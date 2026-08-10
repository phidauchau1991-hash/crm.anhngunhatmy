import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    
    if (!month) {
      return NextResponse.json({ success: false, error: 'Vui lòng chọn tháng.' }, { status: 400 });
    }

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr);
    const monthInt = parseInt(monthStr);

    const startDate = new Date(year, monthInt - 1, 1);
    const endDate = new Date(year, monthInt, 0, 23, 59, 59, 999);

    // Lấy tất cả các bản ghi điểm danh trong tháng
    const summaries = await prisma.attendanceSummary.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        teacherId: {
          not: null
        }
      },
      include: {
        class: true
      }
    });

    // Lấy danh sách giáo viên
    const teachers = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'TEACHER' },
          { id: { in: summaries.map(s => s.teacherId).filter(Boolean) } }
        ]
      },
      select: { id: true, fullName: true, username: true }
    });

    const teacherMap = {};
    teachers.forEach(t => {
      teacherMap[t.id] = {
        id: t.id,
        name: t.fullName,
        username: t.username,
        mainClasses: 0,
        substituteClasses: 0,
        totalClasses: 0,
        details: []
      };
    });

    summaries.forEach(s => {
      const tid = s.teacherId;
      if (!teacherMap[tid]) {
        teacherMap[tid] = { id: tid, name: 'Giáo viên đã xóa', username: 'unknown', mainClasses: 0, substituteClasses: 0, totalClasses: 0, details: [] };
      }
      
      const t = teacherMap[tid];
      t.totalClasses += 1;
      
      if (s.isSubstitute) {
        t.substituteClasses += 1;
      } else {
        t.mainClasses += 1;
      }

      t.details.push({
        classCode: s.classCode,
        date: s.date,
        isSubstitute: s.isSubstitute
      });
    });

    const result = Object.values(teacherMap).filter(t => t.totalClasses > 0);

    return NextResponse.json({ success: true, data: result });

  } catch (error) {
    console.error('Lỗi API Bảng Lương:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server' }, { status: 500 });
  }
}
