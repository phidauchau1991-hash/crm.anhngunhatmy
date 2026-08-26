const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const classes = await prisma.class.findMany({
      include: {
        enrollments: {
          where: { status: 'Đang học' }
        },
        teacher: {
          select: {
            shortName: true,
            fullName: true
          }
        }
      }
    });
    console.log('Classes count:', classes.length);
  } catch(e) {
    console.error('ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
