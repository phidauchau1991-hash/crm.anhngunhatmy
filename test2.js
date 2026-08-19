const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.class.findMany({ select: { code: true, schedule: true, startDate: true }});
  console.log("Schedules:", classes);
}

main().catch(console.error).finally(() => prisma.$disconnect());
