const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function run() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const res = await ssh.execCommand('cd /var/www/nhat-my-crm && node -e "const db = require(\'better-sqlite3\')(\'dev.db\'); console.log(db.prepare(\'SELECT id, studentId, billingType FROM Enrollment WHERE billingType != \\\'COURSE\\\' AND billingType IS NOT NULL\').all());"');
  console.log("OUT:", res.stdout);
  console.log("ERR:", res.stderr);
  
  // also get the pm2 logs for the API request to see if it crashed
  const logRes = await ssh.execCommand('tail -n 50 /root/.pm2/logs/nhat-my-crm-error.log');
  console.log("PM2 ERR:", logRes.stdout);
  process.exit(0);
}
run();
