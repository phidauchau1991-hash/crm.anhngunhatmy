import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBranchFilter } from '@/lib/rbac';

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '_')
    .trim();
}

export async function GET(request) {
  try {
    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'all');

    // Lấy danh sách kho thực tế
    const inventory = await prisma.inventory.findMany({
      where: branchFilter,
      orderBy: { createdAt: 'desc' },
    });

    const stats = {
      totalItems: inventory.length,
      lowStock: inventory.filter(i => i.currentStock > 0 && i.currentStock <= i.threshold).length,
      outOfStock: inventory.filter(i => i.currentStock === 0).length,
    };

    return NextResponse.json({ success: true, data: inventory, stats });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách kho:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { id, name, category, threshold } = body;

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'all');

    if (!id || !name || !category) {
      return NextResponse.json({ success: false, error: 'Vui lòng điền đủ ID, tên và danh mục vật tư' }, { status: 400 });
    }

    const existing = await prisma.inventory.findUnique({ where: { id } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Mã vật tư này đã tồn tại' }, { status: 400 });
    }

    const item = await prisma.inventory.create({
      data: {
        id,
        name,
        category,
        threshold: parseInt(threshold) || 5,
        currentStock: 0,
        branchId: branchFilter.branchId || process.env.DEFAULT_BRANCH_ID || "CN1_BinhDuong"
      },
    });

    return NextResponse.json({ success: true, message: 'Thêm vật tư thành công', data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, category, threshold } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'ID vật tư là bắt buộc' }, { status: 400 });
    }

    const item = await prisma.inventory.update({
      where: { id },
      data: {
        name,
        category,
        threshold: parseInt(threshold) || 5,
      },
    });

    return NextResponse.json({ success: true, message: 'Cập nhật thành công', data: item });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ success: false, error: 'Thiếu ID vật tư' }, { status: 400 });

    const logsCount = await prisma.inventoryLog.count({ where: { inventoryId: id } });
    if (logsCount > 0) {
      return NextResponse.json({ success: false, error: 'Không thể xóa vật tư đã có phát sinh giao dịch. Vui lòng giữ lại để đối soát.' }, { status: 400 });
    }

    await prisma.inventory.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Xóa vật tư thành công' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
