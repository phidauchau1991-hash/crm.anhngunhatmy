const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const studentId = 'HV2607_004'; // NGUYỄN GIA BẢO
  const wrongClassCode = 'CN1_M2_MsMy_35_01'; // Class T3-T5

  console.log(`Cleaning up student ${studentId} from class ${wrongClassCode}...`);

  // 1. Delete Attendance records in wrong class
  const deletedAttendances = await prisma.attendance.deleteMany({
    where: {
      studentId,
      classCode: wrongClassCode
    }
  });
  console.log(`Deleted ${deletedAttendances.count} attendance records from ${wrongClassCode}.`);

  // 2. Delete Enrollment record in wrong class
  const deletedEnrollment = await prisma.enrollment.deleteMany({
    where: {
      studentId,
      classCode: wrongClassCode
    }
  });
  console.log(`Deleted ${deletedEnrollment.count} enrollment record from ${wrongClassCode}.`);

  // 3. Delete any order linked specifically to wrong class for this student if present (check inspect-bao: order was already for M3_24_01)
  const deletedOrders = await prisma.orderFinance.deleteMany({
    where: {
      studentId,
      classCode: wrongClassCode
    }
  });
  console.log(`Deleted ${deletedOrders.count} order records from ${wrongClassCode}.`);

  console.log('Cleanup complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
