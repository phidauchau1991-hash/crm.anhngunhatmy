import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentId, alertKey, reason, dismissedBy } = body;

    if (!studentId || !alertKey) {
      return NextResponse.json({ success: false, error: 'Thiếu studentId hoặc alertKey' }, { status: 400 });
    }

    const record = await prisma.tutoringAlertDismissal.upsert({
      where: {
        studentId_alertKey: {
          studentId,
          alertKey
        }
      },
      update: {
        reason: reason || 'Đã xử lý / Bỏ qua',
        dismissedBy: dismissedBy || 'Nhân viên CRM'
      },
      create: {
        studentId,
        alertKey,
        reason: reason || 'Đã xử lý / Bỏ qua',
        dismissedBy: dismissedBy || 'Nhân viên CRM'
      }
    });

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error('Lỗi bỏ qua cảnh báo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
