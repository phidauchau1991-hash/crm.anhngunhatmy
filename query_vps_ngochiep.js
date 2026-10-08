const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function query() {
  try {
    await ssh.connect({
      host: '103.165.144.154',
      username: 'root',
      password: '4jGbRF9eQRXybRJr3vQP'
    });
    
    console.log('--- STUDENT ---');
    let res = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT id, name, phone FROM Student WHERE name LIKE \'%Hiệp%\';"');
    console.log(res.stdout);

    console.log('--- ENROLLMENT ---');
    res = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT id, studentId, classCode, billingType, monthlyRate, monthlySessions FROM Enrollment WHERE studentId IN (SELECT id FROM Student WHERE name LIKE \'%Hiệp%\');"');
    console.log(res.stdout);

    console.log('--- MONTHLY INVOICE ---');
    res = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT id, studentId, classCode, monthYear, billingType, committedSessions, actualSessions, feePerSession, previousDebt, currentFee, excessMissing, totalToPay, amountPaid, status, notes FROM MonthlyInvoice WHERE studentId IN (SELECT id FROM Student WHERE name LIKE \'%Hiệp%\');"');
    console.log(res.stdout);

    console.log('--- ORDER FINANCE ---');
    res = await ssh.execCommand('sqlite3 /var/www/nhat-my-crm/dev.db "SELECT id, studentId, classCode, feeToPay, amountPaid, paymentStatus, notes FROM OrderFinance WHERE studentId IN (SELECT id FROM Student WHERE name LIKE \'%Hiệp%\');"');
    console.log(res.stdout);

    ssh.dispose();
  } catch (err) {
    console.error(err);
    ssh.dispose();
  }
}
query();
