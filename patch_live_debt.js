const fs = require('fs');
let code = fs.readFileSync('src/app/api/finance/monthly/route.js', 'utf8');

// Find the needsUpdate block
const oldBlock = `            needsUpdate = true;
            // Bom d? li?u live ra UI d? hi?n th? dng v user c th? b?m "C?p nh?t"
            currentFee = liveCurrentFee;
            excessMissing = liveExcessMissing;
            totalToPay = liveTotalToPay;`;

// Wait, the comment might have different encoding. Let's just use a more generic replace.
const oldBlockRegex = /needsUpdate = true;\s*\/\/[^\n]*\s*currentFee = liveCurrentFee;\s*excessMissing = liveExcessMissing;\s*totalToPay = liveTotalToPay;/g;

const newBlock = `needsUpdate = true;
            currentFee = liveCurrentFee;
            excessMissing = liveExcessMissing;
            totalToPay = liveTotalToPay;
            // FIX: MUST ALSO OVERRIDE previousDebt TO LIVE VALUE!
            // Wait, previousDebt at the top is the "live" previousDebt!
            // But we stored it in the same variable previousDebt.
            // Let's create a livePreviousDebt variable at the top.
`;

// It's safer to just patch it directly.
code = code.replace(
  `let liveTotalToPay = 0;`,
  `let liveTotalToPay = 0;\n      let livePreviousDebt = previousDebt;`
);

code = code.replace(
  /needsUpdate = true;[\s\S]*?totalToPay = liveTotalToPay;/m,
  `needsUpdate = true;
            currentFee = liveCurrentFee;
            excessMissing = liveExcessMissing;
            totalToPay = liveTotalToPay;
            previousDebt = livePreviousDebt;`
);

fs.writeFileSync('src/app/api/finance/monthly/route.js', code);
console.log("Patched route.js for livePreviousDebt bug");
