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

// Trích xuất mã Ca học chuẩn (e.g. Ca1, Ca2, Ca3, Ca4) từ mã lớp
export function extractClassShiftCode(classCode) {
  if (!classCode) return 'Ca1';
  const parts = classCode.split('_');
  if (parts.length >= 5) {
    const raw = parts[4].trim();
    const clean = raw.toLowerCase();
    if (clean === '01' || clean === 'ca1' || clean === 'k1' || clean === '1') return 'Ca1';
    if (clean === '02' || clean === 'ca2' || clean === 'k2' || clean === '2') return 'Ca2';
    if (clean === '03' || clean === 'ca3' || clean === 'k3' || clean === '3') return 'Ca3';
    if (clean === '04' || clean === 'ca4' || clean === 'k4' || clean === '4') return 'Ca4';
    if (clean === '05' || clean === 'ca5' || clean === 'k5' || clean === '5') return 'Ca5';
    if (clean === '06' || clean === 'ca6' || clean === 'k6' || clean === '6') return 'Ca6';
    return raw;
  }
  return 'Ca1';
}

export function formatClassCode(classCode) {
  if (!classCode) return '';
  // Example formats: 
  // CN1_M2_PhanThiTrucMy_7CN_01
  // CN1_S3_MsMy_35_Ca2
  // CN1_S1_MsMy_7CN_Ca4
  
  const parts = classCode.split('_');
  if (parts.length < 4) return classCode;

  // Extract parts
  // parts[0] is usually branch e.g., 'CN1'
  const level = parts[1]; // 'M2', 'S3'
  // parts[2] is teacher name
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
