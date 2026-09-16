import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        billingType: { in: ['MONTHLY_PREPAID', 'MONTHLY_POSTPAID'] },
      },
      include: {
        student: true,
        class: true,
      },
    });
    return NextResponse.json(enrollments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { enrollmentId, billingType, monthlyRate, monthlySessions } = await request.json();
    const updated = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        billingType,
        monthlyRate: monthlyRate || null,
        monthlySessions: monthlySessions || null,
      }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
