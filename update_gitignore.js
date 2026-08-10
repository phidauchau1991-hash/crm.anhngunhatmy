const fs = require('fs');
let gitignore = fs.readFileSync('.gitignore', 'utf8');
if (!gitignore.includes('*.db')) {
  gitignore += '\n\n# SQLite Database\n*.db\n*.db.bak\n*.sqlite\n*.sqlite3\n';
  fs.writeFileSync('.gitignore', gitignore);
}
console.log('.gitignore updated');
