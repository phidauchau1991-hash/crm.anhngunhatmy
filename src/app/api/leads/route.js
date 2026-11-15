import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBranchFilter } from '@/lib/rbac';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    let where = {
      ...branchFilter,
      OR: [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ]
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    const stats = {
      total: leads.length,
      newLeads: leads.filter(l => l.status === 'Mới').length,
      inProgress: leads.filter(l => l.status === 'Đang tư vấn' || l.status === 'Học thử').length,
      converted: leads.filter(l => l.status === 'Đã chốt').length,
      lost: leads.filter(l => l.status === 'Trượt').length,
    };

    return NextResponse.json({ success: true, data: leads, stats });
  } catch (error) {
    console.error('Lỗi khi lấy danh sách Leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, phone, dob, email, address, painPoints, goals, status, trialClassCode, trialStartDate, notes, salesRep, followUpDate, followUpNote } = body;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Tên khách hàng là bắt buộc' }, { status: 400 });
    }

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');

    const parseVnDateOnly = (val) => {
      if (!val) return null;
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(`${str}T00:00:00+07:00`);
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };
    
    const lead = await prisma.lead.create({
      data: {
        name,
        phone: phone || null,
        dob: parseVnDateOnly(dob),
        email: email || null,
        address: address || null,
        painPoints: painPoints || null,
        goals: goals || null,
        status: status || 'Mới',
        trialClassCode: status === 'Học thử' ? (trialClassCode || null) : null,
        trialStartDate: status === 'Học thử' ? parseVnDateOnly(trialStartDate) : null,
        followUpDate: parseVnDateOnly(followUpDate),
        followUpNote: followUpNote || null,
        notes: notes || null,
        salesRep: salesRep || null,
        branchId: body.branchId || branchId || process.env.DEFAULT_BRANCH_ID || "CN1_BinhDuong",
        lastContacted: new Date(),
      }
    });

    return NextResponse.json({ success: true, message: 'Thêm khách hàng tiềm năng thành công', data: lead });
  } catch (error) {
    console.error('Lỗi khi tạo Lead:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, name, phone, dob, email, address, painPoints, goals, status, trialClassCode, trialStartDate, notes, salesRep, followUpDate, followUpNote } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu ID khách hàng' }, { status: 400 });
    }

    const idNum = parseInt(id, 10);
    if (isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'ID khách hàng không hợp lệ' }, { status: 400 });
    }

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    const existingLead = await prisma.lead.findFirst({
      where: { id: idNum, ...branchFilter }
    });

    if (!existingLead) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng hoặc không có quyền' }, { status: 404 });
    }

    const parseVnDateOnly = (val) => {
      if (!val) return null;
      const str = String(val).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(`${str}T00:00:00+07:00`);
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    };

    const nextStatus = status || 'Mới';
    // Giữ lại thông tin lớp học thử khi Lead chuyển sang 'Đã chốt' hoặc 'Trượt' để phục vụ Ghi danh & thống kê
    const keepTrialHistory = ['Học thử', 'Đã chốt', 'Trượt'].includes(nextStatus);
    const nextTrialClass = keepTrialHistory
      ? (trialClassCode !== undefined ? (trialClassCode || null) : existingLead.trialClassCode)
      : null;
    const nextTrialStart = keepTrialHistory
      ? (trialStartDate !== undefined ? parseVnDateOnly(trialStartDate) : existingLead.trialStartDate)
      : null;

    const lead = await prisma.lead.update({
      where: { id: idNum },
      data: {
        name,
        phone: phone || null,
        dob: parseVnDateOnly(dob),
        email: email || null,
        address: address || null,
        painPoints: painPoints || null,
        goals: goals || null,
        status: nextStatus,
        trialClassCode: nextTrialClass,
        trialStartDate: nextTrialStart,
        followUpDate: parseVnDateOnly(followUpDate),
        followUpNote: followUpNote || null,
        notes: notes || null,
        salesRep: salesRep || null,
        lastContacted: new Date(),
      }
    });

    return NextResponse.json({ success: true, message: 'Cập nhật thành công', data: lead });
  } catch (error) {
    console.error('Lỗi khi cập nhật Lead:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idNum = parseInt(id, 10);

    if (!id || isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'Thiếu hoặc sai ID khách hàng' }, { status: 400 });
    }

    const userRole = request.headers.get('x-user-role');
    const branchId = request.headers.get('x-user-branch');
    const selectedBranch = request.headers.get('x-selected-branch');
    const branchFilter = getBranchFilter(userRole, branchId, selectedBranch, 'finance');

    const existingLead = await prisma.lead.findFirst({
      where: { id: idNum, ...branchFilter }
    });
    if (!existingLead) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy khách hàng hoặc không có quyền xóa' }, { status: 404 });
    }

    await prisma.lead.delete({
      where: { id: idNum }
    });

    return NextResponse.json({ success: true, message: 'Xóa khách hàng thành công' });
  } catch (error) {
    console.error('Lỗi khi xóa Lead:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
