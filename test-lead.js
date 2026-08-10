const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function testLead() {
  const leads = await prisma.lead.findMany();
  console.log('Current leads count:', leads.length);
  if (leads.length > 0) {
    console.log('Sample lead branchId:', leads[0].branchId);
  }
}
testLead().catch(console.error).finally(() => prisma.$disconnect());
