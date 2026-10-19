import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

// Helper: sinh mã đợt phụ đạo tự động (VD: PD2610_001)
async function generatePlanCode() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = `PD${yy}${mm}_`;

  const latest = await prisma.tutoringPlan.findFirst({
    where: { planCode: { startsWith: prefix } },
    orderBy: { planCode: 'desc' }
  });

  let nextNum = 1;
  if (latest && latest.planCode) {
    const parts = latest.planCode.split('_');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) nextNum = lastNum + 1;
  }

  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

// GET: Lấy danh sách đợt & các buổi phụ đạo
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const teacherId = searchParams.get('teacherId') || '';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const studentId = searchParams.get('studentId') || '';

    // Xây dựng điều kiện lọc
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (teacherId) {
      where.teacherId = teacherId;
    }

    if (studentId) {
      where.studentId = studentId;
    }

    if (search) {
      where.OR = [
        { planCode: { contains: search } },
        { student: { name: { contains: search } } },
        { student: { phone: { contains: search } } },
        { tutorName: { contains: search } },
        { classCode: { contains: search } },
        { sessions: { some: { roomName: { contains: search } } } }
      ];
    }

    const plans = await prisma.tutoringPlan.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            dob: true,
            status: true
          }
        },
        class: {
          select: {
            code: true,
            level: true,
            teacherName: true,
            schedule: true
          }
        },
        teacher: {
          select: {
            id: true,
            fullName: true,
            shortName: true
          }
        },
        sessions: {
          orderBy: { sessionNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    console.error('Lỗi lấy danh sách phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo đợt phụ đạo mới kèm danh sách buổi học
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      studentId,
      classCode,
      teacherId,
      tutorName,
      sessionType,
      focusSkills,
      content,
      instructions,
      sessions, // Array of { teachingDate, startTimeText, endTimeText, roomName, notes }
      createdById
    } = body;

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn học viên cần phụ đạo' }, { status: 400 });
    }

    if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
      return NextResponse.json({ success: false, error: 'Cần thiết lập ít nhất 1 buổi/ngày phụ đạo' }, { status: 400 });
    }

    // Kiểm tra học viên tồn tại
    const student = await prisma.student.findUnique({
      where: { id: studentId }
    });
    if (!student) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy học viên tương ứng' }, { status: 404 });
    }

    // Tên giáo viên kèm
    let finalTutorName = tutorName || 'Chưa phân công';
    if (teacherId) {
      const user = await prisma.user.findUnique({ where: { id: teacherId } });
      if (user) {
        finalTutorName = user.shortName || user.fullName;
      }
    }

    const planCode = await generatePlanCode();

    // Tạo đợt phụ đạo và các buổi học trong transaction
    const newPlan = await prisma.$transaction(async (tx) => {
      const plan = await tx.tutoringPlan.create({
        data: {
          planCode,
          studentId,
          classCode: classCode || null,
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
            create: sessions.map((s, index) => ({
              sessionNumber: index + 1,
              teachingDate: s.teachingDate || new Date().toISOString().split('T')[0],
              startTimeText: s.startTimeText ? String(s.startTimeText).trim() : '16:30',
              endTimeText: s.endTimeText ? String(s.endTimeText).trim() : '17:30',
              roomName: s.roomName ? String(s.roomName).trim() : 'Phòng học tại trung tâm',
              notes: s.notes || null,
              status: 'SCHEDULED'
            }))
          }
        },
        include: {
          student: true,
          class: true,
          teacher: true,
          sessions: { orderBy: { sessionNumber: 'asc' } }
        }
      });

      return plan;
    });

    return NextResponse.json({ success: true, data: newPlan });
  } catch (error) {
    console.error('Lỗi tạo buổi phụ đạo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
