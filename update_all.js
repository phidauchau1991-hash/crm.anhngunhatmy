const Database = require('better-sqlite3');
const db = new Database('dev.db');

const dobs = {
  // M3
  'PHAN ĐAN LINH': '2016-08-05',
  'THÁI HOÀNG ÁNH DƯƠNG': '2017-09-06',
  'TRẦN MINH HẰNG': '2016-02-23',
  'NGUYỄN GIA BẢO': '2015-04-27',
  'VÒNG PHÚ VĨNH': '2015-01-28',
  'LÊ TRẦN NGUYÊN DƯƠNG': '2015-07-18',
  'TRỊNH THỊ HUYỀN TRANG': '2015-08-18',
  // M2
  'NGUYỄN PHÚC LÂM': '2018-03-03',
  'CHÂU NHẬT TRƯỜNG': '2020-07-15',
  'HOÀNG TRỊNH NHƯ Ý': '2018-01-19',
  'ĐINH HOÀNG THỊNH': '2017-08-26',
  'LÊ THỊ XUÂN THƯƠNG': '2016-05-09',
  'NGUYỄN NHÂN NGHĨA': '2016-10-11',
  'NGUYỄN NGỌC BẢO TRÂN': '2016-08-26',
  'NGUYỄN ĐÌNH BẢO': '2016-11-17',
  'DANH NGỌC THẢO UYÊN': '2014-05-29',
  'NGUYỄN VỊ ANH VĂN': '2016-07-31'
};

const updateDob = db.prepare(`UPDATE Student SET dob = ? WHERE name = ?`);

// 1. Update DOBs
for (const [name, dateStr] of Object.entries(dobs)) {
  const unixEpochMs = new Date(`${dateStr}T00:00:00.000Z`).getTime();
  // Prisma stores DateTime as ISO strings or ms in SQLite? Wait, my earlier check showed it returns an ISO string!
  // In Prisma, dates are stored as unix epoch in SQLite sometimes, but when reading via raw it showed `2019-01-01T00:00:00.000+00:00`
  // So it's probably stored as an ISO string.
  updateDob.run(new Date(`${dateStr}T00:00:00.000Z`).toISOString(), name);
}
console.log("Updated DOBs");

// 2. Fix nationalId formatting for ALL students
const allStudents = db.prepare(`SELECT id, nationalId FROM Student WHERE nationalId IS NOT NULL`).all();
const updateNationalId = db.prepare(`UPDATE Student SET nationalId = ? WHERE id = ?`);

for (const student of allStudents) {
  if (student.nationalId && /^[1-9][0-9]*$/.test(student.nationalId)) {
    updateNationalId.run('0' + student.nationalId, student.id);
  }
}
console.log("Updated CCCDs");

// 3. Mark attendance for M3 class
const m3ClassCode = 'CN1_M3_MsMy_24_01';
const m3Enrollments = db.prepare(`SELECT studentId FROM Enrollment WHERE classCode = ?`).all(m3ClassCode);

const datesToMark = [
  new Date('2026-07-27T00:00:00.000Z').toISOString(),
  new Date('2026-07-29T00:00:00.000Z').toISOString()
];

const checkAttendance = db.prepare(`SELECT id FROM Attendance WHERE studentId = ? AND classCode = ? AND date = ?`);
const insertAttendance = db.prepare(`
  INSERT INTO Attendance (studentId, classCode, date, status, checkInTime, missingWb, missingVideo, copyError, createdAt, updatedAt) 
  VALUES (?, ?, ?, 'Có mặt', 'Đúng giờ', 0, 0, 0, ?, ?)
`);

let created = 0;
const nowStr = new Date().toISOString();

for (const enrollment of m3Enrollments) {
  for (const date of datesToMark) {
    const existing = checkAttendance.get(enrollment.studentId, m3ClassCode, date);
    if (!existing) {
      insertAttendance.run(enrollment.studentId, m3ClassCode, date, nowStr, nowStr);
      created++;
    }
  }
}

console.log(`Created ${created} attendance records.`);
db.close();
