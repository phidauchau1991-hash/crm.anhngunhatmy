
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
async function main() {
  try {
    const hash = await bcrypt.hash('NhatMy@2026', 10);
    const updated = await prisma.user.updateMany({
      where: { username: 'admin' },
      data: { password: hash }
    });
    console.log('Password updated to NhatMy@2026. Updated count:', updated.count);
  } catch (e) {
    console.error('Error updating password:', e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
