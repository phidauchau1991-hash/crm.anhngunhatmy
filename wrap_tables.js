const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/finance/monthly/page.js');
let code = fs.readFileSync(file, 'utf8');

let lines = code.split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<table className="custom-table">') && !lines[i].includes('overflowX')) {
    lines[i] = lines[i].replace('<table className="custom-table">', '<div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>\n<table className="custom-table">');
  }
  if (lines[i].includes('<table style={{ borderCollapse: \'separate\', borderSpacing: 0, width: \'100%\', fontSize: \'0.95rem\' }}>') && !lines[i].includes('overflowX')) {
    lines[i] = lines[i].replace('<table style={{ borderCollapse: \'separate\', borderSpacing: 0, width: \'100%\', fontSize: \'0.95rem\' }}>', '<div style={{ overflowX: "auto", width: "100%", WebkitOverflowScrolling: "touch" }}>\n<table style={{ borderCollapse: \'separate\', borderSpacing: 0, width: \'100%\', fontSize: \'0.95rem\' }}>');
  }
  
  if (lines[i].trim() === '</table>') {
    lines[i] = lines[i].replace('</table>', '</table>\n</div>');
  }
}

fs.writeFileSync(file, lines.join('\n'), 'utf8');
console.log('Done');
