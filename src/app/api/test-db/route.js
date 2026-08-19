import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const enrolls = await prisma.enrollment.findMany({
      include: { class: true, student: true }
    });
    
    let badEnrolls = [];
    for (const e of enrolls) {
      if (!e.class) {
        badEnrolls.push({ id: e.id, classCode: e.classCode, studentId: e.studentId });
      }
    }

    const orders = await prisma.orderFinance.findMany({
      include: { class: true }
    });
    let badOrders = [];
    for (const o of orders) {
      if (!o.class && o.classCode && o.classCode !== 'THU_GIAO_TRINH') {
        badOrders.push({ id: o.id, classCode: o.classCode });
      }
    }

    return NextResponse.json({ badEnrolls, badOrders });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
