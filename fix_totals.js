const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL || 'file:./dev.db' });

async function fixInvoices() {
  const invoices = await prisma.monthlyInvoice.findMany({
    where: { status: 'UNPAID' }
  });

  let fixed = 0;
  for (const inv of invoices) {
    const correctTotal = inv.currentFee + inv.previousDebt + inv.excessMissing;
    if (inv.totalToPay !== correctTotal) {
      console.log("Fixing invoice " + inv.id + ": " + inv.totalToPay + " -> " + correctTotal);
      await prisma.monthlyInvoice.update({
        where: { id: inv.id },
        data: { totalToPay: correctTotal }
      });
      fixed++;
    }
  }
  console.log("Fixed " + fixed + " invoices.");
}

fixInvoices().catch(console.error);
