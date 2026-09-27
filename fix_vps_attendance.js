const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function fix() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const script = `
    const Database = require('better-sqlite3'); 
    const db = new Database('dev.db'); 
    const res = db.prepare("DELETE FROM Attendance WHERE classCode = 'CN1_M3_MsMy_24_01' AND date IN ('2026-09-04T00:00:00.000+00:00', '2026-09-05T00:00:00.000+00:00')").run();
    console.log('Deleted extra Attendance records:', res.changes);
  `;
  const res = await ssh.execCommand(`cd /var/www/nhat-my-crm && node -e '${script.replace(/'/g, "'\\''").replace(/\n/g, ' ')}'`);
  console.log(res.stdout);
  if(res.stderr) console.error(res.stderr);
  process.exit(0);
}
fix();
