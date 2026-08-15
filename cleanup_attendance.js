const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getHolidayForDate(date, classCode, schedule, holidays) {
  const normalizedTime = new Date(date).setHours(0, 0, 0, 0);

  for (const h of holidays) {
    const start = new Date(h.startDate).setHours(0, 0, 0, 0);
    const end = new Date(h.endDate).setHours(0, 0, 0, 0);

    if (normalizedTime >= start && normalizedTime <= end) {
      if (h.scope === 'GLOBAL') return h;
      if (h.scope === 'SHIFT' && h.targetId === schedule) return h;
      if (h.scope === 'CLASS' && h.targetId === classCode) return h;
    }
  }
  return null;
}

async function main() {
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

  console.log(`Clean up finished. Deleted ${deletedCount} invalid dates.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
