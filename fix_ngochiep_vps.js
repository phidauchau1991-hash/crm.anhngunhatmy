const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function runCommand() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    const query = "UPDATE MonthlyInvoice SET totalToPay = 4250000, amountPaid = 0, status = 'UNPAID', previousDebt = 2250000 WHERE studentId = 'HV2609_003' AND monthYear = '09/2026';";
    const result = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "' + query + '"');
    console.log("Output:", result.stdout);
    if (result.stderr) console.error("Error:", result.stderr);
    
    ssh.dispose();
  } catch (err) {
    console.error(err);
    ssh.dispose();
  }
}
runCommand();
