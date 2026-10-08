const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function q() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const res = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT id, studentId, classCode, monthYear, previousDebt, currentFee, totalToPay, amountPaid, status, notes FROM MonthlyInvoice WHERE studentId = 'HV2609_003';\"");
  console.log('HV2609_003 Invoice now:', res.stdout);
  ssh.dispose();
}
q();
