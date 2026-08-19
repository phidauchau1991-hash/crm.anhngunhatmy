const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const enrollments = await prisma.enrollment.findMany({ take: 5 });
  console.log("Enrollments:", enrollments);
  
  const classes = await prisma.class.findMany({ take: 5, include: { enrollments: true }});
  console.log("Classes:", classes.map(c => ({ code: c.code, enrollmentCount: c.enrollments.length, firstEnrollmentStatus: c.enrollments[0]?.status })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
