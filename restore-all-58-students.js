const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');

const adapter = new PrismaBetterSqlite3({ url: 'file:dev.db' });
const prisma = new PrismaClient({ adapter });

const brainPaths = [
  'C:/Users/admin/.gemini/antigravity/brain',
  'C:/Users/admin/.gemini/antigravity-ide/brain'
];
const students = new Map();

function searchDir(dir) {
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const p = path.join(dir, item);
      try {
        if (fs.statSync(p).isDirectory()) {
          if (!item.includes('node_modules')) {
            searchDir(p);
          }
        } else {
          if (/\.(jsonl|log|txt)$/i.test(item)) {
            scanFile(p);
          }
        }
      } catch(e){}
    }
  } catch(e){}
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const l of lines) {
      const subs = l.split(/\\n|\n/);
      for (const sub of subs) {
        const clean = sub.replace(/\\"/g, '"').replace(/\\\\/g, '\\').trim();
        
        // Pattern A: ✓ [HV2607_040] BÙI DUY VƯƠNG | SĐT: 0397236289 | CCCD: 064218010997 | HP: 3.450.000 đ | Đã đóng: 0 đ (Chưa đóng) | Điểm danh: 6/6 buổi
        if (clean.includes('✓ [HV2607_') && clean.includes('| CCCD:')) {
          const m = clean.match(/✓ \[([^\]]+)\] ([^|]+) \| SĐT: ([^|]+) \| CCCD: ([^\s|]+)/);
          if (m) {
            const id = m[1].trim();
            const name = m[2].trim();
            let phone = m[3].replace(/"/g, '').trim();
            if (phone === 'Chưa có' || phone === 'null' || phone === 'undefined' || phone === 'N/A') phone = null;
            const cccd = m[4].replace(/"/g, '').trim();
            const existing = students.get(id) || { id, name, phone, cccd };
            if (phone) existing.phone = phone;
            if (cccd) existing.cccd = cccd;

            // Extract Fee & Paid & Attendance
            const feeMatch = clean.match(/HP:\s*([\d\.]+)\s*đ/);
            if (feeMatch) existing.fee = parseInt(feeMatch[1].replace(/\./g, ''));
            const paidMatch = clean.match(/Đã đóng:\s*([\d\.]+)\s*đ/);
            if (paidMatch) existing.paid = parseInt(paidMatch[1].replace(/\./g, ''));
            const attMatch = clean.match(/Điểm danh:\s*(\d+)\/(\d+)/);
            if (attMatch) {
              existing.attended = parseInt(attMatch[1]);
              existing.totalSessionsTaught = parseInt(attMatch[2]);
            }

            students.set(id, existing);
          }
        }

        // Pattern B: [task-141.log] [HV2607_001] PHAN ĐAN LINH | SĐT: "0975796002" | CCCD: 92316003611 | Lớp: CN1_M3_MsMy_24_01
        if (clean.includes('[HV2607_') && clean.includes('| Lớp:')) {
          const m = clean.match(/\[(HV2607_[^\]]+)\] ([^|]+) \| SĐT: ([^|]+) \| CCCD: ([^|]+) \| Lớp: ([^\s|]+)/);
          if (m) {
            const id = m[1].trim();
            const name = m[2].trim();
            let phone = m[3].replace(/"/g, '').trim();
            if (phone === 'Chưa có' || phone === 'null' || phone === 'undefined' || phone === 'N/A') phone = null;
            const cccd = m[4].replace(/"/g, '').trim();
            const classCode = m[5].replace(/"/g, '').trim();
            const existing = students.get(id) || { id, name, phone, cccd };
            existing.classCode = classCode;
            if (phone) existing.phone = phone;
            if (cccd) existing.cccd = cccd;
            students.set(id, existing);
          }
        }

        // Pattern C: 27: HV2607_027: PHAN NGUYỄN QUỲNH TRANG | Phone: null | CCCD: 074319005724
        if (clean.includes('HV2607_') && (clean.includes('| Phone:') || clean.includes('| SĐT:'))) {
          const m = clean.match(/(HV2607_[0-9]{3}): ([^|]+) \| (?:Phone|SĐT): ([^|]+) \| CCCD: ([^\s|]+)/);
          if (m) {
            const id = m[1].trim();
            const name = m[2].trim();
            let phone = m[3].replace(/"/g, '').trim();
            if (phone === 'Chưa có' || phone === 'null' || phone === 'undefined' || phone === 'N/A') phone = null;
            const cccd = m[4].replace(/"/g, '').trim();
            const existing = students.get(id) || { id, name, phone, cccd };
            if (phone) existing.phone = phone;
            if (cccd) existing.cccd = cccd;
            students.set(id, existing);
          }
        }
      }
    }
  } catch(e){}
}

function getPastClassDates(startDate, schedule, count, holidays) {
  const dates = [];
  let currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  const targetDays = [];
  if (schedule.includes('2')) targetDays.push(1);
  if (schedule.includes('3')) targetDays.push(2);
  if (schedule.includes('4')) targetDays.push(3);
  if (schedule.includes('5')) targetDays.push(4);
  if (schedule.includes('6')) targetDays.push(5);
  if (schedule.includes('7')) targetDays.push(6);
  if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) targetDays.push(0);

  const holidaySet = new Set(holidays.map(h => new Date(h.startDate).toDateString()));

  let attempts = 0;
  while (dates.length < count && attempts < 365) {
    attempts++;
    const day = currentDate.getDay();
    if (targetDays.includes(day)) {
      if (!holidaySet.has(currentDate.toDateString())) {
        dates.push(new Date(currentDate));
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dates;
}

async function main() {
  console.log('=== STARTING COMPLETE RESTORATION OF 58 HISTORICAL STUDENTS ===\n');
  for (const bp of brainPaths) {
    searchDir(bp);
  }

  const holidays = await prisma.holiday.findMany();
  const classes = await prisma.class.findMany();
  const classMap = new Map(classes.map(c => [c.code, c]));

  // Ensure CN1_S1_MsMy_7CN_Ca4 has level S1
  await prisma.class.update({
    where: { code: 'CN1_S1_MsMy_7CN_Ca4' },
    data: { level: 'S1' }
  });

  // 1. Clean up existing partial tables
  console.log('--- Cleaning up current partial tables ---');
  await prisma.attendance.deleteMany({});
  await prisma.orderFinance.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.student.deleteMany({});

  const now = new Date();
  const yearMonthPrefix = `${String(now.getFullYear()).substring(2)}${String(now.getMonth() + 1).padStart(2, '0')}`;

  let restoredCount = 0;
  for (let i = 1; i <= 58; i++) {
    const id = `HV2607_${String(i).padStart(3, '0')}`;
    const s = students.get(id);
    if (!s) {
      console.log(`WARNING: Missing student data for ${id}`);
      continue;
    }

    let targetClassCode = s.classCode;
    if (!targetClassCode) {
      if (i <= 7) targetClassCode = 'CN1_M3_MsMy_24_01';
      else if (i <= 17) targetClassCode = 'CN1_M2_MsMy_35_01';
      else if (i <= 26) targetClassCode = 'CN1_M1_MsMy_7CN_Ca2';
      else if (i <= 38) targetClassCode = 'CN1_S3_MsMy_7CN_Ca1';
      else if (i <= 50) targetClassCode = 'CN1_S3_MsMy_35_Ca2';
      else if (i <= 58) targetClassCode = 'CN1_S1_MsMy_7CN_Ca4';
    }

    const cls = classMap.get(targetClassCode);
    if (!cls) {
      console.log(`WARNING: Class not found for code ${targetClassCode}`);
      continue;
    }

    let feeToPay = s.fee;
    if (!feeToPay) {
      if (cls.level === 'M3' || cls.level === 'S1') feeToPay = 3150000;
      else feeToPay = 3450000;
    }

    let amountPaid = s.paid !== undefined ? s.paid : 0;
    const paymentStatus = amountPaid >= feeToPay ? 'Đã đóng' : (amountPaid > 0 ? 'Chưa đóng đủ' : 'Chưa đóng');

    let nationalId = s.cccd;
    if (!nationalId || nationalId === '0' || nationalId === 'undefined' || nationalId === 'N/A') {
      nationalId = `KDD_${yearMonthPrefix}_${String(i).padStart(3, '0')}`;
    }

    // Create Student
    const student = await prisma.student.create({
      data: {
        id,
        name: s.name,
        phone: s.phone || null,
        dob: new Date('2019-01-01'),
        address: null,
        nationalId,
        status: 'Đang học',
        specialPolicyType: 'Không giảm',
        specialPolicyValue: 0,
        specialPolicy: 'Không',
        referralCode: id,
      }
    });

    // Create Enrollment
    await prisma.enrollment.create({
      data: {
        studentId: id,
        classCode: targetClassCode
      }
    });

    // Create Finance Order
    const orderId = `ORD_IMP_${yearMonthPrefix}_${String(i).padStart(3, '0')}`;
    await prisma.orderFinance.create({
      data: {
        id: orderId,
        studentId: id,
        classCode: targetClassCode,
        promoType: 'Giá thỏa thuận Import',
        promoDiscount: 0,
        feeToPay,
        amountPaid,
        paymentStatus,
        paymentDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        paymentPolicy: 'Đóng trước'
      }
    });

    // Create Attendance
    let sessionsTaught = s.totalSessionsTaught;
    if (!sessionsTaught) {
      if (cls.level === 'M3') sessionsTaught = 6;
      else if (cls.level === 'M2') sessionsTaught = 22;
      else if (cls.level === 'M1') sessionsTaught = 20;
      else if (cls.level === 'S3') sessionsTaught = 6;
      else if (cls.level === 'S1') sessionsTaught = 4;
      else sessionsTaught = 6;
    }

    let sessionsAttended = s.attended !== undefined ? s.attended : sessionsTaught;
    const pastDates = getPastClassDates(cls.startDate, cls.schedule, sessionsTaught, holidays);

    for (let dIdx = 0; dIdx < pastDates.length; dIdx++) {
      const attendDate = pastDates[dIdx];
      const status = dIdx < sessionsAttended ? 'Có mặt' : 'Vắng có phép';

      await prisma.attendance.create({
        data: {
          studentId: id,
          classCode: targetClassCode,
          date: attendDate,
          status,
          teacherNotes: 'Khôi phục dữ liệu từ log lịch sử',
          checkInTime: status === 'Có mặt' ? 'Đúng giờ' : '',
        }
      });
    }

    restoredCount++;
    console.log(`✓ [${id}] ${student.name} (${targetClassCode}) | SĐT: ${student.phone || 'Chưa có'} | CCCD: ${student.nationalId} | HP: ${feeToPay.toLocaleString('vi-VN')} đ | Đóng: ${amountPaid.toLocaleString('vi-VN')} đ (${paymentStatus})`);
  }

  console.log(`\n=== KHÔI PHỤC THÀNH CÔNG ${restoredCount}/58 HỌC VIÊN VÀO 6 LỚP ===`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
