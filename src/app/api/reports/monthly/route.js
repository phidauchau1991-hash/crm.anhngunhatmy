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
    const monthNum = parseInt(mm, 10);
    const yearNum = parseInt(yyyy, 10);
    if (isNaN(monthNum) || isNaN(yearNum)) {
      return NextResponse.json({ success: false, error: 'Định dạng tháng phải là MM/YYYY' }, { status: 400 });
    }

    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0) - 7 * 3600 * 1000);
    const endDate = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0) - 7 * 3600 * 1000);

    // 1. Lấy tất cả học viên đang học trong lớp (hỗ trợ cả lớp theo khóa lẫn lớp tháng)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        classCode,
        status: 'Đang học',
        student: { status: 'Đang học' },
      },
      include: {
        student: true,
      },
      orderBy: { id: 'asc' },
    });

    const studentIds = enrollments.map(e => e.studentId);

    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, students: [], diaries: [] });
    }

    // 2. Lấy dữ liệu điểm danh, bài tập & nhận xét tháng đã lưu trong CSDL
    const [attendances, savedReports] = await Promise.all([
      prisma.attendance.findMany({
        where: {
          studentId: { in: studentIds },
          classCode,
          date: { gte: startDate, lt: endDate },
        },
      }),
      prisma.monthlyAcademicReport.findMany({
        where: { classCode, monthYear },
      }),
    ]);

    const savedMap = new Map(savedReports.map(r => [r.studentId, r]));

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

      const saved = savedMap.get(enroll.studentId);

      return {
        id: enroll.studentId,
        name: enroll.student.name,
        stats: { present, absent, missingWb, missingVideo },
        teacherKeywords: saved?.teacherKeywords || '',
        aiComment: saved?.aiComment || '',
      };
    });

    // 3. Lấy Nhật ký giảng dạy chung của lớp (tránh lỗi trùng key JS)
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        classCode,
        date: { gte: startDate, lt: endDate },
        AND: [
          { classNotes: { not: null } },
          { classNotes: { not: '' } },
        ],
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

export async function POST(request) {
  try {
    const { studentId, classCode, monthYear, teacherKeywords, aiComment } = await request.json();
    if (!studentId || !classCode || !monthYear) {
      return NextResponse.json({ success: false, error: 'Thiếu studentId, classCode hoặc monthYear' }, { status: 400 });
    }

    const saved = await prisma.monthlyAcademicReport.upsert({
      where: {
        studentId_classCode_monthYear: {
          studentId,
          classCode,
          monthYear,
        },
      },
      update: {
        ...(teacherKeywords !== undefined ? { teacherKeywords } : {}),
        ...(aiComment !== undefined ? { aiComment } : {}),
      },
      create: {
        studentId,
        classCode,
        monthYear,
        teacherKeywords: teacherKeywords || '',
        aiComment: aiComment || '',
      },
    });

    try { await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)'); } catch (_) {}

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Lỗi lưu báo cáo học tập tháng:', error);
    return NextResponse.json({ success: false, error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
