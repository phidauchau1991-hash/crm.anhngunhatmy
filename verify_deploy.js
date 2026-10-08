const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function verify() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });

    console.log('--- 1. Kiểm tra cơ sở dữ liệu học viên Nguyễn Võ Ngọc Hiệp ---');
    const dbRes = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT id, studentId, classCode, monthYear, previousDebt, currentFee, totalToPay, amountPaid, status, previousDebtLocked, isLocked FROM MonthlyInvoice WHERE studentId = 'HV2609_003';\"");
    console.log(dbRes.stdout);

    console.log('--- 2. Kiểm tra API GET /api/finance/monthly?monthYear=09/2026 ---');
    const apiRes = await ssh.execCommand("curl -s http://localhost:3000/api/finance/monthly?monthYear=09/2026");
    const json = JSON.parse(apiRes.stdout);
    const hiep = json.find(s => s.studentId === 'HV2609_003');
    console.log('Dữ liệu API trả về cho Nguyễn Võ Ngọc Hiệp:');
    console.log(JSON.stringify(hiep, null, 2));

    ssh.dispose();
  } catch (err) {
    console.error('Lỗi kiểm tra:', err);
  }
}

verify();
