const Database = require('better-sqlite3');
const db = new Database('dev.db');

const getStudents = db.prepare(`
  SELECT s.name, e.classCode 
  FROM Student s
  JOIN Enrollment e ON s.id = e.studentId
  WHERE e.classCode IN ('CN1_S3_MsMy_7CN_Ca1', 'CN1_S3_MsMy_35_Ca2', 'CN1_S1_MsMy_7CN_Ca4')
`);

const students = getStudents.all();

const classes = {
  'CN1_S3_MsMy_7CN_Ca1': [],
  'CN1_S3_MsMy_35_Ca2': [],
  'CN1_S1_MsMy_7CN_Ca4': []
};

for (const s of students) {
  classes[s.classCode].push(s.name);
}

console.log("S1 T7&CN (CN1_S1_MsMy_7CN_Ca4):", classes['CN1_S1_MsMy_7CN_Ca4']);
console.log("S3 T7&CN (CN1_S3_MsMy_7CN_Ca1):", classes['CN1_S3_MsMy_7CN_Ca1']);
console.log("S3 T3&T5 (CN1_S3_MsMy_35_Ca2):", classes['CN1_S3_MsMy_35_Ca2']);

db.close();
