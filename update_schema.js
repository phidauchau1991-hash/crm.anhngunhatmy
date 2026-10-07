const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');
if (!schema.includes('amountPaid Float @default(0)')) {
  schema = schema.replace('totalToPay Float // Tổng cần thu', 'totalToPay Float // Tổng cần thu\n  amountPaid Float @default(0) // Số tiền đã thu');
  fs.writeFileSync('prisma/schema.prisma', schema);
  console.log("Schema updated.");
} else {
  console.log("Schema already has amountPaid.");
}
