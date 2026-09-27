const Database = require('better-sqlite3');
const db = new Database('dev.db');

const res = db.prepare("UPDATE Student SET status = 'Đang học' WHERE status != 'Đang học' AND status LIKE '%ang h%'").run();
console.log('Fixed using LIKE %ang h%:', res.changes);

const res2 = db.prepare("UPDATE Student SET status = 'Đang học' WHERE status = 'Ä''ang há»c' OR status = 'Äang há»c' OR (status LIKE '%ng h%' AND status != 'Đang học' AND status != 'Nghỉ học' AND status != 'Bảo lưu')").run();
console.log('Fixed using other patterns:', res2.changes);

db.close();
