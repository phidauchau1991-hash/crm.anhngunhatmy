import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET: Chi tiết 1 đợt phụ đạo
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const plan = await prisma.tutoringPlan.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
        teacher: true,
        sessions: { orderBy: { sessionNumber: 'asc' } }
      }
    });

    if (!plan) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đợt phụ đạo' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('Lỗi lấy chi tiết phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH: Cập nhật thông tin đợt phụ đạo
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      sessionType,
      focusSkills,
      content,
      instructions,
      teacherId,
      tutorName,
      status,
      sessions // danh sách buổi cập nhật nếu có
    } = body;

    const existing = await prisma.tutoringPlan.findUnique({
      where: { id },
      include: { sessions: true }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đợt phụ đạo' }, { status: 404 });
    }

    let finalTutorName = tutorName;
    if (teacherId && teacherId !== existing.teacherId) {
      const user = await prisma.user.findUnique({ where: { id: teacherId } });
      if (user) {
        finalTutorName = user.shortName || user.fullName;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Cập nhật thông tin chính của plan
      const plan = await tx.tutoringPlan.update({
        where: { id },
        data: {
          sessionType: sessionType !== undefined ? sessionType : existing.sessionType,
          focusSkills: focusSkills !== undefined ? focusSkills : existing.focusSkills,
          content: content !== undefined ? content : existing.content,
          instructions: instructions !== undefined ? instructions : existing.instructions,
          teacherId: teacherId !== undefined ? teacherId : existing.teacherId,
          tutorName: finalTutorName !== undefined ? finalTutorName : existing.tutorName,
          status: status !== undefined ? status : existing.status,
          totalSessions: sessions && Array.isArray(sessions) ? sessions.length : existing.totalSessions
        }
      });

      // Nếu có cập nhật danh sách buổi
      if (sessions && Array.isArray(sessions) && sessions.length > 0) {
        // Xóa các buổi cũ của plan chưa hoàn thành và tạo lại theo danh sách mới
        // (chỉ cập nhật hoặc tạo mới, giữ nguyên buổi đã completed)
        for (let i = 0; i < sessions.length; i++) {
          const s = sessions[i];
          if (s.id) {
            // Update buổi đã có
            await tx.tutoringSession.update({
              where: { id: s.id },
              data: {
                sessionNumber: i + 1,
                teachingDate: s.teachingDate,
                startTimeText: s.startTimeText,
                endTimeText: s.endTimeText,
                roomName: s.roomName || 'Phòng học tại trung tâm',
                notes: s.notes || null,
                status: s.status || 'SCHEDULED'
              }
            });
          } else {
            // Tạo mới buổi được thêm thêm vào
            await tx.tutoringSession.create({
              data: {
                planId: id,
                sessionNumber: i + 1,
                teachingDate: s.teachingDate,
                startTimeText: s.startTimeText || '16:30',
                endTimeText: s.endTimeText || '17:30',
                roomName: s.roomName || 'Phòng học tại trung tâm',
                notes: s.notes || null,
                status: 'SCHEDULED'
              }
            });
          }
        }
      }

      return await tx.tutoringPlan.findUnique({
        where: { id },
        include: {
          student: true,
          class: true,
          teacher: true,
          sessions: { orderBy: { sessionNumber: 'asc' } }
        }
      });
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Lỗi cập nhật phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hủy đợt phụ đạo (Soft cancel)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await prisma.tutoringPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đợt phụ đạo' }, { status: 404 });
    }

    // Soft-cancel: cập nhật plan và các session còn SCHEDULED sang CANCELLED
    await prisma.$transaction([
      prisma.tutoringPlan.update({
        where: { id },
        data: { status: 'CANCELLED' }
      }),
      prisma.tutoringSession.updateMany({
        where: { planId: id, status: 'SCHEDULED' },
        data: { status: 'CANCELLED' }
      })
    ]);

    return NextResponse.json({ success: true, message: 'Đã hủy đợt phụ đạo thành công' });
  } catch (error) {
    console.error('Lỗi hủy phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
