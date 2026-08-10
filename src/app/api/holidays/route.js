import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { recalculateClassEndDate } from '@/lib/holidayHelpers';

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
    const { name, startDateStr, endDateStr, scope, targetId } = body;

    if (!name || !startDateStr || !endDateStr || !scope) {
      return NextResponse.json({ success: false, error: 'Tên ngày nghỉ, ngày bắt đầu, ngày kết thúc và phạm vi là bắt buộc' }, { status: 400 });
    }

    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(endDateStr);
    endDate.setHours(23, 59, 59, 999);

    if (endDate < startDate) {
      return NextResponse.json({ success: false, error: 'Ngày kết thúc không được nhỏ hơn ngày bắt đầu' }, { status: 400 });
    }

    if (scope !== 'GLOBAL' && !targetId) {
      return NextResponse.json({ success: false, error: 'Mã đối tượng áp dụng là bắt buộc khi phạm vi không phải Toàn hệ thống' }, { status: 400 });
    }

    // Tạo Holiday mới
    const newHoliday = await prisma.holiday.create({
      data: {
        name,
        startDate,
        endDate,
        scope,
        targetId: scope === 'GLOBAL' ? null : targetId,
      },
    });

    // Tịnh tiến lại ngày kết thúc các lớp học chịu ảnh hưởng
    // Tìm tất cả các lớp có expectedEndDate >= startDate
    const activeClasses = await prisma.class.findMany({
      where: {
        expectedEndDate: { gte: startDate },
      },
    });

    // Chỉ lọc các lớp thực sự khớp với scope và targetId
    const affectedClasses = activeClasses.filter(cls => {
      if (scope === 'GLOBAL') return true;
      if (scope === 'SHIFT' && cls.schedule === targetId) return true;
      if (scope === 'CLASS' && cls.code === targetId) return true;
      return false;
    });

    // Chạy tái tính toán trong transaction
    await prisma.$transaction(async (tx) => {
      for (const cls of affectedClasses) {
        await recalculateClassEndDate(cls.code, tx);
      }
    });

    return NextResponse.json({ 
      success: true, 
      data: newHoliday, 
      message: `Đã tạo ngày nghỉ ${name} và tự động cập nhật lại lịch cho ${affectedClasses.length} lớp học.` 
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

    // Xóa Holiday
    await prisma.holiday.delete({
      where: { id },
    });

    // Tịnh tiến lại ngày kết thúc các lớp học chịu ảnh hưởng (tính lại từ ngày khai giảng của chúng)
    const activeClasses = await prisma.class.findMany();

    const affectedClasses = activeClasses.filter(cls => {
      if (holiday.scope === 'GLOBAL') return true;
      if (holiday.scope === 'SHIFT' && cls.schedule === holiday.targetId) return true;
      if (holiday.scope === 'CLASS' && cls.code === holiday.targetId) return true;
      return false;
    });

    await prisma.$transaction(async (tx) => {
      for (const cls of affectedClasses) {
        await recalculateClassEndDate(cls.code, tx);
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Đã xóa ngày nghỉ và cập nhật tịnh tiến lại dự kiến kết thúc cho ${affectedClasses.length} lớp học.` 
    });
  } catch (error) {
    console.error('Lỗi khi xóa ngày nghỉ:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
