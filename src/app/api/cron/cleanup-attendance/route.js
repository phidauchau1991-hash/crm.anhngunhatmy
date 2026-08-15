import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getHolidayForDate } from '@/lib/holidayHelpers';

export async function GET(request) {
  try {
    const classes = await prisma.class.findMany();
    const holidays = await prisma.holiday.findMany();

    let deletedCount = 0;

    for (const cls of classes) {
      const classStart = new Date(cls.startDate).setHours(0, 0, 0, 0);

      const summaries = await prisma.attendanceSummary.findMany({
        where: { classCode: cls.code },
      });

      for (const summary of summaries) {
        const summaryDate = new Date(summary.date).setHours(0, 0, 0, 0);

        const isBeforeStart = summaryDate < classStart;
        const isHoliday = getHolidayForDate(summary.date, cls.code, cls.schedule, holidays);

        if (isBeforeStart || isHoliday) {
          console.log(`Deleting invalid attendance for class ${cls.code} on date ${summary.date.toISOString()} (Before start: ${isBeforeStart}, Holiday: ${!!isHoliday})`);
          
          await prisma.attendance.deleteMany({
            where: { classCode: cls.code, date: summary.date },
          });

          await prisma.attendanceSummary.delete({
            where: { classCode_date: { classCode: cls.code, date: summary.date } },
          });

          deletedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, deletedCount, message: `Clean up finished. Deleted ${deletedCount} invalid dates.` });
  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
