const fs = require('fs');
let code = fs.readFileSync('src/app/finance/monthly/page.js', 'utf8');

// 1. Fix the body in fetch('/api/finance/monthly/pay')
code = code.replace(
  `amountPaid: payInvoice.totalToPay`,
  `amountPaid: payAmount`
);

// 2. Fix setEReceiptData inside handlePayInvoice
const oldSetEReceiptData = `          setEReceiptData({
            studentName: payInvoice.studentName,
            totalPaid: payInvoice.totalToPay,
            oldDebt: payInvoice.previousDebt || 0,
            tuitionPaid: payInvoice.currentFee || payInvoice.totalToPay,
            remainingDebt: 0,
            monthYear: displayMonthYear,
            paymentMethod: payMethod,
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            cashier: 'Admin',
          });`;

const newSetEReceiptData = `          const realAmountPaid = Number(payAmount || 0);
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
          });`;

code = code.replace(oldSetEReceiptData, newSetEReceiptData);

fs.writeFileSync('src/app/finance/monthly/page.js', code);
console.log("Patched page.js successfully!");
