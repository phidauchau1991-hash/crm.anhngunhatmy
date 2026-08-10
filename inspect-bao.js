const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const student = await prisma.student.findFirst({
    where: { name: { contains: 'NGUYỄN GIA BẢO' } },
    include: {
      enrollments: { include: { class: true } },
      orders: true,
      attendances: true
    }
  });

  console.log('=== STUDENT NGUYỄN GIA BẢO ===');
  console.log('ID:', student?.id, 'Name:', student?.name);
  console.log('\n--- ENROLLMENTS ---');
  for (const e of student.enrollments) {
    console.log(`Enrollment ID: ${e.id} | ClassCode: ${e.classCode} | Level: ${e.class.level} | Schedule: ${e.class.schedule} | Teacher: ${e.class.teacherName}`);
  }

  console.log('\n--- ORDERS ---');
  for (const o of student.orders) {
    console.log(`Order ID: ${o.id} | ClassCode: ${o.classCode} | Fee: ${o.feeToPay} | Paid: ${o.amountPaid} | Status: ${o.paymentStatus}`);
  }

  console.log('\n--- ATTENDANCES ---');
  for (const a of student.attendances) {
    console.log(`Attendance ID: ${a.id} | ClassCode: ${a.classCode} | Date: ${a.date.toISOString().split('T')[0]} | Status: ${a.status}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
