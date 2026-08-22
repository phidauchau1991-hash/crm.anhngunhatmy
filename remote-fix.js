const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fix() {
  const st = await prisma.student.updateMany({ where: { status: 'Ä ang há» c' }, data: { status: 'Đang học' } });
  const en = await prisma.enrollment.updateMany({ where: { status: 'Ä ang há» c' }, data: { status: 'Đang học' } });
  console.log('Fixed Students:', st.count);
  console.log('Fixed Enrollments:', en.count);
}
fix().catch(console.error).finally(() => prisma.$disconnect());
