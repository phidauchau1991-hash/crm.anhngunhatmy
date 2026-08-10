const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS IN DB ---');
  users.forEach(row => console.log(row.username, '|', row.fullName));
}
main().catch(console.error).finally(() => prisma.$disconnect());
