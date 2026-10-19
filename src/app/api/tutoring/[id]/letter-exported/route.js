import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;

    const plan = await prisma.tutoringPlan.update({
      where: { id },
      data: {
        letterExportedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    console.error('Lỗi cập nhật thời gian xuất thư:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
