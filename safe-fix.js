const fs = require('fs');
let code = fs.readFileSync('src/app/finance/monthly/page.js', 'utf8');

const regex = /\{row\.status === 'NOT_GENERATED' \? \([\s\S]*?fa-file-invoice[\s\S]*?<\/button>\s*\) : \([\s\S]*?fa-image[\s\S]*?<\/button>\s*\)\}/;

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

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/app/finance/monthly/page.js', code, 'utf8');
    console.log("Success regex");
} else {
    console.log("Not found regex");
}
