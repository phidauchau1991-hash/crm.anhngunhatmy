import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();

    const requestUserRole = request.headers.get('x-user-role');
    const requestBranchId = request.headers.get('x-user-branch');
    const isGlobal = requestUserRole?.includes('DIRECTOR') || requestUserRole?.includes('REGIONAL_MANAGER');

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User không tồn tại.' }, { status: 404 });
    }

    // MANAGER restrictions
    if (!isGlobal) {
      if (targetUser.branchId !== requestBranchId) {
        return NextResponse.json({ success: false, error: 'Không thể sửa tài khoản của chi nhánh khác.' }, { status: 403 });
      }
      if (data.branchId && data.branchId !== requestBranchId) {
        return NextResponse.json({ success: false, error: 'Không thể chuyển tài khoản sang chi nhánh khác.' }, { status: 403 });
      }
      const restrictedRoles = ['DIRECTOR', 'REGIONAL_MANAGER', 'CHIEF_ACCOUNTANT', 'SALES_MANAGER', 'ACADEMIC_MANAGER'];
      if (restrictedRoles.includes(targetUser.role) || (data.role && restrictedRoles.includes(data.role))) {
        return NextResponse.json({ success: false, error: 'Trưởng chi nhánh không được phép sửa tài khoản quản lý cấp cao.' }, { status: 403 });
      }
    }
    
    let updateData = {
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      role: data.role,
      branchId: data.branchId,
      isActive: data.isActive
    };

    if (data.password && data.password.trim() !== '') {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, data: { id: updatedUser.id } });
  } catch (error) {
    console.error('Lỗi cập nhật user:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const requestUserRole = request.headers.get('x-user-role');
    const requestBranchId = request.headers.get('x-user-branch');
    const isGlobal = requestUserRole?.includes('DIRECTOR') || requestUserRole?.includes('REGIONAL_MANAGER');

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ success: false, error: 'User không tồn tại.' }, { status: 404 });
    }

    // MANAGER restrictions
    if (!isGlobal) {
      if (targetUser.branchId !== requestBranchId) {
        return NextResponse.json({ success: false, error: 'Không thể xóa tài khoản của chi nhánh khác.' }, { status: 403 });
      }
      const restrictedRoles = ['DIRECTOR', 'REGIONAL_MANAGER', 'CHIEF_ACCOUNTANT', 'SALES_MANAGER', 'ACADEMIC_MANAGER'];
      if (restrictedRoles.includes(targetUser.role)) {
        return NextResponse.json({ success: false, error: 'Trưởng chi nhánh không được phép xóa tài khoản quản lý cấp cao.' }, { status: 403 });
      }
    }
    
    // Instead of hard deleting, just deactivate
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi vô hiệu hóa user:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
