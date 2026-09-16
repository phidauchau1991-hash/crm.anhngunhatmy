import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const { invoiceId, paymentMethod, amountPaid } = await request.json();
    
    const invoice = await prisma.monthlyInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        notes: `Đã thu ${amountPaid} qua ${paymentMethod}`,
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
