'use client';

import { useState, useEffect } from 'react';

export default function PayrollTab() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('ACCOUNTANT');

  useEffect(() => {
    // Lấy thông tin user hiện tại để phân quyền ẩn hiện Tiền Lương
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUserRole(data.data.role);
        }
      });
  }, []);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${month}`);
      const json = await res.json();
      if (json.success) {
        setPayrollData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month]);

  // Giả sử giám đốc cấu hình lương: 200,000 VND / tiết
  const HOURLY_RATE = 200000;

  return (
    <div className="payroll-tab animated-scale">
      <div className="toolbar-panel glass-panel" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}><i className="fa-solid fa-money-check-dollar"></i> Bảng tính số tiết dạy</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontWeight: '600' }}>Chọn tháng:</label>
          <input 
            type="month" 
            value={month} 
            onChange={e => setMonth(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i> Đang tính toán số tiết dạy...</div>
        ) : payrollData.length === 0 ? (
          <div className="empty-state">Không có dữ liệu điểm danh trong tháng này.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Giáo viên</th>
                <th>Số tiết đứng lớp (Chính)</th>
                <th>Số tiết dạy thay</th>
                <th>Tổng cộng (Tiết)</th>
                {userRole === 'DIRECTOR' && (
                  <th>Tổng thù lao (VND) <i className="fa-solid fa-eye-slash" title="Chỉ Giám đốc được xem"></i></th>
                )}
              </tr>
            </thead>
            <tbody>
              {payrollData.map(t => (
                <tr key={t.id}>
                  <td><strong>{t.name}</strong> <span style={{fontSize: '0.8rem', color: '#64748b'}}>({t.username})</span></td>
                  <td style={{textAlign: 'center'}}>{t.mainClasses}</td>
                  <td style={{textAlign: 'center'}}>{t.substituteClasses}</td>
                  <td style={{textAlign: 'center', fontWeight: 'bold', color: 'var(--color-primary)'}}>{t.totalClasses}</td>
                  {userRole === 'DIRECTOR' && (
                    <td style={{textAlign: 'right', fontWeight: 'bold', color: '#16a34a'}}>
                      {new Intl.NumberFormat('vi-VN').format(t.totalClasses * HOURLY_RATE)} ₫
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
