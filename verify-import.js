const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

async function verify() {
  console.log("=== DANH SÁCH HỌC VIÊN LỚP CN1_S3_MsMy_7CN_Ca1 ===");
  const classObj = await prisma.class.findUnique({
    where: { code: 'CN1_S3_MsMy_7CN_Ca1' },
    include: {
      enrollments: {
        include: {
          student: {
            include: {
              orders: true
            }
          }
        }
      }
    }
  });

  if (!classObj) {
    console.log("Không tìm thấy lớp!");
    return;
  }

  console.log(`Lớp: ${classObj.code} | Cấp độ: ${classObj.level} | Giáo viên: ${classObj.teacherName} | Khai giảng: ${classObj.startDate.toISOString().substring(0,10)} | Sỹ số: ${classObj.enrollments.length}`);
  
  classObj.enrollments.forEach((e, idx) => {
    const s = e.student;
    const order = s.orders[0];
    console.log(`${idx + 1}. Mã HV: ${s.id} | Tên: ${s.name} | SĐT: ${s.phone || 'N/A'} | Ngày sinh: ${s.dob ? s.dob.toISOString().substring(0,10) : 'N/A'} | CCCD: ${s.nationalId} | Học phí: ${order ? order.feeToPay.toLocaleString() + 'đ' : 'N/A'} | Đã đóng: ${order ? order.amountPaid.toLocaleString() + 'đ' : 'N/A'}`);
  });

  const attendanceCount = await prisma.attendance.count({
    where: { classCode: 'CN1_S3_MsMy_7CN_Ca1' }
  });
  console.log(`\nTổng số bản ghi điểm danh lịch sử được sinh ra cho lớp: ${attendanceCount}`);
}

verify().catch(console.error).finally(() => prisma.$disconnect());
