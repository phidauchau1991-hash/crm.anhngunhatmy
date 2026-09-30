const fs = require('fs');
let code = fs.readFileSync('src/app/leads/page.js', 'utf8');

const regex = /<button\s*className="action-btn"\s*style=\{\{ color: '#4c1d95', background: '#ede9fe', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' \}\}\s*title="[^"]*"\s*onClick=\{\(\) => \{ setPlacementLead\(lead\); setShowPlacementModal\(true\); \}\}\s*>\s*[^<]*KQ Test\s*<\/button>/g;

const replacement = `<button 
                            className="action-btn" 
                            style={{ color: '#4c1d95', background: '#ede9fe', border: '1px solid #ddd6fe', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                            title="Báo kết quả test năng lực" 
                            onClick={() => { setPlacementLead(lead); setShowPlacementModal(true); }}
                          >
                            📝 Báo KQ Test
                          </button>`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/app/leads/page.js', code, 'utf8');
    console.log("Replaced successfully!");
} else {
    console.log("Could not find regex!");
}
