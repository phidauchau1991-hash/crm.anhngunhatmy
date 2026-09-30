const fs = require('fs');
let code = fs.readFileSync('src/app/leads/page.js', 'utf8');

// 1. Add import
if (!code.includes('import ReviewModal')) {
    code = code.replace("import PlacementTestModal from './components/PlacementTestModal';", "import PlacementTestModal from './components/PlacementTestModal';\nimport ReviewModal from '@/components/ReviewModal';");
}

// 2. Add state
if (!code.includes('showReviewModal')) {
    code = code.replace("// Trial Invite Modal State", "// Review Modal State\n  const [showReviewModal, setShowReviewModal] = useState(false);\n  const [reviewLead, setReviewLead] = useState(null);\n\n  // Trial Invite Modal State");
}

// 3. Add component rendering
const reviewModalComponent = `
      {showReviewModal && reviewLead && (
        <ReviewModal 
          isOpen={showReviewModal}
          onClose={() => { setShowReviewModal(false); setReviewLead(null); }}
          initialType="trial"
          defaultStudent={{ name: reviewLead?.name, classCode: reviewLead?.trialClassCode || '' }}
        />
      )}
`;
if (!code.includes('<ReviewModal')) {
    code = code.replace("<PlacementTestModal ", reviewModalComponent + "\n      <PlacementTestModal ");
}

// 4. Add button
const reviewButton = `
                          <button 
                            className="action-btn" 
                            style={{ color: '#047857', background: '#d1fae5', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                            title="Nhận xét học thử" 
                            onClick={() => { setReviewLead(lead); setShowReviewModal(true); }}
                          >
                            <i className="fa-solid fa-star"></i> NX Học thử
                          </button>`;

if (!code.includes('NX Học thử')) {
    code = code.replace('📝 Báo KQ Test\n                          </button>', '📝 Báo KQ Test\n                          </button>' + reviewButton);
}

fs.writeFileSync('src/app/leads/page.js', code, 'utf8');
console.log('Modified page.js successfully!');
