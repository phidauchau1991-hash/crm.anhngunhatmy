import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const { invoiceId, paymentMethod, amountPaid } = await request.json();
    const cashier = request.headers.get('x-user-username') || 'Thu ngân';

    const id = parseInt(invoiceId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Mã hóa đơn không hợp lệ' }, { status: 400 });
    }

    // Lấy hóa đơn hiện tại
    const existing = await prisma.monthlyInvoice.findUnique({
      where: { id },
      include: {
        student: true,
        class: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    const payAmount = Math.round(Number(amountPaid || 0));
    if (payAmount <= 0) {
      return NextResponse.json({ error: 'Số tiền thanh toán phải lớn hơn 0' }, { status: 400 });
    }

    const currentAmountPaid = Math.round(Number(existing.amountPaid || 0));
    const newAmountPaid = currentAmountPaid + payAmount;
    const remaining = Math.max(0, Math.round(Number(existing.totalToPay || 0)) - newAmountPaid);
    const newStatus = remaining <= 0.0001 ? 'PAID' : 'PARTIAL';

    const now = new Date();
    const tsCode = now.toISOString().replace(/[-:T]/g, '').slice(2, 8);
    const randStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptCode = `PT-T${(existing.monthYear || '').replace(/[^0-9]/g, '')}-${tsCode}-${randStr}`;

    const oldNotes = existing.notes ? existing.notes + '\n' : '';
    const newNotes =
      oldNotes +
      `+ Đã thu ${payAmount.toLocaleString('vi-VN')}đ qua ${paymentMethod} (${receiptCode} - ngày ${now.toLocaleDateString('vi-VN')})`;

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.monthlyInvoice.update({
        where: { id },
        data: {
          status: newStatus,
          amountPaid: newAmountPaid,
          previousDebtLocked: true, // 🔒 Khóa nợ cũ
          isLocked: true, // 🔒 Khóa hóa đơn
          notes: newNotes,
        },
        include: {
          student: true,
          class: true,
          paymentLogs: { orderBy: { createdAt: 'desc' } },
        },
      });

      await tx.monthlyPaymentLog.create({
        data: {
          invoiceId: id,
          amount: payAmount,
          paymentMethod: paymentMethod || 'Chuyển khoản',
          receiptCode,
          notes: `Thu học phí tháng ${existing.monthYear}`,
          createdBy: cashier,
        },
      });

      return inv;
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({
      success: true,
      invoice: updated,
      snapshot: {
        receiptCode,
        cashier,
        studentName: existing.student?.name || 'Học viên',
        monthYear: existing.monthYear,
        classCode: existing.classCode,
        currentFee: existing.currentFee,
        previousDebt: existing.previousDebt,
        excessMissing: existing.excessMissing,
        totalToPay: existing.totalToPay,
        amountPaidBefore: currentAmountPaid,
        amountThisTime: payAmount,
        amountPaidAfter: newAmountPaid,
        remainingAfter: remaining,
        statusAfter: newStatus,
        paymentMethod,
        date: now.toLocaleDateString('vi-VN'),
        time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      },
    });
  } catch (error) {
    console.error('Lỗi API thanh toán học phí tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}

// DELETE: Hoàn tác / Xóa lần thu gần nhất nếu thu ngân gõ nhầm (Chỉ Giám đốc)
export async function DELETE(request) {
  try {
    const userRole = request.headers.get('x-user-role') || '';
    const roles = userRole.split(',').map((r) => r.trim());
    if (!roles.includes('DIRECTOR') && !roles.includes('REGIONAL_MANAGER')) {
      return NextResponse.json({ error: 'Chỉ Giám đốc mới được hoàn tác khoản thu nhầm' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const invoiceId = parseInt(searchParams.get('invoiceId'), 10);
    const logId = searchParams.get('logId') ? parseInt(searchParams.get('logId'), 10) : null;

    if (isNaN(invoiceId)) {
      return NextResponse.json({ error: 'Mã hóa đơn không hợp lệ' }, { status: 400 });
    }

    const invoice = await prisma.monthlyInvoice.findUnique({
      where: { id: invoiceId },
      include: { paymentLogs: { orderBy: { createdAt: 'desc' } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      let nextPaid = 0;
      if (logId && invoice.paymentLogs.some((l) => l.id === logId)) {
        const target = invoice.paymentLogs.find((l) => l.id === logId);
        await tx.monthlyPaymentLog.delete({ where: { id: logId } });
        nextPaid = Math.max(0, Math.round((invoice.amountPaid || 0) - (target.amount || 0)));
      } else {
        // Hoàn tác toàn bộ về chưa đóng
        await tx.monthlyPaymentLog.deleteMany({ where: { invoiceId } });
        nextPaid = 0;
      }

      const due = Math.round(invoice.totalToPay || 0);
      const nextStatus = due <= 0 || nextPaid >= due ? 'PAID' : nextPaid > 0 ? 'PARTIAL' : 'UNPAID';
      const oldNotes = invoice.notes ? invoice.notes + '\n' : '';

      return await tx.monthlyInvoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: nextPaid,
          status: nextStatus,
          isLocked: nextPaid > 0,
          notes: oldNotes + `[Hoàn tác khoản thu ngày ${new Date().toLocaleDateString('vi-VN')}]`,
        },
      });
    });

    try {
      await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)');
    } catch (_) {}

    return NextResponse.json({ success: true, invoice: updated, message: 'Đã hoàn tác giao dịch thu nhầm thành công!' });
  } catch (error) {
    console.error('Lỗi hoàn tác thu học phí tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống: ' + error.message }, { status: 500 });
  }
}
