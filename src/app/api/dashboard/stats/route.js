import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDateRangeFromPreset } from '@/lib/dateHelpers';
import { getBranchFilter } from '@/lib/rbac';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset') || 'all';
    const customStart = searchParams.get('startDate') || '';
    const customEnd = searchParams.get('endDate') || '';

    const { startDate, endDate } = getDateRangeFromPreset(preset, customStart, customEnd);

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'all'); // using 'all' to be safe for dashboard

    // Xây dựng điều kiện ngày cho Orders (Doanh thu & Công nợ)
    let orderWhere = { ...branchFilter };
    if (startDate || endDate) {
      orderWhere.createdAt = {};
      if (startDate) orderWhere.createdAt.gte = startDate;
      if (endDate) orderWhere.createdAt.lte = endDate;
    }

    // Xây dựng điều kiện ngày cho Students (Học viên mới trong mốc thời gian)
    let studentDateWhere = { ...branchFilter };
    if (startDate || endDate) {
      studentDateWhere.createdAt = {};
      if (startDate) studentDateWhere.createdAt.gte = startDate;
      if (endDate) studentDateWhere.createdAt.lte = endDate;
    }

    // Xây dựng điều kiện ngày cho Leads
    let leadWhere = { ...branchFilter };
    if (startDate || endDate) {
      leadWhere.createdAt = {};
      if (startDate) leadWhere.createdAt.gte = startDate;
      if (endDate) leadWhere.createdAt.lte = endDate;
    }

    // 1. Thống kê Học viên theo Trạng thái Vận hành
    // Thống kê toàn bộ (Realtime current status)
    const allStudents = await prisma.student.findMany({ where: branchFilter });
    const statusCounts = {
      studying: allStudents.filter(s => s.status === 'Đang học').length,
      paused: allStudents.filter(s => s.status === 'Tạm nghỉ').length,
      reserved: allStudents.filter(s => s.status === 'Bảo lưu').length,
      dropout: allStudents.filter(s => s.status === 'Nghỉ luôn' || s.status === 'Thôi học').length,
      total: allStudents.length
    };

    // Số học viên mới đăng ký trong mốc thời gian đã chọn
    const newStudentsInPeriod = await prisma.student.count({
      where: studentDateWhere
    });

    // 2. Thống kê Tài chính & Doanh thu trong mốc thời gian đã chọn
    const periodOrders = await prisma.orderFinance.findMany({
      where: orderWhere
    });

    const financeStats = {
      revenue: periodOrders.reduce((sum, o) => sum + o.amountPaid, 0),
      debt: periodOrders.reduce((sum, o) => sum + Math.max(0, o.feeToPay - o.amountPaid), 0),
      totalFeeToPay: periodOrders.reduce((sum, o) => sum + o.feeToPay, 0),
      ordersCount: periodOrders.length,
      unpaidOrdersCount: periodOrders.filter(o => o.amountPaid < o.feeToPay).length
    };

    // 3. Thống kê KHTN (Leads) trong mốc thời gian đã chọn
    const totalLeads = await prisma.lead.count({ where: leadWhere });
    const convertedLeads = await prisma.lead.count({
      where: {
        ...leadWhere,
        status: 'Đã chốt'
      }
    });

    // 4. Lớp học hoạt động
    const totalClasses = await prisma.class.count({ where: branchFilter });

    // 5. Cảnh báo Tồn kho
    const inventory = await prisma.inventory.findMany({ where: branchFilter });
    const lowStockItems = inventory.filter(item => item.currentStock <= item.threshold);

    // 6. Cảnh báo chăm sóc lại / hạn bảo lưu (trong 10 ngày tới hoặc quá hạn)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tenDaysLater = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);

    const alertsStudents = await prisma.student.findMany({
      where: {
        ...branchFilter,
        OR: [
          {
            status: 'Tạm nghỉ',
            callbackDate: { not: null, lte: tenDaysLater }
          },
          {
            status: 'Bảo lưu',
            reservationDeadline: { not: null, lte: tenDaysLater }
          }
        ]
      },
      include: {
        enrollments: {
          select: {
            classCode: true
          }
        }
      },
      orderBy: [
        { callbackDate: 'asc' },
        { reservationDeadline: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: {
        filter: {
          preset,
          customStart,
          customEnd,
          startDate: startDate ? startDate.toISOString() : null,
          endDate: endDate ? endDate.toISOString() : null
        },
        statusCounts,
        newStudentsInPeriod,
        financeStats,
        leadsStats: {
          totalLeads,
          convertedLeads,
          conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0
        },
        totalClasses,
        lowStockItems,
        alertsStudents
      }
    });

  } catch (error) {
    console.error('Lỗi khi lấy thống kê Dashboard:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
