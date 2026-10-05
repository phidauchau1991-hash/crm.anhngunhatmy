const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/app/finance/monthly/page.js');
let code = fs.readFileSync(file, 'utf8');

// Replace import
if (!code.includes("import * as htmlToImage")) {
  code = code.replace("import html2canvas from 'html2canvas';", "import * as htmlToImage from 'html-to-image';");
}

// We will use regex to replace the whole functions.
// Replace handleCopyPreviewImage
const handleCopyPreviewImageRegex = /const handleCopyPreviewImage = async \(\) => \{[\s\S]*?(?=const handleDownloadPreviewImage =)/;
const newHandleCopyPreviewImage = `const handleCopyPreviewImage = async () => {
    const el = hiddenPrintRef.current || previewTemplateRef.current;
    if (!el) return;
    setCopyingPreview(true);
    try {
      const blob = await htmlToImage.toBlob(el, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      if (!blob) throw new Error('Không tạo được ảnh (blob rỗng)');
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('Đã copy ảnh Thư Báo vào Clipboard! Hãy mở Zalo và dán (Ctrl+V) ngay cho phụ huynh.');
      } catch (err) {
        // Fallback cho điện thoại hoặc thiết bị không hỗ trợ ghi ảnh vào clipboard
        handleDownloadPreviewImage();
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo ảnh thư báo: ' + err.message);
    } finally {
      setCopyingPreview(false);
    }
  };

  `;
code = code.replace(handleCopyPreviewImageRegex, newHandleCopyPreviewImage);

// Replace handleDownloadPreviewImage
const handleDownloadPreviewImageRegex = /const handleDownloadPreviewImage = async [\s\S]*?(?=const handleCopyZaloMessage =)/;
const newHandleDownloadPreviewImage = `const handleDownloadPreviewImage = async () => {
    const el = hiddenPrintRef.current || previewTemplateRef.current;
    if (!el) return;
    try {
      const blob = await htmlToImage.toBlob(el, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      const filename = \`ThuBao_\${activeRecord?.studentName?.replace(/\\s+/g, '_') || 'HV'}_Thang_\${targetNoticeMonth?.replace('/', '_') || 'NA'}.png\`;
      
      // Hỗ trợ chia sẻ trực tiếp (Share) trên điện thoại (đặc biệt là iPhone, Zalo)
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        const file = new File([blob], filename, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'Thư báo học phí',
          text: 'Gửi phụ huynh thư báo học phí'
        });
        return;
      }
      
      // Fallback: Tải xuống bình thường
      const dataUrl = await htmlToImage.toPng(el, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tải ảnh thư báo.');
    }
  };

  `;
code = code.replace(handleDownloadPreviewImageRegex, newHandleDownloadPreviewImage);

// Replace handleCopyReceipt
const handleCopyReceiptRegex = /const handleCopyReceipt = async \(\) => \{[\s\S]*?(?=const downloadReceiptImage =)/;
const newHandleCopyReceipt = `const handleCopyReceipt = async () => {
    if (!receiptRef.current) return;
    setCopyingReceipt(true);
    try {
      const blob = await htmlToImage.toBlob(receiptRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('Đã copy Phiếu thu điện tử vào Clipboard! Hãy mở Zalo và dán (Ctrl+V) ngay.');
      } catch (err) {
        // Fallback for mobile
        downloadReceiptImage();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCopyingReceipt(false);
    }
  };

  `;
code = code.replace(handleCopyReceiptRegex, newHandleCopyReceipt);

// Replace downloadReceiptImage
const downloadReceiptImageRegex = /const downloadReceiptImage = async \(\) => \{[\s\S]*?(?=const toggleSelectRow =)/;
const newDownloadReceiptImage = `const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const blob = await htmlToImage.toBlob(receiptRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      const filename = \`PhieuThu_\${eReceiptData?.studentName?.replace(/\\s+/g, '_') || 'HV'}_Thang_\${monthYear?.replace('/', '_') || 'NA'}.png\`;
      
      // Hỗ trợ chia sẻ trực tiếp (Share) trên điện thoại
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        const file = new File([blob], filename, { type: 'image/png' });
        await navigator.share({
          files: [file],
          title: 'Phiếu thu điện tử',
          text: 'Gửi phụ huynh phiếu thu'
        });
        return;
      }
      
      // Fallback tải xuống
      const dataUrl = await htmlToImage.toPng(receiptRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  // Checkbox chọn học viên
  `;
code = code.replace(downloadReceiptImageRegex, newDownloadReceiptImage);

fs.writeFileSync(file, code, 'utf8');
console.log('Successfully upgraded image exports!');
