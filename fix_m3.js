const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    // Backup dev.db first
    await ssh.execCommand('cp /var/www/nhat-my-crm/dev.db /var/www/nhat-my-crm/dev.db.m3.backup');
    
    const sql = `
      -- Delete the fake 'Buoi 1' which was stored as a unix timestamp
      DELETE FROM AttendanceSummary WHERE classCode = 'CN1_M3_MsMy_24_01' AND date = '1785110400000';
      DELETE FROM Attendance WHERE classCode = 'CN1_M3_MsMy_24_01' AND date = '1785110400000';

      -- Delete the 'Z' duplicate records in Attendance which artificially inflated the session count
      DELETE FROM Attendance WHERE classCode = 'CN1_M3_MsMy_24_01' AND date = '2026-07-27T00:00:00.000Z';
      DELETE FROM Attendance WHERE classCode = 'CN1_M3_MsMy_24_01' AND date = '2026-07-29T00:00:00.000Z';
    `;
    
    const res = await ssh.execCommand(`sqlite3 /var/www/nhat-my-crm/dev.db "${sql}"`);
    console.log("SQL executed:");
    console.log(res.stdout);
    if(res.stderr) console.error(res.stderr);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
