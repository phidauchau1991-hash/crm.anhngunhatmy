const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/page.js');
let c = fs.readFileSync(file, 'utf8');

if (!c.includes('crmAlerts: prevCrm.tuition')) {
  // modify dismissAlerts to handle crmAlerts
  const oldDismiss = `setReviewAlerts((prev) => ({
      trialAlerts: prev.trialAlerts.filter((x) => !set.has(x.key)),
      reviewAlerts: prev.reviewAlerts.filter((x) => !set.has(x.key)),
    }));`;
    
  const newDismiss = oldDismiss + `\n    setCrmAlerts((prev) => ({
      ...prev,
      tuition: prev.tuition.filter((x) => !set.has(x.key)),
    }));`;
    
  c = c.replace(oldDismiss, newDismiss);

  // modify the tuition map to add "Đã nhắc" button
  const oldTuitionBtn = `<button onClick={() => openAiAlertModal(order, 'tuition')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', cursor: 'pointer' }}>AI Nhắc</button>`;
  const newTuitionBtn = `<div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        <button
                          onClick={() => dismissAlerts(order.key)}
                          title="Đánh dấu đã nhắc - cảnh báo sẽ ẩn đi"
                          style={{ padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #16a34a', background: '#f0fdf4', color: '#15803d', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}
                        >✓ Đã nhắc</button>
                        <button onClick={() => { openAiAlertModal(order, 'tuition'); dismissAlerts(order.key); }} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', cursor: 'pointer', borderRadius: '6px' }}>AI Nhắc</button>
                      </div>`;
                      
  c = c.replace(oldTuitionBtn, newTuitionBtn);
  
  fs.writeFileSync(file, c, 'utf8');
  console.log("Tuition alert UI patched!");
} else {
  console.log("Tuition alert UI already patched.");
}
