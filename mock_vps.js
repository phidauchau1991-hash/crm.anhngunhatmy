const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const fixDbCode = `
const Database = require('better-sqlite3');
const db = new Database('dev.db');

db.exec(\`
  UPDATE Enrollment 
  SET billingType = 'MONTHLY_PREPAID', monthlyRate = 250000, monthlySessions = 8 
  WHERE id IN (
    SELECT id FROM Enrollment LIMIT 3
  );
  
  UPDATE Enrollment 
  SET billingType = 'MONTHLY_POSTPAID', monthlyRate = 250000
  WHERE id IN (
    SELECT id FROM Enrollment LIMIT 3 OFFSET 3
  );
\`);

console.log('Updated 6 enrollments successfully.');
db.close();
`;

async function fixVPS() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log("Writing script to VPS...");
    const writeRes = await ssh.execCommand(`cat << 'EOF' > /var/www/nhat-my-crm/fix_billing.js
${fixDbCode}
EOF`);
    
    console.log("Running fix_billing.js on VPS...");
    const runRes = await ssh.execCommand('cd /var/www/nhat-my-crm && node fix_billing.js');
    console.log(runRes.stdout);
    if(runRes.stderr) console.error("STDERR:", runRes.stderr);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
fixVPS();
