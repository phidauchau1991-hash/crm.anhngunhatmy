import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request) {
  try {
    const token = request.cookies.get('crm_token')?.value;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Token không hợp lệ' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: payload
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
