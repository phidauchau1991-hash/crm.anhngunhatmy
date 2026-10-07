const fs = require('fs');
let code = fs.readFileSync('src/app/api/finance/monthly/route.js', 'utf8');

// 1. Update previousDebt calculation
code = code.replace(
  `previousDebt += prevInvoice.totalToPay;`,
  `previousDebt += (prevInvoice.totalToPay - (prevInvoice.amountPaid || 0));`
);

// 2. Fetch amountPaid
code = code.replace(
  `totalToPay = currentInvoice.totalToPay;`,
  `totalToPay = currentInvoice.totalToPay;\n        let amountPaid = currentInvoice.amountPaid || 0;`
);

// 3. Define liveAmountPaid
code = code.replace(
  `let liveTotalToPay = 0;`,
  `let liveTotalToPay = 0;\n      let liveAmountPaid = 0;`
);

// 4. Update the needsUpdate condition. If totalToPay is different, needsUpdate = true.
// Wait, we don't need to change needsUpdate logic, totalToPay is still the total sum.
// We just need to add amountPaid to the JSON return.
code = code.replace(
  `totalToPay,\n        monthYear`,
  `totalToPay,\n        amountPaid: currentInvoice ? (currentInvoice.amountPaid || 0) : 0,\n        monthYear`
);

// 5. Allow updating amountPaid during POST
code = code.replace(
  `totalToPay,\n    } = body;`,
  `totalToPay,\n      amountPaid,\n    } = body;`
);

// 6. In update existing
code = code.replace(
  `totalToPay: totalToPay !== undefined && totalToPay !== null ? parseFloat(totalToPay) : existing.totalToPay,`,
  `totalToPay: totalToPay !== undefined && totalToPay !== null ? parseFloat(totalToPay) : existing.totalToPay,\n          amountPaid: amountPaid !== undefined && amountPaid !== null ? parseFloat(amountPaid) : existing.amountPaid,`
);

// 7. In create new
code = code.replace(
  `totalToPay: parseFloat(totalToPay) || 0,`,
  `totalToPay: parseFloat(totalToPay) || 0,\n        amountPaid: parseFloat(amountPaid) || 0,`
);

fs.writeFileSync('src/app/api/finance/monthly/route.js', code);
console.log("Patched api route");
