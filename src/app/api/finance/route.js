import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDateRangeFromPreset } from '@/lib/dateHelpers';
import { getBranchFilter } from '@/lib/rbac';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || ''; // 'paid', 'unpaid', 'partial', 'all'
    const search = searchParams.get('search') || '';
    const preset = searchParams.get('preset') || 'all';
    const customStart = searchParams.get('startDate') || '';
    const customEnd = searchParams.get('endDate') || '';

    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    let where = {
      ...branchFilter,
    };

    // Tìm kiếm theo từ khóa
    if (search) {
      where.OR = [
        { student: { name: { contains: search } } },
        { studentId: { contains: search } },
        { classCode: { contains: search } },
        { id: { contains: search } }
      ];
    }

    // Lọc theo trạng thái thanh toán
    if (status && status !== 'all') {
      where.paymentStatus = status === 'paid' ? 'Đã đóng' : (status === 'unpaid' ? 'Chưa đóng' : 'Chưa đóng đủ');
    }

    // Lọc theo mốc thời gian phát sinh hóa đơn / giao dịch
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const orders = await prisma.orderFinance.findMany({
      where,
      include: {
        student: {
          select: {
            name: true,
            phone: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Tính toán số liệu thống kê doanh thu / công nợ cho mốc thời gian lọc (chỉ lọc theo ngày & từ khóa, không lọc theo paymentStatus để thấy tổng quan)
    let statsWhere = {};
    if (search) statsWhere.OR = where.OR;
    if (startDate || endDate) statsWhere.createdAt = where.createdAt;

    const filteredStatsOrders = await prisma.orderFinance.findMany({ where: statsWhere });
    const stats = {
      totalRevenue: filteredStatsOrders.reduce((sum, o) => sum + o.amountPaid, 0),
      totalDebt: filteredStatsOrders.reduce((sum, o) => sum + Math.max(0, o.feeToPay - o.amountPaid), 0),
      totalFeeToPay: filteredStatsOrders.reduce((sum, o) => sum + o.feeToPay, 0),
      totalOrdersCount: filteredStatsOrders.length,
      unpaidOrdersCount: filteredStatsOrders.filter(o => o.amountPaid < o.feeToPay).length
    };

    return NextResponse.json({
      success: true,
      data: orders,
      stats,
      filter: { preset, customStart, customEnd }
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu tài chính:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Tạo hóa đơn thủ công (Cho học viên cũ / học giữa chừng)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      studentId,
      classCode,
      promoType,
      promoDiscount,
      feeToPay,
      amountPaid,
      paymentStatus,
      paymentDeadline,
      giftName,
      paymentPolicy,
      notes
    } = body;

    if (!studentId || !classCode || feeToPay === undefined) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin Học viên, Lớp học hoặc Học phí phải đóng' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json({ success: false, error: 'Học viên không tồn tại' }, { status: 404 });
    }

    const classInfo = await prisma.class.findUnique({ where: { code: classCode } });
    if (!classInfo) {
      return NextResponse.json({ success: false, error: 'Lớp học không tồn tại' }, { status: 404 });
    }

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');

    const now = new Date();
    const year = String(now.getFullYear()).substring(2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `ORD_MAN_${year}${month}_${random}`;

    // Tạo hóa đơn thủ công
    const newOrder = await prisma.orderFinance.create({
      data: {
        id: orderId,
        studentId,
        classCode,
        promoType: promoType || 'Tạo thủ công' + (notes ? ` (${notes})` : ''),
        promoDiscount: parseFloat(promoDiscount) || 0,
        feeToPay: parseFloat(feeToPay) || 0,
        amountPaid: parseFloat(amountPaid) || 0,
        paymentStatus: paymentStatus || (parseFloat(amountPaid) >= parseFloat(feeToPay) ? 'Đã đóng' : 'Chưa đóng'),
        paymentPolicy: paymentPolicy || 'Đóng trước',
        paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        giftName: giftName || null,
        branchId: branchId || process.env.DEFAULT_BRANCH_ID || "CN1",
      }
    });

    return NextResponse.json({ success: true, message: 'Tạo hóa đơn học phí thủ công thành công', data: newOrder });
  } catch (error) {
    console.error('Lỗi khi tạo hóa đơn thủ công:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
