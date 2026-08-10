import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'Thiếu studentId' }, { status: 400 });
    }

    const certificates = await prisma.certificate.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Lỗi API certificates GET:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentId, examName, examDate, score, notes } = body;

    if (!studentId || !examName) {
      return NextResponse.json({ success: false, error: 'Bắt buộc nhập Mã học viên và Tên kỳ thi' }, { status: 400 });
    }

    const certificate = await prisma.certificate.create({
      data: {
        studentId,
        examName,
        examDate: examDate ? new Date(examDate) : null,
        score: score || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, message: 'Cấp chứng chỉ/kết quả kỳ thi thành công', data: certificate });
  } catch (error) {
    console.error('Lỗi API certificates POST:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID chứng chỉ' }, { status: 400 });
    }

    await prisma.certificate.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true, message: 'Xóa chứng chỉ thành công' });
  } catch (error) {
    console.error('Lỗi API certificates DELETE:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
