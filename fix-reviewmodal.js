const fs = require('fs');
let code = fs.readFileSync('src/components/ReviewModal.js', 'utf8');

const handleDownloadFuncRegex = /const handleDownload = async \(\) => \{[\s\S]*?\};/;
const handleCopyCode = `
  const handleCopy = async () => {
    const el = document.getElementById('report-template-capture');
    if (!el) return;
    try {
      const dataUrl = await htmlToImage.toPng(el, { quality: 1, pixelRatio: 2, style: { transform: 'scale(1)', transformOrigin: 'top left' } });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const item = new ClipboardItem({ 'image/png': blob });
      await navigator.clipboard.write([item]);
      alert('Đã copy ảnh vào bộ nhớ tạm. Có thể dán (Ctrl+V) vào Zalo ngay!');
    } catch (err) {
      console.error('Error copying image:', err);
      alert('Lỗi copy ảnh hoặc trình duyệt không hỗ trợ.');
    }
  };
`;
code = code.replace(handleDownloadFuncRegex, match => match + '\n' + handleCopyCode);

const buttonsRegex = /(<button onClick=\{handleDownload\}.*?Tải Ảnh Nhận Xét.*?<\/button>)/;
const replacementButtons = `
              <button onClick={handleCopy} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginRight: '10px' }}>
                <i className="fa-solid fa-copy"></i> Copy Ảnh (Zalo)
              </button>
              $1`;
code = code.replace(buttonsRegex, replacementButtons);

fs.writeFileSync('src/components/ReviewModal.js', code, 'utf8');
console.log('Modified ReviewModal.js successfully!');
