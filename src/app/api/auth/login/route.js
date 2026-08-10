import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Thiếu tên đăng nhập hoặc mật khẩu.' }, { status: 400 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Tài khoản không tồn tại hoặc đã bị khóa.' }, { status: 401 });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return NextResponse.json({ success: false, error: 'Sai mật khẩu.' }, { status: 401 });
    }

    // Create JWT
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      branchId: user.branchId
    };

    const token = await signToken(payload);

    // Set cookie
    const response = NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        branchId: user.branchId
      }
    });

    response.cookies.set({
      name: 'crm_token',
      value: token,
      httpOnly: true,
      secure: false, // temporarily disable secure requirement for HTTP access
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server nội bộ.' }, { status: 500 });
  }
}
