const Database = require('better-sqlite3');
const db = new Database('dev.db');

const dobs = {
  'TRẦN THỊ MỸ KIM': '2018-03-27',
  'DƯƠNG TRẦN HOÀNG BÁCH': '2017-11-29',
  'VÕ NGỌC TRÂM ANH': '2017-11-16',
  'HOÀNG THÙY DƯƠNG': '2018-01-02',
  'LEE ĐÔNG MINH': '2018-06-25',
  'TRỊNH NGUYỄN NGỌC DIỆP': '2016-12-21',
  'VÕ THỊ NGỌC TUYỀN': '2015-07-11',
  'TRỊNH THỊ HẢI YẾN': '2016-01-12',
  'NGUYỄN MINH ANH': '2017-09-07'
};

const updateDob = db.prepare(`UPDATE Student SET dob = ?, updatedAt = ? WHERE id = ?`);
const students = db.prepare('SELECT id, name FROM Student').all();
const nowStr = new Date().toISOString();

let updated = 0;

for (const student of students) {
  const normName = student.name.normalize('NFC').trim();
  for (const [key, dateStr] of Object.entries(dobs)) {
    if (normName === key.normalize('NFC')) {
      const isoStr = new Date(`${dateStr}T00:00:00.000Z`).toISOString();
      updateDob.run(isoStr, nowStr, student.id);
      updated++;
      console.log('Updated:', normName);
    }
  }
}

console.log(`Updated ${updated} students' DOBs successfully.`);
db.close();
