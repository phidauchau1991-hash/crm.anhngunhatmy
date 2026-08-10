const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function check() {
  const m2Students = await prisma.student.findMany({
    where: { enrollments: { some: { classCode: 'CN1_M2_MsMy_35_01' } } },
    include: { orders: true }
  });
  console.log('--- M2 Students ---');
  for (const s of m2Students) {
    console.log(`${s.id}: ${s.name} | Orders: ${s.orders.map(o => `${o.feeToPay}đ (paid: ${o.amountPaid}đ)`).join(', ')}`);
  }

  const s3Students = await prisma.student.findMany({
    where: { enrollments: { some: { classCode: 'CN1_S3_MsMy_7CN_Ca1' } } }
  });
  console.log(`\n--- S3 Students (${s3Students.length}) ---`);

  const m1Students = await prisma.student.findMany({
    where: { enrollments: { some: { classCode: 'CN1_M1_MsMy_7CN_Ca2' } } }
  });
  console.log(`\n--- M1 Students (${m1Students.length}) ---`);
}

check().finally(() => prisma.$disconnect());
