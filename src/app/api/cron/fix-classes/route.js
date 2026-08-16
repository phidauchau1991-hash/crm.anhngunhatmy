import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'check') {
      const s1Dates = await prisma.attendanceSummary.findMany({
        where: { classCode: 'CN1_S1_MsMy_7CN_Ca4' },
        orderBy: { date: 'asc' }
      });
  
      return NextResponse.json({ s1: s1Dates });
    }

    if (action === 'delete') {
      const id = parseInt(searchParams.get('id'));
      const dateStr = searchParams.get('date');
      if (!id || !dateStr) return NextResponse.json({ error: 'Missing id or date' });

      await prisma.attendanceSummary.delete({
        where: { id: id }
      });
      await prisma.attendance.deleteMany({
        where: { classCode: 'CN1_S1_MsMy_7CN_Ca4', date: new Date(dateStr) }
      });

      return NextResponse.json({ success: true, message: `Deleted ${id} for S1` });
    }
    
    return NextResponse.json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
