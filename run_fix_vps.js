const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

const fixDbCode = `
const Database = require('better-sqlite3');
const db = new Database('dev.db');

function fixTableDates(tableName, dateColumns, uniqueColumns, pk = 'id') {
  console.log('Fixing table:', tableName);
  
  let hasPk = true;
  try {
    db.prepare(\`SELECT \${pk} FROM \${tableName} LIMIT 1\`).get();
  } catch(e) {
    hasPk = false;
  }
  
  // Verify columns exist
  const existingCols = db.pragma(\`table_info(\${tableName})\`).map(c => c.name);
  dateColumns = dateColumns.filter(c => existingCols.includes(c));
  
  const orderClause = hasPk ? \`ORDER BY \${pk} DESC\` : '';
  const rows = db.prepare(\`SELECT * FROM \${tableName} \${orderClause}\`).all();
  
  const duplicates = {};
  
  const updateStmt = db.prepare(\`UPDATE \${tableName} SET \${dateColumns.map(c => \`\${c} = ?\`).join(', ')} WHERE \${pk} = ?\`);
  const deleteStmt = db.prepare(\`DELETE FROM \${tableName} WHERE \${pk} = ?\`);
  
  let convertedCount = 0;
  let deletedCount = 0;

  db.transaction(() => {
    for (const row of rows) {
      let needsUpdate = false;
      const newVals = [];
      
      for (const col of dateColumns) {
        const val = row[col];
        if (typeof val === 'string') {
          needsUpdate = true;
          newVals.push(new Date(val).getTime());
        } else {
          newVals.push(val); 
        }
      }
      
      if (uniqueColumns && uniqueColumns.length > 0) {
        const keyParts = uniqueColumns.map(col => {
          const idx = dateColumns.indexOf(col);
          if (idx !== -1) return newVals[idx];
          return row[col];
        });
        const key = keyParts.join('|');
        
        if (duplicates[key]) {
          deleteStmt.run(row[pk]);
          deletedCount++;
          continue; 
        } else {
          duplicates[key] = true;
        }
      }
      
      if (needsUpdate) {
        updateStmt.run(...newVals, row[pk]);
        convertedCount++;
      }
    }
  })();
  
  console.log(\`- Converted dates for \${convertedCount} rows.\`);
  console.log(\`- Deleted \${deletedCount} duplicate rows.\`);
}

fixTableDates('Attendance', ['date', 'createdAt', 'updatedAt'], ['studentId', 'leadId', 'classCode', 'date']);
fixTableDates('AttendanceSummary', ['date', 'createdAt', 'updatedAt'], ['classCode', 'date']);
fixTableDates('Class', ['startDate', 'expectedEndDate', 'createdAt', 'updatedAt'], ['code'], 'code');
fixTableDates('Holiday', ['startDate', 'endDate', 'createdAt', 'updatedAt'], ['id']);
fixTableDates('Student', ['dob', 'createdAt', 'updatedAt'], ['id'], 'id');
fixTableDates('Enrollment', ['createdAt', 'updatedAt', 'enrolledDate'], ['id'], 'id');
console.log('Done fixing dates in SQLite.');
`;

async function fixVPS() {
  try {
    await ssh.connect({ host: '103.165.144.154', username: 'root', password: '4jGbRF9eQRXybRJr3vQP' });
    
    console.log("Writing script to VPS...");
    const writeRes = await ssh.execCommand(`cat << 'EOF' > /var/www/nhat-my-crm/fix_dates.js
${fixDbCode}
EOF`);
    
    console.log("Running fix_dates.js on VPS...");
    const runRes = await ssh.execCommand('cd /var/www/nhat-my-crm && node fix_dates.js');
    console.log(runRes.stdout);
    if(runRes.stderr) console.error("STDERR:", runRes.stderr);
    
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
fixVPS();
