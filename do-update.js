const fs = require('fs');
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

function getPastClassDates(startDate, schedule, count, holidays) {
  const dates = [];
  let currentDate = new Date(startDate || new Date());
  currentDate.setHours(0, 0, 0, 0);

  const targetDays = [];
  const schedStr = schedule || '2,4,6';
  if (schedStr.includes('2')) targetDays.push(1);
  if (schedStr.includes('3')) targetDays.push(2);
  if (schedStr.includes('4')) targetDays.push(3);
  if (schedStr.includes('5')) targetDays.push(4);
  if (schedStr.includes('6')) targetDays.push(5);
  if (schedStr.includes('7')) targetDays.push(6);
  if (schedStr.includes('8') || schedStr.includes('CN') || schedStr.toUpperCase().includes('C')) targetDays.push(0);

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

async function main() {
  const excelPath = 'd:/2. TÀI LIỆU LỖI THỜI/4. CRM NHẬT MỸ/File_Mau_Import_NhatMy. M3 24.xlsx';
  const buffer = fs.readFileSync(excelPath);
  const workbook = xlsx.read(buffer, { type: 'buffer' });

  // Parse Sheet "Lớp Học"
  const classSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('lớp') || n.toLowerCase().includes('class'));
  const classRows = classSheetName ? xlsx.utils.sheet_to_json(workbook.Sheets[classSheetName]) : [];

  // Parse Sheet "Học Viên"
  const studentSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('viên') || n.toLowerCase().includes('student'));
  const studentRows = xlsx.utils.sheet_to_json(workbook.Sheets[studentSheetName]);

  const holidays = await prisma.holiday.findMany();
  const now = new Date();
  const yearMonthPrefix = `${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

  const report = {
    classesUpdated: 0,
    studentsProcessed: 0,
    ordersUpdated: 0
  };

  await prisma.$transaction(async (tx) => {
    // 1. Process Classes
    const classMap = new Map();
    for (const row of classRows) {
      const code = row['Mã lớp']?.toString().trim();
      const level = row['Khóa học']?.toString().trim();
      const teacherName = row['Giáo viên']?.toString().trim();
      const startDateVal = row['Ngày khai giảng'];
      const schedule = row['Lịch học tuần']?.toString().trim();
      const sessionsTaught = parseInt(row['Số buổi đã học thực tế']) || 0;

      if (!code) continue;

      const startDate = parseExcelDate(startDateVal) || new Date();

      await tx.class.upsert({
        where: { code },
        update: {
          level: level || 'M3',
          teacherName: teacherName || 'MsMy',
          startDate,
          schedule: schedule || '2,4,6',
        },
        create: {
          code,
          level: level || 'M3',
          teacherName: teacherName || 'MsMy',
          startDate,
          schedule: schedule || '2,4,6',
          expectedEndDate: startDate,
        }
      });

      classMap.set(code, { startDate, schedule, sessionsTaught });
      report.classesUpdated++;
    }

    // 2. Process Students
    let serialOffset = 1;
    const latestStudent = await tx.student.findFirst({
      where: { id: { startsWith: `HV${yearMonthPrefix}_` } },
      orderBy: { id: 'desc' },
    });
    if (latestStudent) {
      const parts = latestStudent.id.split('_');
      if (parts.length === 2) {
        serialOffset = parseInt(parts[1]) + 1;
      }
    }

    for (const row of studentRows) {
      const name = row['Họ và Tên']?.toString().trim();
      if (!name) continue;

      let nationalId = row['CCCD / Định danh']?.toString().trim();
      let phone = row['Số điện thoại']?.toString().trim();
      if (phone === '0') phone = null;

      const dobVal = row['Ngày sinh'];
      const address = row['Địa chỉ']?.toString().trim();
      const classCode = row['Mã lớp xếp vào']?.toString().trim();
      const customFee = parseFloat(row['Học phí thỏa thuận']) || 0;
      const amountPaid = parseFloat(row['Số tiền đã đóng']) || 0;
      const sessionsAttended = parseInt(row['Số buổi đã đi học']) || 0;

      if (!nationalId || nationalId === '0') {
        nationalId = `KDD_${yearMonthPrefix}_${String(serialOffset).padStart(3, '0')}`;
      }

      const dob = parseExcelDate(dobVal);

      // Find existing student
      let existingStudent = await tx.student.findFirst({
        where: {
          OR: [
            { name: name },
            { nationalId: nationalId },
            ...(phone ? [{ phone: phone }] : [])
          ]
        }
      });

      let studentId;
      if (existingStudent) {
        studentId = existingStudent.id;
        await tx.student.update({
          where: { id: studentId },
          data: {
            phone: phone || existingStudent.phone,
            dob: dob || existingStudent.dob,
            address: address || existingStudent.address,
            nationalId: nationalId || existingStudent.nationalId
          }
        });
      } else {
        studentId = `HV${yearMonthPrefix}_${String(serialOffset).padStart(3, '0')}`;
        serialOffset++;

        await tx.student.create({
          data: {
            id: studentId,
            name,
            phone: phone || null,
            dob,
            address: address || null,
            nationalId,
            status: 'Đang học',
            specialPolicyType: 'Không giảm',
            specialPolicyValue: 0,
            specialPolicy: 'Không',
            referralCode: studentId,
          }
        });
      }
      report.studentsProcessed++;

      // Enrollment & OrderFinance
      if (classCode) {
        const existingEnrollment = await tx.enrollment.findFirst({
          where: { studentId, classCode }
        });

        if (!existingEnrollment) {
          await tx.enrollment.create({
            data: { studentId, classCode }
          });
        }

        const feeToPay = customFee > 0 ? customFee : 3250000;
        const paymentStatus = amountPaid >= feeToPay ? 'Đã đóng' : (amountPaid > 0 ? 'Chưa đóng đủ' : 'Chưa đóng');

        const orderId = `ORD_IMP_${studentId.replace(/[^a-zA-Z0-9]/g, '')}`;

        // Upsert order by finding order for student and classCode, or creating unique orderId
        const existingOrder = await tx.orderFinance.findFirst({
          where: { studentId, classCode }
        });

        if (existingOrder) {
          await tx.orderFinance.update({
            where: { id: existingOrder.id },
            data: {
              feeToPay,
              amountPaid,
              paymentStatus,
              promoType: customFee > 0 ? 'Học phí thỏa thuận' : 'Tiêu chuẩn',
            }
          });
        } else {
          await tx.orderFinance.create({
            data: {
              id: orderId,
              studentId,
              classCode,
              promoType: customFee > 0 ? 'Học phí thỏa thuận' : 'Tiêu chuẩn',
              promoDiscount: 0,
              feeToPay,
              amountPaid,
              paymentStatus,
              paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
            }
          });
        }
        report.ordersUpdated++;

        // Attendance history update if classMeta or sessionsAttended > 0
        const classMeta = classMap.get(classCode) || { startDate: new Date('2024-01-01'), schedule: '2,4,6', sessionsTaught: sessionsAttended };
        const sessionsToGenerate = Math.max(classMeta.sessionsTaught, sessionsAttended);
        if (sessionsToGenerate > 0) {
          const pastDates = getPastClassDates(classMeta.startDate, classMeta.schedule, sessionsToGenerate, holidays);
          for (let i = 0; i < pastDates.length; i++) {
            const attendDate = pastDates[i];
            const status = i < sessionsAttended ? 'Có mặt' : 'Vắng có phép';

            await tx.attendance.upsert({
              where: {
                studentId_classCode_date: {
                  studentId,
                  classCode,
                  date: attendDate
                }
              },
              update: { status },
              create: {
                studentId,
                classCode,
                date: attendDate,
                status,
                teacherNotes: 'Cập nhật từ Excel',
                checkInTime: status === 'Có mặt' ? 'Đúng giờ' : '',
              }
            });
          }
        }
      }
    }
  });

  console.log('Update result:', JSON.stringify(report, null, 2));
}

main()
  .then(() => console.log('Successfully updated CRM database from Excel!'))
  .catch(err => console.error('Error updating CRM database:', err))
  .finally(() => prisma.$disconnect());
