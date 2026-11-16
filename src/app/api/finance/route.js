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
        },
        paymentLogs: {
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Tính toán số liệu công nợ theo kỳ & chi nhánh (cùng branchFilter để không lệch chi nhánh)
    const statsWhere = { ...branchFilter };
    if (search) statsWhere.OR = where.OR;
    if (startDate || endDate) statsWhere.createdAt = where.createdAt;

    const filteredStatsOrders = await prisma.orderFinance.findMany({ where: statsWhere });

    // Tính DOANH THU THU THỰC TẾ dựa theo ngày dòng tiền thật (PaymentLog.createdAt & MonthlyPaymentLog.createdAt)
    const logDateFilter = (startDate || endDate)
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          }
        }
      : {};

    const orderLogRelationFilter = {
      ...branchFilter,
      ...(search ? { OR: where.OR } : {}),
    };

    const courseLogs = await prisma.paymentLog.findMany({
      where: {
        ...logDateFilter,
        ...(Object.keys(orderLogRelationFilter).length > 0 ? { order: orderLogRelationFilter } : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            studentId: true,
            classCode: true,
            student: { select: { name: true, phone: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const monthlyLogRelationFilter = {
      student: { ...branchFilter },
      ...(search
        ? {
            OR: [
              { student: { name: { contains: search } } },
              { studentId: { contains: search } },
              { classCode: { contains: search } },
              { paymentCode: { contains: search } },
            ],
          }
        : {}),
    };

    const monthlyLogs = await prisma.monthlyPaymentLog.findMany({
      where: {
        ...logDateFilter,
        invoice: monthlyLogRelationFilter,
      },
      include: {
        invoice: {
          select: {
            id: true,
            paymentCode: true,
            studentId: true,
            classCode: true,
            monthYear: true,
            student: { select: { name: true, phone: true } },
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    const courseRevenue = courseLogs.reduce((sum, l) => sum + (l.amount || 0), 0);
    const monthlyRevenue = monthlyLogs.reduce((sum, l) => sum + (l.amount || 0), 0);
    const allLogsCombined = [
      ...courseLogs.map(l => ({
        id: `C_${l.id}`,
        type: 'COURSE',
        refId: l.orderId,
        studentId: l.order?.studentId,
        studentName: l.order?.student?.name || 'Học viên',
        classCode: l.order?.classCode || '',
        amount: l.amount,
        paymentMethod: l.paymentMethod,
        notes: l.notes,
        createdAt: l.createdAt,
      })),
      ...monthlyLogs.map(l => ({
        id: `M_${l.id}`,
        type: 'MONTHLY',
        refId: l.invoice?.paymentCode || `HP#${l.invoiceId}`,
        studentId: l.invoice?.studentId,
        studentName: l.invoice?.student?.name || 'Học viên',
        classCode: `${l.invoice?.classCode || ''} (T${l.invoice?.monthYear || ''})`,
        amount: l.amount,
        paymentMethod: l.paymentMethod,
        notes: l.notes,
        createdAt: l.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const cashRevenue = allLogsCombined
      .filter(l => (l.paymentMethod || '').toLowerCase().includes('tiền mặt'))
      .reduce((s, l) => s + (l.amount || 0), 0);
    const transferRevenue = allLogsCombined
      .filter(l => !(l.paymentMethod || '').toLowerCase().includes('tiền mặt'))
      .reduce((s, l) => s + (l.amount || 0), 0);

    // Công nợ thực tế hiện tại theo học phí tháng chưa thu đủ (cùng chi nhánh)
    const unpaidMonthly = await prisma.monthlyInvoice.findMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        student: { ...branchFilter },
      },
      select: { totalToPay: true, amountPaid: true },
    });
    const monthlyDebt = unpaidMonthly.reduce((sum, m) => sum + Math.max(0, (m.totalToPay || 0) - (m.amountPaid || 0)), 0);

    const stats = {
      totalRevenue: Math.round(courseRevenue + monthlyRevenue),
      courseRevenue: Math.round(courseRevenue),
      monthlyRevenue: Math.round(monthlyRevenue),
      cashRevenue: Math.round(cashRevenue),
      transferRevenue: Math.round(transferRevenue),
      totalDebt: Math.round(filteredStatsOrders.reduce((sum, o) => sum + Math.max(0, o.feeToPay - o.amountPaid), 0)),
      monthlyDebt: Math.round(monthlyDebt),
      totalFeeToPay: Math.round(filteredStatsOrders.reduce((sum, o) => sum + o.feeToPay, 0)),
      totalOrdersCount: filteredStatsOrders.length,
      unpaidOrdersCount: filteredStatsOrders.filter(o => o.amountPaid < o.feeToPay).length,
      paymentLogsCount: allLogsCombined.length,
    };

    return NextResponse.json({
      success: true,
      data: orders,
      cashflowLogs: allLogsCombined,
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

    const userBranchId = request.headers.get('x-user-branch');

    const now = new Date();
    const year = String(now.getFullYear()).substring(2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderId = `ORD_MAN_${year}${month}_${random}`;

    const parsedFeeToPay = Math.round(parseFloat(feeToPay) || 0);
    const parsedAmountPaid = Math.round(parseFloat(amountPaid) || 0);
    const computedStatus =
      paymentStatus ||
      (parsedFeeToPay <= 0 || parsedAmountPaid >= parsedFeeToPay
        ? 'Đã đóng'
        : parsedAmountPaid > 0
          ? 'Chưa đóng đủ'
          : 'Chưa đóng');
    const effectiveBranchId = student.branchId || classInfo.branchId || userBranchId || 'CN1_BinhDuong';

    // Tạo hóa đơn thủ công kèm PaymentLog nếu có thu tiền ngay
    const newOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.orderFinance.create({
        data: {
          id: orderId,
          studentId,
          classCode,
          promoType: promoType || 'Tạo thủ công' + (notes ? ` (${notes})` : ''),
          promoDiscount: parseFloat(promoDiscount) || 0,
          feeToPay: parsedFeeToPay,
          amountPaid: parsedAmountPaid,
          paymentStatus: computedStatus,
          paymentPolicy: paymentPolicy || 'Đóng trước',
          paymentDeadline: paymentDeadline ? new Date(paymentDeadline) : new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
          giftName: giftName || null,
          branchId: effectiveBranchId,
        }
      });

      if (parsedAmountPaid > 0) {
        const tsCode = now.toISOString().replace(/[-:T]/g, '').slice(2, 8);
        const receiptCode = `PT-${tsCode}-${random}`;
        await tx.paymentLog.create({
          data: {
            orderId,
            amount: parsedAmountPaid,
            paymentMethod: body.paymentMethod || 'Chuyển khoản',
            notes: `Thu ngay khi lập hóa đơn thủ công (${receiptCode})${notes ? ` - ${notes}` : ''}`,
          }
        });
      }

      return created;
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({ success: true, message: 'Tạo hóa đơn học phí thủ công thành công', data: newOrder });
  } catch (error) {
    console.error('Lỗi khi tạo hóa đơn thủ công:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
