// Kiểm tra xem lịch học có thuộc Cuối tuần (Thứ 7 & Chủ Nhật) hay không
export function isWeekendSchedule(schedule) {
  if (!schedule) return false;
  const s = String(schedule).toUpperCase();
  return s.includes('7') || s.includes('CN') || s.includes('CHỦ NHẬT') || s.includes('CHU NHAT') || s.includes('T7');
}

// ============================================================================
// BẢNG KHUNG GIỜ CA HỌC CHUẨN - NGUỒN DUY NHẤT (Single Source of Truth)
// Mọi nơi trong CRM (chọn ca khi mở lớp, thư chuyển lớp, thư học thử, danh sách lớp,
// học viên tháng...) đều lấy giờ học từ bảng này. Muốn đổi giờ chỉ cần sửa tại đây.
// Chốt theo thông tin Quản lý cung cấp ngày 25/10/2026.
// ============================================================================
export const SHIFT_HOURS_CONFIG = {
  // 1. Các ngày trong tuần (Thứ 2-4, Thứ 3-5, 246, ... chỉ học buổi tối)
  WEEKDAY: {
    Ca1: { shift: 'Ca 1', hours: '17:45 - 19:15', period: 'Tối' },
    Ca2: { shift: 'Ca 2', hours: '19:30 - 21:00', period: 'Tối' },
  },
  // 2. Cuối tuần (Thứ Bảy & Chủ Nhật - học sinh tiểu học nghỉ học, học gần như cả ngày)
  WEEKEND: {
    Ca1: { shift: 'Ca 1', hours: '07:45 - 09:15', period: 'Sáng' },
    Ca2: { shift: 'Ca 2', hours: '09:30 - 11:00', period: 'Sáng' },
    Ca3: { shift: 'Ca 3', hours: '13:45 - 15:15', period: 'Đầu giờ chiều' },
    Ca4: { shift: 'Ca 4', hours: '15:30 - 17:00', period: 'Chiều' },
    Ca5: { shift: 'Ca 5', hours: '17:00 - 18:30', period: 'Chiều tối' },
  }
};

// Tạo nhãn hiển thị dạng "Ca 1 (07:45 - 09:15 - Sáng)" từ bảng cấu hình trên
function buildShiftOption(code, cfg) {
  return { value: code, label: `${cfg.shift} (${cfg.hours} - ${cfg.period})` };
}

// Hàm chuẩn hóa tên Ca học (K1, K2, Ca 1, Ca 2, 01, 02...)
export function parseShift(rawShift) {
  if (!rawShift) return 'Ca 1';
  const clean = String(rawShift).trim().toLowerCase();
  if (clean === '01' || clean === 'ca1' || clean === 'k1' || clean === '1') return 'Ca 1';
  if (clean === '02' || clean === 'ca2' || clean === 'k2' || clean === '2') return 'Ca 2';
  if (clean === '03' || clean === 'ca3' || clean === 'k3' || clean === '3') return 'Ca 3';
  if (clean === '04' || clean === 'ca4' || clean === 'k4' || clean === '4') return 'Ca 4';
  if (clean === '05' || clean === 'ca5' || clean === 'k5' || clean === '5') return 'Ca 5';
  if (clean === '06' || clean === 'ca6' || clean === 'k6' || clean === '6') return 'Ca 6';
  
  if (/^ca\s*\d+$/i.test(clean)) {
    return clean.replace(/^ca\s*/i, 'Ca ');
  }
  if (/^k\s*\d+$/i.test(clean)) {
    return clean.replace(/^k\s*/i, 'Ca ');
  }
  return rawShift;
}

// Trích xuất mã Ca học chuẩn (e.g. Ca1, Ca2, Ca3, Ca4, Ca5) từ mã lớp hoặc chuỗi ca
export function extractClassShiftCode(classCode) {
  if (!classCode) return 'Ca1';
  const parts = classCode.split('_');
  const raw = (parts.length >= 5 ? parts[4] : parts[parts.length - 1]).trim();
  const clean = raw.toLowerCase();

  if (clean === '01' || clean === 'ca1' || clean === 'k1' || clean === '1') return 'Ca1';
  if (clean === '02' || clean === 'ca2' || clean === 'k2' || clean === '2') return 'Ca2';
  if (clean === '03' || clean === 'ca3' || clean === 'k3' || clean === '3') return 'Ca3';
  if (clean === '04' || clean === 'ca4' || clean === 'k4' || clean === '4') return 'Ca4';
  if (clean === '05' || clean === 'ca5' || clean === 'k5' || clean === '5') return 'Ca5';
  if (clean === '06' || clean === 'ca6' || clean === 'k6' || clean === '6') return 'Ca6';
  
  if (/^ca\s*\d+$/i.test(clean)) {
    return clean.replace(/^ca\s*/i, 'Ca');
  }
  if (/^k\s*\d+$/i.test(clean)) {
    return clean.replace(/^k\s*/i, 'Ca');
  }
  return raw || 'Ca1';
}

