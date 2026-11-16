import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBranchFilter } from '@/lib/rbac';

function hasPayrollAccess(roleHeader) {
  const roles = (roleHeader || '').split(',').map((r) => r.trim());
  return roles.includes('DIRECTOR') || roles.includes('REGIONAL_MANAGER') || roles.includes('CHIEF_ACCOUNTANT');
}

export async function GET(request) {
  try {
    const userRole = request.headers.get('x-user-role') || '';
    if (!hasPayrollAccess(userRole)) {
      return NextResponse.json({ success: false, error: 'Bạn không có quyền truy cập bảng lương giáo viên' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn tháng hợp lệ (YYYY-MM).' }, { status: 400 });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const monthInt = parseInt(monthStr, 10);

    // Mốc đầu tháng - cuối tháng theo UTC/VN
    const startDate = new Date(Date.UTC(year, monthInt - 1, 1, 0, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, monthInt, 0, 23, 59, 59, 999));

    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    // Lấy toàn bộ bản ghi điểm danh lớp trong tháng (bao gồm bản ghi chưa gắn teacherId để fallback sang GVCN lớp)
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(Object.keys(branchFilter).length > 0 ? { class: branchFilter } : {}),
      },
      include: {
        class: true,
      },
      orderBy: { date: 'asc' },
    });

    const resolvedTeacherIds = summaries
      .map((s) => s.teacherId || s.class?.teacherId)
      .filter(Boolean);

    // Lấy danh sách giáo viên (hỗ trợ multi-role như "TEACHER,DIRECTOR")
    const teachers = await prisma.user.findMany({
      where: {
        OR: [
          { role: { contains: 'TEACHER' } },
          { id: { in: resolvedTeacherIds } },
        ],
      },
      select: { id: true, fullName: true, shortName: true, username: true, hourlyRate: true },
    });

    const teacherByNameMap = {};
    teachers.forEach((t) => {
      if (t.shortName) teacherByNameMap[t.shortName.trim().toLowerCase()] = t;
      if (t.fullName) teacherByNameMap[t.fullName.trim().toLowerCase()] = t;
    });

    const teacherMap = {};
    teachers.forEach((t) => {
      teacherMap[t.id] = {
        id: t.id,
        name: t.shortName || t.fullName,
        fullName: t.fullName,
        username: t.username,
        hourlyRate: Number(t.hourlyRate) > 0 ? Number(t.hourlyRate) : 200000,
        mainClasses: 0,
        substituteClasses: 0,
        totalClasses: 0,
        details: [],
      };
    });

    summaries.forEach((s) => {
      let tid = s.teacherId || s.class?.teacherId || null;
      if (!tid && s.class?.teacherName) {
        const matched = teacherByNameMap[s.class.teacherName.trim().toLowerCase()];
        if (matched) tid = matched.id;
      }

      if (!tid) {
        tid = '__UNASSIGNED__';
      }

      if (!teacherMap[tid]) {
        teacherMap[tid] = {
          id: tid,
          name: tid === '__UNASSIGNED__' ? 'Chưa phân công GV (Cần gán GVCN)' : 'Giáo viên đã xóa',
          fullName: tid === '__UNASSIGNED__' ? 'Chưa phân công giáo viên' : 'Giáo viên đã xóa',
          username: tid === '__UNASSIGNED__' ? 'unassigned' : 'unknown',
          hourlyRate: 200000,
          mainClasses: 0,
          substituteClasses: 0,
          totalClasses: 0,
          details: [],
        };
      }

      const t = teacherMap[tid];
      t.totalClasses += 1;

      if (s.isSubstitute) {
        t.substituteClasses += 1;
      } else {
        t.mainClasses += 1;
      }

      t.details.push({
        classCode: s.classCode,
        date: s.date,
        isSubstitute: s.isSubstitute,
      });
    });

    const result = Object.values(teacherMap)
      .filter((t) => t.totalClasses > 0)
      .map((t) => ({
        ...t,
        estimatedPay: Math.round(t.totalClasses * (t.hourlyRate || 200000)),
      }));

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Lỗi API Bảng Lương:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const userRole = request.headers.get('x-user-role') || '';
    const roles = userRole.split(',').map((r) => r.trim());
    if (!roles.includes('DIRECTOR') && !roles.includes('REGIONAL_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Chỉ Giám đốc mới được cấu hình đơn giá lương giáo viên' }, { status: 403 });
    }

    const { teacherId, hourlyRate } = await request.json();
    const parsedRate = parseFloat(hourlyRate);
    if (!teacherId || teacherId === '__UNASSIGNED__' || isNaN(parsedRate) || parsedRate < 0) {
      return NextResponse.json({ success: false, error: 'Giáo viên hoặc đơn giá/tiết không hợp lệ' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: teacherId },
      data: { hourlyRate: Math.round(parsedRate) },
      select: { id: true, fullName: true, hourlyRate: true },
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({ success: true, data: updated, message: 'Cập nhật đơn giá tiết dạy thành công!' });
  } catch (error) {
    console.error('Lỗi cập nhật đơn giá lương:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server: ' + error.message }, { status: 500 });
  }
}
