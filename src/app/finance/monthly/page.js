'use client';

import { useState, useEffect } from 'react';
import MonthlyTuitionAction from './components/MonthlyTuitionAction';

export default function MonthlyBillingPage() {
  const currentDate = new Date();
  const currentMonthYear = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const [monthYear, setMonthYear] = useState(currentMonthYear);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchData = async () => {
    if (!monthYear) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/monthly?monthYear=${encodeURIComponent(monthYear)}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [monthYear]);

  const handleGenerateInvoice = async (record) => {
    setMessage({ type: '', text: '' });
    setIsProcessing(true);
    try {
      const res = await fetch('/api/finance/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: record.studentId,
          classCode: record.classCode,
          monthYear: monthYear,
          billingType: record.billingType,
          committedSessions: record.committedSessions,
          actualSessions: record.actualSessions,
          feePerSession: record.feePerSession,
          previousDebt: record.previousDebt,
          currentFee: record.currentFee,
          excessMissing: record.excessMissing,
          totalToPay: record.totalToPay
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Tạo hóa đơn thành công cho ${record.studentName}` });
        fetchData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Lỗi khi tạo hóa đơn' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMonthChange = (e) => {
    const val = e.target.value; // "YYYY-MM"
    if (val) {
      const [y, m] = val.split('-');
      setMonthYear(`${m}/${y}`);
    }
  };

  const toInputMonth = (my) => {
    if (!my) return '';
    const [m, y] = my.split('/');
    return `${y}-${m}`;
  };

  return (
    <div className="page-container">
      <div className="page-header-actions">
        <div>
          <h1><i className="fa-solid fa-file-invoice"></i> Chốt Sổ Học Phí Tháng</h1>
          <p>Quản lý đóng học phí theo tháng (PREPAID/POSTPAID).</p>
        </div>
      </div>

      {message.text && (
        <div className={`alert-box alert-${message.type} animated-scale`}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      <div className="toolbar-panel glass-panel">
        <div className="filter-group">
          <label><i className="fa-solid fa-calendar"></i> Chọn tháng:</label>
          <select 
            value={monthYear} 
            onChange={(e) => setMonthYear(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', width: '150px' }}
          >
            {[...Array(12)].map((_, i) => {
              const d = new Date();
              d.setMonth(d.getMonth() - 5 + i);
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const y = d.getFullYear();
              const val = `${m}/${y}`;
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
        </div>
      </div>

      <div className="table-container glass-panel">
        {loading ? (
          <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>
        ) : data.length === 0 ? (
          <div className="empty-table-state">
            <p>Không có dữ liệu học phí tháng {monthYear}.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Học viên</th>
                <th>Lớp</th>
                <th>Kiểu đóng</th>
                <th style={{ textAlign: 'center' }}>Cam kết</th>
                <th style={{ textAlign: 'center' }}>Thực tế</th>
                <th style={{ textAlign: 'right' }}>HP/Buổi</th>
                <th style={{ textAlign: 'right' }}>Dư/Thiếu</th>
                <th style={{ textAlign: 'right' }}>Nợ cũ</th>
                <th style={{ textAlign: 'right' }}>Tổng thanh toán</th>
                <th style={{ textAlign: 'center' }}>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={`${row.studentId}-${row.classCode}`}>
                  <td>{index + 1}</td>
                  <td>{row.studentName}</td>
                  <td>{row.classCode}</td>
                  <td>{row.billingType === 'MONTHLY_PREPAID' ? 'Trước (Prepaid)' : 'Sau (Postpaid)'}</td>
                  <td style={{ textAlign: 'center' }}>{row.committedSessions}</td>
                  <td style={{ textAlign: 'center' }}>{row.actualSessions}</td>
                  <td style={{ textAlign: 'right' }}>{row.feePerSession.toLocaleString('vi-VN')}đ</td>
                  <td style={{ textAlign: 'right', color: row.excessMissing > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                    {row.excessMissing.toLocaleString('vi-VN')}đ
                  </td>
                  <td style={{ textAlign: 'right', color: row.previousDebt > 0 ? 'var(--color-danger)' : 'inherit' }}>
                    {row.previousDebt.toLocaleString('vi-VN')}đ
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{row.totalToPay.toLocaleString('vi-VN')}đ</td>
                  <td style={{ textAlign: 'center' }}>
                    {row.status === 'NOT_GENERATED' ? (
                      <span className="status-badge bg-warning-light">Chưa chốt</span>
                    ) : row.status === 'UNPAID' ? (
                      <span className="status-badge bg-danger-light">Chưa đóng</span>
                    ) : (
                      <span className="status-badge bg-success-light">Đã đóng</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {row.status === 'NOT_GENERATED' ? (
                      <button 
                        className="btn btn-sm btn-primary" 
                        onClick={() => handleGenerateInvoice(row)}
                        disabled={isProcessing}
                      >
                        <i className="fa-solid fa-file-invoice"></i> Chốt sổ
                      </button>
                    ) : (
                      <MonthlyTuitionAction record={row} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