// Lấy danh sách các Ca học phù hợp kèm khung giờ chuẩn theo Lịch học tuần
export function getAvailableShifts(schedule) {
  const isWeekend = isWeekendSchedule(schedule);
  const config = isWeekend ? SHIFT_HOURS_CONFIG.WEEKEND : SHIFT_HOURS_CONFIG.WEEKDAY;
  const options = Object.entries(config).map(([code, cfg]) => buildShiftOption(code, cfg));
  if (!isWeekend) {
    // Tùy chọn mở rộng nếu có lớp học ngoại lệ (giờ nhập tay)
    options.push({ value: 'Ca3', label: 'Ca 3 (Khung giờ khác)' });
    options.push({ value: 'Ca4', label: 'Ca 4 (Khung giờ khác)' });
  }
  return options;
}

// Trích xuất khung giờ học từ Lịch học tuần và Ca học
// Chỉ tra đúng bảng của nhóm ngày (trong tuần / cuối tuần). Ca không có trong bảng => trả về '' để nhập tay,
// tuyệt đối không "mượn" giờ của nhóm ngày khác (tránh hiển thị sai giờ học).
export function getShiftTime(schedule, shiftCode) {
  const normShift = extractClassShiftCode(`___${shiftCode || 'Ca1'}`);
  const isWeekend = isWeekendSchedule(schedule);
  const primaryConfig = isWeekend ? SHIFT_HOURS_CONFIG.WEEKEND : SHIFT_HOURS_CONFIG.WEEKDAY;

  if (primaryConfig[normShift]) {
    return primaryConfig[normShift].hours;
  }
  return '';
}

// Chuyển đổi mã lịch học (ví dụ "7CN", "35", "24") thành văn bản tiếng Việt dễ đọc
export function formatScheduleDisplay(schedule) {
  if (!schedule) return 'Chưa xếp lịch';
  const clean = String(schedule).trim().toUpperCase();
  if (clean === '7CN' || clean === 'T7CN' || clean === '7-CN') return 'Thứ 7 & Chủ Nhật';
  if (clean === '35' || clean === 'T35' || clean === '3-5') return 'Thứ 3 & Thứ 5';
  if (clean === '24' || clean === 'T24' || clean === '2-4') return 'Thứ 2 & Thứ 4';
  if (clean === '246' || clean === 'T246') return 'Thứ 2 - 4 - 6';
  if (clean === '357' || clean === 'T357') return 'Thứ 3 - 5 - 7';
  if (clean === '46' || clean === 'T46') return 'Thứ 4 & Thứ 6';
  return schedule;
}

// Trích xuất toàn diện Lịch học & Giờ học từ Mã lớp và Lịch học
export function getClassScheduleDetails(classCode, scheduleRaw) {
  // Hỗ trợ lớp học theo tháng có định dạng "Thứ 7, Chủ Nhật | 15h -> 17h"
  if (scheduleRaw && String(scheduleRaw).includes('|')) {
    const pipeParts = String(scheduleRaw).split('|');
    const daysDisplay = pipeParts[0].trim();
    const hours = pipeParts.slice(1).join(' | ').trim();
    return {
      schedule: daysDisplay,
      shiftCode: '',
      shiftName: '',
      hours,
      daysDisplay,
      fullDisplay: hours ? `${daysDisplay} (${hours})` : daysDisplay,
    };
  }

  let schedule = scheduleRaw;
  const parts = (classCode || '').split('_');
  if (!schedule && parts.length >= 4) {
    schedule = parts[3];
  }
  const shiftCode = extractClassShiftCode(classCode);
  const shiftName = parseShift(shiftCode);
  const hours = getShiftTime(schedule, shiftCode);
  const daysDisplay = formatScheduleDisplay(schedule);

  let fullDisplay = daysDisplay;
  if (hours) {
    fullDisplay = `${daysDisplay} (${hours})`;
  } else if (shiftName) {
    fullDisplay = `${daysDisplay} (${shiftName})`;
  }

  return {
    schedule,
    shiftCode,
    shiftName,
    hours,
    daysDisplay,
    fullDisplay,
  };
}

