const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function testCreateLead() {
  const lead = await prisma.lead.create({
    data: {
      name: "TEST LEAD DELETE ME",
      phone: "0999999999",
      status: "Mới",
      branchId: "CN1",
      lastContacted: new Date(),
    }
  });
  console.log("Successfully created lead with id:", lead.id);
  await prisma.lead.delete({ where: { id: lead.id } });
  console.log("Successfully cleaned up test lead.");
}
testCreateLead().catch(console.error).finally(() => prisma.$disconnect());
