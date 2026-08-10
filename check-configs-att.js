const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function check() {
  const configs = await prisma.courseConfig.findMany();
  console.log('--- CourseConfigs ---');
  console.table(configs);

  const classes = await prisma.class.findMany();
  console.log('\n--- Classes & Attendance Count ---');
  for (const c of classes) {
    const uniqueDates = await prisma.attendance.groupBy({
      by: ['date'],
      where: { classCode: c.code },
    });
    console.log(`${c.code} (${c.level}): ${uniqueDates.length} sessions taught.`);
  }
}

check().finally(() => prisma.$disconnect());
