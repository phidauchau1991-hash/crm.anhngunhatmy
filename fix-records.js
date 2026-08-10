const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function fix() {
  console.log('Starting record adjustment...');

  // 1. Find Nguyễn Minh Trí & Nguyễn Nhân Nghĩa
  const nguyenMinhTri = await prisma.student.findFirst({ where: { name: { contains: 'MINH TRÍ' } } });
  const nguyenNhanNghia = await prisma.student.findFirst({ where: { name: { contains: 'NHÂN NGHĨA' } } });
  const danhNgocThaoUyen = await prisma.student.findFirst({ where: { name: { contains: 'THẢO UYÊN' } } });

  console.log('Found students:', {
    tri: nguyenMinhTri ? nguyenMinhTri.name + ' (' + nguyenMinhTri.id + ')' : null,
    nghia: nguyenNhanNghia ? nguyenNhanNghia.name + ' (' + nguyenNhanNghia.id + ')' : null,
    uyen: danhNgocThaoUyen ? danhNgocThaoUyen.name + ' (' + danhNgocThaoUyen.id + ')' : null,
  });

  if (nguyenMinhTri) {
    await prisma.orderFinance.updateMany({
      where: { studentId: nguyenMinhTri.id },
      data: {
        feeToPay: 3250000,
        amountPaid: 1950000,
        paymentStatus: 'Chưa đóng đủ'
      }
    });
    console.log('Updated Nguyễn Minh Trí: Paid 1,950,000 / Fee 3,250,000 (Remaining 1,300,000 VNĐ)');
  }

  if (nguyenNhanNghia) {
    await prisma.orderFinance.updateMany({
      where: { studentId: nguyenNhanNghia.id },
      data: {
        feeToPay: 3250000,
        amountPaid: 3250000,
        paymentStatus: 'Đã đóng'
      }
    });
    console.log('Updated Nguyễn Nhân Nghĩa: Paid 3,250,000 / Fee 3,250,000 (Đã đóng 100%)');
  }

  if (danhNgocThaoUyen) {
    console.log('Preserved Danh Ngọc Thảo Uyên user status: Paid 3,250,000 / Status: Đã đóng');
  }

  // Delete duplicate order ORD_IMP_HV2607004 if exists
  const dupOrder = await prisma.orderFinance.findUnique({ where: { id: 'ORD_IMP_HV2607004' } });
  if (dupOrder) {
    await prisma.orderFinance.delete({ where: { id: 'ORD_IMP_HV2607004' } });
    console.log('Cleaned up duplicate order ORD_IMP_HV2607004');
  }
}

fix()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
