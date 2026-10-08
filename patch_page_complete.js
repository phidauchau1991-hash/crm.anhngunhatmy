const fs = require('fs');
let code = fs.readFileSync('src/app/finance/monthly/page.js', 'utf8');

// 1. In handleSaveAdjustedDebt: add previousDebtLocked: true
code = code.replace(
  `notes: adjustedDebtMonth ? \`Nợ cũ tháng \${adjustedDebtMonth}\` : activeRecord.notes,`,
  `previousDebtLocked: true,\n            notes: adjustedDebtMonth ? \`Nợ cũ tháng \${adjustedDebtMonth}\` : activeRecord.notes,`
);

// 2. In handlePayInvoice: enhance setEReceiptData
const oldHandlePaySuccess = `      if (res.ok) {
        setMessage({ type: 'success', text: 'Thu tiền thành công!' });
                let displayMonthYear = monthYear;
        if (payInvoice.billingType === 'MONTHLY_PREPAID' && monthYear.includes('/')) {
          const [m, y] = monthYear.split('/');
          let nextM = parseInt(m, 10) + 1;
          let nextY = parseInt(y, 10);
          if (nextM > 12) { nextM = 1; nextY++; }
          displayMonthYear = \`\${nextM.toString().padStart(2, '0')}/\${nextY}\`;
        }
        const realAmountPaid = Number(payAmount || 0);
          const debtBeforeThis = Number(payInvoice.totalToPay || 0) - Number(payInvoice.amountPaid || 0);
          const newRemaining = debtBeforeThis - realAmountPaid;
          setEReceiptData({
            studentName: payInvoice.studentName,
            totalPaid: realAmountPaid,
            oldDebt: debtBeforeThis,
            tuitionPaid: realAmountPaid,
            remainingDebt: newRemaining > 0 ? newRemaining : 0,
            monthYear: displayMonthYear,
            paymentMethod: payMethod,
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            cashier: 'Admin',
          });
        fetchNoticesData();
      }`;

const newHandlePaySuccess = `      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setMessage({ type: 'success', text: 'Thu tiền thành công!' });
        let displayMonthYear = monthYear;
        if (payInvoice.billingType === 'MONTHLY_PREPAID' && monthYear.includes('/')) {
          const [m, y] = monthYear.split('/');
          let nextM = parseInt(m, 10) + 1;
          let nextY = parseInt(y, 10);
          if (nextM > 12) { nextM = 1; nextY++; }
          displayMonthYear = \`\${nextM.toString().padStart(2, '0')}/\${nextY}\`;
        }
        const snap = resJson.snapshot;
        const numThisTime = Number(payAmount || 0);
        setEReceiptData({
          studentName: snap?.studentName || payInvoice.studentName,
          classCode: snap?.classCode || payInvoice.classCode,
          monthYear: displayMonthYear,
          paymentMethod: payMethod,
          currentFee: snap?.currentFee ?? (payInvoice.currentFee || 0),
          previousDebt: snap?.previousDebt ?? (payInvoice.previousDebt || 0),
          excessMissing: snap?.excessMissing ?? (payInvoice.excessMissing || 0),
          totalToPay: snap?.totalToPay ?? (payInvoice.totalToPay || 0),
          amountPaidBefore: snap?.amountPaidBefore ?? (payInvoice.amountPaid || 0),
          amountThisTime: snap?.amountThisTime ?? numThisTime,
          amountPaidAfter: snap?.amountPaidAfter ?? ((payInvoice.amountPaid || 0) + numThisTime),
          remainingDebt: snap?.remainingAfter ?? Math.max(0, (payInvoice.totalToPay || 0) - ((payInvoice.amountPaid || 0) + numThisTime)),
          date: snap?.date || new Date().toLocaleDateString('vi-VN'),
          time: snap?.time || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          cashier: 'Admin',
        });
        fetchNoticesData();
      } else {
        alert(resJson?.error || 'Có lỗi khi thu tiền');
      }`;

if (code.includes(oldHandlePaySuccess)) {
  code = code.replace(oldHandlePaySuccess, newHandlePaySuccess);
  console.log('Replaced handlePaySuccess directly');
} else {
  // Use regex replace for handlePayInvoice success block
  code = code.replace(
    /if \(res\.ok\) \{[\s\S]*?fetchNoticesData\(\);\s*\}/,
    newHandlePaySuccess
  );
  console.log('Replaced handlePaySuccess via regex');
}

