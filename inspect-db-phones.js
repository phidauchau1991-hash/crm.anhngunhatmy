const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const students = await prisma.student.findMany({
    orderBy: { id: 'asc' }
  });
  console.log(`Total students in DB: ${students.length}`);
  students.forEach(s => {
    console.log(`Mã: ${s.id} | Name: ${s.name} | Phone: "${s.phone}" | CCCD: ${s.nationalId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