// Định dạng tên lớp chuẩn hiển thị
export function formatClassCode(classCode) {
  if (!classCode) return '';
  // Example formats: 
  // CN1_M2_PhanThiTrucMy_7CN_01
  // CN1_S3_MsMy_35_Ca2
  // CN1_S1_MsMy_7CN_Ca4
  
  const parts = classCode.split('_');
  if (parts.length < 4) return classCode;

  const level = parts[1]; // 'M2', 'S3'
  const schedule = parts[3]; // '7CN', '35'
  
  let shift = '';
  if (parts.length >= 5) {
    shift = parseShift(parts[4]);
  }

  let displaySchedule = schedule;
  if (schedule === '7CN' || schedule.toLowerCase() === 't7cn') displaySchedule = 'T7CN';
  else if (schedule === '35' || schedule.toLowerCase() === 't35') displaySchedule = '35';
  else if (schedule === '24' || schedule.toLowerCase() === 't24') displaySchedule = '24';
  else if (schedule === '46' || schedule.toLowerCase() === 't46') displaySchedule = '46';
  else if (schedule === '246' || schedule.toLowerCase() === 't246') displaySchedule = '246';
  else if (schedule === '357' || schedule.toLowerCase() === 't357') displaySchedule = '357';

  if (shift) {
    return `${level} - ${displaySchedule} - ${shift}`;
  }
  return `${level} - ${displaySchedule}`;
}

/**
 * Kiểm tra một lớp có đã kết thúc hay chưa.
 * Lớp đóng theo tháng (MONTHLY) chạy liên tục nên không bao giờ bị xếp vào nhóm đã kết thúc.
 */
export function isClassEnded(cls, now = new Date()) {
  if (!cls || cls.level === 'MONTHLY') return false;
  if (cls.sessionsRemaining !== undefined) {
    return cls.sessionsRemaining <= 0;
  }
  if (cls.status === 'Kết thúc' || cls.status === 'Đã kết thúc' || cls.status === 'Đã hoàn thành') {
    return true;
  }
  if (cls.expectedEndDate) {
    return new Date(cls.expectedEndDate) < now;
  }
  return false;
}

/**
 * Tên hiển thị ngắn gọn chuẩn của lớp học (VD: "M1 - T7CN - Ca 1 - Ms My", hoặc "[Đã đóng] ...").
 */
export function getClassDisplayLabel(cls, isEnded = false) {
  if (!cls) return '';
  const code = cls.code || '';
  const shortName = formatClassCode(code);
  const teacherSuffix = cls.teacherName ? ` - ${cls.teacherName}` : '';
  return `${isEnded ? '[Đã đóng] ' : ''}${shortName}${teacherSuffix}`;
}

/**
 * Phân nhóm và sắp xếp danh sách lớp theo đúng 3 tầng chuẩn UX:
 * 1. Các nhóm lớp theo khóa đang hoạt động (gom theo `Cấp độ ...`, sort A->Z)
 * 2. Lớp Học Kèm / Đóng Theo Tháng (`level === 'MONTHLY'`)
 * 3. Lớp đã kết thúc (`[Đã đóng] ...`) ở dưới cùng (dưới cả lớp tháng)
 */
