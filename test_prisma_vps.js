const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testApiDirectly() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });

    const testScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const inv = await prisma.monthlyInvoice.findFirst({
    where: { studentId: 'HV2609_003', monthYear: '09/2026' },
    include: { student: true, class: true }
  });
  console.log(JSON.stringify(inv, null, 2));
}
run().finally(() => prisma.$disconnect());
`;

    const res = await ssh.execCommand(`node -e "${testScript.replace(/\n/g, ' ')}"`, { cwd: '/var/www/nhat-my-crm' });
    console.log('Direct Prisma Invoice for HV2609_003:');
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

testApiDirectly();
