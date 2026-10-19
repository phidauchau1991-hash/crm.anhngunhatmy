import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const {
      attendanceStatus, // "Có mặt", "Đi trễ", "Vắng mặt"
      evaluation,       // "Xuất sắc", "Tốt", "Trung bình", "Cần cố gắng"
      evaluationNotes,  // Nhận xét chi tiết
      homeworkAssigned  // Bài tập về nhà
    } = body;

    const existing = await prisma.tutoringSession.findUnique({
      where: { id: sessionId },
      include: { plan: { include: { sessions: true } } }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy buổi phụ đạo' }, { status: 404 });
    }

    const updatedSession = await prisma.$transaction(async (tx) => {
      // 1. Cập nhật trạng thái buổi học
      const session = await tx.tutoringSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          attendanceStatus: attendanceStatus || 'Có mặt',
          evaluation: evaluation || 'Tốt',
          evaluationNotes: evaluationNotes || null,
          homeworkAssigned: homeworkAssigned || null,
          completedAt: new Date()
        }
      });

      // 2. Kiểm tra các buổi còn lại trong đợt
      const allSessions = await tx.tutoringSession.findMany({
        where: { planId: existing.planId }
      });

      const remainingScheduled = allSessions.filter(s => s.status === 'SCHEDULED' && s.id !== sessionId);

      let newPlanStatus = 'COMPLETED';
      if (remainingScheduled.length > 0) {
        newPlanStatus = 'IN_PROGRESS';
      }

      await tx.tutoringPlan.update({
        where: { id: existing.planId },
        data: { status: newPlanStatus }
      });

      return session;
    });

    return NextResponse.json({ success: true, data: updatedSession });
  } catch (error) {
    console.error('Lỗi hoàn thành buổi phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
