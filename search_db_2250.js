const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function q() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  
  console.log('--- Search 2250000 in dev.db ---');
  let res = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT * FROM MonthlyInvoice WHERE previousDebt = 2250000 OR totalToPay = 2250000 OR currentFee = 2250000;\"");
  console.log('MonthlyInvoice with 2250000:', res.stdout);

  res = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT * FROM OrderFinance WHERE feeToPay = 2250000 OR amountPaid = 2250000;\"");
  console.log('OrderFinance with 2250000:', res.stdout);

  res = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT * FROM Attendance WHERE studentId = 'HV2609_003';\"");
  console.log('HV2609_003 Attendance count:', res.stdout.split('\n').length);

  ssh.dispose();
}
q();
