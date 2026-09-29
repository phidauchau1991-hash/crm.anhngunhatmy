import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const monthYear = searchParams.get('monthYear');
    const classCode = searchParams.get('classCode');

    if (!monthYear || !classCode) {
      return NextResponse.json({ success: false, error: 'Thiếu tham số' }, { status: 400 });
    }

    const [mm, yyyy] = monthYear.split('/');
    const startDate = new Date(parseInt(yyyy, 10), parseInt(mm, 10) - 1, 1);
    const endDate = new Date(parseInt(yyyy, 10), parseInt(mm, 10), 1);

    // 1. Lấy danh sách học viên tháng trong lớp
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classCode,
        billingType: { in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'] },
      },
      include: {
        student: true,
      },
    });

    const studentIds = enrollments.map(e => e.studentId);

    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, students: [], diaries: [] });
    }

    // 2. Lấy dữ liệu điểm danh và bài tập
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        classCode,
        date: { gte: startDate, lt: endDate },
      },
    });

    // Gom dữ liệu cho từng học viên
    const studentsData = enrollments.map(enroll => {
      const studentAtt = attendances.filter(a => a.studentId === enroll.studentId);
      
      let present = 0;
      let absent = 0;
      let missingWb = 0;
      let missingVideo = 0;

      studentAtt.forEach(a => {
        if (a.status === 'Có mặt' || a.status === 'Đi trễ') present++;
        else if (a.status?.includes('Vắng')) absent++;

        if (a.missingWb) missingWb++;
        if (a.missingVideo) missingVideo++;
      });

      return {
        id: enroll.studentId,
        name: enroll.student.name,
        stats: { present, absent, missingWb, missingVideo }
      };
    });

    // 3. Lấy Nhật ký giảng dạy chung của lớp
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        classCode,
        date: { gte: startDate, lt: endDate },
        classNotes: { not: null, not: '' }
      },
      orderBy: { date: 'asc' },
      select: { date: true, classNotes: true }
    });

    return NextResponse.json({
      success: true,
      students: studentsData,
      diaries: summaries
    });

  } catch (error) {
    console.error('Lỗi lấy báo cáo tháng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
