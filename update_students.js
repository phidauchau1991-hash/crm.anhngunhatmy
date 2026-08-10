const Database = require('better-sqlite3');
const db = new Database('dev.db');

const names = [
  'TRẦN THỊ MỸ KIM',
  'DƯƠNG TRẦN HOÀNG BÁCH',
  'VÕ NGỌC TRÂM ANH',
  'HOÀNG THÙY DƯƠNG',
  'LEE ĐÔNG MINH',
  'TRỊNH NGUYỄN NGỌC DIỆP',
  'VÕ THỊ NGỌC TUYỀN',
  'TRỊNH THỊ HẢI YẾN',
  'NGUYỄN MINH ANH'
];

const students = db.prepare(`SELECT * FROM Student WHERE name IN (${names.map(() => '?').join(',')})`).all(names);

console.log(JSON.stringify(students, null, 2));

// Update TRẦN THỊ MỸ KIM
db.prepare(`UPDATE Student SET nationalId = '064318005735' WHERE name = 'TRẦN THỊ MỸ KIM'`).run();
// Update DƯƠNG TRẦN HOÀNG BÁCH
db.prepare(`UPDATE Student SET phone = '0938029628' WHERE name = 'DƯƠNG TRẦN HOÀNG BÁCH'`).run();
// Update VÕ NGỌC TRÂM ANH
db.prepare(`UPDATE Student SET nationalId = '094317007198', phone = '0523194042' WHERE name = 'VÕ NGỌC TRÂM ANH'`).run();
// Update HOÀNG THÙY DƯƠNG
db.prepare(`UPDATE Student SET nationalId = '036318016934', phone = '0362098928' WHERE name = 'HOÀNG THÙY DƯƠNG'`).run();
// Update LEE ĐÔNG MINH
db.prepare(`UPDATE Student SET nationalId = '066218008479' WHERE name = 'LEE ĐÔNG MINH'`).run();
// Update TRỊNH NGUYỄN NGỌC DIỆP
db.prepare(`UPDATE Student SET nationalId = '040316005927', phone = '0989651517' WHERE name = 'TRỊNH NGUYỄN NGỌC DIỆP'`).run();
// Update VÕ THỊ NGỌC TUYỀN
db.prepare(`UPDATE Student SET phone = '0375478459' WHERE name = 'VÕ THỊ NGỌC TUYỀN'`).run();
// Update TRỊNH THỊ HẢI YẾN
db.prepare(`UPDATE Student SET nationalId = '0383317013719', phone = '0369436838' WHERE name = 'TRỊNH THỊ HẢI YẾN'`).run();
// Update NGUYỄN MINH ANH
db.prepare(`UPDATE Student SET nationalId = '074317002755' WHERE name = 'NGUYỄN MINH ANH'`).run();

console.log("Updated students.");
db.close();