// 3. Replace the Modal Thu Tiền input box & breakdown (around line 2675-2720)
const oldModalInputBox = `<div
                    style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #FFCA29',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: '0 0 0.25rem 0', color: '#64748b' }}>Số tiền thu thực tế đợt này:</p>
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
                      Tổng cần thanh toán: {Number((payInvoice.totalToPay || 0) - (payInvoice.amountPaid || 0)).toLocaleString('vi-VN')}đ
                    </p>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.8rem' }}>
                      *(Số tiền chưa đóng sẽ được lưu làm nợ cũ tháng sau)
                    </p>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Học viên: <strong>{payInvoice.studentName}</strong> | Lớp: {payInvoice.classCode}
                    </div>
                  </div>`;

const newModalInputBox = `<div
                    style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #FFCA29',
                      borderRadius: '12px',
                      padding: '1rem 1.15rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: '0.6rem' }}>
                      Học viên: <strong style={{ color: '#085E8A' }}>{payInvoice.studentName}</strong> | Lớp: <strong>{payInvoice.classCode}</strong>
                    </div>

                    <div style={{ borderBottom: '1px dashed #FCD34D', paddingBottom: '0.5rem', marginBottom: '0.6rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#475569' }}>Học phí tháng này:</span>
                        <strong>{Number(payInvoice.currentFee || 0).toLocaleString('vi-VN')}đ</strong>
                      </div>
                      {Number(payInvoice.previousDebt || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B45309' }}>
                          <span>Nợ cũ chuyển sang:</span>
                          <strong>+ {Number(payInvoice.previousDebt || 0).toLocaleString('vi-VN')}đ</strong>
                        </div>
                      )}
                      {Number(payInvoice.excessMissing || 0) !== 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Bù trừ dư/thiếu:</span>
                          <strong>{Number(payInvoice.excessMissing || 0) > 0 ? '+' : ''}{Number(payInvoice.excessMissing || 0).toLocaleString('vi-VN')}đ</strong>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #FCD34D', paddingTop: '0.35rem', marginTop: '0.35rem', color: '#085E8A' }}>
                        <span style={{ fontWeight: '800' }}>TỔNG CẦN THANH TOÁN:</span>
                        <strong style={{ fontSize: '1.05rem', fontWeight: '900' }}>{Number(payInvoice.totalToPay || 0).toLocaleString('vi-VN')}đ</strong>
                      </div>
                      {Number(payInvoice.amountPaid || 0) > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16A34A' }}>
                          <span>Đã nộp trước đó:</span>
                          <strong>- {Number(payInvoice.amountPaid || 0).toLocaleString('vi-VN')}đ</strong>
                        </div>
                      )}
                    </div>

                    <p style={{ margin: '0 0 0.25rem 0', color: '#085E8A', fontWeight: '700', textAlign: 'center', fontSize: '0.95rem' }}>
                      Số tiền thực thu đợt này:
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={Number(payAmount || 0).toLocaleString('vi-VN')}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\\D/g, '');
                          setPayAmount(Number(val));
                        }}
                        style={{
                          fontSize: '1.65rem',
                          color: '#085E8A',
                          fontWeight: '900',
                          border: 'none',
                          borderBottom: '2px dashed #085E8A',
                          background: 'transparent',
                          width: '210px',
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '1.65rem', color: '#085E8A', fontWeight: '900', marginLeft: '4px' }}>đ</span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{ fontSize: '0.8rem', padding: '2px 10px', borderColor: '#085E8A', color: '#085E8A', fontWeight: '600' }}
                        onClick={() => setPayAmount(Math.max(0, (payInvoice.totalToPay || 0) - (payInvoice.amountPaid || 0)))}
                      >
                        Thu đủ ({Number(Math.max(0, (payInvoice.totalToPay || 0) - (payInvoice.amountPaid || 0))).toLocaleString('vi-VN')}đ)
                      </button>
                    </div>

                    <div style={{ marginTop: '0.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
                      {((payInvoice.totalToPay || 0) - (payInvoice.amountPaid || 0) - (payAmount || 0)) > 0 ? (
                        <span style={{ color: '#DC2626', fontWeight: '600' }}>
                          Còn lại sau thu: {Number((payInvoice.totalToPay || 0) - (payInvoice.amountPaid || 0) - (payAmount || 0)).toLocaleString('vi-VN')}đ (Lưu nợ kỳ sau)
                        </span>
                      ) : (
                        <span style={{ color: '#16A34A', fontWeight: '700' }}>
                          ✓ Thanh toán hoàn tất
                        </span>
                      )}
                    </div>
                  </div>`;

