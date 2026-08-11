const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fix() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log("Summary dates:");
    const res1 = await ssh.execCommand(`sqlite3 /var/www/nhat-my-crm/dev.db "SELECT DISTINCT date FROM AttendanceSummary WHERE classCode = 'CN1_M3_MsMy_24_01' ORDER BY date;"`);
    console.log(res1.stdout);

    console.log("Attendance dates:");
    const res2 = await ssh.execCommand(`sqlite3 /var/www/nhat-my-crm/dev.db "SELECT DISTINCT date FROM Attendance WHERE classCode = 'CN1_M3_MsMy_24_01' ORDER BY date;"`);
    console.log(res2.stdout);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
fix();
