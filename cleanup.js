const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 
async function main() { 
  await prisma.student.deleteMany({ where: { id: 'HV2608_007' }}); 
  await prisma.student.updateMany({ where: { id: 'HV2608_006' }, data: { status: 'Đang học' }}); 
  console.log('DB cleanup done!'); 
} 
main().catch(console.error).finally(() => prisma.$disconnect());
