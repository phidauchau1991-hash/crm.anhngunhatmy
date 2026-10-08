const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function q() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const res = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT id, name FROM Student WHERE id = 'HV2609_002';\"");
  console.log('HV2609_002:', res.stdout);
  const res2 = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT * FROM MonthlyInvoice WHERE studentId = 'HV2609_002';\"");
  console.log('HV2609_002 Invoice:', res2.stdout);
  ssh.dispose();
}
q();
