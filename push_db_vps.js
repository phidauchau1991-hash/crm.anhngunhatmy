const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function runCommand() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    console.log('Connected! Running ALTER TABLE...');
    const result = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "ALTER TABLE MonthlyInvoice ADD COLUMN amountPaid REAL DEFAULT 0;"');
    console.log("Output: ", result.stdout);
    if (result.stderr) console.error("Error: ", result.stderr);
    
    // Also restart PM2 just in case
    await ssh.execCommand('pm2 reload nhat-my-crm');
    
    console.log('Done.');
    ssh.dispose();
  } catch (err) {
    console.error(err);
    ssh.dispose();
  }
}
runCommand();
