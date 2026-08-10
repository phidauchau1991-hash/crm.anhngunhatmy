const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Seed Inventory from CSV
  const inventoryItems = [
    { id: 'TP_01', name: 'Áo thun', category: 'Tặng phẩm', currentStock: 0, threshold: 5 },
    { id: 'TP_02', name: 'Túi xách', category: 'Tặng phẩm', currentStock: 10, threshold: 5 },
    { id: 'TP_03', name: 'Bình nước', category: 'Tặng phẩm', currentStock: 15, threshold: 5 },
    { id: 'GT_01', name: 'Beehive Starters', category: 'Giáo trình', currentStock: 20, threshold: 5 },
    { id: 'GT_02', name: 'Beehive 1', category: 'Giáo trình', currentStock: 12, threshold: 5 },
    { id: 'GT_03', name: 'Beehive 2', category: 'Giáo trình', currentStock: 8, threshold: 5 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventory.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
  }

  // 2. Seed Admin
  await prisma.admin.upsert({
    where: { email: 'director@nhatmy.edu.vn' },
    update: {},
    create: {
      name: 'Giám đốc Nhật Mỹ',
      email: 'director@nhatmy.edu.vn',
      role: 'Giám đốc hệ thống',
      branchId: null,
      permissions: 'all',
    },
  });

  await prisma.admin.upsert({
    where: { email: 'cn1@nhatmy.edu.vn' },
    update: {},
    create: {
      name: 'Quản lý Chi nhánh 1',
      email: 'cn1@nhatmy.edu.vn',
      role: 'Quản lý chi nhánh',
      branchId: 'CN1',
      permissions: 'branch',
    },
  });

  // 3. Seed Course Config
  const courseConfigs = [
    { program: 'STARTERS', level: 'S1', price: 3150000, totalSessions: 32, bookName: 'Beehive Starters', bookPrice: 250000 },
    { program: 'STARTERS', level: 'S2', price: 3150000, totalSessions: 32, bookName: 'Beehive Starters', bookPrice: 250000 },
    { program: 'MOVERS', level: 'M1', price: 3350000, totalSessions: 36, bookName: 'Beehive 1', bookPrice: 270000 },
    { program: 'MOVERS', level: 'M2', price: 3350000, totalSessions: 36, bookName: 'Beehive 1', bookPrice: 270000 },
  ];

  for (const config of courseConfigs) {
    await prisma.courseConfig.upsert({
      where: { level: config.level },
      update: {},
      create: config,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
