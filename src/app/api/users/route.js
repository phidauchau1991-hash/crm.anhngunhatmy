import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const isGlobal = userRole?.includes('DIRECTOR') || userRole?.includes('REGIONAL_MANAGER');

    const users = await prisma.user.findMany({
      where: isGlobal ? {} : { branchId: branchId },
      select: {
        id: true,
        username: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        branchId: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ 
      success: true, 
      data: users,
      meta: {
        currentUserRole: userRole,
        currentBranchId: branchId
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy ds user:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.username || !data.password || !data.role) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin bắt buộc (Username, Password, Role).' }, { status: 400 });
    }

    const requestUserRole = request.headers.get('x-user-role');
    const requestBranchId = request.headers.get('x-user-branch');
    const isGlobal = requestUserRole?.includes('DIRECTOR') || requestUserRole?.includes('REGIONAL_MANAGER');

    // MANAGER restrictions
    if (!isGlobal) {
      if (data.branchId !== requestBranchId) {
        return NextResponse.json({ success: false, error: 'Trưởng chi nhánh chỉ được tạo tài khoản cho chi nhánh của mình.' }, { status: 403 });
      }
      const restrictedRoles = ['DIRECTOR', 'REGIONAL_MANAGER', 'CHIEF_ACCOUNTANT', 'SALES_MANAGER', 'ACADEMIC_MANAGER'];
      if (restrictedRoles.includes(data.role)) {
        return NextResponse.json({ success: false, error: 'Trưởng chi nhánh không được phép tạo tài khoản quản lý cấp cao.' }, { status: 403 });
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: data.username }
    });

    if (existingUser) {
      return NextResponse.json({ success: false, error: 'Tên đăng nhập đã tồn tại.' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: data.username,
        password: hashedPassword,
        fullName: data.fullName || data.username,
        phone: data.phone,
        email: data.email,
        role: data.role,
        branchId: data.branchId
      }
    });

    return NextResponse.json({ success: true, data: { id: newUser.id, username: newUser.username } });
  } catch (error) {
    console.error('Lỗi tạo user:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
