const fs = require('fs');
let content = fs.readFileSync('src/app/attendance/page.js', 'utf8');

// Replace inline styles with class for TH
content = content.replace(
  /style=\{\{\s*textAlign:\s*'center',\s*position:\s*'sticky',\s*right:\s*0,\s*background:\s*'var\(--color-surface\)',\s*zIndex:\s*5,\s*boxShadow:\s*'-4px 0 10px rgba\(0,0,0,0\.08\)',\s*minWidth:\s*'170px'\s*\}\}/g,
  'className="sticky-col-right" style={{ textAlign: \'center\', minWidth: \'170px\' }}'
);

// Replace inline styles with class for TD
content = content.replace(
  /style=\{\{\s*textAlign:\s*'center',\s*whiteSpace:\s*'nowrap',\s*position:\s*'sticky',\s*right:\s*0,\s*background:\s*'var\(--color-surface\)',\s*zIndex:\s*5,\s*boxShadow:\s*'-4px 0 10px rgba\(0,0,0,0\.08\)'\s*\}\}/g,
  'className="sticky-col-right" style={{ textAlign: \'center\', whiteSpace: \'nowrap\' }}'
);

const cssToAdd = `
        .sticky-col-right {
          position: sticky;
          right: 0;
          background: var(--color-surface);
          z-index: 5;
          box-shadow: -4px 0 10px rgba(0,0,0,0.08);
        }
`;

// Insert the CSS class
content = content.replace(
  /(\@media \(max-width: 768px\) \{)/,
  cssToAdd + '$1'
);

// Disable sticky on mobile
content = content.replace(
  /(\.form-group-horizontal select, \.form-group-horizontal input \{ width: 100%; \})([\s\S]*?)(\})/,
  '$1$2\n          .sticky-col-right { position: static !important; box-shadow: none !important; }\n        $3'
);

fs.writeFileSync('src/app/attendance/page.js', content);
console.log('Fixed sticky column.');
