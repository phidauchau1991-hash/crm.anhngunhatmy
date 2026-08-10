const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cls = await prisma.class.findUnique({
    where: { code: 'CN1_S3_MsMy_35_Ca2' },
    include: {
      enrollments: {
        include: {
          student: {
            include: {
              orders: true,
              attendances: true
            }
          }
        }
      }
    }
  });

  console.log(`Lớp: ${cls.code} (${cls.level}) - Sĩ số: ${cls.enrollments.length} HV`);
  cls.enrollments.forEach((e, idx) => {
    const s = e.student;
    console.log(`${idx + 1}. [${s.id}] ${s.name} | SĐT: ${s.phone || 'Trống'} | CCCD: ${s.nationalId} | Đóng: ${s.orders[0]?.amountPaid}đ / ${s.orders[0]?.feeToPay}đ | Buổi đi học: ${s.attendances.filter(a => a.status === 'Có mặt').length}/${s.attendances.length}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
