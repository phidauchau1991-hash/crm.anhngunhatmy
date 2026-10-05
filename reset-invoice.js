const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixInvoice() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    console.log('Resetting invoice...');
    const command = `
cd /var/www/nhat-my-crm
sqlite3 dev.db "UPDATE MonthlyInvoice SET status = 'UNPAID' WHERE studentId = 'HV2609_002' AND monthYear = '09/2026';"
sqlite3 dev.db "SELECT id, studentId, status FROM MonthlyInvoice WHERE studentId = 'HV2609_002';"
    `;

    const res = await ssh.execCommand(command);
    console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);

    ssh.dispose();
  } catch (err) {
    console.error(err);
  }
}
fixInvoice();
