const fs = require('fs');
let code = fs.readFileSync('src/app/finance/monthly/page.js', 'utf8');

// 1. Fix the body in fetch
code = code.replace(
  `amountPaid: payInvoice.totalToPay,`,
  `amountPaid: payAmount,`
);

// 2. Fix setEReceiptData
code = code.replace(
  /setEReceiptData\(\{\s*studentName: payInvoice\.studentName,[\s\S]*?cashier: 'Admin',\s*\}\);/,
  `const realAmountPaid = Number(payAmount || 0);
          const debtBeforeThis = Number(payInvoice.totalToPay || 0) - Number(payInvoice.amountPaid || 0);
          const newRemaining = debtBeforeThis - realAmountPaid;
          setEReceiptData({
            studentName: payInvoice.studentName,
            totalPaid: realAmountPaid,
            oldDebt: debtBeforeThis,
            tuitionPaid: realAmountPaid,
            remainingDebt: newRemaining > 0 ? newRemaining : 0,
            monthYear: displayMonthYear,
            paymentMethod: payMethod,
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            cashier: 'Admin',
          });`
);

fs.writeFileSync('src/app/finance/monthly/page.js', code);
console.log("Patched correctly with regex!");
