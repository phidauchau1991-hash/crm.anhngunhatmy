const Database = require('better-sqlite3');
const db = new Database('prisma/dev.db', { fileMustExist: true });

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

if (tables.some(t => t.name === 'Class')) {
  const classes = db.prepare('SELECT code FROM Class').all();
  console.log('Classes:', classes.map(c => c.code).join(', '));
  const students = db.prepare('SELECT count(*) as count FROM Student').get();
  console.log('Total Students:', students.count);
  const leads = db.prepare('SELECT count(*) as count FROM Lead').get();
  console.log('Total Leads:', leads.count);
}
