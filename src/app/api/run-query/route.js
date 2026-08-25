import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    await prisma.student.deleteMany({ where: { id: 'HV2608_007' }}); 
    await prisma.student.updateMany({ where: { id: 'HV2608_006' }, data: { status: 'Đang học' }}); 
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message, stack: err.stack });
  }
}
