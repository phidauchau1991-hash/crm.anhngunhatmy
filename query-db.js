const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function checkConfigs() {
  const configs = await prisma.courseConfig.findMany();
  console.log("=== COURSE CONFIGS ===");
  console.log(configs.map(c => ({ id: c.id, program: c.program, capDo: c.capDo, level: c.level, price: c.price, totalSessions: c.totalSessions })));
}

checkConfigs().catch(console.error).finally(() => prisma.$disconnect());
