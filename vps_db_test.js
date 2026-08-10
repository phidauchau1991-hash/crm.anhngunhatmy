const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const users = await prisma.user.count();
    const students = await prisma.student.count();
    console.log('Users:', users, 'Students:', students);
  } catch (e) {
    console.error('Prisma Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
