import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const s1Dates = await prisma.attendance.groupBy({
      by: ['date'],
      where: { classCode: 'CN1_S1_MsMy_7CN_Ca4' },
      orderBy: { date: 'asc' }
    });

    const s3Dates = await prisma.attendance.groupBy({
      by: ['date'],
      where: { classCode: 'CN1_S3_MsMy_7CN_Ca1' },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({ 
      s1: s1Dates.map(d => d.date.toISOString()),
      s3: s3Dates.map(d => d.date.toISOString())
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
