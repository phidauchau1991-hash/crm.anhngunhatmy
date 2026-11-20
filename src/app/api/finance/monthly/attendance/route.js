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
    // 1. Lấy học viên chính thức hệ Học phí tháng
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

    // 2. Lấy thêm các lớp hệ MONTHLY để hiển thị luôn Lead đang "Học thử" trong lớp đó
    const monthlyClasses = await prisma.class.findMany({
      where: { level: 'MONTHLY' },
      select: { code: true },
    });
    const monthlyClassCodes = Array.from(
      new Set([...monthlyClasses.map((c) => c.code), ...enrollments.map((e) => e.classCode)])
    );

    const trialLeads =
      monthlyClassCodes.length > 0
        ? await prisma.lead.findMany({
            where: {
              status: 'Học thử',
              trialClassCode: { in: monthlyClassCodes },
              ...branchFilter,
            },
            orderBy: { id: 'desc' },
          })
        : [];

    const studentIds = enrollments.map((e) => e.studentId);
    const classCodes = Array.from(new Set([...enrollments.map((e) => e.classCode), ...monthlyClassCodes]));
    const trialLeadIds = trialLeads.map((l) => l.id);

    const attendanceConditions = [];
    if (studentIds.length > 0 && classCodes.length > 0) {
      attendanceConditions.push({
        studentId: { in: studentIds },
        classCode: { in: classCodes },
      });
    }
    if (trialLeadIds.length > 0 && monthlyClassCodes.length > 0) {
      attendanceConditions.push({
        leadId: { in: trialLeadIds },
        classCode: { in: monthlyClassCodes },
      });
    }

    const attendances =
      attendanceConditions.length > 0
        ? await prisma.attendance.findMany({
            where: {
              OR: attendanceConditions,
              date: {
                gte: startDate,
                lt: endDate,
              },
            },
          })
        : [];

    return NextResponse.json({ enrollments, trialLeads, attendances });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { studentId, leadId, isTrial, classCode, date, status } = await request.json();

    // date is YYYY-MM-DD -> normalize to UTC midnight consistently
    const dateObj = new Date(`${date}T00:00:00.000Z`);

    const isLeadTrial = Boolean(
      isTrial || leadId || (studentId && String(studentId).startsWith('LEAD_'))
    );
    const actualLeadId = leadId
      ? parseInt(leadId, 10)
      : isLeadTrial && studentId
      ? parseInt(String(studentId).replace(/^LEAD_/, ''), 10)
      : null;

    if (isLeadTrial && (!actualLeadId || Number.isNaN(actualLeadId))) {
      return NextResponse.json({ error: 'Thiếu mã Lead học thử hợp lệ' }, { status: 400 });
    }

    const uniqueWhere = isLeadTrial
      ? { leadId_classCode_date: { leadId: actualLeadId, classCode, date: dateObj } }
      : { studentId_classCode_date: { studentId, classCode, date: dateObj } };

    if (status === 'Trống' || status === '') {
      const existingAtt = await prisma.attendance.findUnique({ where: uniqueWhere });
      if (existingAtt) {
        const hasNotesOrHomework =
          Boolean(existingAtt.teacherNotes && existingAtt.teacherNotes.trim()) ||
          Boolean(existingAtt.adjustmentNotes && existingAtt.adjustmentNotes.trim()) ||
          existingAtt.missingWb ||
          existingAtt.missingVideo ||
          existingAtt.copyError;

        if (hasNotesOrHomework) {
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
      where: uniqueWhere,
      update: { status },
      create: isLeadTrial
        ? { leadId: actualLeadId, classCode, date: dateObj, status }
        : { studentId, classCode, date: dateObj, status },
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
