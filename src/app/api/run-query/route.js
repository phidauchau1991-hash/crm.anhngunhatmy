import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const dobs = {
      // M3
      'PHAN ĐAN LINH': '2016-08-05',
      'THÁI HOÀNG ÁNH DƯƠNG': '2017-09-06',
      'TRẦN MINH HẰNG': '2016-02-23',
      'NGUYỄN GIA BẢO': '2015-04-27',
      'VÒNG PHÚ VĨNH': '2015-01-28',
      'LÊ TRẦN NGUYÊN DƯƠNG': '2015-07-18',
      'TRỊNH THỊ HUYỀN TRANG': '2015-08-18',
      // M2
      'NGUYỄN PHÚC LÂM': '2018-03-03',
      'CHÂU NHẬT TRƯỜNG': '2020-07-15',
      'HOÀNG TRỊNH NHƯ Ý': '2018-01-19',
      'ĐINH HOÀNG THỊNH': '2017-08-26',
      'LÊ THỊ XUÂN THƯƠNG': '2016-05-09',
      'NGUYỄN NHÂN NGHĨA': '2016-10-11',
      'NGUYỄN NGỌC BẢO TRÂN': '2016-08-26',
      'NGUYỄN ĐÌNH BẢO': '2016-11-17',
      'DANH NGỌC THẢO UYÊN': '2014-05-29',
      'NGUYỄN VỊ ANH VĂN': '2016-07-31'
    };

    // 1 & 2. Update DOBs
    for (const [name, dateStr] of Object.entries(dobs)) {
      const dobDate = new Date(`${dateStr}T00:00:00.000Z`);
      await prisma.student.updateMany({
        where: { name: name },
        data: { dob: dobDate }
      });
    }

    // 3. Fix nationalId formatting for ALL students
    const allStudents = await prisma.student.findMany({
      where: { nationalId: { not: null } }
    });

    for (const student of allStudents) {
      if (student.nationalId && /^[1-9][0-9]*$/.test(student.nationalId)) {
        await prisma.student.update({
          where: { id: student.id },
          data: { nationalId: '0' + student.nationalId }
        });
      }
    }

    // 4. Mark attendance for M3 class
    // M3 class is 'CN1_M3_MsMy_24_01'
    const m3ClassCode = 'CN1_M3_MsMy_24_01';
    
    // Find all students in M3
    const m3Enrollments = await prisma.enrollment.findMany({
      where: { classCode: m3ClassCode }
    });

    const datesToMark = [
      new Date('2026-07-27T00:00:00.000Z'),
      new Date('2026-07-29T00:00:00.000Z')
    ];

    let createdAttendances = 0;
    for (const enrollment of m3Enrollments) {
      for (const date of datesToMark) {
        // Check if exists
        const existing = await prisma.attendance.findUnique({
          where: {
            studentId_classCode_date: {
              studentId: enrollment.studentId,
              classCode: m3ClassCode,
              date: date
            }
          }
        });
        
        if (!existing) {
          await prisma.attendance.create({
            data: {
              studentId: enrollment.studentId,
              classCode: m3ClassCode,
              date: date,
              status: 'Có mặt',
              checkInTime: 'Đúng giờ'
            }
          });
          createdAttendances++;
        }
      }
    }

    return NextResponse.json({ success: true, createdAttendances });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
