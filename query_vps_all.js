const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function query() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    let res = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT id, name FROM Student LIMIT 20;"');
    console.log('Sample students:', res.stdout);

    let res2 = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT id, studentId, monthYear, totalToPay, previousDebt, status FROM MonthlyInvoice;"');
    console.log('All MonthlyInvoices:', res2.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
query();
