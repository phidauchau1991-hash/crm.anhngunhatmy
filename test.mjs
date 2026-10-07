import db from './src/lib/db.js';
async function run() {
  const inv = await db.monthlyInvoice.findFirst({ where: { monthYear: '09/2026', student: { name: { contains: 'Hiệp' } } } });
  console.log(inv);
}
run();
