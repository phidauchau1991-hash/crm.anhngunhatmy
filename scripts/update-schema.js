const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
let content = fs.readFileSync(filePath, 'utf8');

const target = 'branchId            String    @default("CN1_BinhDuong")';
if (content.includes(target)) {
  const replacement = target + '\n\n  // Web App Courseware Integration\n  customBookCodes        String?   // JSON Array: vd ["beehive_1", "beehive_starter"]\n  retainCoursewareAccess Boolean   @default(false) // Giu quyen khi tam nghi / nghi luon';
  content = content.replace(target, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully updated schema.prisma');
} else {
  console.error('Target not found in schema.prisma');
}
