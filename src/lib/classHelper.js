// Kiểm tra xem lịch học có thuộc Cuối tuần (Thứ 7 & Chủ Nhật) hay không
export function isWeekendSchedule(schedule) {
  if (!schedule) return false;
  const s = String(schedule).toUpperCase();
  return s.includes('7') || s.includes('CN') || s.includes('CHỦ NHẬT') || s.includes('CHU NHAT') || s.includes('T7');
}

// Bảng cấu hình khung giờ học chuẩn cố định của Hệ thống Anh Ngữ Nhật Mỹ
export const SHIFT_HOURS_CONFIG = {
  // 1. Các ngày trong tuần (Thứ Hai đến thứ Sáu, ví dụ: 24, 35, 246...)
  WEEKDAY: {
    Ca1: { shift: 'Ca 1', hours: '17:45 - 19:15', label: 'Ca 1 (17:45 - 19:15)' },
    Ca2: { shift: 'Ca 2', hours: '19:30 - 21:00', label: 'Ca 2 (19:30 - 21:00)' },
  },
  // 2. Cuối tuần (Thứ Bảy & Chủ Nhật - học sinh tiểu học nghỉ học, học gần như cả ngày)
  WEEKEND: {
    Ca1: { shift: 'Ca 1', hours: '07:45 - 09:15', label: 'Ca 1 (07:45 - 09:15 - Sáng)' },
    Ca2: { shift: 'Ca 2', hours: '09:30 - 11:00', label: 'Ca 2 (09:30 - 11:00 - Sáng)' },
    Ca3: { shift: 'Ca 3', hours: '13:45 - 15:15', label: 'Ca 3 (13:45 - 15:15 - Đầu giờ chiều)' },
    Ca4: { shift: 'Ca 4', hours: '15:30 - 17:00', label: 'Ca 4 (15:30 - 17:00 - Chiều)' },
    Ca5: { shift: 'Ca 5', hours: '17:00 - 18:30', label: 'Ca 5 (17:00 - 18:30 - Chiều tối)' },
  }
};

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
  if (isWeekend) {
    return [
      { value: 'Ca1', label: 'Ca 1 (07:45 - 09:15 - Sáng)' },
      { value: 'Ca2', label: 'Ca 2 (09:30 - 11:00 - Sáng)' },
      { value: 'Ca3', label: 'Ca 3 (13:45 - 15:15 - Đầu giờ chiều)' },
      { value: 'Ca4', label: 'Ca 4 (15:30 - 17:00 - Chiều)' },
      { value: 'Ca5', label: 'Ca 5 (17:00 - 18:30 - Chiều tối)' },
    ];
  }
  return [
    { value: 'Ca1', label: 'Ca 1 (17:45 - 19:15 - Tối)' },
    { value: 'Ca2', label: 'Ca 2 (19:30 - 21:00 - Tối)' },
    // Tùy chọn mở rộng nếu có lớp học ngoại lệ
    { value: 'Ca3', label: 'Ca 3 (Khung giờ khác)' },
    { value: 'Ca4', label: 'Ca 4 (Khung giờ khác)' },
  ];
}

// Trích xuất khung giờ học từ Lịch học tuần và Ca học
export function getShiftTime(schedule, shiftCode) {
  const normShift = extractClassShiftCode(`___${shiftCode || 'Ca1'}`);
  const isWeekend = isWeekendSchedule(schedule);
  const primaryConfig = isWeekend ? SHIFT_HOURS_CONFIG.WEEKEND : SHIFT_HOURS_CONFIG.WEEKDAY;
  
  if (primaryConfig[normShift]) {
    return primaryConfig[normShift].hours;
  }
  if (SHIFT_HOURS_CONFIG.WEEKEND[normShift]) {
    return SHIFT_HOURS_CONFIG.WEEKEND[normShift].hours;
  }
  if (SHIFT_HOURS_CONFIG.WEEKDAY[normShift]) {
    return SHIFT_HOURS_CONFIG.WEEKDAY[normShift].hours;
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
