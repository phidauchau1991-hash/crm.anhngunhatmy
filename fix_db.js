const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.enrollment.updateMany({
    where: {
      status: { not: 'Đang học' }
    },
    data: {
      status: 'Đang học'
    }
  });
  console.log('Updated enrollments:', result.count);
  
  const studentResult = await prisma.student.updateMany({
    where: {
      status: { not: 'Đang học' }
    },
    data: {
      status: 'Đang học'
    }
  });
  console.log('Updated students:', studentResult.count);
}
main().catch(console.error).finally(() => prisma.$disconnect());
