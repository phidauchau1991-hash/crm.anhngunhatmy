import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const monthYear = searchParams.get('monthYear');
  if (!monthYear) {
    return NextResponse.json({ error: 'Thiếu tham số monthYear' }, { status: 400 });
  }

  const [mm, yyyy] = monthYear.split('/');
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  try {
    // Get all enrollments for monthly billing
    const enrollments = await prisma.enrollment.findMany({
      where: {
        billingType: { in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'] },
      },
      include: {
        student: true,
        class: true,
      },
    });

    const studentIds = enrollments.map(e => e.studentId);
    const classCodes = enrollments.map(e => e.classCode);

    // Get attendance for these students in this month
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        classCode: { in: classCodes },
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    return NextResponse.json({ enrollments, attendances });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { studentId, classCode, date, status } = await request.json();
    
    // date is YYYY-MM-DD
    const dateObj = new Date(date);

    if (status === 'Trống' || status === '') {
      await prisma.attendance.deleteMany({
        where: {
          studentId,
          classCode,
          date: dateObj,
        }
      });
      return NextResponse.json({ success: true, status: 'Trống' });
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_classCode_date: {
          studentId,
          classCode,
          date: dateObj,
        }
      },
      update: {
        status,
      },
      create: {
        studentId,
        classCode,
        date: dateObj,
        status,
      }
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
