const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function fixNgocHiepData() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });

    console.log('Connected! Updating invoice for HV2609_003 (Nguyễn Võ Ngọc Hiệp)...');

    const updateSql = `
      UPDATE MonthlyInvoice
      SET previousDebt = 2250000.0,
          currentFee = 2000000.0,
          excessMissing = 0.0,
          totalToPay = 4250000.0,
          amountPaid = 0.0,
          status = 'UNPAID',
          previousDebtLocked = 1,
          isLocked = 0,
          notes = 'Nợ cũ tháng 08/2026: 2.250.000đ'
      WHERE studentId = 'HV2609_003' AND monthYear = '09/2026';
    `.trim();

    await ssh.execCommand(`sqlite3 /var/www/nhat-my-crm/dev.db "${updateSql.replace(/\n/g, ' ')}"`);

    // Verify
    const check = await ssh.execCommand("sqlite3 /var/www/nhat-my-crm/dev.db \"SELECT id, studentId, classCode, monthYear, previousDebt, currentFee, totalToPay, amountPaid, status, previousDebtLocked, isLocked, notes FROM MonthlyInvoice WHERE studentId = 'HV2609_003';\"");
    console.log('Updated Invoice for HV2609_003 on VPS:\n', check.stdout);

    ssh.dispose();
  } catch (err) {
    console.error('Error fixing Ngoc Hiep data:', err);
  }
}

fixNgocHiepData();
