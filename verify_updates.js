const Database = require('better-sqlite3');
const db = new Database('dev.db');

const dobs = {
  // Image 1: S1 T7&CN
  'ĐỖ TRUNG QUÂN': '2019-09-14',
  'PHẠM HOÀNG LONG': '2020-10-14',
  'NGUYỄN VIẾT ĐĂNG KHOA': '2019-12-12',
  'VŨ TIẾN MINH': '2019-03-29',
  'VÒNG TÚ ANH': '2020-06-10',
  'LEE DẠ MINH': '2019-12-14',
  'LÊ TRẦN NHẬT MINH': '2020-11-10',
  'CHƯỚNG BÁC QUÝ': '2020-11-10',

  // Image 2: S3 T3&T5
  'HÀ ANH ĐỨC': '2019-04-16',
  'BÙI DUY VƯƠNG': '2018-07-31',
  'NGUYỄN HOÀNG HUY': '2018-01-19',
  'LÊ HOÀNG QUÂN': '2019-10-22',
  'TRẦN NGUYÊN ANH KHÔI': '2018-01-04',
  'NGUYỄN AN NHIÊN': '2018-04-15',
  'NGUYỄN MINH KHANG': '2019-08-28',
  'LÊ NGỌC BẢO TRÚC': '2018-04-25',
  'NGUYỄN THÀNH CÔNG': '2017-05-18',
  'MAI PHƯƠNG HUYỀN': '2019-12-08',
  'NGUYỄN BÙI BẢO HÂN': '2017-08-01',

  // Image 3: S3 T7&CN
  'PHAN NGUYỄN QUỲNH TRANG': '2019-08-21',
  'BÙI THẢO NGÂN': '2019-06-18',
  'HỒ THỊ QUỲNH NHƯ': '2018-08-28',
  'DANH PHƯỚC TRÍ': '2018-08-05',
  'LÊ CHÍ THIỆN': '2018-04-04',
  'LÊ HOÀNG ANH KHOA': '2017-04-19',
  'NGÔ NGỌC BẢO TRÂN': '2019-04-10',
  'CHƯƠNG MỸ ANH': '2018-11-22',
  'BÙI LÊ AN NHIÊN': '2019-04-13',
  'LÊ TRẦN GIA HÂN': '2017-11-17',
  'VŨ NHẬT BẢO TRÚC': '2018-10-13'
};

const check = db.prepare('SELECT dob FROM Student WHERE name = ?');

let notUpdated = [];
for (const [name, expected] of Object.entries(dobs)) {
  const res = check.get(name);
  if (!res || !res.dob) {
    notUpdated.push(name);
  }
}

console.log("Missing DOBs for:", notUpdated);
db.close();
