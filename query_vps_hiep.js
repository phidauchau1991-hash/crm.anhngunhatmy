const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function query() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    let res = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT * FROM Student WHERE id = \'HV2609_003\';"');
    console.log('HV2609_003 Student:', res.stdout);

    let res2 = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT * FROM MonthlyInvoice WHERE studentId = \'HV2609_003\';"');
    console.log('HV2609_003 Invoices:', res2.stdout);

    let res3 = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT * FROM MonthlyInvoice WHERE monthYear = \'08/2026\' OR monthYear = \'07/2026\';"');
    console.log('August / July Invoices:', res3.stdout);

    let res4 = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT * FROM OrderFinance WHERE studentId = \'HV2609_003\';"');
    console.log('HV2609_003 OrderFinance:', res4.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
query();
