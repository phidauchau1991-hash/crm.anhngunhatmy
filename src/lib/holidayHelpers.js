import prisma from './db';

/**
 * Checks if a given date is a holiday for a specific class code and schedule.
 * @param {Date|string} date - Date to check
 * @param {string} classCode - Code of the class
 * @param {string} schedule - Schedule of the class (e.g. "24", "35", "7CN", "246")
 * @param {Array} holidays - Array of holiday records fetched from the database
 * @returns {Object|null} - The holiday record if found, or null
 */
export function getHolidayForDate(date, classCode, schedule, holidays) {
  const normalizedTime = new Date(date).setHours(0, 0, 0, 0);

  for (const h of holidays) {
    const start = new Date(h.startDate).setHours(0, 0, 0, 0);
    const end = new Date(h.endDate).setHours(0, 0, 0, 0);

    if (normalizedTime >= start && normalizedTime <= end) {
      if (h.scope === 'GLOBAL') return h;
      if (h.scope === 'SHIFT' && h.targetId === schedule) return h;
      if (h.scope === 'CLASS' && h.targetId === classCode) return h;
    }
  }
  return null;
}

/**
 * Recalculates expectedEndDate for a class based on its startDate, schedule, courseConfig, and holidays.
 * Supports running within an optional prisma transaction context.
 * @param {string} classCode - Class Code to recalculate
 * @param {Object} [tx] - Optional Prisma transaction client
 */
export async function recalculateClassEndDate(classCode, tx = prisma) {
  const cls = await tx.class.findUnique({
    where: { code: classCode },
  });
  if (!cls) return null;

  const courseConfig = await tx.courseConfig.findUnique({
    where: { level: cls.level },
  });
  if (!courseConfig) return null;

  const totalSessions = courseConfig.totalSessions;
  const holidays = await tx.holiday.findMany();

  const targetDays = [];
  const schedule = cls.schedule;
  if (schedule.includes('2')) targetDays.push(1);
  if (schedule.includes('3')) targetDays.push(2);
  if (schedule.includes('4')) targetDays.push(3);
  if (schedule.includes('5')) targetDays.push(4);
  if (schedule.includes('6')) targetDays.push(5);
  if (schedule.includes('7')) targetDays.push(6);
  if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) targetDays.push(0);

  if (targetDays.length === 0) return null;

  let currentDate = new Date(cls.startDate);
  currentDate.setHours(0, 0, 0, 0);
  let sessionsCount = 0;

  while (sessionsCount < totalSessions) {
    const dayOfWeek = currentDate.getDay();
    const isDayHoliday = getHolidayForDate(currentDate, classCode, schedule, holidays);

    if (targetDays.includes(dayOfWeek) && !isDayHoliday) {
      sessionsCount++;
      if (sessionsCount === totalSessions) {
        break;
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const expectedEndDate = new Date(currentDate);

  const updatedClass = await tx.class.update({
    where: { code: classCode },
    data: { expectedEndDate },
  });

  return updatedClass;
}
