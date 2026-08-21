import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  // Fix Students
  const studentsFixed = await prisma.student.updateMany({
    where: { status: 'Ä ang há» c' },
    data: { status: 'Đang học' }
  });

  // Fix Enrollments
  const enrollmentsFixed = await prisma.enrollment.updateMany({
    where: { status: 'Ä ang há» c' },
    data: { status: 'Đang học' }
  });

  return NextResponse.json({
    success: true,
    studentsFixed: studentsFixed.count,
    enrollmentsFixed: enrollmentsFixed.count
  });
}
