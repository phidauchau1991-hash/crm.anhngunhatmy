const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

function formatPhone(val) {
  if (!val || val === '0' || val === 0 || val === 'null' || val === 'undefined') return null;
  let str = val.toString().replace(/[\s\.\-\+]/g, '').trim();
  if (!str || str === '0') return null;
  str = str.replace(/\D/g, '');
  if (!str) return null;
  if (/^[1-9]\d{8}$/.test(str)) {
    str = '0' + str;
  }
  return str;
}

function parseExcelDate(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    return new Date((val - 25569) * 86400 * 1000);
  }
  const parts = val.toString().split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(val);
}

function getPastClassDates(startDate, schedule, count, holidays) {
  const dates = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const targetDays = [];
  if (schedule.includes('2')) targetDays.push(1);
  if (schedule.includes('3')) targetDays.push(2);
  if (schedule.includes('4')) targetDays.push(3);
  if (schedule.includes('5')) targetDays.push(4);
  if (schedule.includes('6')) targetDays.push(5);
  if (schedule.includes('7')) targetDays.push(6);
  if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) targetDays.push(0);

  const holidaySet = new Set(holidays.map(h => new Date(h.startDate).toDateString()));

  let attempts = 0;
  while (dates.length < count && attempts < 365) {
    attempts++;
    const day = currentDate.getDay();
    if (targetDays.includes(day)) {
      if (!holidaySet.has(currentDate.toDateString())) {
        dates.push(new Date(currentDate));
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

function calculateExpectedEndDate(startDate, schedule, totalSessions) {
  const targetDays = [];
  if (schedule.includes('2')) targetDays.push(1);
  if (schedule.includes('3')) targetDays.push(2);
  if (schedule.includes('4')) targetDays.push(3);
  if (schedule.includes('5')) targetDays.push(4);
  if (schedule.includes('6')) targetDays.push(5);
  if (schedule.includes('7')) targetDays.push(6);
  if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) targetDays.push(0);

  let cur = new Date(startDate);
  let count = 0;
  let attempts = 0;
  while (count < totalSessions && attempts < 365) {
    attempts++;
    if (targetDays.includes(cur.getDay())) {
      count++;
    }
    if (count < totalSessions) {
      cur.setDate(cur.getDate() + 1);
    }
  }
  return cur;
}

async function main() {
  console.log('=== STARTING COMPLETE RE-IMPORT AND PHONE NORMALIZATION ===');

  const filePath = 'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\File_Mau_Import_NhatMy. M3 24.xlsx';
  const workbook = xlsx.readFile(filePath);
  const classSheet = workbook.Sheets['Lớp Học'];
  const studentSheet = workbook.Sheets['Học Viên'];

  const classRows = xlsx.utils.sheet_to_json(classSheet);
  const studentRows = xlsx.utils.sheet_to_json(studentSheet);
  const holidays = await prisma.holiday.findMany();

  const now = new Date();
  const yearMonthPrefix = `${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1. Upsert Classes
  const classMap = new Map();
  for (const row of classRows) {
    const code = row['Mã lớp']?.toString().trim();
    const level = row['Khóa học']?.toString().trim();
    const teacherName = row['Giáo viên']?.toString().trim();
    const startDateVal = row['Ngày khai giảng'];
    const schedule = row['Lịch học tuần']?.toString().trim();
    const sessionsTaught = parseInt(row['Số buổi đã học thực tế']) || 0;

    if (!code || !level || !startDateVal || !schedule) continue;

    const startDate = parseExcelDate(startDateVal);
    const courseConfig = await prisma.courseConfig.findUnique({ where: { level } });
    const totalSessions = courseConfig ? courseConfig.totalSessions : 32;
    const expectedEndDate = calculateExpectedEndDate(startDate, schedule, totalSessions);

    await prisma.class.upsert({
      where: { code },
      update: { level, teacherName, startDate, schedule, expectedEndDate },
      create: { code, level, teacherName, startDate, schedule, expectedEndDate }
    });

    classMap.set(code, { startDate, schedule, sessionsTaught, level });
    console.log(`✓ Lớp: ${code} (${level}) - Ngày KG: ${startDate.toLocaleDateString('vi-VN')}`);
  }

  // 2. Clear out existing students to clean up previous mis-assigned records and re-create accurately
  console.log('\n--- CLEANING UP & RE-CREATING STUDENT RECORDS ---');
  await prisma.attendance.deleteMany({});
  await prisma.orderFinance.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.student.deleteMany({});

  let serialOffset = 1;

  for (let idx = 0; idx < studentRows.length; idx++) {
    const row = studentRows[idx];
    const name = row['Họ và Tên']?.toString().trim();
    if (!name) continue;

    let nationalId = row['CCCD / Định danh']?.toString().trim();
    let rawPhone = row['Số điện thoại'];
    const phone = formatPhone(rawPhone);
    const dob = parseExcelDate(row['Ngày sinh']);
    const address = row['Địa chỉ']?.toString().trim();
    const classCode = row['Mã lớp xếp vào']?.toString().trim();
    const customFee = parseFloat(row['Học phí thỏa thuận']) || 0;
    const amountPaid = parseFloat(row['Số tiền đã đóng']) || 0;
    const sessionsAttended = parseInt(row['Số buổi đã đi học']) || 0;

    if (!nationalId || nationalId === '0' || nationalId === 'undefined') {
      nationalId = `KDD_${yearMonthPrefix}_${String(serialOffset).padStart(3, '0')}`;
    }

    const studentId = `HV${yearMonthPrefix}_${String(serialOffset).padStart(3, '0')}`;
    serialOffset++;

    const student = await prisma.student.create({
      data: {
        id: studentId,
        name,
        phone,
        dob,
        address,
        nationalId,
        status: 'Đang học',
        specialPolicyType: 'Không giảm',
        specialPolicyValue: 0,
        specialPolicy: 'Không',
        referralCode: studentId,
      }
    });

    console.log(`[${studentId}] ${name} | SĐT: "${phone || 'N/A'}" | CCCD: ${nationalId} | Lớp: ${classCode}`);

    // Enroll and set up orders/attendance
    if (classCode && classMap.has(classCode)) {
      const classMeta = classMap.get(classCode);

      await prisma.enrollment.create({
        data: { studentId, classCode }
      });

      const courseConfig = await prisma.courseConfig.findUnique({ where: { level: classMeta.level } });
      const totalSessions = courseConfig.totalSessions;
      const sessionsRemaining = Math.max(0, totalSessions - classMeta.sessionsTaught);
      const costPerSession = courseConfig.price / totalSessions;
      const rawProRated = costPerSession * sessionsRemaining;
      const proRatedTuition = Math.floor(rawProRated / 10000) * 10000;

      const feeToPay = customFee > 0 ? customFee : proRatedTuition;
      const paymentStatus = amountPaid >= feeToPay ? 'Đã đóng' : (amountPaid > 0 ? 'Chưa đóng đủ' : 'Chưa đóng');

      const orderId = `ORD_IMP_${yearMonthPrefix}_${studentId.split('_')[1]}`;
      await prisma.orderFinance.create({
        data: {
          id: orderId,
          studentId,
          classCode,
          promoType: customFee > 0 ? 'Giá thỏa thuận Import' : `Khấu trừ Import (${sessionsRemaining}/${totalSessions} buổi)`,
          promoDiscount: courseConfig.price - feeToPay,
          feeToPay,
          amountPaid,
          paymentStatus,
          paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        }
      });

      // Attendance history
      if (classMeta.sessionsTaught > 0) {
        const pastDates = getPastClassDates(classMeta.startDate, classMeta.schedule, classMeta.sessionsTaught, holidays);
        for (let i = 0; i < pastDates.length; i++) {
          const attendDate = pastDates[i];
          const status = i < sessionsAttended ? 'Có mặt' : 'Vắng có phép';

          await prisma.attendance.create({
            data: {
              studentId,
              classCode,
              date: attendDate,
              status,
              teacherNotes: 'Import lịch sử từ Excel',
              checkInTime: status === 'Có mặt' ? 'Đúng giờ' : '',
            }
          });
        }
      }
    }
  }

  console.log('\n=== RE-IMPORT COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
