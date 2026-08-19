const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const enrolls = await prisma.enrollment.findMany({
    include: { class: true }
  });
  
  let nullClassCount = 0;
  for (const e of enrolls) {
    if (!e.class) {
      console.log(`Enrollment ID: ${e.id}, classCode: ${e.classCode} has NO CLASS!`);
      nullClassCount++;
    }
  }
  console.log(`Total enrollments with null class: ${nullClassCount}`);
}

check().catch(console.error).finally(() => prisma.$disconnect());
