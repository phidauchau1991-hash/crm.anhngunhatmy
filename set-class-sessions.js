const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function setSessions(classCode, targetSessions, scheduleStr) {
  console.log(`\n=== Processing ${classCode} -> ${targetSessions} sessions ===`);
  const cls = await prisma.class.findUnique({
    where: { code: classCode },
    include: { enrollments: true }
  });

  if (!cls) {
    console.log(`Class ${classCode} not found.`);
    return;
  }

  // 1. Delete existing attendances
  await prisma.attendance.deleteMany({ where: { classCode } });
  await prisma.attendanceSummary.deleteMany({ where: { classCode } });
  console.log(`Deleted existing attendances for ${classCode}`);

  // 2. Generate new dates
  const targetDays = [];
  if (scheduleStr.includes('2')) targetDays.push(1);
  if (scheduleStr.includes('3')) targetDays.push(2);
  if (scheduleStr.includes('4')) targetDays.push(3);
  if (scheduleStr.includes('5')) targetDays.push(4);
  if (scheduleStr.includes('6')) targetDays.push(5);
  if (scheduleStr.includes('7')) targetDays.push(6);
  if (scheduleStr.includes('CN') || scheduleStr.includes('8') || scheduleStr.toUpperCase().includes('C')) targetDays.push(0);

  let currentDate = new Date(cls.startDate);
  currentDate.setHours(0, 0, 0, 0);
  let sessionsGenerated = 0;
  
  while (sessionsGenerated < targetSessions) {
    const dayOfWeek = currentDate.getDay();
    // Assuming no holidays for simplicity, we just want N sessions
    if (targetDays.includes(dayOfWeek)) {
      const dateToSave = new Date(currentDate);
      
      // Create Summary
      await prisma.attendanceSummary.create({
        data: {
          classCode,
          date: dateToSave,
          classNotes: `Buổi ${sessionsGenerated + 1}`
        }
      });

      // Create Attendances for students
      for (const enr of cls.enrollments) {
        await prisma.attendance.create({
          data: {
            classCode,
            date: dateToSave,
            studentId: enr.studentId,
            status: 'Có mặt'
          }
        });
      }
      sessionsGenerated++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`Generated ${sessionsGenerated} sessions for ${classCode}`);
}

async function main() {
  await setSessions('CN1_M3_MsMy_24_01', 8, '24');
  await setSessions('CN1_M2_MsMy_35_01', 24, '35');
  await setSessions('CN1_S1_MsMy_7CN_Ca4', 6, '7CN');
  await setSessions('CN1_S3_MsMy_35_Ca2', 8, '35');
}

main().catch(console.error).finally(() => prisma.$disconnect());
