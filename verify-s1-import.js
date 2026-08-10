const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const cls = await prisma.class.findUnique({
    where: { code: 'CN1_S1_MsMy_7CN_Ca4' },
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
    console.log(`${idx + 1}. [${s.id}] ${s.name} | SĐT: ${s.phone || 'Trống'} | CCCD: ${s.nationalId} | Đóng: ${s.orders[0]?.amountPaid}đ / ${s.orders[0]?.feeToPay}đ (${s.orders[0]?.paymentStatus}) | Buổi đi học: ${s.attendances.filter(a => a.status === 'Có mặt').length}/${s.attendances.length}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
