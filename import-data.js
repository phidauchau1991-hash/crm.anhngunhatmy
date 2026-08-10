const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

// Khởi tạo Prisma Client với Adapter SQLite dành cho Prisma 7
const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('==================================================');
  console.log('   BẮT ĐẦU NẠP DỮ LIỆU TỪ CSV VÀO DATABASE CỤC BỘ');
  console.log('==================================================');

  const csvPath = path.join(__dirname, '../7. Database CRM_Nhật Mỹ.csv');
  console.log(`Đang tìm file dữ liệu gốc tại: ${csvPath}`);

  if (!fs.existsSync(csvPath)) {
    console.error(`[THẤT BẠI] Không tìm thấy file CSV tại đường dẫn: ${csvPath}`);
    process.exit(1);
  }

  // 1. Parse CSV & Import Kho (Inventory)
  try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split(/\r?\n/);
    console.log(`Đã đọc file CSV. Phát hiện ${lines.length} dòng. Bắt đầu phân tích...`);

    let successCount = 0;
    let skipCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Bỏ qua dòng trống hoặc dòng định dạng kết thúc excel
      if (!line || line.startsWith('...') || line.startsWith(',,,')) {
        continue;
      }

      try {
        const parts = line.split(',');
        if (parts.length < 3) {
          throw new Error('Dòng không đủ số cột tối thiểu (3 cột)');
        }

        const id = parts[0]?.trim();
        const name = parts[1]?.trim();

        // Kiểm tra dòng tiêu đề hoặc dòng không hợp lệ
        if (!id || !name || id.includes('ID_Tang_Pham') || id === 'ID') {
          continue;
        }

        const category = parts[2]?.trim() || (id.startsWith('GT') ? 'Giáo trình' : 'Tặng phẩm');
        const currentStock = parseInt(parts[5]?.trim()) || 0;
        const threshold = 5;

        // Upsert dữ liệu kho
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

        console.log(`[OK] Đã nạp vật phẩm kho: [${id}] ${name} (Tồn: ${currentStock})`);
        successCount++;
      } catch (lineError) {
        console.warn(`[BỎ QUA] Lỗi tại dòng ${i + 1}: ${lineError.message} | Dữ liệu gốc: "${line}"`);
        skipCount++;
      }
    }

    console.log(`\n=> Hoàn tất nạp dữ liệu Kho: Thành công ${successCount} dòng, Bỏ qua ${skipCount} dòng.`);

  } catch (fileError) {
    console.error('[THẤT BẠI] Lỗi nghiêm trọng khi đọc file CSV:', fileError.message);
  }

  // 2. Tạo Dữ liệu Giả lập (Mock Data) cho Dashboard có số liệu
  console.log('\n--------------------------------------------------');
  console.log('   NẠP DỮ LIỆU GIẢ LẬP HỌC VIÊN, LỚP HỌC & TÀI CHÍNH');
  console.log('--------------------------------------------------');

  // Nạp Lớp học mẫu
  const classCode = 'CN1_S1 Ms My_35_01';
  try {
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
    console.log(`[OK] Đã tạo lớp học mẫu: ${classCode}`);
  } catch (e) {
    console.error(`[LỖI] Không thể tạo lớp học mẫu:`, e.message);
  }

  // Nạp Học viên mẫu
  const students = [
    { id: 'HV2606_001', name: 'Nguyễn Minh Quân', phone: '0987654321', dob: new Date('2018-05-12'), address: 'Thủ Dầu Một, Bình Dương' },
    { id: 'HV2606_002', name: 'Lê Mai Chi', phone: '0912345678', dob: new Date('2017-08-22'), address: 'Thuận An, Bình Dương' },
    { id: 'HV2606_003', name: 'Trần Gia Bảo', phone: '0933445566', dob: new Date('2019-11-02'), address: 'Dĩ An, Bình Dương' },
  ];

  for (const student of students) {
    try {
      // Upsert học viên
      await prisma.student.upsert({
        where: { id: student.id },
        update: {},
        create: student,
      });

      // Tạo kết nối học viên vào lớp (nếu chưa có)
      const existingEnrollment = await prisma.enrollment.findFirst({
        where: { studentId: student.id, classCode },
      });

      if (!existingEnrollment) {
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
      console.log(`[OK] Đã nạp học viên & xếp lớp: ${student.name}`);
    } catch (e) {
      console.error(`[LỖI] Không thể nạp học viên ${student.name}:`, e.message);
    }
  }

  // Nạp Khách hàng tiềm năng (Leads)
  const leads = [
    { name: 'Phạm Minh Khôi', phone: '0977889900', status: 'Đang tư vấn', painPoints: 'Con nhát nói tiếng Anh', goals: 'Tự tin giao tiếp' },
    { name: 'Hoàng Ngọc Vy', phone: '0966554433', status: 'Học thử', painPoints: 'Mất gốc ngữ pháp', goals: 'Lấy lại căn bản' },
  ];

  for (const lead of leads) {
    try {
      const existingLead = await prisma.lead.findFirst({
        where: { phone: lead.phone },
      });

      if (!existingLead) {
        await prisma.lead.create({ data: lead });
        console.log(`[OK] Đã nạp KHTN: ${lead.name}`);
      }
    } catch (e) {
      console.error(`[LỖI] Không thể nạp KHTN ${lead.name}:`, e.message);
    }
  }

  // Nạp Giao dịch tài chính mẫu
  const orders = [
    { id: 'ORD_2606_001', studentId: 'HV2606_001', classCode: classCode, feeToPay: 3150000, amountPaid: 3150000, paymentStatus: 'Đã đóng' },
    { id: 'ORD_2606_002', studentId: 'HV2606_002', classCode: classCode, feeToPay: 3150000, amountPaid: 1500000, paymentStatus: 'Chưa đóng đủ' },
  ];

  for (const order of orders) {
    try {
      await prisma.orderFinance.upsert({
        where: { id: order.id },
        update: {},
        create: order,
      });
      console.log(`[OK] Đã tạo hóa đơn học phí: ${order.id}`);
    } catch (e) {
      console.error(`[LỖI] Không thể tạo hóa đơn ${order.id}:`, e.message);
    }
  }

  console.log('\n==================================================');
  console.log('          QUÁ TRÌNH NẠP DỮ LIỆU HOÀN TẤT!');
  console.log('==================================================');
}

main()
  .catch((e) => {
    console.error('Lỗi hệ thống trong quá trình seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
