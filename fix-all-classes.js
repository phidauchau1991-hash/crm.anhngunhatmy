const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { recalculateClassEndDate } = require('./src/lib/holidayHelpers.js');

async function main() {
  const classes = await prisma.class.findMany();
  let updatedCount = 0;
  console.log(`Bắt đầu rà soát ${classes.length} lớp học...`);
  
  for (const cls of classes) {
    const oldDateStr = new Date(cls.expectedEndDate).toLocaleDateString('vi-VN');
    const updated = await recalculateClassEndDate(cls.code, prisma);
    
    if (updated) {
      const newDateStr = new Date(updated.expectedEndDate).toLocaleDateString('vi-VN');
      if (oldDateStr !== newDateStr) {
        console.log(`Đã cập nhật lớp ${cls.code}: ${oldDateStr} -> ${newDateStr}`);
        updatedCount++;
      }
    }
  }
  console.log(`Đã tính toán và cập nhật lại thành công cho ${updatedCount} lớp có sự thay đổi.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
