import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  const st = await prisma.student.findFirst({where: {name: 'BÙI LÊ AN NHIÊN'}});
  if (!st) return NextResponse.json({error: 'Not found'});
  const enrs = await prisma.enrollment.findMany({where: {studentId: st.id}});
  return NextResponse.json({ st, enrs });
}