if (code.includes(oldModalInputBox)) {
  code = code.replace(oldModalInputBox, newModalInputBox);
  console.log('Replaced modalInputBox directly');
} else {
  code = code.replace(
    /<div\s*style=\{\{\s*background:\s*'#FFFBEB'[\s\S]*?Học viên:[\s\S]*?<\/div>\s*<\/div>/,
    newModalInputBox
  );
  console.log('Replaced modalInputBox via regex');
}

// 4. Replace eReceiptData rendering in the receipt view (around line 2840-2880)
const oldReceiptBreakdown = `<div style={{ margin: '0.75rem 0', fontSize: '0.95rem', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí cần đóng:</span>
                          <span>{Number(eReceiptData.oldDebt || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí đóng đợt này:</span>
                          <span style={{ fontWeight: 'bold', color: '#0D88C4' }}>
                            + {Number(eReceiptData.tuitionPaid || 0).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí còn lại:</span>
                          <span
                            style={{
                              fontWeight: 'bold',
                              color: Number(eReceiptData.remainingDebt || 0) > 0 ? '#E11D48' : '#10B981',
                            }}
                          >
                            {Number(eReceiptData.remainingDebt || 0).toLocaleString('vi-VN')}đ{' '}
                            {Number(eReceiptData.remainingDebt || 0) === 0 ? '(Đã hoàn tất)' : ''}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '1rem',
                          background: '#FFFBEB',
                          border: '2px solid #FFCA29',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: '800', fontSize: '1rem', color: '#085E8A' }}>TỔNG THU ĐỢT NÀY:</span>
                        <span style={{ fontWeight: '900', fontSize: '1.35rem', color: '#0D88C4' }}>
                          {Number(eReceiptData.totalPaid || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>`;

const newReceiptBreakdown = `<div style={{ margin: '0.75rem 0', fontSize: '0.92rem', lineHeight: '1.85' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>1. Học phí tháng {eReceiptData.monthYear}:</span>
                          <span style={{ fontWeight: '600' }}>{Number(eReceiptData.currentFee || 0).toLocaleString('vi-VN')}đ</span>
                        </div>

                        {Number(eReceiptData.previousDebt || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B45309' }}>
                            <span>2. Nợ cũ chuyển sang:</span>
                            <span style={{ fontWeight: '600' }}>+ {Number(eReceiptData.previousDebt || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                        )}

                        {Number(eReceiptData.excessMissing || 0) !== 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#475569' }}>3. Bù trừ dư/thiếu:</span>
                            <span style={{ fontWeight: '600' }}>{Number(eReceiptData.excessMissing || 0) > 0 ? '+' : ''}{Number(eReceiptData.excessMissing || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', marginTop: '4px' }}>
                          <span style={{ color: '#085E8A', fontWeight: '800' }}>TỔNG CẦN THANH TOÁN:</span>
                          <strong style={{ color: '#085E8A', fontWeight: '900', fontSize: '1.05rem' }}>
                            {Number(eReceiptData.totalToPay || 0).toLocaleString('vi-VN')}đ
                          </strong>
                        </div>

                        {Number(eReceiptData.amountPaidBefore || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Đã nộp trước đó:</span>
                            <span>{Number(eReceiptData.amountPaidBefore || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', marginTop: '4px' }}>
                          <span style={{ color: '#475569', fontWeight: '600' }}>Học phí còn lại:</span>
                          <span
                            style={{
                              fontWeight: 'bold',
                              color: Number(eReceiptData.remainingDebt || 0) > 0 ? '#E11D48' : '#10B981',
                            }}
                          >
                            {Number(eReceiptData.remainingDebt || 0).toLocaleString('vi-VN')}đ{' '}
                            {Number(eReceiptData.remainingDebt || 0) === 0 ? '(Đã hoàn tất)' : '(Lưu nợ kỳ sau)'}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '1rem',
                          background: '#FFFBEB',
                          border: '2px solid #FFCA29',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: '800', fontSize: '1rem', color: '#085E8A' }}>THỰC THU ĐỢT NÀY:</span>
                        <span style={{ fontWeight: '900', fontSize: '1.35rem', color: '#0D88C4' }}>
                          {Number(eReceiptData.amountThisTime || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>`;

if (code.includes(oldReceiptBreakdown)) {
  code = code.replace(oldReceiptBreakdown, newReceiptBreakdown);
  console.log('Replaced receiptBreakdown directly');
} else {
  code = code.replace(
    /<div\s*style=\{\{\s*margin:\s*'0\.75rem 0'[\s\S]*?TỔNG THU ĐỢT NÀY:[\s\S]*?<\/span>\s*<\/div>/,
    newReceiptBreakdown
  );
  console.log('Replaced receiptBreakdown via regex');
}

fs.writeFileSync('src/app/finance/monthly/page.js', code);
console.log('Successfully patched src/app/finance/monthly/page.js');
