const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

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

// Simple end date calculation helper for class
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
  const filePath = 'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ\\File_Mau_Import_NhatMy. M3 24.xlsx';
  const workbook = xlsx.readFile(filePath);

  // 1. Get Class Sheet & Student Sheet
  const classSheet = workbook.Sheets['Lớp Học'];
  const studentSheet = workbook.Sheets['Học Viên'];

  const classRows = xlsx.utils.sheet_to_json(classSheet);
  const studentRows = xlsx.utils.sheet_to_json(studentSheet);

  console.log('--- STARTING M1 CLASS & STUDENT IMPORT ---');

  // Find M1 class row
  const m1ClassRow = classRows.find(r => {
    const code = (r['Mã lớp'] || '').toString();
    const level = (r['Khóa học'] || '').toString();
    return code.includes('M1') || level === 'M1';
  });

  if (!m1ClassRow) {
    console.error('Không tìm thấy thông tin Lớp M1 trong sheet "Lớp Học"!');
    return;
  }

  const classCode = m1ClassRow['Mã lớp']?.toString().trim();
  const level = m1ClassRow['Khóa học']?.toString().trim();
  const teacherName = m1ClassRow['Giáo viên']?.toString().trim();
  const startDateVal = m1ClassRow['Ngày khai giảng'];
  const schedule = m1ClassRow['Lịch học tuần']?.toString().trim();
  const sessionsTaught = parseInt(m1ClassRow['Số buổi đã học thực tế']) || 0;

  const startDate = parseExcelDate(startDateVal);

  const courseConfig = await prisma.courseConfig.findUnique({ where: { level } });
  const totalSessions = courseConfig ? courseConfig.totalSessions : 32;
  const expectedEndDate = calculateExpectedEndDate(startDate, schedule, totalSessions);

  // Create or Update M1 Class
  const createdClass = await prisma.class.upsert({
    where: { code: classCode },
    update: {
      level,
      teacherName,
      startDate,
      schedule,
      expectedEndDate,
    },
    create: {
      code: classCode,
      level,
      teacherName,
      startDate,
      schedule,
      expectedEndDate,
    }
  });

  console.log(`✓ Cập nhật/Tạo Lớp học M1 thành công: ${createdClass.code} (Khai giảng: ${startDate.toLocaleDateString('vi-VN')}, Ca: ${schedule}, Lịch dạy: ${teacherName})`);

  // Filter student rows for M1
  const m1StudentsInExcel = studentRows.filter(r => (r['Mã lớp xếp vào'] || '').toString().trim() === classCode);

  console.log(`\nTổng số học viên lớp M1 trong file Excel: ${m1StudentsInExcel.length}`);

  let importedCount = 0;
  let skippedCount = 0;
  const skippedDetails = [];

  for (const row of m1StudentsInExcel) {
    const name = row['Họ và Tên']?.toString().trim();
    let phone = row['Số điện thoại']?.toString().trim();
    if (phone === '0' || phone === 'undefined' || !phone) {
      phone = null;
    }

    // CHECK PHONE NUMBER REQUIREMENT ("những ba mẹ chưa có SĐT hãy bỏ qua")
    if (!phone) {
      skippedCount++;
      skippedDetails.push({ name, reason: 'Chưa có / Thiếu số điện thoại' });
      continue;
    }

    // If phone exists, proceed with student import logic
    const nationalId = row['CCCD / Định danh']?.toString().trim() || null;
    const dob = parseExcelDate(row['Ngày sinh']);
    const address = row['Địa chỉ']?.toString().trim();

    // Check existing
    let existingStudent = await prisma.student.findFirst({
      where: {
        OR: [
          ...(nationalId ? [{ nationalId }] : []),
          { phone },
          { name }
        ]
      }
    });

    let studentId;
    if (existingStudent) {
      studentId = existingStudent.id;
    } else {
      const now = new Date();
      const prefix = `HV${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const count = await prisma.student.count();
      studentId = `${prefix}_${String(count + 1).padStart(3, '0')}`;

      await prisma.student.create({
        data: {
          id: studentId,
          name,
          phone,
          dob,
          address,
          nationalId,
          status: 'Đang học',
        }
      });
    }

    // Enroll in class M1
    await prisma.enrollment.upsert({
      where: {
        id: (await prisma.enrollment.findFirst({ where: { studentId, classCode } }))?.id || 0
      },
      update: {},
      create: {
        studentId,
        classCode
      }
    });

    importedCount++;
    console.log(`✓ Đã nhập học viên: ${name} (${phone}) vào lớp ${classCode}`);
  }

  console.log('\n--- KẾT QUẢ IMPORT HỌC VIÊN LỚP M1 ---');
  console.log(`• Số học viên hợp lệ đã cập nhật lên CRM: ${importedCount}`);
  console.log(`• Số học viên bị bỏ qua do chưa có SĐT: ${skippedCount}`);
  if (skippedDetails.length > 0) {
    console.log('Chi tiết các học viên bị bỏ qua:');
    skippedDetails.forEach((item, idx) => console.log(`  ${idx + 1}. ${item.name} (${item.reason})`));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
