const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding 10 students and 3 classes...');

  // Clear existing data to avoid conflicts
  await prisma.attendance.deleteMany({});
  await prisma.orderFinance.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.class.deleteMany({});
  await prisma.courseConfig.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.inventory.deleteMany({});

  // 1. Re-seed Admin
  await prisma.admin.create({
    data: {
      name: 'Giám đốc Nhật Mỹ',
      email: 'director@nhatmy.edu.vn',
      role: 'Giám đốc hệ thống',
      branchId: null,
      permissions: 'all',
    }
  });

  // 2. Re-seed Course Configs
  const configs = [
    { program: 'STARTERS', level: 'S1', price: 3150000, totalSessions: 32, bookName: 'Beehive Starters', bookPrice: 250000 },
    { program: 'STARTERS', level: 'S2', price: 3150000, totalSessions: 32, bookName: 'Beehive Starters', bookPrice: 250000 },
    { program: 'MOVERS', level: 'M1', price: 3350000, totalSessions: 36, bookName: 'Beehive 1', bookPrice: 270000 },
  ];
  for (const cfg of configs) {
    await prisma.courseConfig.create({ data: cfg });
  }

  // 3. Re-seed Inventory
  const inventoryItems = [
    { id: 'TP_01', name: 'Áo thun', category: 'Tặng phẩm', currentStock: 10, threshold: 5 },
    { id: 'TP_02', name: 'Túi xách', category: 'Tặng phẩm', currentStock: 15, threshold: 5 },
    { id: 'TP_03', name: 'Bình nước', category: 'Tặng phẩm', currentStock: 20, threshold: 5 },
    { id: 'GT_01', name: 'Beehive Starters', category: 'Giáo trình', currentStock: 30, threshold: 5 },
    { id: 'GT_02', name: 'Beehive 1', category: 'Giáo trình', currentStock: 25, threshold: 5 },
  ];
  for (const item of inventoryItems) {
    await prisma.inventory.create({ data: item });
  }

  // 4. Create 3 Classes
  const classes = [
    { code: 'CN1_S1 Ms My_35_01', level: 'S1', teacherName: 'Ms My', startDate: new Date('2026-06-01'), schedule: '35', expectedEndDate: new Date('2026-09-17') },
    { code: 'CN1_S2 Mr John_24_01', level: 'S2', teacherName: 'Mr John', startDate: new Date('2026-06-01'), schedule: '24', expectedEndDate: new Date('2026-09-16') },
    { code: 'CN1_M1 Ms Lan_35_01', level: 'M1', teacherName: 'Ms Lan', startDate: new Date('2026-06-01'), schedule: '35', expectedEndDate: new Date('2026-10-06') },
  ];
  for (const cls of classes) {
    await prisma.class.create({ data: cls });
  }

  // 5. Create 10 Students with nationalId
  const students = [
    // Lớp S1 (4 học sinh)
    { id: 'HV2606_001', name: 'Nguyễn Minh Quân', phone: '0987654321', dob: new Date('2018-05-12'), address: 'Thủ Dầu Một, Bình Dương', nationalId: '074098001234', classCode: 'CN1_S1 Ms My_35_01', feePaid: 3150000, feeToPay: 3150000, status: 'Đã đóng' },
    { id: 'HV2606_002', name: 'Lê Mai Chi', phone: '0912345678', dob: new Date('2017-08-22'), address: 'Thuận An, Bình Dương', nationalId: '074097005678', classCode: 'CN1_S1 Ms My_35_01', feePaid: 1500000, feeToPay: 3150000, status: 'Chưa đóng đủ' },
    { id: 'HV2606_003', name: 'Trần Gia Bảo', phone: '0933445566', dob: new Date('2019-11-02'), address: 'Dĩ An, Bình Dương', nationalId: '074099009911', classCode: 'CN1_S1 Ms My_35_01', feePaid: 0, feeToPay: 3150000, status: 'Chưa đóng' },
    { id: 'HV2606_004', name: 'Phạm Thùy Linh', phone: '0944556677', dob: new Date('2018-02-14'), address: 'Bến Cát, Bình Dương', nationalId: '074098002233', classCode: 'CN1_S1 Ms My_35_01', feePaid: 3150000, feeToPay: 3150000, status: 'Đã đóng' },
    
    // Lớp S2 (3 học sinh)
    { id: 'HV2606_005', name: 'Hoàng Quốc Anh', phone: '0955667788', dob: new Date('2018-09-30'), address: 'Thủ Dầu Một, Bình Dương', nationalId: '074098004455', classCode: 'CN1_S2 Mr John_24_01', feePaid: 2650000, feeToPay: 2650000, status: 'Đã đóng', specialPolicyType: 'ACE học cùng', specialPolicyValue: 500000 },
    { id: 'HV2606_006', name: 'Vũ Ngọc Hân', phone: '0966778899', dob: new Date('2017-12-05'), address: 'Tân Uyên, Bình Dương', nationalId: '074097006677', classCode: 'CN1_S2 Mr John_24_01', feePaid: 3150000, feeToPay: 3150000, status: 'Đã đóng' },
    { id: 'HV2606_007', name: 'Đặng Minh Triết', phone: '0977889900', dob: new Date('2019-04-18'), address: 'Thủ Dầu Một, Bình Dương', nationalId: '074099008899', classCode: 'CN1_S2 Mr John_24_01', feePaid: 0, feeToPay: 3150000, status: 'Chưa đóng' },
    
    // Lớp M1 (3 học sinh)
    { id: 'HV2606_008', name: 'Bùi Gia Khánh', phone: '0901234567', dob: new Date('2016-03-24'), address: 'Dĩ An, Bình Dương', nationalId: '074096001122', classCode: 'CN1_M1 Ms Lan_35_01', feePaid: 3350000, feeToPay: 3350000, status: 'Đã đóng' },
    { id: 'HV2606_009', name: 'Đỗ Hà Phương', phone: '0902345678', dob: new Date('2016-07-15'), address: 'Thuận An, Bình Dương', nationalId: '074096003344', classCode: 'CN1_M1 Ms Lan_35_01', feePaid: 1675000, feeToPay: 1675000, status: 'Đã đóng', specialPolicyType: 'Khó khăn', specialPolicyValue: 1675000 }, // Giảm 50%
    { id: 'HV2606_010', name: 'Phan Anh Đức', phone: '0903456789', dob: new Date('2016-10-10'), address: 'Thủ Dầu Một, Bình Dương', nationalId: '074096005566', classCode: 'CN1_M1 Ms Lan_35_01', feePaid: 0, feeToPay: 3350000, status: 'Chưa đóng' },
  ];

  for (const std of students) {
    // Tạo Student
    await prisma.student.create({
      data: {
        id: std.id,
        name: std.name,
        phone: std.phone,
        dob: std.dob,
        address: std.address,
        nationalId: std.nationalId,
        specialPolicyType: std.specialPolicyType || 'Không giảm',
        specialPolicyValue: std.specialPolicyValue || 0,
        specialPolicy: std.specialPolicyType ? `${std.specialPolicyType} (-${std.specialPolicyValue.toLocaleString()}đ)` : 'Không',
        referralCode: std.id,
      }
    });

    // Tạo Enrollment
    await prisma.enrollment.create({
      data: {
        studentId: std.id,
        classCode: std.classCode,
      }
    });

    // Tạo OrderFinance
    const year = '26';
    const month = '06';
    const serial = std.id.split('_')[1];
    await prisma.orderFinance.create({
      data: {
        id: `ORD_${year}${month}_${serial}`,
        studentId: std.id,
        classCode: std.classCode,
        feeToPay: std.feeToPay,
        amountPaid: std.feePaid,
        paymentStatus: std.status,
        paymentDeadline: new Date('2026-06-15'),
      }
    });
    console.log(`Created student profile: ${std.id} - ${std.name}`);
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
