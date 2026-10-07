const fs = require('fs');
let code = fs.readFileSync('src/app/finance/monthly/page.js', 'utf8');

// Update Table Display for totalToPay
const oldTd = `<td style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.05rem', color: '#085E8A' }}>
                          {Number(row.totalToPay || 0).toLocaleString('vi-VN')}d
                        </td>`;

const newTd = `<td style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.05rem', color: '#085E8A' }}>
                          {Number(row.totalToPay || 0).toLocaleString('vi-VN')}đ
                          {row.amountPaid > 0 && (
                            <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 'bold' }}>
                              - Đã thu: {Number(row.amountPaid || 0).toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </td>`;

code = code.replace(oldTd, newTd);

// Update Modal Calculation
code = code.replace(
  `Tổng cần thanh toán: {Number(payInvoice.totalToPay || 0).toLocaleString('vi-VN')}đ`,
  `Tổng cần thanh toán: {Number((payInvoice.totalToPay || 0) - (payInvoice.amountPaid || 0)).toLocaleString('vi-VN')}đ`
);

// Update default payAmount
code = code.replace(
  `setPayAmount(row.totalToPay || 0);`,
  `setPayAmount((row.totalToPay || 0) - (row.amountPaid || 0));`
);

fs.writeFileSync('src/app/finance/monthly/page.js', code);
console.log("Patched page.js UI for table");
