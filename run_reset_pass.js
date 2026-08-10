const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
const fs = require('fs');

async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  
  const script = `
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
`;
  
  fs.writeFileSync('reset_admin_pass.js', script);
  await ssh.putFile('reset_admin_pass.js', '/var/www/nhat-my-crm/reset_admin_pass.js');
  
  const res = await ssh.execCommand('node /var/www/nhat-my-crm/reset_admin_pass.js', { cwd: '/var/www/nhat-my-crm' });
  console.log(res.stdout);
  if (res.stderr) console.error(res.stderr);
  process.exit(0);
}
run();
