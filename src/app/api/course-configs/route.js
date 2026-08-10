import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const courseConfigs = await prisma.courseConfig.findMany({
      orderBy: [
        { program: 'asc' },
        { capDo: 'asc' },
        { level: 'asc' }
      ]
    });
    return NextResponse.json({ success: true, data: courseConfigs });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách cấu hình khóa học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { program, capDo, level, price, totalSessions, bookName, bookPrice } = body;

    if (!program || !capDo || !level || price === undefined || !totalSessions) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin Độ tuổi, Cấp độ, Khóa học (Mã khóa), Học phí hoặc Số buổi học' }, { status: 400 });
    }

    // Check if level already exists
    const existing = await prisma.courseConfig.findUnique({ where: { level } });
    if (existing) {
      return NextResponse.json({ success: false, error: `Khóa học (Mã khóa) "${level}" đã tồn tại trên hệ thống.` }, { status: 400 });
    }

    const newConfig = await prisma.courseConfig.create({
      data: {
        program,
        capDo,
        level,
        price: parseFloat(price),
        totalSessions: parseInt(totalSessions),
        bookName: bookName || null,
        bookPrice: bookPrice ? parseFloat(bookPrice) : null,
      }
    });

    return NextResponse.json({ success: true, message: 'Thêm cấu hình khóa học thành công', data: newConfig });
  } catch (error) {
    console.error('Lỗi khi tạo cấu hình khóa học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, program, capDo, level, price, totalSessions, bookName, bookPrice } = body;

    if (!id || !program || !capDo || !level || price === undefined || !totalSessions) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin cập nhật' }, { status: 400 });
    }

    // Check if level is taken by another config
    const conflicting = await prisma.courseConfig.findFirst({
      where: {
        level,
        id: { not: parseInt(id) }
      }
    });
    if (conflicting) {
      return NextResponse.json({ success: false, error: `Mã khóa học "${level}" đã bị trùng với một cấu hình khác.` }, { status: 400 });
    }

    const updated = await prisma.courseConfig.update({
      where: { id: parseInt(id) },
      data: {
        program,
        capDo,
        level,
        price: parseFloat(price),
        totalSessions: parseInt(totalSessions),
        bookName: bookName || null,
        bookPrice: bookPrice ? parseFloat(bookPrice) : null,
      }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật cấu hình thành công', data: updated });
  } catch (error) {
    console.error('Lỗi khi sửa cấu hình khóa học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'Thiếu ID cấu hình' }, { status: 400 });

    // Check if this level is currently referenced by any Class
    const config = await prisma.courseConfig.findUnique({ where: { id: parseInt(id) } });
    if (config) {
      const referenced = await prisma.class.findFirst({ where: { level: config.level } });
      if (referenced) {
        return NextResponse.json({ success: false, error: `Không thể xóa cấu hình này vì Khóa học "${config.level}" đang được sử dụng bởi lớp học "${referenced.code}".` }, { status: 400 });
      }
    }

    await prisma.courseConfig.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ success: true, message: 'Xóa cấu hình thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa cấu hình khóa học:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
