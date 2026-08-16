import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'delete237') {
      const summary = await prisma.attendanceSummary.findUnique({ where: { id: 237 } });
      if (!summary) return NextResponse.json({ error: '237 not found' });
      
      const count = await prisma.attendance.deleteMany({
        where: { classCode: 'CN1_S1_MsMy_7CN_Ca4', date: summary.date }
      });
      await prisma.attendanceSummary.delete({ where: { id: 237 } });

      return NextResponse.json({ success: true, deletedAttendance: count.count });
    }

    if (action === 'fixS3') {
      const classInfo = await prisma.class.findUnique({
        where: { code: 'CN1_S3_MsMy_7CN_Ca1' },
        include: { enrollments: true }
      });

      // Insert missing dates: 2026-08-09 and 2026-08-15 (Saturday/Sunday)
      const d1 = new Date('2026-08-09T00:00:00.000Z');
      const d2 = new Date('2026-08-15T00:00:00.000Z');

      const dataS = [
          { classCode: 'CN1_S3_MsMy_7CN_Ca1', date: d1, teacherId: classInfo.teacherId, classNotes: 'Đã hoàn thành' },
          { classCode: 'CN1_S3_MsMy_7CN_Ca1', date: d2, teacherId: classInfo.teacherId, classNotes: 'Đã hoàn thành' }
      ];

      for (const d of dataS) {
         try { await prisma.attendanceSummary.create({ data: d }); } catch (e) {}
      }

      const attendanceData = [];
      for (const enr of classInfo.enrollments) {
        attendanceData.push({
          studentId: enr.studentId, classCode: 'CN1_S3_MsMy_7CN_Ca1', date: d1, status: 'Có mặt', teacherNotes: 'BT đầy đủ'
        });
        attendanceData.push({
          studentId: enr.studentId, classCode: 'CN1_S3_MsMy_7CN_Ca1', date: d2, status: 'Có mặt', teacherNotes: 'BT đầy đủ'
        });
      }

      for (const d of attendanceData) {
         try { await prisma.attendance.create({ data: d }); } catch (e) {}
      }

      await prisma.class.update({
        where: { code: 'CN1_S3_MsMy_7CN_Ca1' },
        data: { status: 'Đã kết thúc' }
      });

      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
