import db from './src/lib/db.js';

async function check() {
  const students = await db.student.findMany();
  console.log('Students count:', students.length);
  
  const inventory = await db.inventoryItem.findMany();
  console.log('Inventory count:', inventory.length);
  
  const orders = await db.tuitionOrder.findMany();
  console.log('Orders count:', orders.length);
}

check().catch(console.error).finally(() => process.exit(0));
