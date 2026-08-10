const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const script = `
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
`;

async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  await ssh.execCommand('echo "' + script.replace(/"/g, '\\"') + '" > /var/www/nhat-my-crm/test_db.js');
  const res = await ssh.execCommand('node /var/www/nhat-my-crm/test_db.js', { cwd: '/var/www/nhat-my-crm' });
  console.log('Output:', res.stdout);
  if (res.stderr) console.log('Error:', res.stderr);
  process.exit(0);
}
run();
