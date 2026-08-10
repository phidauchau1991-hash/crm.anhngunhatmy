const Database = require('better-sqlite3');
const db = new Database('dev.db');

const students = db.prepare('SELECT id, name FROM Student').all();

const updateDob = db.prepare('UPDATE Student SET dob = ? WHERE id = ?');

const fixList = {
  'TRẦN NGUYÊN ANH KHÔI': '2018-01-04T00:00:00.000Z',
  'CHƯỚNG MỸ ANH': '2018-11-22T00:00:00.000Z',
  'CHƯƠNG MỸ ANH': '2018-11-22T00:00:00.000Z'
};

for (const student of students) {
  const normName = student.name.normalize('NFC').trim();
  for (const [key, date] of Object.entries(fixList)) {
    if (normName === key.normalize('NFC')) {
      updateDob.run(date, student.id);
      console.log('Updated:', normName);
    }
  }
}

db.close();
