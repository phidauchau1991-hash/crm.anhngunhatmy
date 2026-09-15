const Database = require('better-sqlite3');
const db = new Database('./dev.db');

db.exec(`
  UPDATE Enrollment 
  SET billingType = 'MONTHLY_PREPAID', monthlyRate = 250000, monthlySessions = 8 
  WHERE id IN (
    SELECT id FROM Enrollment LIMIT 3
  );
  
  UPDATE Enrollment 
  SET billingType = 'MONTHLY_POSTPAID', monthlyRate = 250000
  WHERE id IN (
    SELECT id FROM Enrollment LIMIT 3 OFFSET 3
  );
`);

console.log('Updated 6 enrollments successfully.');
db.close();
