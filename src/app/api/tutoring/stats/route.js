import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // 1. Đếm số buổi theo trạng thái của TutoringSession
    const [scheduledSessions, completedSessions, cancelledSessions, totalSessions] = await Promise.all([
      prisma.tutoringSession.count({ where: { status: 'SCHEDULED' } }),
      prisma.tutoringSession.count({ where: { status: 'COMPLETED' } }),
      prisma.tutoringSession.count({ where: { status: 'CANCELLED' } }),
      prisma.tutoringSession.count()
    ]);

    // 2. Tính số học viên cảnh báo cần phụ đạo (chưa được lên lịch)
    const dismissedRecords = await prisma.tutoringAlertDismissal.findMany();
    const dismissedSet = new Set(dismissedRecords.map(d => `${d.studentId}|${d.alertKey}`));

    const activePlans = await prisma.tutoringPlan.findMany({
      where: { status: { in: ['SCHEDULED', 'IN_PROGRESS'] } },
      select: { studentId: true, classCode: true }
    });
    const scheduledStudentSet = new Set(activePlans.map(p => `${p.studentId}|${p.classCode || ''}`));

    let config = await prisma.alertConfig.findFirst();
    const consecutiveLimit = config?.consecutiveAbsences || 2;

    const enrollments = await prisma.enrollment.findMany({
      where: { status: 'Đang học' },
      select: { studentId: true, classCode: true }
    });

    const attendances = await prisma.attendance.findMany({
      orderBy: { date: 'desc' }
    });

    let alertCount = 0;

    for (const enr of enrollments) {
      if (scheduledStudentSet.has(`${enr.studentId}|${enr.classCode}`) || scheduledStudentSet.has(`${enr.studentId}|`)) {
        continue;
      }

      const studentAtts = attendances.filter(a => a.studentId === enr.studentId && a.classCode === enr.classCode);
      if (studentAtts.length === 0) continue;

      let consecutiveAbsences = 0;
      for (const a of studentAtts) {
        if (a.status === 'Chưa điểm danh') continue;
        if (a.status === 'Vắng không phép' || a.status === 'Vắng có phép') {
          consecutiveAbsences++;
        } else if (a.status === 'Có mặt') {
          break;
        }
      }

      if (consecutiveAbsences >= consecutiveLimit) {
        const alertKey = `att_consecutive_${consecutiveAbsences}`;
        if (!dismissedSet.has(`${enr.studentId}|${alertKey}`)) {
          alertCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        alertCount, // Cảnh báo Cần Phụ Đạo
        scheduledCount: scheduledSessions, // Đang Lên Lịch (Chờ học)
        completedCount: completedSessions, // Đã Hoàn Thành
        totalCount: scheduledSessions + completedSessions, // Tổng Số Buổi Tổ Chức
        cancelledCount: cancelledSessions, // Số buổi đã hủy
        scheduledStudentsCount: activePlans.length // Số học viên đã được lên lịch
      }
    });
  } catch (error) {
    console.error('Lỗi tính thống kê phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
