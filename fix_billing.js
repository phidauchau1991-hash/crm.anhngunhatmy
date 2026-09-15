const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enrollments = await prisma.enrollment.findMany({ take: 3 });
  for (let i = 0; i < enrollments.length; i++) {
    const enr = enrollments[i];
    await prisma.enrollment.update({
      where: { id: enr.id },
      data: {
        billingType: i % 2 === 0 ? 'MONTHLY_PREPAID' : 'MONTHLY_POSTPAID',
        monthlyRate: 250000,
        monthlySessions: 8
      }
    });
  }
  console.log("Updated 3 enrollments with monthly billing.");
}
main().catch(console.error).finally(() => process.exit(0));
