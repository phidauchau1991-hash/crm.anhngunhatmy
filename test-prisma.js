const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  const res1 = await prisma.enrollment.findMany({ where: { status: 'Đang học' } });
  console.log('Matches for Đang học:', res1.length);
  const res2 = await prisma.enrollment.findMany({});
  if (res2.length > 0) {
    console.log('Sample status byte length:', Buffer.from(res2[0].status).length);
    console.log('Sample status:', res2[0].status);
  }
}
test().finally(() => prisma.$disconnect());
