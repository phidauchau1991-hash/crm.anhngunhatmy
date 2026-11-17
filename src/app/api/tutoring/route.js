import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const vnDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getVnTodayStr() {
  return vnDateFormatter.format(new Date());
}

// Helper: tìm số thứ tự kế tiếp cho mã đợt (PD...) hoặc mã nhóm (NH...)
async function getNextSequenceNumber(tx, field, prefix) {
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

// GET: Lấy danh sách đợt & các buổi phụ đạo
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const teacherId = searchParams.get('teacherId') || '';
    const classCode = searchParams.get('classCode') || '';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const studentId = searchParams.get('studentId') || '';

    const where = {};

    if (status && status !== 'ALL') {
      if (status === 'SCHEDULED') {
        where.status = { in: ['SCHEDULED', 'IN_PROGRESS'] };
      } else {
        where.status = status;
      }
    }

    if (teacherId) where.teacherId = teacherId;
    if (classCode) where.classCode = classCode;
    if (studentId) where.studentId = studentId;

    if (search) {
      where.OR = [
        { planCode: { contains: search } },
        { groupCode: { contains: search } },
        { student: { name: { contains: search } } },
        { student: { phone: { contains: search } } },
        { tutorName: { contains: search } },
        { classCode: { contains: search } },
        { sessions: { some: { roomName: { contains: search } } } },
      ];
    }

    const plans = await prisma.tutoringPlan.findMany({
      where,
      include: {
        student: {
          select: { id: true, name: true, phone: true, dob: true, status: true },
        },
        class: {
          select: { code: true, level: true, teacherName: true, schedule: true },
        },
        teacher: {
          select: { id: true, fullName: true, shortName: true },
        },
        sessions: {
          orderBy: { sessionNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error('Lỗi lấy danh sách phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo đợt phụ đạo mới cho 1 học viên hoặc cả nhóm nhiều học viên (cùng hoặc khác lớp)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      studentId,
      classCode,
      participants, // Optional array: [{ studentId, classCode }]
      teacherId,
      tutorName,
      sessionType,
      focusSkills,
      content,
      instructions,
      sessions,
      createdById,
    } = body;

    // Chuẩn hóa danh sách học viên tham gia (ưu tiên participants, fallback studentId đơn)
    const rawParticipants = Array.isArray(participants) && participants.length > 0
      ? participants
      : (studentId ? [{ studentId, classCode: classCode || null }] : []);

    const dedupMap = new Map();
    for (const p of rawParticipants) {
      if (p && p.studentId && !dedupMap.has(p.studentId)) {
        dedupMap.set(p.studentId, { studentId: p.studentId, classCode: p.classCode || null });
      }
    }
    const cleanParticipants = Array.from(dedupMap.values());

    if (cleanParticipants.length === 0) {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn ít nhất 1 học viên cần phụ đạo' }, { status: 400 });
    }

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ success: false, error: 'Cần thiết lập ít nhất 1 buổi/ngày phụ đạo' }, { status: 400 });
    }

    const foundStudents = await prisma.student.findMany({
      where: { id: { in: cleanParticipants.map((p) => p.studentId) } },
      select: { id: true },
    });
    const foundSet = new Set(foundStudents.map((s) => s.id));
    const missing = cleanParticipants.filter((p) => !foundSet.has(p.studentId));
    if (missing.length > 0) {
      return NextResponse.json({ success: false, error: `Không tìm thấy học viên: ${missing.map((m) => m.studentId).join(', ')}` }, { status: 404 });
    }

    let finalTutorName = tutorName || 'Chưa phân công';
    if (teacherId) {
      const user = await prisma.user.findUnique({ where: { id: teacherId } });
      if (user) {
        finalTutorName = user.shortName || user.fullName;
      }
    }

    const vnToday = getVnTodayStr();
    const [yyyy, mm] = vnToday.split('-');
    const yy = yyyy.slice(-2);
    const planPrefix = `PD${yy}${mm}_`;
    const groupPrefix = `NH${yy}${mm}_`;

    const createdPlans = await prisma.$transaction(async (tx) => {
      const startPlanSeq = await getNextSequenceNumber(tx, 'planCode', planPrefix);
      let groupCode = null;
      if (cleanParticipants.length > 1) {
        const nextGrpSeq = await getNextSequenceNumber(tx, 'groupCode', groupPrefix);
        groupCode = `${groupPrefix}${String(nextGrpSeq).padStart(3, '0')}`;
      }

      const results = [];
      for (let idx = 0; idx < cleanParticipants.length; idx++) {
        const p = cleanParticipants[idx];
        const planCode = `${planPrefix}${String(startPlanSeq + idx).padStart(3, '0')}`;

        const plan = await tx.tutoringPlan.create({
          data: {
            planCode,
            groupCode,
            studentId: p.studentId,
            classCode: p.classCode || null,
            teacherId: teacherId || null,
            tutorName: finalTutorName,
            sessionType: sessionType || 'Bù bài học viên vắng (Makeup)',
            focusSkills: focusSkills || 'Tổng hợp / Toàn diện',
            content: content || null,
            instructions: instructions || null,
            totalSessions: sessions.length,
            status: 'SCHEDULED',
            createdById: createdById || null,
            sessions: {
              create: sessions.map((s, sIdx) => ({
                sessionNumber: sIdx + 1,
                teachingDate: s.teachingDate || vnToday,
                startTimeText: s.startTimeText ? String(s.startTimeText).trim() : '16:30',
                endTimeText: s.endTimeText ? String(s.endTimeText).trim() : '17:30',
                roomName: s.roomName ? String(s.roomName).trim() : 'Phòng học tại trung tâm',
                notes: s.notes || null,
                status: 'SCHEDULED',
              })),
            },
          },
          include: {
            student: true,
            class: true,
            teacher: true,
            sessions: { orderBy: { sessionNumber: 'asc' } },
          },
        });
        results.push(plan);
      }

      return results;
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      data: createdPlans[0],
      plans: createdPlans,
      groupCode: createdPlans[0]?.groupCode || null,
    });
  } catch (error) {
    console.error('Lỗi tạo buổi phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
