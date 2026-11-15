import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { recalculateClassEndDate, normalizeScheduleCode } from '@/lib/holidayHelpers';

export async function GET() {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { startDate: 'asc' },
    });
    return NextResponse.json({ success: true, data: holidays });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách ngày nghỉ:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, startDateStr, endDateStr, scope, targetId, targetIds } = body;

    if (!name || !startDateStr || !endDateStr || !scope) {
      return NextResponse.json({ success: false, error: 'Tên ngày nghỉ, ngày bắt đầu, ngày kết thúc và phạm vi là bắt buộc' }, { status: 400 });
    }

    const startDate = new Date(`${startDateStr}T00:00:00.000+07:00`);
    const endDate = new Date(`${endDateStr}T23:59:59.999+07:00`);

    if (endDate < startDate) {
      return NextResponse.json({ success: false, error: 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu' }, { status: 400 });
    }

    let finalTargetIds = targetIds || (targetId ? [targetId] : []);

    if (scope !== 'GLOBAL' && finalTargetIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Mã đối tượng áp dụng là bắt buộc khi phạm vi không phải Toàn hệ thống' }, { status: 400 });
    }

    if (scope === 'GLOBAL') finalTargetIds = [null];

    const createdHolidays = [];
    const activeClasses = await prisma.class.findMany();

    const allAffectedClassCodes = new Set();

    for (const rawTargetId of finalTargetIds) {
      const normalizedTargetId = scope === 'SHIFT' ? normalizeScheduleCode(rawTargetId) : rawTargetId;
      const newHoliday = await prisma.holiday.create({
        data: {
          name,
          startDate,
          endDate,
          scope,
          targetId: scope === 'GLOBAL' ? null : normalizedTargetId,
        },
      });
      createdHolidays.push(newHoliday);

      const affectedClasses = activeClasses.filter(cls => {
        if (cls.level === 'MONTHLY') return false;
        if (scope === 'GLOBAL') return true;
        if (scope === 'SHIFT' && normalizeScheduleCode(cls.schedule) === normalizedTargetId) return true;
        if (scope === 'CLASS' && cls.code === normalizedTargetId) return true;
        return false;
      });

      affectedClasses.forEach(cls => allAffectedClassCodes.add(cls.code));
    }

    await prisma.$transaction(async (tx) => {
      for (const classCode of allAffectedClassCodes) {
        await recalculateClassEndDate(classCode, tx);
      }
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({ 
      success: true, 
      data: createdHolidays.length === 1 ? createdHolidays[0] : createdHolidays, 
      message: `Đã tạo ${createdHolidays.length} ngày nghỉ "${name}" và tự động cập nhật lại lịch kết thúc cho ${allAffectedClassCodes.size} lớp học.` 
    });
  } catch (error) {
    console.error('Lỗi khi tạo ngày nghỉ:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');
    if (!idStr) {
      return NextResponse.json({ success: false, error: 'Mã ngày nghỉ cần xóa là bắt buộc' }, { status: 400 });
    }
    const id = parseInt(idStr);

    const holiday = await prisma.holiday.findUnique({
      where: { id },
    });
    if (!holiday) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy ngày nghỉ' }, { status: 404 });
    }

    await prisma.holiday.delete({
      where: { id },
    });

    const activeClasses = await prisma.class.findMany();

    const affectedClasses = activeClasses.filter(cls => {
      if (cls.level === 'MONTHLY') return false;
      if (holiday.scope === 'GLOBAL') return true;
      if (holiday.scope === 'SHIFT' && (cls.schedule === holiday.targetId || normalizeScheduleCode(cls.schedule) === normalizeScheduleCode(holiday.targetId))) return true;
      if (holiday.scope === 'CLASS' && cls.code === holiday.targetId) return true;
      return false;
    });

    await prisma.$transaction(async (tx) => {
      for (const cls of affectedClasses) {
        await recalculateClassEndDate(cls.code, tx);
      }
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({ 
      success: true, 
      message: `Đã xóa ngày nghỉ và cập nhật tịnh tiến lại dự kiến kết thúc cho ${affectedClasses.length} lớp học.` 
    });
  } catch (error) {
    console.error('Lỗi khi xóa ngày nghỉ:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
