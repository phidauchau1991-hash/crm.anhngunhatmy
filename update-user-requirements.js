const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function setSessions(classCode, targetSessions) {
  console.log(`\n--- Setting ${classCode} to ${targetSessions} sessions taught ---`);
  const cls = await prisma.class.findUnique({
    where: { code: classCode },
    include: { enrollments: true }
  });

  if (!cls) {
    console.log(`Class ${classCode} not found.`);
    return;
  }

  const holidays = await prisma.holiday.findMany();
  const holidaySet = new Set(holidays.map(h => new Date(h.startDate).toDateString()));

  // 1. Delete existing attendances and summaries for this class
  await prisma.attendance.deleteMany({ where: { classCode } });
  await prisma.attendanceSummary.deleteMany({ where: { classCode } });

  // 2. Determine target days of week from schedule
  const targetDays = [];
  const sched = cls.schedule.toString().toUpperCase();
  if (sched.includes('2')) targetDays.push(1);
  if (sched.includes('3')) targetDays.push(2);
  if (sched.includes('4')) targetDays.push(3);
  if (sched.includes('5')) targetDays.push(4);
  if (sched.includes('6')) targetDays.push(5);
  if (sched.includes('7')) targetDays.push(6);
  if (sched.includes('CN') || sched.includes('8') || sched.includes('C')) targetDays.push(0);

  let currentDate = new Date(cls.startDate);
  currentDate.setHours(0, 0, 0, 0);
  let sessionsGenerated = 0;

  while (sessionsGenerated < targetSessions && sessionsGenerated < 200) {
    const dayOfWeek = currentDate.getDay();
    if (targetDays.includes(dayOfWeek) && !holidaySet.has(currentDate.toDateString())) {
      const dateToSave = new Date(currentDate);

      await prisma.attendanceSummary.create({
        data: {
          classCode,
          date: dateToSave,
          classNotes: `Buổi ${sessionsGenerated + 1}`,
          teacherId: null
        }
      });

      for (const enr of cls.enrollments) {
        await prisma.attendance.create({
          data: {
            classCode,
            date: dateToSave,
            studentId: enr.studentId,
            status: 'Có mặt',
            teacherNotes: 'Cập nhật theo tiến độ lớp',
            checkInTime: 'Đúng giờ'
          }
        });
      }

      sessionsGenerated++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log(`✓ Generated ${sessionsGenerated} unique attendance dates for ${classCode}`);
}

async function updateFinance(classCode, isM2 = false) {
  console.log(`\n--- Updating Finance Orders for ${classCode} ---`);
  const enrollments = await prisma.enrollment.findMany({
    where: { classCode },
    include: { student: { include: { orders: true } } }
  });

  for (const enr of enrollments) {
    const s = enr.student;
    for (const order of s.orders) {
      let feeToPay = order.feeToPay;
      let amountPaid = feeToPay;
      let paymentStatus = 'Đã đóng';

      if (isM2 && (s.id === 'HV2607_017' || s.name.toUpperCase().includes('MINH TRÍ'))) {
        amountPaid = Math.max(0, feeToPay - 1300000);
        paymentStatus = 'Chưa đóng đủ';
        console.log(`  -> [Minh Trí] ${s.name} (${s.id}): HP ${feeToPay.toLocaleString('vi-VN')}đ | Đã đóng: ${amountPaid.toLocaleString('vi-VN')}đ | Còn nợ: 1.300.000đ`);
      } else {
        console.log(`  -> ${s.name} (${s.id}): HP ${feeToPay.toLocaleString('vi-VN')}đ | Đã đóng: ${amountPaid.toLocaleString('vi-VN')}đ (${paymentStatus})`);
      }

      await prisma.orderFinance.update({
        where: { id: order.id },
        data: {
          amountPaid,
          paymentStatus
        }
      });
    }
  }
}

async function main() {
  console.log('=== STARTING USER REQUIREMENT UPDATES ===');

  // 1. Lớp S3 Ms My - T7 & CN (CN1_S3_MsMy_7CN_Ca1) -> 33 sessions, all paid
  await updateFinance('CN1_S3_MsMy_7CN_Ca1');
  await setSessions('CN1_S3_MsMy_7CN_Ca1', 33);

  // 2. Lớp M1 Ms My - T7 & CN (CN1_M1_MsMy_7CN_Ca2) -> 25 sessions, all paid
  await updateFinance('CN1_M1_MsMy_7CN_Ca2');
  await setSessions('CN1_M1_MsMy_7CN_Ca2', 25);

  // 3. Lớp M2 Ms My - T3 & T5 (CN1_M2_MsMy_35_01) -> 24 sessions, all paid except Minh Trí (debt 1,300,000)
  await updateFinance('CN1_M2_MsMy_35_01', true);
  await setSessions('CN1_M2_MsMy_35_01', 24);

  console.log('\n=== ALL UPDATES COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error).finally(() => prisma.$disconnect());
