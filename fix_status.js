const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all students...');
  
  const result = await prisma.$executeRaw`UPDATE Student SET status = 'Đang học' WHERE status LIKE '%ang h%' AND status != 'Đang học'`;
  console.log(`Raw query updated ${result} rows for %ang h%.`);
  
  const result2 = await prisma.$executeRaw`UPDATE Student SET status = 'Đang học' WHERE status = 'Ä''ang há»c' OR status = 'Äang há»c' OR status LIKE '%ng h%' AND status != 'Đang học' AND status != 'Nghỉ học' AND status != 'Bảo lưu'`;
  console.log(`Raw query updated ${result2} rows for other variants.`);

  console.log(`Finished fixing statuses.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
