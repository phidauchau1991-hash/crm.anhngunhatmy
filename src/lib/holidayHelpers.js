import prisma from './db';

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Chuẩn hóa mọi kiểu Date / timestamp / chuỗi ngày về định dạng YYYY-MM-DD theo múi giờ Việt Nam (GMT+7)
 */
export function toVnDateKey(dateInput) {
  if (!dateInput && dateInput !== 0) return '';
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return vnDateFormatter.format(d);
}

/**
 * Chuẩn hóa chuỗi lịch học (VD: "Thứ 7, Chủ Nhật", "7CN", "Thứ 3, Thứ 5") về mã chuẩn ("7CN", "35", "24"...)
 */
export function normalizeScheduleCode(str) {
  if (!str) return '';
  const base = String(str).split('|')[0].toUpperCase();
  const days = [];
  if (base.includes('2')) days.push('2');
  if (base.includes('3')) days.push('3');
  if (base.includes('4')) days.push('4');
  if (base.includes('5')) days.push('5');
  if (base.includes('6')) days.push('6');
  if (base.includes('7')) days.push('7');
  if (base.includes('8') || base.includes('CN') || base.includes('CHỦ NHẬT') || base.includes('CHU NHAT')) days.push('CN');
  return days.length > 0 ? days.join('') : base.trim();
}

/**
 * Lấy danh sách các thứ trong tuần (0 = Chủ Nhật, 1 = Thứ 2, ..., 6 = Thứ 7) từ chuỗi lịch học
 */
export function extractTargetDays(schedule) {
  const norm = normalizeScheduleCode(schedule);
  const targetDays = [];
  if (norm.includes('2')) targetDays.push(1);
  if (norm.includes('3')) targetDays.push(2);
  if (norm.includes('4')) targetDays.push(3);
  if (norm.includes('5')) targetDays.push(4);
  if (norm.includes('6')) targetDays.push(5);
  if (norm.includes('7')) targetDays.push(6);
  if (norm.includes('CN')) targetDays.push(0);
  return targetDays;
}

/**
 * Checks if a given date is a holiday for a specific class code and schedule.
 * @param {Date|string|number} date - Date to check
 * @param {string} classCode - Code of the class
 * @param {string} schedule - Schedule of the class (e.g. "24", "35", "7CN", "246")
 * @param {Array} holidays - Array of holiday records fetched from the database
 * @returns {Object|null} - The holiday record if found, or null
 */
export function getHolidayForDate(date, classCode, schedule, holidays) {
  if (!holidays || !Array.isArray(holidays)) return null;
  const dateKey = toVnDateKey(date);
  if (!dateKey) return null;

  const normSchedule = normalizeScheduleCode(schedule);

  for (const h of holidays) {
    const startKey = toVnDateKey(h.startDate);
    const endKey = toVnDateKey(h.endDate);
    if (!startKey || !endKey) continue;

    if (dateKey >= startKey && dateKey <= endKey) {
      if (h.scope === 'GLOBAL') return h;
      if (h.scope === 'SHIFT') {
        if (h.targetId === schedule || (normSchedule && normalizeScheduleCode(h.targetId) === normSchedule)) {
          return h;
        }
        // Tương thích ngược nếu targetId vô tình lưu mã lớp
        if (classCode && h.targetId === classCode) return h;
      }
      if (h.scope === 'CLASS' && h.targetId === classCode) return h;
    }
  }
  return null;
}

/**
 * Tính toán ngày kết thúc dự kiến (trả về Date chuẩn UTC 00:00 của ngày Việt Nam tương ứng)
 */
export function computeExpectedEndDate({ startDate, totalSessions, classCode, schedule, holidays }) {
  const targetDays = extractTargetDays(schedule);
  if (targetDays.length === 0 || !totalSessions || totalSessions <= 0) return null;

  const startKey = toVnDateKey(startDate);
  if (!startKey) return null;

  const cursor = new Date(`${startKey}T12:00:00.000Z`);
  let sessionsCount = 0;
  let guard = 0;

  while (sessionsCount < totalSessions && guard < 1500) {
    guard++;
    const currentKey = cursor.toISOString().slice(0, 10);
    const dayOfWeek = cursor.getUTCDay();
    const isDayHoliday = getHolidayForDate(currentKey, classCode, schedule, holidays);

    if (targetDays.includes(dayOfWeek) && !isDayHoliday) {
      sessionsCount++;
      if (sessionsCount === totalSessions) {
        return new Date(`${currentKey}T00:00:00.000Z`);
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return new Date(`${cursor.toISOString().slice(0, 10)}T00:00:00.000Z`);
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
