import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

async function getNextGroupOrPlanCode(tx, field, prefix) {
  const latest = await tx.tutoringPlan.findFirst({
    where: { [field]: { startsWith: prefix } },
    orderBy: { [field]: 'desc' },
    select: { [field]: true },
  });
  let nextNum = 1;
  if (latest && latest[field]) {
    const parts = String(latest[field]).split('_');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }
  return nextNum;
}

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
        sessions: { orderBy: { sessionNumber: 'asc' } },
      },
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

// PATCH: Cập nhật thông tin 1 đợt phụ đạo hoặc đồng bộ cả nhóm (cập nhật buổi, thêm/bớt học viên)
export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      classCode,
      sessionType,
      focusSkills,
      content,
      instructions,
      teacherId,
      tutorName,
      status,
      sessions,
      applyToGroup = false,
      participants, // Optional: [{ studentId, classCode }] khi sửa danh sách HV của đợt/nhóm
    } = body;

    const existing = await prisma.tutoringPlan.findUnique({
      where: { id },
      include: { sessions: { orderBy: { sessionNumber: 'asc' } } },
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

    const vnToday = vnDateFormatter.format(new Date());
    const [yyyy, mm] = vnToday.split('-');
    const yy = yyyy.slice(-2);

    const updatedPlans = await prisma.$transaction(async (tx) => {
      // Xác định danh sách plan mục tiêu (1 plan hoặc cả nhóm)
      let targetPlans = [existing];
      if (applyToGroup && existing.groupCode) {
        targetPlans = await tx.tutoringPlan.findMany({
          where: { groupCode: existing.groupCode, status: { not: 'CANCELLED' } },
          include: { sessions: { orderBy: { sessionNumber: 'asc' } } },
        });
      }

      // Nếu có danh sách participants mới (thêm/bớt học viên hoặc nâng từ 1 bạn -> nhóm nhiều bạn)
      let activeGroupCode = existing.groupCode;
      if (Array.isArray(participants) && participants.length > 0) {
        const dedup = new Map();
        for (const p of participants) {
          if (p?.studentId && !dedup.has(p.studentId)) {
            dedup.set(p.studentId, { studentId: p.studentId, classCode: p.classCode || null });
          }
        }
        const desiredList = Array.from(dedup.values());

        if (desiredList.length > 1 && !activeGroupCode) {
          const grpPrefix = `NH${yy}${mm}_`;
          const nextGrp = await getNextGroupOrPlanCode(tx, 'groupCode', grpPrefix);
          activeGroupCode = `${grpPrefix}${String(nextGrp).padStart(3, '0')}`;
        }

        const existingByStudent = new Map(targetPlans.map((tp) => [tp.studentId, tp]));
        const desiredStudentIds = new Set(desiredList.map((d) => d.studentId));

        // 1. Hủy những bạn bị gỡ khỏi nhóm
        for (const tp of targetPlans) {
          if (!desiredStudentIds.has(tp.studentId)) {
            await tx.tutoringPlan.update({ where: { id: tp.id }, data: { status: 'CANCELLED' } });
            await tx.tutoringSession.updateMany({
              where: { planId: tp.id, status: 'SCHEDULED' },
              data: { status: 'CANCELLED' },
            });
          }
        }

        // 2. Tạo mới cho những bạn mới được thêm vào nhóm
        const newMembers = desiredList.filter((d) => !existingByStudent.has(d.studentId));
        if (newMembers.length > 0) {
          const planPrefix = `PD${yy}${mm}_`;
          const startSeq = await getNextGroupOrPlanCode(tx, 'planCode', planPrefix);
          const sessionTemplates = Array.isArray(sessions) && sessions.length > 0
            ? sessions
            : existing.sessions;

          for (let i = 0; i < newMembers.length; i++) {
            const m = newMembers[i];
            const newPlan = await tx.tutoringPlan.create({
              data: {
                planCode: `${planPrefix}${String(startSeq + i).padStart(3, '0')}`,
                groupCode: activeGroupCode,
                studentId: m.studentId,
                classCode: m.classCode || null,
                teacherId: teacherId !== undefined ? (teacherId || null) : existing.teacherId,
                tutorName: finalTutorName !== undefined ? finalTutorName : existing.tutorName,
                sessionType: sessionType !== undefined ? sessionType : existing.sessionType,
                focusSkills: focusSkills !== undefined ? focusSkills : existing.focusSkills,
                content: content !== undefined ? content : existing.content,
                instructions: instructions !== undefined ? instructions : existing.instructions,
                totalSessions: sessionTemplates.length,
                status: 'SCHEDULED',
                sessions: {
                  create: sessionTemplates.map((s, idx) => ({
                    sessionNumber: idx + 1,
                    teachingDate: s.teachingDate || vnToday,
                    startTimeText: s.startTimeText ? String(s.startTimeText).trim() : '16:30',
                    endTimeText: s.endTimeText ? String(s.endTimeText).trim() : '17:30',
                    roomName: s.roomName ? String(s.roomName).trim() : 'Phòng học tại trung tâm',
                    notes: s.notes || null,
                    status: 'SCHEDULED',
                  })),
                },
              },
              include: { sessions: { orderBy: { sessionNumber: 'asc' } } },
            });
            targetPlans.push(newPlan);
          }
        }

        // Cập nhật lại targetPlans chỉ giữ những em còn nằm trong desiredList + cập nhật classCode nếu đổi
        targetPlans = targetPlans.filter((tp) => desiredStudentIds.has(tp.studentId));
        for (const tp of targetPlans) {
          const matched = desiredList.find((d) => d.studentId === tp.studentId);
          if (matched && matched.classCode !== undefined && matched.classCode !== tp.classCode) {
            await tx.tutoringPlan.update({ where: { id: tp.id }, data: { classCode: matched.classCode || null } });
          }
        }
      }

      // Cập nhật thông tin chung & danh sách buổi cho tất cả plan mục tiêu
      const resultIds = [];
      for (const tp of targetPlans) {
        resultIds.push(tp.id);
        await tx.tutoringPlan.update({
          where: { id: tp.id },
          data: {
            groupCode: activeGroupCode !== undefined ? activeGroupCode : tp.groupCode,
            classCode: (!Array.isArray(participants) && classCode !== undefined && tp.id === id) ? (classCode || null) : undefined,
            sessionType: sessionType !== undefined ? sessionType : tp.sessionType,
            focusSkills: focusSkills !== undefined ? focusSkills : tp.focusSkills,
            content: content !== undefined ? content : tp.content,
            instructions: instructions !== undefined ? instructions : tp.instructions,
            teacherId: teacherId !== undefined ? (teacherId || null) : tp.teacherId,
            tutorName: finalTutorName !== undefined ? finalTutorName : tp.tutorName,
            status: status !== undefined ? status : tp.status,
            totalSessions: Array.isArray(sessions) && sessions.length > 0 ? sessions.length : tp.totalSessions,
          },
        });

        if (Array.isArray(sessions) && sessions.length > 0) {
          const existingSessions = await tx.tutoringSession.findMany({
            where: { planId: tp.id },
            orderBy: { sessionNumber: 'asc' },
          });

          // Đồng bộ theo vị trí buổi (giữ nguyên buổi đã COMPLETED nếu vẫn nằm trong danh sách, tránh xóa dữ liệu điểm danh)
          const keptIds = new Set();
          for (let i = 0; i < sessions.length; i++) {
            const s = sessions[i];
            const matchById = s.id ? existingSessions.find((es) => es.id === s.id) : null;
            const matchByIndex = !matchById && tp.id !== id ? existingSessions[i] : null;
            const targetSession = matchById || matchByIndex;

            if (targetSession) {
              keptIds.add(targetSession.id);
              await tx.tutoringSession.update({
                where: { id: targetSession.id },
                data: {
                  sessionNumber: i + 1,
                  teachingDate: s.teachingDate,
                  startTimeText: s.startTimeText ? String(s.startTimeText).trim() : '16:30',
                  endTimeText: s.endTimeText ? String(s.endTimeText).trim() : '17:30',
                  roomName: s.roomName ? String(s.roomName).trim() : 'Phòng học tại trung tâm',
                  notes: s.notes || null,
                  status: targetSession.status === 'COMPLETED' ? 'COMPLETED' : (s.status || 'SCHEDULED'),
                },
              });
            } else {
              const created = await tx.tutoringSession.create({
                data: {
                  planId: tp.id,
                  sessionNumber: i + 1,
                  teachingDate: s.teachingDate || vnToday,
                  startTimeText: s.startTimeText ? String(s.startTimeText).trim() : '16:30',
                  endTimeText: s.endTimeText ? String(s.endTimeText).trim() : '17:30',
                  roomName: s.roomName ? String(s.roomName).trim() : 'Phòng học tại trung tâm',
                  notes: s.notes || null,
                  status: 'SCHEDULED',
                },
              });
              keptIds.add(created.id);
            }
          }

          // Hủy/xóa các buổi thừa chưa hoàn thành nếu người dùng xóa bớt buổi khi sửa
          for (const es of existingSessions) {
            if (!keptIds.has(es.id) && es.status !== 'COMPLETED') {
              await tx.tutoringSession.delete({ where: { id: es.id } });
            }
          }
        }
      }

      return await tx.tutoringPlan.findMany({
        where: { id: { in: resultIds } },
        include: {
          student: true,
          class: true,
          teacher: true,
          sessions: { orderBy: { sessionNumber: 'asc' } },
        },
        orderBy: { createdAt: 'asc' },
      });
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      data: updatedPlans.find((p) => p.id === id) || updatedPlans[0],
      plans: updatedPlans,
    });
  } catch (error) {
    console.error('Lỗi cập nhật phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE: Hủy đợt phụ đạo (hoặc hủy cả nhóm nếu ?scope=GROUP)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'SINGLE';

    const existing = await prisma.tutoringPlan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đợt phụ đạo' }, { status: 404 });
    }

    if (scope === 'GROUP' && existing.groupCode) {
      const groupPlans = await prisma.tutoringPlan.findMany({
        where: { groupCode: existing.groupCode, status: { not: 'CANCELLED' } },
        select: { id: true },
      });
      const planIds = groupPlans.map((p) => p.id);
      await prisma.$transaction([
        prisma.tutoringPlan.updateMany({
          where: { id: { in: planIds } },
          data: { status: 'CANCELLED' },
        }),
        prisma.tutoringSession.updateMany({
          where: { planId: { in: planIds }, status: 'SCHEDULED' },
          data: { status: 'CANCELLED' },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.tutoringPlan.update({
          where: { id },
          data: { status: 'CANCELLED' },
        }),
        prisma.tutoringSession.updateMany({
          where: { planId: id, status: 'SCHEDULED' },
          data: { status: 'CANCELLED' },
        }),
      ]);
    }

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({ success: true, message: 'Đã hủy lịch phụ đạo thành công' });
  } catch (error) {
    console.error('Lỗi hủy phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
