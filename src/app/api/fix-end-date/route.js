export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getHolidayForDate, recalculateClassEndDate } from '@/lib/holidayHelpers';

export async function GET() {
  try {
    const classCode = 'CN1_S3_MsMy_7CN_Ca1';
    const cls = await prisma.class.findUnique({
      where: { code: classCode },
    });
    
    if (!cls) return NextResponse.json({ success: false, error: 'Not found' });
    
    const courseConfig = await prisma.courseConfig.findUnique({
      where: { level: cls.level },
    });
    const totalSessions = courseConfig.totalSessions;
    const holidays = await prisma.holiday.findMany();
    
    let currentDate = new Date(cls.startDate);
    currentDate.setHours(0, 0, 0, 0); 
    let sessionsCount = 0;
    const schedule = cls.schedule;
    
    const targetDays = [0, 6]; // 7CN
    const history = [];

    while (sessionsCount < totalSessions) {
      const dayOfWeek = currentDate.getDay();
      const isDayHoliday = getHolidayForDate(currentDate, classCode, schedule, holidays);
      
      if (isDayHoliday) {
        history.push({ date: currentDate.toLocaleDateString(), event: 'HOLIDAY', name: isDayHoliday.name });
      } else if (targetDays.includes(dayOfWeek)) {
        sessionsCount++;
        history.push({ date: currentDate.toLocaleDateString(), event: 'SESSION', count: sessionsCount });
        if (sessionsCount === totalSessions) break;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Test the recalculate function
    const recalculated = await recalculateClassEndDate(classCode, prisma);
    
    return NextResponse.json({ 
      success: true, 
      startDateFromDb: cls.startDate,
      expectedEndDateInDb: cls.expectedEndDate,
      recalculatedEndDate: recalculated?.expectedEndDate,
      history,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
