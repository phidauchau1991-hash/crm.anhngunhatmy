const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const orders = await prisma.orderFinance.findMany({
    include: { student: true }
  });
  console.log('--- DB ORDERS ---');
  for (const o of orders) {
    console.log(`ID: ${o.id} | Student: ${o.student.name} (ID: ${o.studentId}) | Fee: ${o.feeToPay} | Paid: ${o.amountPaid} | Status: ${o.paymentStatus}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
