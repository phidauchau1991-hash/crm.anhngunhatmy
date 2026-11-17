import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// POST: Điểm danh & Đánh giá hàng loạt cho nhiều học viên trong cùng 1 buổi/nhóm phụ đạo
export async function POST(request) {
  try {
    const body = await request.json();
    const { records } = body; // Array of { sessionId, attendanceStatus, evaluation, evaluationNotes, homeworkAssigned }

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu danh sách điểm danh buổi phụ đạo' }, { status: 400 });
    }

    const sessionIds = records.map((r) => r.sessionId).filter(Boolean);
    const existingSessions = await prisma.tutoringSession.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, planId: true },
    });

    if (existingSessions.length === 0) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy buổi phụ đạo hợp lệ' }, { status: 404 });
    }

    const planIdsToRefresh = new Set(existingSessions.map((s) => s.planId));

    const updatedCount = await prisma.$transaction(async (tx) => {
      let count = 0;
      const now = new Date();

      for (const r of records) {
        if (!r.sessionId) continue;
        await tx.tutoringSession.update({
          where: { id: r.sessionId },
          data: {
            status: 'COMPLETED',
            attendanceStatus: r.attendanceStatus || 'Có mặt',
            evaluation: r.evaluation || 'Tốt',
            evaluationNotes: r.evaluationNotes || null,
            homeworkAssigned: r.homeworkAssigned || null,
            completedAt: now,
          },
        });
        count++;
      }

      for (const planId of planIdsToRefresh) {
        const planSessions = await tx.tutoringSession.findMany({
          where: { planId },
          select: { status: true },
        });
        const hasScheduled = planSessions.some((s) => s.status === 'SCHEDULED');
        await tx.tutoringPlan.update({
          where: { id: planId },
          data: { status: hasScheduled ? 'IN_PROGRESS' : 'COMPLETED' },
        });
      }

      return count;
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Đã điểm danh & đánh giá ${updatedCount} học viên thành công`,
    });
  } catch (error) {
    console.error('Lỗi điểm danh nhóm phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
