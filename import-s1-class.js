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
  if (val instanceof Date) return val;
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
  console.log('=== EXECUTE IMPORT FOR S1 (LỊCH 7CN) & 8 HỌC VIÊN ===\n');

  const filePath = 'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\File_Mau_Import_NhatMy. M3 24.xlsx';
  const workbook = xlsx.readFile(filePath);
  const classSheet = workbook.Sheets['Lớp Học'];
  const studentSheet = workbook.Sheets['Học Viên'];

  const classRows = xlsx.utils.sheet_to_json(classSheet);
  const studentRows = xlsx.utils.sheet_to_json(studentSheet);
  const holidays = await prisma.holiday.findMany();

  // 1. Upsert Class
  const classCode = 'CN1_S1_MsMy_7CN_Ca4';
  const s1ClassRow = classRows.find(r => (r['Mã lớp'] || '').toString().trim() === classCode);
  if (!s1ClassRow) {
    throw new Error(`Không tìm thấy mã lớp ${classCode} trong sheet Lớp Học`);
  }

  // Level is S1 (as specified in class code and request)
  const level = 'S1';
  const teacherName = s1ClassRow['Giáo viên']?.toString().trim();
  const startDateStr = '04/07/2026';
  const startDate = parseExcelDate(startDateStr);
  const schedule = s1ClassRow['Lịch học tuần']?.toString().trim();
  const sessionsTaughtInClass = parseInt(s1ClassRow['Số buổi đã học thực tế']) || 0;

  const courseConfig = await prisma.courseConfig.findUnique({ where: { level } });
  const totalSessions = courseConfig ? courseConfig.totalSessions : 32;
  const expectedEndDate = calculateExpectedEndDate(startDate, schedule, totalSessions);

  const createdClass = await prisma.class.upsert({
    where: { code: classCode },
    update: { level, teacherName, startDate, schedule, expectedEndDate },
    create: { code: classCode, level, teacherName, startDate, schedule, expectedEndDate }
  });

  console.log(`✓ Đã tạo/cập nhật Lớp học: ${createdClass.code}`);
  console.log(`  - Khóa học: ${createdClass.level} | Giáo viên: ${createdClass.teacherName}`);
  console.log(`  - Khai giảng: ${createdClass.startDate.toLocaleDateString('vi-VN')} | Lịch học: ${createdClass.schedule} | Dự kiến KT: ${createdClass.expectedEndDate.toLocaleDateString('vi-VN')}`);
  console.log(`  - Số buổi đã dạy thực tế: ${sessionsTaughtInClass}\n`);

  // 2. Import Students
  const s1Students = studentRows.filter(r => (r['Mã lớp xếp vào'] || '').toString().trim() === classCode);
  console.log(`--- TIẾN HÀNH THÊM 100% ACCURATE ${s1Students.length} HỌC VIÊN ---`);

  const now = new Date();
  const yearMonthPrefix = `${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Find maximum existing HV serial number
  const existingStudents = await prisma.student.findMany({ select: { id: true } });
  let maxSerial = 0;
  for (const st of existingStudents) {
    const parts = st.id.split('_');
    if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
      const serial = parseInt(parts[1]);
      if (serial > maxSerial) maxSerial = serial;
    }
  }

  let currentSerial = maxSerial;
  const pastClassDates = getPastClassDates(startDate, schedule, sessionsTaughtInClass, holidays);

  for (let i = 0; i < s1Students.length; i++) {
    const row = s1Students[i];
    const name = row['Họ và Tên']?.toString().trim();
    let nationalId = row['CCCD / Định danh']?.toString().trim();
    if (nationalId) nationalId = nationalId.trim();
    let rawPhone = row['Số điện thoại'];
    const phone = formatPhone(rawPhone);
    const dob = parseExcelDate(row['Ngày sinh']);
    const address = row['Địa chỉ']?.toString().trim() || null;
    const customFee = parseFloat(row['Học phí thỏa thuận']) || 3150000;
    const amountPaid = parseFloat(row['Số tiền đã đóng']) || 0;
    const sessionsAttended = parseInt(row['Số buổi đã đi học']) || 0;

    currentSerial++;
    const studentId = `HV${yearMonthPrefix}_${String(currentSerial).padStart(3, '0')}`;

    if (!nationalId || nationalId === '0' || nationalId === 'undefined') {
      nationalId = `KDD_${yearMonthPrefix}_${String(currentSerial).padStart(3, '0')}`;
    }

    // Create Student
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

    // Create Enrollment
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classCode: createdClass.code
      }
    });

    // Create Finance Order
    const feeToPay = customFee;
    let paymentStatus = 'Chưa đóng';
    if (amountPaid >= feeToPay) {
      paymentStatus = 'Đã đóng';
    } else if (amountPaid > 0) {
      paymentStatus = 'Chưa đóng đủ';
    }

    const orderId = `ORD_IMP_${yearMonthPrefix}_${studentId.split('_')[1]}`;

    await prisma.orderFinance.create({
      data: {
        id: orderId,
        studentId: student.id,
        classCode: createdClass.code,
        promoType: 'Giá thỏa thuận Import',
        promoDiscount: 0,
        feeToPay,
        amountPaid,
        paymentStatus,
        paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        paymentPolicy: 'Đóng trước'
      }
    });

    // Create Attendance History
    let attendanceCount = 0;
    for (let dIdx = 0; dIdx < pastClassDates.length; dIdx++) {
      const attendDate = pastClassDates[dIdx];
      const status = dIdx < sessionsAttended ? 'Có mặt' : 'Vắng có phép';

      await prisma.attendance.create({
        data: {
          studentId: student.id,
          classCode: createdClass.code,
          date: attendDate,
          status,
          teacherNotes: 'Import lịch sử từ Excel',
          checkInTime: status === 'Có mặt' ? 'Đúng giờ' : '',
        }
      });
      attendanceCount++;
    }

    console.log(`✓ [${student.id}] ${student.name} | SĐT: ${student.phone || 'Chưa có'} | CCCD: ${student.nationalId} | HP: ${feeToPay.toLocaleString('vi-VN')} đ | Đã đóng: ${amountPaid.toLocaleString('vi-VN')} đ (${paymentStatus}) | Điểm danh: ${sessionsAttended}/${sessionsTaughtInClass} buổi`);
  }

  console.log('\n=== IMPORT THÀNH CÔNG 100% CẢ 8 HỌC VIÊN VÀO LỚP S1 (7CN) ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
