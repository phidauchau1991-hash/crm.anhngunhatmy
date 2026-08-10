import Database from 'better-sqlite3';

const db = new Database('./dev.db');

const students = db.prepare('SELECT id, name, status FROM Student').all();
console.log('Tổng số học viên:', students.length);

const enrollments = db.prepare('SELECT classCode, count(*) as count FROM Enrollment GROUP BY classCode').all();
console.log('Học viên theo lớp:');
console.table(enrollments);

const classes = db.prepare('SELECT classCode FROM Class').all();
console.log('Tổng số lớp:', classes.length);
