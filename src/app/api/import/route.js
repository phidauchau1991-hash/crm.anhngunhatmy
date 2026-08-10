import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as xlsx from 'xlsx';
import { recalculateClassEndDate } from '@/lib/holidayHelpers';

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

// Helper to slugify and parse date string
function parseExcelDate(val) {
  if (!val) return null;
  // If it's a number (Excel date code)
  if (typeof val === 'number') {
    return new Date((val - 25569) * 86400 * 1000);
  }
  // Try DD/MM/YYYY
  const parts = val.toString().split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(val);
}

// Helper to compute calendar dates for past N sessions
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

export async function POST(request) {
  try {
    const data = await request.formData();
    const file = data.get('file');

    if (!file) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy file tải lên' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = xlsx.read(buffer, { type: 'buffer' });

    // 1. Parse Sheet "Lớp Học"
    const classSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('lớp') || n.toLowerCase().includes('class'));
    if (!classSheetName) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy Sheet "Lớp Học"' }, { status: 400 });
    }
    const classRows = xlsx.utils.sheet_to_json(workbook.Sheets[classSheetName]);

    // 2. Parse Sheet "Học Viên"
    const studentSheetName = workbook.SheetNames.find(n => n.toLowerCase().includes('viên') || n.toLowerCase().includes('hoc vien') || n.toLowerCase().includes('student'));
    if (!studentSheetName) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy Sheet "Học Viên"' }, { status: 400 });
    }
    const studentRows = xlsx.utils.sheet_to_json(workbook.Sheets[studentSheetName]);

    const holidays = await prisma.holiday.findMany();
    const now = new Date();
    const yearMonthPrefix = `${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

    const report = {
      classesImported: 0,
      studentsImported: 0,
      errors: []
    };

    // Chạy tuần tự trong transaction
    await prisma.$transaction(async (tx) => {
      // --- IMPORT LỚP HỌC ---
      const classMap = new Map(); // Lưu số buổi đã học của lớp
      for (const row of classRows) {
        const code = row['Mã lớp']?.toString().trim();
        const level = row['Khóa học']?.toString().trim();
        const teacherName = row['Giáo viên']?.toString().trim();
        const startDateVal = row['Ngày khai giảng'];
        const schedule = row['Lịch học tuần']?.toString().trim();
        const sessionsTaught = parseInt(row['Số buổi đã học thực tế']) || 0;

        if (!code || !level || !startDateVal || !schedule) {
          throw new Error(`Dòng lớp học thiếu thông tin bắt buộc (Mã lớp, Khóa học, Ngày khai giảng hoặc Lịch học)`);
        }

        const startDate = parseExcelDate(startDateVal);
        if (!startDate || isNaN(startDate.getTime())) {
          throw new Error(`Lớp ${code}: Ngày khai giảng không hợp lệ.`);
        }

        // Kiểm tra Level tồn tại trong CourseConfig
        const config = await tx.courseConfig.findUnique({ where: { level } });
        if (!config) {
          throw new Error(`Khóa học "${level}" của lớp ${code} không tồn tại trong cấu hình hệ thống.`);
        }

        // Tạo hoặc cập nhật Lớp học
        // Bắt đầu với expectedEndDate tạm thời, sau đó recalculate
        await tx.class.upsert({
          where: { code },
          update: {
            level,
            teacherName,
            startDate,
            schedule,
            expectedEndDate: startDate, // Tạm thời
          },
          create: {
            code,
            level,
            teacherName,
            startDate,
            schedule,
            expectedEndDate: startDate, // Tạm thời
          }
        });

        classMap.set(code, { startDate, schedule, sessionsTaught });
        report.classesImported++;
      }

      // --- IMPORT HỌC VIÊN ---
      // Tải danh sách học viên hiện tại để tránh trùng mã số sinh tự động
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
        let nationalId = row['CCCD / Định danh']?.toString().trim();
        let phone = formatPhone(row['Số điện thoại']);

        const dobVal = row['Ngày sinh'];
        const address = row['Địa chỉ']?.toString().trim();
        const classCode = row['Mã lớp xếp vào']?.toString().trim();
        const customFee = parseFloat(row['Học phí thỏa thuận']) || 0;
        const amountPaid = parseFloat(row['Số tiền đã đóng']) || 0;
        const sessionsAttended = parseInt(row['Số buổi đã đi học']) || 0;

        if (!name) {
          throw new Error(`Dòng học viên thiếu Họ và Tên bắt buộc`);
        }

        const hasValidNationalId = nationalId && nationalId !== '0' && !nationalId.startsWith('KDD_');

        if (!nationalId || nationalId === '0') {
          nationalId = `KDD_${yearMonthPrefix}_${String(serialOffset).padStart(3, '0')}`;
        }

        const dob = parseExcelDate(dobVal);

        // Tránh lầm tưởng 2 anh em chung SĐT bố mẹ là 1 người -> Phải trùng CCCD hợp lệ hoặc trùng (Tên + SĐT)
        let existingStudent = await tx.student.findFirst({
          where: {
            OR: [
              ...(hasValidNationalId ? [{ nationalId: nationalId }] : []),
              {
                AND: [
                  { name: name },
                  ...(phone ? [{ phone: phone }] : [])
                ]
              }
            ]
          }
        });

        let studentId;
        if (existingStudent) {
          studentId = existingStudent.id;
          report.studentsSkipped++;
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
          report.studentsImported++;
        }

        // Xếp lớp và tính toán hóa đơn
        if (classCode && classCode !== 'none' && classMap.has(classCode)) {
          const classMeta = classMap.get(classCode);

          // Kiểm tra xem đã xếp lớp chưa
          const existingEnrollment = await tx.enrollment.findFirst({
            where: { studentId, classCode }
          });

          if (!existingEnrollment) {
            await tx.enrollment.create({
              data: { studentId, classCode }
            });

            // Lấy cấu hình khóa học để tính toán
            const classInfo = await tx.class.findUnique({ where: { code: classCode } });
            const courseConfig = await tx.courseConfig.findUnique({ where: { level: classInfo.level } });

            // Tính học phí khấu trừ
            const totalSessions = courseConfig.totalSessions;
            const sessionsRemaining = Math.max(0, totalSessions - classMeta.sessionsTaught);
            const costPerSession = courseConfig.price / totalSessions;
            const rawProRated = costPerSession * sessionsRemaining;
            const proRatedTuition = Math.floor(rawProRated / 10000) * 10000;

            const feeToPay = customFee > 0 ? customFee : proRatedTuition;
            const paymentStatus = amountPaid >= feeToPay ? 'Đã đóng' : (amountPaid > 0 ? 'Chưa đóng đủ' : 'Chưa đóng');

            // Tạo hóa đơn
            const orderId = `ORD_IMP_${yearMonthPrefix}_${studentId.split('_')[1]}`;
            await tx.orderFinance.upsert({
              where: { id: orderId },
              update: { feeToPay, amountPaid, paymentStatus },
              create: {
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

            // Sinh dữ liệu Lịch sử điểm danh (Placeholder) cho N buổi đã học
            if (classMeta.sessionsTaught > 0) {
              const pastDates = getPastClassDates(classMeta.startDate, classMeta.schedule, classMeta.sessionsTaught, holidays);
              
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
                    teacherNotes: 'Import lịch sử từ Excel',
                    checkInTime: status === 'Có mặt' ? 'Đúng giờ' : '',
                  }
                });
              }
            }
          }
        }
      }

      // --- CẬP NHẬT EXPECTED END DATE CHO CÁC LỚP HỌC VỪA IMPORT ---
      for (const code of classMap.keys()) {
        await recalculateClassEndDate(code, tx);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Nhập dữ liệu thành công! Tạo ${report.classesImported} lớp, thêm ${report.studentsImported} học viên mới, bỏ qua ${report.studentsSkipped} học viên đã tồn tại.`, 
      data: report 
    });
  } catch (error) {
    console.error('Lỗi khi import Excel:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
