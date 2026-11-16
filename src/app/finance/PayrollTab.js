'use client';

import { useState, useEffect } from 'react';

export default function PayrollTab() {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [userRole, setUserRole] = useState('');
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [rateInput, setRateInput] = useState('');
  const [savingRate, setSavingRate] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUserRole(data.data.role || '');
        }
      });
  }, []);

  const fetchPayroll = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/payroll?month=${month}`);
      const json = await res.json();
      if (json.success) {
        setPayrollData(json.data || []);
      } else {
        setPayrollData([]);
        setErrorMsg(json.error || 'Không thể tải dữ liệu bảng lương.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, [month]);

  const roles = (userRole || '').split(',').map((r) => r.trim());
  const isDirector = roles.includes('DIRECTOR') || roles.includes('REGIONAL_MANAGER');
  const canViewPay = isDirector || roles.includes('CHIEF_ACCOUNTANT');

  const handleSaveRate = async (teacherId) => {
    const parsed = parseInt(String(rateInput).replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) {
      alert('Vui lòng nhập đơn giá hợp lệ.');
      return;
    }
    setSavingRate(true);
    try {
      const res = await fetch('/api/payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId, hourlyRate: parsed }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingTeacherId(null);
        fetchPayroll();
      } else {
        alert(json.error || 'Lỗi cập nhật đơn giá');
      }
    } catch {
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setSavingRate(false);
    }
  };

  const totalSessionsAll = payrollData.reduce((s, t) => s + (t.totalClasses || 0), 0);
  const totalPayAll = payrollData.reduce(
    (s, t) => s + (t.estimatedPay ?? (t.totalClasses || 0) * (t.hourlyRate || 200000)),
    0
  );

  return (
    <div className="payroll-tab animated-scale">
      <div
        className="toolbar-panel glass-panel"
        style={{
          marginBottom: '1.25rem',
          padding: '1rem 1.25rem',
          borderRadius: '12px',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>
            <i className="fa-solid fa-money-check-dollar"></i> Bảng tính số tiết dạy &amp; Thù lao
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label style={{ fontWeight: '600' }}>Chọn tháng:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>
        {canViewPay && payrollData.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', fontWeight: '700' }}>
            <span style={{ color: '#085E8A' }}>Tổng tiết: {totalSessionsAll} buổi</span>
            <span style={{ color: '#16a34a' }}>
              Tổng quỹ lương: {new Intl.NumberFormat('vi-VN').format(totalPayAll)} ₫
            </span>
          </div>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="loading-state">
            <i className="fa-solid fa-spinner fa-spin"></i> Đang tính toán số tiết dạy...
          </div>
        ) : errorMsg ? (
          <div className="empty-state" style={{ color: '#dc2626', fontWeight: '600' }}>
            <i className="fa-solid fa-lock"></i> {errorMsg}
          </div>
        ) : payrollData.length === 0 ? (
          <div className="empty-state">Không có dữ liệu điểm danh trong tháng này.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Giáo viên</th>
                <th style={{ textAlign: 'center' }}>Đứng lớp (Chính)</th>
                <th style={{ textAlign: 'center' }}>Dạy thay</th>
                <th style={{ textAlign: 'center' }}>Tổng (Tiết)</th>
                {canViewPay && (
                  <>
                    <th style={{ textAlign: 'right' }}>Đơn giá / Tiết</th>
                    <th style={{ textAlign: 'right' }}>
                      Tổng thù lao (VND) <i className="fa-solid fa-shield-halved" title="Chỉ Giám đốc / Kế toán trưởng"></i>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {payrollData.map((t) => {
                const rate = t.hourlyRate || 200000;
                const totalPay = t.estimatedPay ?? t.totalClasses * rate;
                const isUnassigned = t.id === '__UNASSIGNED__';
                return (
                  <tr key={t.id} style={{ background: isUnassigned ? '#fffbeb' : 'transparent' }}>
                    <td>
                      <strong style={{ color: isUnassigned ? '#b45309' : 'inherit' }}>{t.name}</strong>{' '}
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({t.username})</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>{t.mainClasses}</td>
                    <td style={{ textAlign: 'center' }}>{t.substituteClasses}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                      {t.totalClasses}
                    </td>
                    {canViewPay && (
                      <>
                        <td style={{ textAlign: 'right' }}>
                          {editingTeacherId === t.id ? (
                            <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                              <input
                                type="text"
                                value={rateInput}
                                onChange={(e) => {
                                  const clean = e.target.value.replace(/\D/g, '');
                                  setRateInput(clean ? Number(clean).toLocaleString('vi-VN') : '');
                                }}
                                style={{
                                  width: '105px',
                                  padding: '4px 6px',
                                  borderRadius: '6px',
                                  border: '1px solid #0284c7',
                                  textAlign: 'right',
                                  fontWeight: '700',
                                }}
                              />
                              <button
                                className="btn btn-sm btn-primary"
                                disabled={savingRate}
                                onClick={() => handleSaveRate(t.id)}
                                style={{ padding: '4px 8px' }}
                              >
                                <i className="fa-solid fa-check"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-outline"
                                onClick={() => setEditingTeacherId(null)}
                                style={{ padding: '4px 8px' }}
                              >
                                &times;
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                              <span>{new Intl.NumberFormat('vi-VN').format(rate)} ₫</span>
                              {isDirector && !isUnassigned && (
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline"
                                  title="Điều chỉnh đơn giá/tiết"
                                  onClick={() => {
                                    setEditingTeacherId(t.id);
                                    setRateInput(Number(rate).toLocaleString('vi-VN'));
                                  }}
                                  style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                                >
                                  <i className="fa-solid fa-pen"></i>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#16a34a' }}>
                          {new Intl.NumberFormat('vi-VN').format(totalPay)} ₫
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
