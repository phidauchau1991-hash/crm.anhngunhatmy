const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const students = await prisma.student.findMany({
    where: {
      name: {
        in: [
          'TRẦN THỊ MỸ KIM',
          'DƯƠNG TRẦN HOÀNG BÁCH',
          'VÕ NGỌC TRÂM ANH',
          'HOÀNG THÙY DƯƠNG',
          'LEE ĐÔNG MINH',
          'TRỊNH NGUYỄN NGỌC DIỆP',
          'VÕ THỊ NGỌC TUYỀN',
          'TRỊNH THỊ HẢI YẾN',
          'NGUYỄN MINH ANH'
        ]
      }
    }
  });
  console.log(JSON.stringify(students, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
