const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cls = await prisma.class.findUnique({
    where: { code: 'CN1_M1_MsMy_7CN_Ca2' }
  });
  console.log('Class in DB:', cls);
}

main().catch(console.error).finally(() => prisma.$disconnect());
