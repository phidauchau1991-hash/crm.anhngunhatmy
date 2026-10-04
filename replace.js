const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/finance/monthly/page.js');
let code = fs.readFileSync(file, 'utf8');

const target = `        setEReceiptData({
          studentName: payInvoice.studentName,
          totalPaid: payInvoice.totalToPay,
          oldDebt: payInvoice.previousDebt || 0,
          tuitionPaid: payInvoice.currentFee || payInvoice.totalToPay,
          remainingDebt: 0,
          monthYear,
          paymentMethod: payMethod,`;

const replacement = `        let displayMonthYear = monthYear;
        if (payInvoice.billingType === 'MONTHLY_PREPAID' && monthYear.includes('/')) {
          const [m, y] = monthYear.split('/');
          let nextM = parseInt(m, 10) + 1;
          let nextY = parseInt(y, 10);
          if (nextM > 12) { nextM = 1; nextY++; }
          displayMonthYear = \`\${nextM.toString().padStart(2, '0')}/\${nextY}\`;
        }
        setEReceiptData({
          studentName: payInvoice.studentName,
          totalPaid: payInvoice.totalToPay,
          oldDebt: payInvoice.previousDebt || 0,
          tuitionPaid: payInvoice.currentFee || payInvoice.totalToPay,
          remainingDebt: 0,
          monthYear: displayMonthYear,
          paymentMethod: payMethod,`;

if (code.includes(target)) {
  fs.writeFileSync(file, code.replace(target, replacement), 'utf8');
  console.log('Success');
} else {
  // try regex with flex spaces
  const targetRegex = /setEReceiptData\(\{\s*studentName: payInvoice.studentName,\s*totalPaid: payInvoice.totalToPay,\s*oldDebt: payInvoice.previousDebt \|\| 0,\s*tuitionPaid: payInvoice.currentFee \|\| payInvoice.totalToPay,\s*remainingDebt: 0,\s*monthYear,\s*paymentMethod: payMethod,/m;
  if (targetRegex.test(code)) {
    fs.writeFileSync(file, code.replace(targetRegex, replacement), 'utf8');
    console.log('Success regex');
  } else {
    console.log('Not found');
  }
}
