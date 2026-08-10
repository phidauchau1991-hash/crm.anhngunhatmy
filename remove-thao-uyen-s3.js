const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  const studentId = 'HV2607_015';
  const classCode = 'CN1_S3_MsMy_7CN_Ca1';

  // 1. Delete attendances for this student in S3 class
  const deletedAttendances = await prisma.attendance.deleteMany({
    where: {
      studentId: studentId,
      classCode: classCode
    }
  });
  console.log(`Deleted ${deletedAttendances.count} attendance records.`);

  // 2. Delete enrollment in S3 class
  const deletedEnrollment = await prisma.enrollment.deleteMany({
    where: {
      studentId: studentId,
      classCode: classCode
    }
  });
  console.log(`Deleted ${deletedEnrollment.count} enrollment records.`);

  // Verify remaining enrollments
  const remainingStudent = await prisma.student.findUnique({
    where: { id: studentId },
    include: { enrollments: true }
  });
  console.log('Remaining enrollments for DANH NGỌC THẢO UYÊN:', remainingStudent.enrollments);
}

main().catch(console.error).finally(() => prisma.$disconnect());
