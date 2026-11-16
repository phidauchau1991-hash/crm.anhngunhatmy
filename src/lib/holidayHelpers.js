import prisma from './db';
import {
  toVnDateKey,
  normalizeScheduleCode,
  extractTargetDays,
  getHolidayForDate,
  computeExpectedEndDate,
  computeExpectedEndDateVn,
} from './classHelper';

export {
  toVnDateKey,
  normalizeScheduleCode,
  extractTargetDays,
  getHolidayForDate,
  computeExpectedEndDate,
  computeExpectedEndDateVn,
};

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
  if (!cls || cls.level === 'MONTHLY') return null;

  const courseConfig = await tx.courseConfig.findUnique({
    where: { level: cls.level },
  });
  if (!courseConfig) return null;

  const holidays = await tx.holiday.findMany();
  const expectedEndDate = computeExpectedEndDate({
    startDate: cls.startDate,
    totalSessions: courseConfig.totalSessions,
    classCode,
    schedule: cls.schedule,
    holidays,
  });

  if (!expectedEndDate) return null;

  const updatedClass = await tx.class.update({
    where: { code: classCode },
    data: { expectedEndDate },
  });

  return updatedClass;
}
