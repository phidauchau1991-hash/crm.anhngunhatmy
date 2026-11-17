import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // 1. Đếm số buổi theo trạng thái (gom nhóm các buổi dùng chung groupCode + sessionNumber để đếm đúng số buổi tổ chức thực tế)
    const allSessions = await prisma.tutoringSession.findMany({
      select: {
        id: true,
        status: true,
        sessionNumber: true,
        teachingDate: true,
        plan: { select: { id: true, groupCode: true } },
      },
    });

    const distinctBuckets = new Map();
    for (const s of allSessions) {
      const batchKey = s.plan?.groupCode
        ? `${s.plan.groupCode}|${s.sessionNumber}|${s.teachingDate}`
        : `${s.plan?.id}|${s.id}`;
      const existing = distinctBuckets.get(batchKey);
      if (!existing) {
        distinctBuckets.set(batchKey, s.status);
      } else if (existing !== 'COMPLETED' && s.status === 'COMPLETED') {
        distinctBuckets.set(batchKey, 'COMPLETED');
      } else if (existing === 'CANCELLED' && s.status === 'SCHEDULED') {
        distinctBuckets.set(batchKey, 'SCHEDULED');
      }
    }

    let scheduledSessions = 0;
    let completedSessions = 0;
    let cancelledSessions = 0;
    for (const st of distinctBuckets.values()) {
      if (st === 'SCHEDULED') scheduledSessions++;
      else if (st === 'COMPLETED') completedSessions++;
      else if (st === 'CANCELLED') cancelledSessions++;
    }

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
      where: {
        status: 'Đang học',
        student: { status: 'Đang học' },
      },
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
