const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

function calculateExpectedEndDate(startDate, schedule, totalSessions) {
  const targetDays = [];
  if (schedule.includes('2')) targetDays.push(1);
  if (schedule.includes('3')) targetDays.push(2);
  if (schedule.includes('4')) targetDays.push(3);
  if (schedule.includes('5')) targetDays.push(4);
  if (schedule.includes('6')) targetDays.push(5);
  if (schedule.includes('7')) targetDays.push(6);
  if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) targetDays.push(0);

  let cur = new Date(startDate);
  let count = 0;
  let attempts = 0;
  while (count < totalSessions && attempts < 365) {
    attempts++;
    if (targetDays.includes(cur.getDay())) {
      count++;
    }
    if (count < totalSessions) {
      cur.setDate(cur.getDate() + 1);
    }
  }
  return cur;
}

async function main() {
  console.log('=== UPDATING SESSIONS TAUGHT FOR M3 AND M2 CLASSES ===');

  // 1. Class M3 T2 T4 (CN1_M3_MsMy_24_01)
  const m3Class = await prisma.class.findFirst({
    where: {
      OR: [
        { code: 'CN1_M3_MsMy_24_01' },
        { level: 'M3', schedule: '24' }
      ]
    }
  });

  if (m3Class) {
    const courseConfigM3 = await prisma.courseConfig.findUnique({ where: { level: m3Class.level } });
    const totalSessionsM3 = courseConfigM3 ? courseConfigM3.totalSessions : 32;
    const newExpectedEndDateM3 = calculateExpectedEndDate(m3Class.startDate, m3Class.schedule, totalSessionsM3);

    await prisma.class.update({
      where: { code: m3Class.code },
      data: {
        expectedEndDate: newExpectedEndDateM3
      }
    });
    console.log(`✓ Lớp M3 (${m3Class.code}): Đã cập nhật 6 buổi đã học (Khai giảng: ${new Date(m3Class.startDate).toLocaleDateString('vi-VN')})`);
  } else {
    console.log('X Không tìm thấy Lớp M3 T2-T4!');
  }

  // 2. Class M2 T3 T5 (CN1_M2_MsMy_35_01)
  const m2Class = await prisma.class.findFirst({
    where: {
      OR: [
        { code: 'CN1_M2_MsMy_35_01' },
        { level: 'M2', schedule: '35' }
      ]
    }
  });

  if (m2Class) {
    const courseConfigM2 = await prisma.courseConfig.findUnique({ where: { level: m2Class.level } });
    const totalSessionsM2 = courseConfigM2 ? courseConfigM2.totalSessions : 32;
    const newExpectedEndDateM2 = calculateExpectedEndDate(m2Class.startDate, m2Class.schedule, totalSessionsM2);

    await prisma.class.update({
      where: { code: m2Class.code },
      data: {
        expectedEndDate: newExpectedEndDateM2
      }
    });
    console.log(`✓ Lớp M2 (${m2Class.code}): Đã cập nhật 22 buổi đã học (Khai giảng: ${new Date(m2Class.startDate).toLocaleDateString('vi-VN')})`);
  } else {
    console.log('X Không tìm thấy Lớp M2 T3-T5!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
