const fs = require('fs');

const payCode = `import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const { invoiceId, paymentMethod, amountPaid } = await request.json();
    
    // Lấy hóa đơn hiện tại
    const existing = await prisma.monthlyInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        student: true,
        class: true,
      }
    });
    
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    const payAmount = Number(amountPaid || 0);
    if (payAmount <= 0) {
      return NextResponse.json({ error: 'Số tiền thanh toán phải lớn hơn 0' }, { status: 400 });
    }

    const currentAmountPaid = Number(existing.amountPaid || 0);
    const newAmountPaid = currentAmountPaid + payAmount;
    const remaining = Math.max(0, Number(existing.totalToPay || 0) - newAmountPaid);
    const newStatus = remaining <= 0.0001 ? 'PAID' : 'PARTIAL';
    
    const oldNotes = existing.notes ? existing.notes + '\\n' : '';
    const newNotes = oldNotes + \`+ Đã thu \${payAmount.toLocaleString('vi-VN')}đ qua \${paymentMethod} (ngày \${new Date().toLocaleDateString('vi-VN')})\`;

    const updated = await prisma.monthlyInvoice.update({
      where: { id: invoiceId },
      data: {
        status: newStatus,
        amountPaid: newAmountPaid,
        previousDebtLocked: true, // 🔒 Khóa nợ cũ
        isLocked: true,           // 🔒 Khóa hóa đơn
        notes: newNotes,
      },
      include: {
        student: true,
        class: true,
      }
    });

    const now = new Date();
    return NextResponse.json({
      success: true,
      invoice: updated,
      snapshot: {
        studentName: existing.student.name,
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
      }
    });
  } catch (error) {
    console.error('Lỗi API thanh toán học phí tháng:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/finance/monthly/pay/route.js', payCode);
console.log('Successfully wrote src/app/api/finance/monthly/pay/route.js');
