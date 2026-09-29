const fs = require('fs');
let code = fs.readFileSync('src/app/finance/monthly/page.js', 'utf8');

const fileInvoiceStr = '<i className="fa-solid fa-file-invoice"></i>';
// We want the last occurrence of fa-file-invoice (which is inside the button)
const invoiceIdx = code.lastIndexOf(fileInvoiceStr);
const imageIdx = code.lastIndexOf('<i className="fa-solid fa-image"></i>');

if (invoiceIdx !== -1 && imageIdx !== -1) {
    const startIdx = code.lastIndexOf("{row.status === 'NOT_GENERATED'", invoiceIdx);
    const endIdx = code.indexOf(')}', imageIdx) + 2;
    
    if (startIdx !== -1 && endIdx !== -1) {
        const replacement = `{row.status === 'NOT_GENERATED' ? (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleGenerateInvoice(row)}
                                disabled={isProcessing}
                                style={{ fontWeight: '600' }}
                              >
                                <i className="fa-solid fa-file-invoice"></i> Chốt sổ
                              </button>
                            ) : row.needsUpdate ? (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleGenerateInvoice(row)}
                                disabled={isProcessing}
                                style={{ fontWeight: '600', backgroundColor: '#dc2626', borderColor: '#dc2626' }}
                                title="Dữ liệu điểm danh đã thay đổi, cần cập nhật lại hóa đơn"
                              >
                                <i className="fa-solid fa-rotate"></i> Cập nhật
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: '700' }}
                                onClick={() => handleOpenNoticeModal(row)}
                              >
                                <i className="fa-solid fa-image"></i> Thư báo
                              </button>
                            )}`;
        
        code = code.substring(0, startIdx) + replacement + code.substring(endIdx);
        fs.writeFileSync('src/app/finance/monthly/page.js', code, 'utf8');
        console.log("Success exact block replacement via robust index");
    } else {
        console.log("Could not find start or end index");
    }
} else {
    console.log("Could not find invoice or image tags");
}
