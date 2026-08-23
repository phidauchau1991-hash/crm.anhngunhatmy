const Database = require('better-sqlite3');
const db = new Database('./dev.db');

// Lớp S4 giá 2,400,000đ cho 24 buổi (100k/buổi).
// Trúc học 22 buổi -> Học phí gốc là 2,200,000đ.
// Giảm 50% do bảo lưu -> Còn 1,100,000đ.
db.prepare("UPDATE OrderFinance SET feeToPay = 1100000 WHERE id = 'ORD_2608_006'").run();

console.log('Đã cập nhật học phí cho Nguyễn Bảo Trúc thành 1,100,000đ (22 buổi - giảm 50%).');
db.close();
