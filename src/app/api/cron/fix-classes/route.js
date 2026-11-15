import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: false,
    error: 'Tác vụ debug cũ đã được khóa an toàn để bảo vệ dữ liệu điểm danh.',
  }, { status: 403 });
}
