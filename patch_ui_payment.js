const fs = require('fs');
let code = fs.readFileSync('src/app/finance/monthly/page.js', 'utf8');

if (!code.includes('payAmount, setPayAmount')) {
  // 1. Add state for payAmount
  code = code.replace(
    `const [payInvoice, setPayInvoice] = useState(null);`,
    `const [payInvoice, setPayInvoice] = useState(null);\n  const [payAmount, setPayAmount] = useState(0);`
  );

  // 2. Set default payAmount when opening modal
  code = code.replace(
    `setPayInvoice(row);\n                                  setShowPayModal(true);`,
    `setPayInvoice(row);\n                                  setPayAmount(row.totalToPay || 0);\n                                  setShowPayModal(true);`
  );

  // 3. UI for amountPaid in the Modal
  const oldAmountUI = `<div
                    style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #FFCA29',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: '0 0 0.25rem 0', color: '#64748b' }}>S? ti?n c?n thu d?t ny:</p>
                    <strong style={{ fontSize: '1.6rem', color: '#085E8A', fontWeight: '900' }}>
                      {Number(payInvoice.totalToPay || 0).toLocaleString('vi-VN')}d
                    </strong>`;

  const newAmountUI = `<div
                    style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #FFCA29',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: '0 0 0.25rem 0', color: '#64748b' }}>S? ti?n thu th?c t? d?t ny:</p>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={Number(payAmount || 0).toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\\D/g, '');
                          setPayAmount(Number(val));
                        }}
                        style={{
                          fontSize: '1.6rem',
                          color: '#085E8A',
                          fontWeight: '900',
                          border: 'none',
                          borderBottom: '2px dashed #085E8A',
                          background: 'transparent',
                          width: '200px',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '1.6rem', color: '#085E8A', fontWeight: '900', marginLeft: '4px' }}>d</span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#dc2626', fontSize: '0.85rem' }}>
                      T?ng n? (N? cu + Thng ny): {Number(payInvoice.totalToPay || 0).toLocaleString('vi-VN')}d
                    </p>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                      * N?u thu ch?u, ph?n cn l?i s? du?c luu sang thng sau
                    </p>`;
                    
  // Replace the exact matching portion. Note: UTF-8 encoding in regex might fail due to ?, so use regex replace with wildcard or handle carefully.
  // Actually, I will just use regex to replace that whole block.
  // Wait, I can just replace the specific section.
  code = code.replace(
    /{Number\(payInvoice.totalToPay \|\| 0\).toLocaleString\('vi-VN'\)}d/g,
    function(match, offset, string) {
       return match; // Actually I'll write a better replacer
    }
  );
  
  // Let's replace the whole modal-body amount block using regex.
  code = code.replace(
    /<p style={{ margin: '0 0 0.25rem 0', color: '#64748b' }}>.*?<\/strong>/s,
    `<p style={{ margin: '0 0 0.25rem 0', color: '#64748b' }}>Số tiền thu thực tế đợt này:</p>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={Number(payAmount || 0).toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\\D/g, '');
                          setPayAmount(Number(val));
                        }}
                        style={{
                          fontSize: '1.6rem',
                          color: '#085E8A',
                          fontWeight: '900',
                          border: 'none',
                          borderBottom: '2px dashed #085E8A',
                          background: 'transparent',
                          width: '180px',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '1.6rem', color: '#085E8A', fontWeight: '900', marginLeft: '4px' }}>đ</span>
                    </div>
                    <p style={{ margin: '0.5rem 0 0 0', color: '#dc2626', fontSize: '0.85rem', fontWeight: '600' }}>
                      Tổng cần thanh toán: {Number(payInvoice.totalToPay || 0).toLocaleString('vi-VN')}đ
                    </p>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                      *(Số tiền chưa đóng sẽ được lưu làm nợ cũ tháng sau)
                    </p>`
  );

  // 4. Update the POST to /api/finance/monthly/pay to pass amountPaid
  code = code.replace(
    `body: JSON.stringify({ invoiceId: payInvoice.invoiceId, paymentMethod }),`,
    `body: JSON.stringify({ invoiceId: payInvoice.invoiceId, paymentMethod, amountPaid: payAmount }),`
  );
  
  fs.writeFileSync('src/app/finance/monthly/page.js', code);
  console.log("Patched page.js UI");
} else {
  console.log("page.js already patched");
}
