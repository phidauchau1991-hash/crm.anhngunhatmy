const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
async function check() {
  await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
  const script = `
    const Database = require('better-sqlite3'); 
    const db = new Database('dev.db'); 
    const att = db.prepare("SELECT date, COUNT(*) as c FROM Attendance WHERE classCode = 'CN1_M3_MsMy_24_01' GROUP BY date ORDER BY date").all();
    console.log('ATT Unique:', att.length);
    const sum = db.prepare("SELECT date FROM AttendanceSummary WHERE classCode = 'CN1_M3_MsMy_24_01' ORDER BY date").all();
    console.log('SUM Unique:', sum.length);
    console.log('ATT Missing in SUM:', att.filter(a => !sum.find(s => s.date === a.date)).map(x => x.date));
  `;
  const res = await ssh.execCommand(`cd /var/www/nhat-my-crm && node -e '${script.replace(/'/g, "'\\''").replace(/\n/g, ' ')}'`);
  console.log(res.stdout);
  if(res.stderr) console.error(res.stderr);
  process.exit(0);
}
check();
