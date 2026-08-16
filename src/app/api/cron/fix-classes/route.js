import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'check') {
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
    }

    if (action === 'fixS1') {
      // Find the date for July 26th (either 2026 or 2025)
      const dateStr = searchParams.get('date'); // e.g. 2026-07-26T00:00:00.000Z
      if (!dateStr) return NextResponse.json({ error: 'Missing date' });

      await prisma.attendance.deleteMany({
        where: { classCode: 'CN1_S1_MsMy_7CN_Ca4', date: new Date(dateStr) }
      });
      await prisma.attendanceSummary.deleteMany({
        where: { classCode: 'CN1_S1_MsMy_7CN_Ca4', date: new Date(dateStr) }
      });

      return NextResponse.json({ success: true, message: `Deleted ${dateStr} for S1` });
    }

    if (action === 'fixS3') {
      // Add two more attendance days
      // Last date for S3
      const s3Dates = await prisma.attendance.groupBy({
        by: ['date'],
        where: { classCode: 'CN1_S3_MsMy_7CN_Ca1' },
        orderBy: { date: 'desc' },
        take: 1
      });

      if (s3Dates.length === 0) return NextResponse.json({ error: 'No dates found for S3' });

      const lastDate = new Date(s3Dates[0].date);
      // Generate next 2 dates based on 7CN (Saturday, Sunday)
      let nextDate1 = new Date(lastDate);
      nextDate1.setDate(nextDate1.getDate() + 1);
      while (nextDate1.getDay() !== 6 && nextDate1.getDay() !== 0) {
        nextDate1.setDate(nextDate1.getDate() + 1);
      }

      let nextDate2 = new Date(nextDate1);
      nextDate2.setDate(nextDate2.getDate() + 1);
      while (nextDate2.getDay() !== 6 && nextDate2.getDay() !== 0) {
        nextDate2.setDate(nextDate2.getDate() + 1);
      }

      const classInfo = await prisma.class.findUnique({
        where: { code: 'CN1_S3_MsMy_7CN_Ca1' },
        include: { enrollments: true }
      });

      // Insert for nextDate1
      await prisma.attendanceSummary.create({
        data: {
          classCode: classInfo.code,
          date: nextDate1,
          teacherId: classInfo.teacherId
        }
      });
      for (const enr of classInfo.enrollments) {
        await prisma.attendance.create({
          data: {
            studentId: enr.studentId,
            classCode: classInfo.code,
            date: nextDate1,
            status: 'Có mặt',
            teacherNotes: 'Đã hoàn thành'
          }
        });
      }

      // Insert for nextDate2
      await prisma.attendanceSummary.create({
        data: {
          classCode: classInfo.code,
          date: nextDate2,
          teacherId: classInfo.teacherId
        }
      });
      for (const enr of classInfo.enrollments) {
        await prisma.attendance.create({
          data: {
            studentId: enr.studentId,
            classCode: classInfo.code,
            date: nextDate2,
            status: 'Có mặt',
            teacherNotes: 'Đã hoàn thành'
          }
        });
      }

      // Force update the class status just in case
      await prisma.class.update({
        where: { code: 'CN1_S3_MsMy_7CN_Ca1' },
        data: { status: 'Đã kết thúc' }
      });

      return NextResponse.json({ success: true, message: `Added ${nextDate1.toISOString()} and ${nextDate2.toISOString()} for S3` });
    }

    return NextResponse.json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
