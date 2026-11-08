import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const studentIds = body.studentIds;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Danh sách mã học viên không hợp lệ' },
        { status: 400 }
      );
    }

    const now = new Date();
    await prisma.student.updateMany({
      where: { id: { in: studentIds } },
      data: { coursewareLetterExportedAt: now },
    });

    return NextResponse.json({
      success: true,
      message: `Đã đánh dấu xuất thư thành công cho ${studentIds.length} học viên.`,
      exportedAt: now.toISOString(),
      studentIds,
    });
  } catch (error) {
    console.error('Lỗi đánh dấu xuất thư hàng loạt:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
