const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

if (!schema.includes('previousDebtLocked')) {
  schema = schema.replace(
    'notes  String?',
    'notes  String?\n\n  previousDebtLocked Boolean @default(false)\n  isLocked           Boolean @default(false)'
  );
  fs.writeFileSync('prisma/schema.prisma', schema);
  console.log('Updated schema with previousDebtLocked and isLocked');
} else {
  console.log('Schema already has previousDebtLocked');
}
