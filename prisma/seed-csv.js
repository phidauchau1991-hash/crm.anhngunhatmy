const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting CSV seeding script...');

  // 1. Path to the CSV file
  const csvPath = path.join(__dirname, '../../7. Database CRM_Nhật Mỹ.csv');
  console.log('Looking for CSV file at:', csvPath);

  if (!fs.existsSync(csvPath)) {
    console.error('ERROR: CSV file not found at:', csvPath);
    process.exit(1);
  }

  // 2. Parse CSV and update Inventory
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split(/\r?\n/);
  
  console.log(`Found ${lines.length} lines in CSV file. Parsing...`);

  let parsedCount = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('...') || line.startsWith(',,,')) continue;

    const parts = line.split(',');
    if (parts.length < 3) continue;

    const id = parts[0]?.trim();
    const name = parts[1]?.trim();
    
    // Ignore lines that don't have valid ID or Name
    if (!id || !name || id.includes('ID_Tang_Pham')) continue;

    const category = parts[2]?.trim() || (id.startsWith('GT') ? 'Giáo trình' : 'Tặng phẩm');
    const currentStock = parseInt(parts[5]?.trim()) || 0;
    const threshold = 5;

    await prisma.inventory.upsert({
      where: { id },
      update: {
        name,
        category,
        currentStock,
        threshold,
      },
      create: {
        id,
        name,
        category,
        currentStock,
        threshold,
      },
    });
    console.log(`Successfully seeded inventory item: [${id}] ${name} (Stock: ${currentStock})`);
    parsedCount++;
  }
  console.log(`Seeded ${parsedCount} items into Inventory.`);

  // 3. Since the CSV only contains inventory data, we generate realistic mock data
  // for Students, Leads, Classes, and Finance so the Dashboard is populated.
  console.log('Generating realistic mock data for Dashboard metrics...');

  // Seed Mock Classes
  const classCode = 'CN1_S1 Ms My_35_01';
  await prisma.class.upsert({
    where: { code: classCode },
    update: {},
    create: {
      code: classCode,
      level: 'S1',
      teacherName: 'Ms My',
      startDate: new Date('2026-06-01'),
      schedule: '35',
      expectedEndDate: new Date('2026-09-15'),
    },
  });

  // Seed Mock Students
  const students = [
    { id: 'HV2606_001', name: 'Nguyễn Minh Quân', phone: '0987654321', dob: new Date('2018-05-12'), address: 'Thủ Dầu Một, Bình Dương' },
    { id: 'HV2606_002', name: 'Lê Mai Chi', phone: '0912345678', dob: new Date('2017-08-22'), address: 'Thuận An, Bình Dương' },
    { id: 'HV2606_003', name: 'Trần Gia Bảo', phone: '0933445566', dob: new Date('2019-11-02'), address: 'Dĩ An, Bình Dương' },
  ];

  for (const student of students) {
    await prisma.student.upsert({
      where: { id: student.id },
      update: {},
      create: student,
    });

    // Enroll students in class
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        classCode: classCode,
        midTermListening: 8.5,
        midTermSpeaking: 9.0,
        midTermReading: 8.0,
        midTermWriting: 7.5,
      },
    });
  }

  // Seed Mock Leads
  const leads = [
    { name: 'Phạm Minh Khôi', phone: '0977889900', status: 'Đang tư vấn', painPoints: 'Con nhát nói tiếng Anh', goals: 'Tự tin giao tiếp' },
    { name: 'Hoàng Ngọc Vy', phone: '0966554433', status: 'Học thử', painPoints: 'Mất gốc ngữ pháp', goals: 'Lấy lại căn bản' },
  ];

  for (const lead of leads) {
    await prisma.lead.create({
      data: lead,
    });
  }

  // Seed Mock Finance Giao dịch
  const orders = [
    { id: 'ORD_2606_001', studentId: 'HV2606_001', classCode: classCode, feeToPay: 3150000, amountPaid: 3150000, paymentStatus: 'Đã đóng' },
    { id: 'ORD_2606_002', studentId: 'HV2606_002', classCode: classCode, feeToPay: 3150000, amountPaid: 1500000, paymentStatus: 'Chưa đóng đủ' },
  ];

  for (const order of orders) {
    await prisma.orderFinance.upsert({
      where: { id: order.id },
      update: {},
      create: order,
    });
  }

  console.log('Data seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
