const fs = require('fs');

const code = `import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const { invoiceId, paymentMethod, amountPaid } = await request.json();
    
    // Get existing invoice
    const existing = await prisma.monthlyInvoice.findUnique({
      where: { id: invoiceId }
    });
    
    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hóa đơn' }, { status: 404 });
    }

    const currentAmountPaid = existing.amountPaid || 0;
    const newAmountPaid = currentAmountPaid + Number(amountPaid || 0);
    const isFullyPaid = newAmountPaid >= existing.totalToPay;
    
    const oldNotes = existing.notes ? existing.notes + '\\n' : '';
    const newNotes = oldNotes + \`+ Đã thu \${Number(amountPaid).toLocaleString('vi-VN')}đ qua \${paymentMethod} (ngày \${new Date().toLocaleDateString('vi-VN')})\`;

    const invoice = await prisma.monthlyInvoice.update({
      where: { id: invoiceId },
      data: {
        status: isFullyPaid ? 'PAID' : 'UNPAID',
        amountPaid: newAmountPaid,
        notes: newNotes,
      },
      include: {
        student: true,
        class: true,
      }
    });

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
`;

fs.writeFileSync('src/app/api/finance/monthly/pay/route.js', code);
console.log("Patched pay route");
