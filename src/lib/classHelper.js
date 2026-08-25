export function formatClassCode(classCode) {
  if (!classCode) return '';
  // Example formats: 
  // CN1_M2_PhanThiTrucMy_7CN_01
  // CN1_S3_MsMy_35_Ca2
  
  const parts = classCode.split('_');
  if (parts.length < 4) return classCode;

  // Extract parts
  // parts[0] is usually branch e.g., 'CN1'
  const level = parts[1]; // 'M2', 'S3'
  // parts[2] is teacher name, but we don't need it if we already have it in the DB, or we can skip it.
  const schedule = parts[3]; // '7CN', '35'
  
  let shift = '';
  if (parts.length >= 5) {
    const rawShift = parts[4];
    if (rawShift === '01' || rawShift.toLowerCase() === 'ca1') shift = 'Ca 1';
    else if (rawShift === '02' || rawShift.toLowerCase() === 'ca2') shift = 'Ca 2';
    else if (rawShift === '03' || rawShift.toLowerCase() === 'ca3') shift = 'Ca 3';
    else if (rawShift === '04' || rawShift.toLowerCase() === 'ca4') shift = 'Ca 4';
    else shift = rawShift; // fallback
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
