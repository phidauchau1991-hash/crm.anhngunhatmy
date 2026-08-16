const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- S1 Dates ---');
  const s1Dates = await prisma.attendance.groupBy({
    by: ['date'],
    where: { classCode: 'CN1_S1_MsMy_7CN_Ca4' },
    orderBy: { date: 'asc' }
  });
  s1Dates.forEach(d => console.log(d.date.toISOString()));

  console.log('--- S3 Dates ---');
  const s3Dates = await prisma.attendance.groupBy({
    by: ['date'],
    where: { classCode: 'CN1_S3_MsMy_7CN_Ca1' },
    orderBy: { date: 'asc' }
  });
  s3Dates.forEach(d => console.log(d.date.toISOString()));
}

main().catch(console.error).finally(() => prisma.$disconnect());
