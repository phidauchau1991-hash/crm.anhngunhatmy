const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function testApiDirectly() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });

    const script = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const inv = await prisma.monthlyInvoice.findFirst({
    where: { studentId: 'HV2609_003', monthYear: '09/2026' },
    include: { student: true, class: true }
  });
  console.log(JSON.stringify(inv, null, 2));
}
run().finally(() => prisma['$disconnect']());
`;
    await ssh.execCommand("cat << 'EOF' > /tmp/test_hiep.js" + script + "\nEOF");
    const res = await ssh.execCommand("node /tmp/test_hiep.js", { cwd: '/var/www/nhat-my-crm' });
    console.log('Result:');
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}

testApiDirectly();