export function groupAndSortClasses(classes, { hideEnded = false } = {}) {
  const courseGroups = {};
  const monthlyClasses = [];
  const endedClasses = [];

  if (!Array.isArray(classes)) {
    return { courseGroups: [], monthlyClasses, endedClasses };
  }

  const now = new Date();
  const sortByShortLabel = (a, b) =>
    formatClassCode(a.code).localeCompare(formatClassCode(b.code), 'vi', { numeric: true, sensitivity: 'base' });

  classes.forEach((cls) => {
    if (!cls || !cls.code) return;
    if (cls.level === 'MONTHLY') {
      monthlyClasses.push(cls);
      return;
    }
    if (isClassEnded(cls, now)) {
      if (!hideEnded) endedClasses.push(cls);
      return;
    }
    const groupKey = cls.capDo || 'Khác';
    if (!courseGroups[groupKey]) courseGroups[groupKey] = [];
    courseGroups[groupKey].push(cls);
  });

  const sortedCourseGroups = Object.keys(courseGroups)
    .sort((a, b) => a.localeCompare(b, 'vi', { numeric: true, sensitivity: 'base' }))
    .map((capDo) => ({
      key: capDo,
      label: `--- Cấp độ ${capDo} ---`,
      items: courseGroups[capDo].sort(sortByShortLabel),
    }));

  monthlyClasses.sort(sortByShortLabel);
  endedClasses.sort(sortByShortLabel);

  return {
    courseGroups: sortedCourseGroups,
    monthlyClasses,
    endedClasses,
  };
}

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Chuẩn hóa mọi kiểu Date / timestamp / chuỗi ngày (YYYY-MM-DD hoặc DD/MM/YYYY) về YYYY-MM-DD (GMT+7)
 */
export function toVnDateKey(dateInput) {
  if (!dateInput && dateInput !== 0) return '';
  if (typeof dateInput === 'string') {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const vnMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vnMatch) {
      const dd = vnMatch[1].padStart(2, '0');
      const mm = vnMatch[2].padStart(2, '0');
      const yyyy = vnMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '';
  return vnDateFormatter.format(d);
}

/**
 * Chuẩn hóa chuỗi lịch học (VD: "Thứ 7, Chủ Nhật", "T7CN", "7CN", "Thứ 3, Thứ 5") về mã chuẩn ("7CN", "35", "24"...)
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
 * Lấy danh sách các thứ trong tuần (0 = Chủ Nhật, 1 = Thứ 2, ..., 6 = Thứ 7) từ chuỗi lịch học hoặc mã lớp
 */
export function extractTargetDays(schedule, classCode = '') {
  const effectiveSchedule = schedule || (classCode && String(classCode).split('_')[3]) || '';
  const norm = normalizeScheduleCode(effectiveSchedule);
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
 * Kiểm tra một ngày cụ thể có trùng ngày nghỉ áp dụng cho lớp/ca đó không
 */
export function getHolidayForDate(date, classCode, schedule, holidays) {
  if (!holidays || !Array.isArray(holidays)) return null;
  const dateKey = toVnDateKey(date);
  if (!dateKey) return null;

  const effectiveSchedule = schedule || (classCode && String(classCode).split('_')[3]) || '';
  const normSchedule = normalizeScheduleCode(effectiveSchedule);

  for (const h of holidays) {
    const startKey = toVnDateKey(h.startDate);
    const endKey = toVnDateKey(h.endDate);
    if (!startKey || !endKey) continue;

    if (dateKey >= startKey && dateKey <= endKey) {
      if (h.scope === 'GLOBAL') return h;
      if (h.scope === 'SHIFT') {
        if (h.targetId === effectiveSchedule || (normSchedule && normalizeScheduleCode(h.targetId) === normSchedule)) {
          return h;
        }
        if (classCode && h.targetId === classCode) return h;
      }
      if (h.scope === 'CLASS' && h.targetId === classCode) return h;
    }
  }
  return null;
}

/**
 * Tính toán ngày kết thúc dự kiến chuẩn (tịnh tiến đúng từng buổi theo lịch học & tự động tránh ngày nghỉ).
 * Trả về Date chuẩn UTC 00:00 của ngày Việt Nam tương ứng.
 */
export function computeExpectedEndDate({ startDate, totalSessions, classCode = '', schedule = '', holidays = [] }) {
  const effectiveSchedule = schedule || (classCode && String(classCode).split('_')[3]) || '';
  const targetDays = extractTargetDays(effectiveSchedule, classCode);
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
    const isDayHoliday = getHolidayForDate(currentKey, classCode, effectiveSchedule, holidays);

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
 * Phiên bản trả về chuỗi DD/MM/YYYY (VD: "28/02/2027") để hiển thị đồng nhất trên giao diện & thư báo
 */
export function computeExpectedEndDateVn({ startDate, totalSessions, classCode = '', schedule = '', holidays = [] }) {
  const endDate = computeExpectedEndDate({ startDate, totalSessions, classCode, schedule, holidays });
  if (!endDate) return '';
  const isoKey = endDate.toISOString().slice(0, 10);
  const [yyyy, mm, dd] = isoKey.split('-');
  return `${dd}/${mm}/${yyyy}`;
}
