import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBranchFilter } from '@/lib/rbac';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const monthYear = searchParams.get('monthYear');
  if (!monthYear) {
    return NextResponse.json({ error: 'Thiếu tham số monthYear' }, { status: 400 });
  }

  const [mm, yyyy] = monthYear.split('/');
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  if (isNaN(month) || isNaN(year)) {
    return NextResponse.json({ error: 'Định dạng monthYear không hợp lệ' }, { status: 400 });
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0) - 7 * 3600 * 1000);
  const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0) - 7 * 3600 * 1000);

  const userRole = request.headers.get('x-user-role');
  const branchId = request.headers.get('x-user-branch');
  const selectedBranch = request.headers.get('x-selected-branch');
  const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

  try {
    // Get active enrollments for monthly billing
    const enrollments = await prisma.enrollment.findMany({
      where: {
        status: 'Đang học',
        billingType: { in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'] },
        student: {
          status: 'Đang học',
          ...branchFilter,
        },
      },
      include: {
        student: true,
        class: true,
      },
    });

    const studentIds = enrollments.map(e => e.studentId);
    const classCodes = enrollments.map(e => e.classCode);

    // Get attendance for these students in this month
    const attendances = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        classCode: { in: classCodes },
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
    });

    return NextResponse.json({ enrollments, attendances });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { studentId, classCode, date, status } = await request.json();

    // date is YYYY-MM-DD -> normalize to UTC midnight consistently
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    if (status === 'Trống' || status === '') {
      const existingAtt = await prisma.attendance.findUnique({
        where: {
          studentId_classCode_date: { studentId, classCode, date: dateObj },
        },
      });
      if (existingAtt) {
        const hasNotesOrHomework =
          Boolean(existingAtt.teacherNotes && existingAtt.teacherNotes.trim()) ||
          Boolean(existingAtt.adjustmentNotes && existingAtt.adjustmentNotes.trim()) ||
          existingAtt.missingWb ||
          existingAtt.missingVideo ||
          existingAtt.copyError;

        if (hasNotesOrHomework) {
          // Bảo toàn nhận xét / bài tập giáo viên đã chấm bên /attendance
          await prisma.attendance.update({
            where: { id: existingAtt.id },
            data: { status: 'Chưa điểm danh' },
          });
        } else {
          await prisma.attendance.delete({ where: { id: existingAtt.id } });
        }
      }
      return NextResponse.json({ success: true, status: 'Trống' });
    }

    const classInfo = await prisma.class.findUnique({ where: { code: classCode } });

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_classCode_date: {
          studentId,
          classCode,
          date: dateObj,
        }
      },
      update: {
        status,
      },
      create: {
        studentId,
        classCode,
        date: dateObj,
        status,
      }
    });

    // Đồng bộ tạo/giữ AttendanceSummary cho buổi học để khớp Bảng lương GV & Nhật ký Báo cáo tháng
    await prisma.attendanceSummary.upsert({
      where: {
        classCode_date: {
          classCode,
          date: dateObj,
        },
      },
      update: {},
      create: {
        classCode,
        date: dateObj,
        teacherId: classInfo?.teacherId || null,
      },
    });

    return NextResponse.json({ success: true, attendance });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
