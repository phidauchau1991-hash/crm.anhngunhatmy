'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import MonthlyTuitionAction from './components/MonthlyTuitionAction';

export default function MonthlyBillingPage() {
  const currentDate = new Date();
  const currentMonthYear = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const [activeTab, setActiveTab] = useState('config');
  const [monthYear, setMonthYear] = useState(currentMonthYear);
  const [classFilter, setClassFilter] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Tab 1: Config
  const [configData, setConfigData] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchStudent, setSearchStudent] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [newBillingType, setNewBillingType] = useState('MONTHLY_PREPAID');
  const [newMonthlyRate, setNewMonthlyRate] = useState('');
  const [newMonthlySessions, setNewMonthlySessions] = useState('');

  // Tab 2: Attendance
  const [attendanceData, setAttendanceData] = useState({ enrollments: [], attendances: [] });
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Tab 3: Notices
  const [noticesData, setNoticesData] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [previewRecord, setPreviewRecord] = useState(null);

  // Pay Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState('Chuyển khoản');
  const [eReceiptData, setEReceiptData] = useState(null);
  const receiptRef = useRef(null);

  useEffect(() => {
    if (activeTab === 'config') fetchConfigData();
    else if (activeTab === 'attendance') fetchAttendanceData();
    else if (activeTab === 'notices') fetchNoticesData();
  }, [activeTab, monthYear]);

  const classOptions = [...new Set(configData.map(e => e.classCode))];

  const fetchConfigData = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/finance/monthly/config');
      const data = await res.json();
      if (res.ok) setConfigData(data);
    } catch (err) { console.error(err); }
    finally { setLoadingConfig(false); }
  };

  const fetchAttendanceData = async () => {
    setLoadingAttendance(true);
    try {
      const res = await fetch('/api/finance/monthly/attendance?monthYear=' + encodeURIComponent(monthYear));
      const data = await res.json();
      if (res.ok) setAttendanceData(data);
    } catch (err) { console.error(err); }
    finally { setLoadingAttendance(false); }
  };

  const fetchNoticesData = async () => {
    setLoadingNotices(true);
    try {
      const res = await fetch('/api/finance/monthly?monthYear=' + encodeURIComponent(monthYear));
      const data = await res.json();
      if (res.ok) setNoticesData(data);
    } catch (err) { console.error(err); }
    finally { setLoadingNotices(false); }
  };

  const handleSearchStudent = async () => {
    if (!searchStudent) return;
    try {
      const res = await fetch('/api/students?search=' + encodeURIComponent(searchStudent) + '&status=all');
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch (err) { console.error(err); }
  };

  const handleUpdateBilling = async () => {
    if (!selectedEnrollment) return;
    try {
      const res = await fetch('/api/finance/monthly/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enrollmentId: selectedEnrollment.id,
          billingType: newBillingType,
          monthlyRate: parseFloat(newMonthlyRate) || 0,
          monthlySessions: parseInt(newMonthlySessions, 10) || 0,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Cập nhật thành công!' });
        setShowAddModal(false);
        setSelectedEnrollment(null);
        setSearchStudent('');
        setSearchResults([]);
        setNewMonthlyRate('');
        setNewMonthlySessions('');
        fetchConfigData();
      }
    } catch (err) { console.error(err); }
  };

  const handleToggleAttendance = async (studentId, classCode, date, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === '' || currentStatus === 'Trống') nextStatus = 'Có mặt';
    else if (currentStatus === 'Có mặt') nextStatus = 'Vắng';
    else nextStatus = 'Trống';

    const updatedAttendances = [...attendanceData.attendances];
    const existingIndex = updatedAttendances.findIndex(a => a.studentId === studentId && a.classCode === classCode && a.date.startsWith(date));
    if (existingIndex >= 0) {
      if (nextStatus === 'Trống') updatedAttendances.splice(existingIndex, 1);
      else updatedAttendances[existingIndex].status = nextStatus;
    } else {
      updatedAttendances.push({ studentId, classCode, date: date + 'T00:00:00.000Z', status: nextStatus });
    }
    setAttendanceData({ ...attendanceData, attendances: updatedAttendances });

    try {
      await fetch('/api/finance/monthly/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classCode, date, status: nextStatus }),
      });
    } catch (err) { console.error(err); }
  };

  const handleGenerateInvoice = async (record) => {
    setMessage({ type: '', text: '' });
    setIsProcessing(true);
    try {
      const res = await fetch('/api/finance/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: record.studentId, classCode: record.classCode, monthYear,
          billingType: record.billingType, committedSessions: record.committedSessions,
          actualSessions: record.actualSessions, feePerSession: record.feePerSession,
          previousDebt: record.previousDebt, currentFee: record.currentFee,
          excessMissing: record.excessMissing, totalToPay: record.totalToPay
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: 'Tạo hóa đơn thành công cho ' + record.studentName });
        fetchNoticesData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Lỗi khi tạo hóa đơn' });
      }
    } catch (err) { setMessage({ type: 'error', text: 'Lỗi kết nối' }); }
    finally { setIsProcessing(false); }
  };

  const handlePayInvoice = async () => {
    if (!payInvoice) return;
    try {
      const res = await fetch('/api/finance/monthly/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: payInvoice.invoiceId, paymentMethod: payMethod, amountPaid: payInvoice.totalToPay }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Thu tiền thành công!' });
        setEReceiptData({
          studentName: payInvoice.studentName, totalPaid: payInvoice.totalToPay,
          oldDebt: payInvoice.previousDebt || 0, tuitionPaid: payInvoice.currentFee || payInvoice.totalToPay,
          remainingDebt: 0, monthYear, paymentMethod: payMethod,
          date: new Date().toLocaleDateString('vi-VN'),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          cashier: 'Admin'
        });
        fetchNoticesData();
      }
    } catch (err) { console.error(err); }
  };

  const copyReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, logging: false });
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert('Đã copy Phiếu thu! Dán (Ctrl+V) vào Zalo ngay.');
        } catch (err) { downloadReceiptImage(); }
      });
    } catch (err) { console.error(err); }
  };

  const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = 'PhieuThu_' + eReceiptData.studentName.replace(/\s+/g, '_') + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) { console.error(err); }
  };

  const toggleSelectRow = (key) => {
    setSelectedRows(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  const toggleSelectAll = () => {
    const fd = getFilteredNotices();
    if (selectedRows.length === fd.length) setSelectedRows([]);
    else setSelectedRows(fd.map(r => r.studentId + '-' + r.classCode));
  };

  const formatSchedule = (schedule) => {
    if (!schedule) return '\u2014';
    return schedule.split('').map(d => 'T' + d).join(', ');
  };

  const getDaysInMonth = (my) => {
    const [m, y] = my.split('/');
    const days = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      return y + '-' + m.padStart(2, '0') + '-' + d.toString().padStart(2, '0');
    });
  };

  const daysList = getDaysInMonth(monthYear);
  const getFilteredConfig = () => classFilter === 'all' ? configData : configData.filter(e => e.classCode === classFilter);
  const getFilteredEnrollments = () => classFilter === 'all' ? attendanceData.enrollments : attendanceData.enrollments.filter(e => e.classCode === classFilter);
  const getFilteredNotices = () => classFilter === 'all' ? noticesData : noticesData.filter(e => e.classCode === classFilter);

  return (
    <div className="page-container">
      <div className="page-header-actions">
        <div>
          <h1><i className="fa-solid fa-file-invoice"></i> Chốt Sổ Học Phí Tháng</h1>
          <p>Quản lý đóng học phí theo tháng (PREPAID/POSTPAID).</p>
        </div>
      </div>

      {message.text && (
        <div className={'alert-box alert-' + message.type + ' animated-scale'}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <button className={'btn ' + (activeTab === 'config' ? 'btn-primary' : 'btn-outline')} onClick={() => setActiveTab('config')}>Cấu hình</button>
        <button className={'btn ' + (activeTab === 'attendance' ? 'btn-primary' : 'btn-outline')} onClick={() => setActiveTab('attendance')}>Điểm danh</button>
        <button className={'btn ' + (activeTab === 'notices' ? 'btn-primary' : 'btn-outline')} onClick={() => setActiveTab('notices')}>Thư báo HP</button>
      </div>

      {/* Toolbar */}
      <div className="toolbar-panel glass-panel" style={{ marginBottom: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="filter-group">
          <label><i className="fa-solid fa-calendar"></i> Chọn tháng:</label>
          <select value={monthYear} onChange={(e) => setMonthYear(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', width: '150px' }}>
            {[...Array(12)].map((_, i) => {
              const d = new Date(); d.setMonth(d.getMonth() - 5 + i);
              const m = String(d.getMonth() + 1).padStart(2, '0');
              const y = d.getFullYear();
              const val = m + '/' + y;
              return <option key={val} value={val}>{val}</option>;
            })}
          </select>
        </div>
        <div className="filter-group">
          <label><i className="fa-solid fa-filter"></i> Lọc lớp:</label>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--color-border)', width: '200px' }}>
            <option value="all">Tất cả lớp</option>
            {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* TAB 1: CẤU HÌNH */}
      {activeTab === 'config' && (
        <div className="glass-panel p-4">
          <button className="btn btn-primary mb-3" onClick={() => setShowAddModal(true)}>
            <i className="fa-solid fa-plus"></i> Thêm Học viên
          </button>
          <div className="table-container" style={{ overflowX: 'auto' }}>
            {loadingConfig ? (
              <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải...</p></div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>STT</th>
                    <th>Họ tên</th>
                    <th>Lớp</th>
                    <th>Ngày học</th>
                    <th>Loại HP</th>
                    <th style={{ textAlign: 'right' }}>HP/Tháng</th>
                    <th style={{ textAlign: 'center' }}>Số buổi CK</th>
                    <th style={{ textAlign: 'right' }}>HP/Buổi</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredConfig().map((enr, idx) => {
                    const hpPerSession = enr.monthlySessions && enr.monthlyRate
                      ? Math.round(enr.monthlyRate / enr.monthlySessions) : enr.monthlyRate || 0;
                    return (
                      <tr key={enr.id}>
                        <td>{idx + 1}</td>
                        <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{enr.student?.name}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{enr.classCode}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{formatSchedule(enr.class?.schedule)}</td>
                        <td>
                          <span className={'status-badge ' + (enr.billingType === 'MONTHLY_PREPAID' ? 'bg-info-light' : 'bg-warning-light')}>
                            {enr.billingType === 'MONTHLY_PREPAID' ? 'Trước' : 'Sau'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>{enr.monthlyRate?.toLocaleString('vi-VN')}\u0111</td>
                        <td style={{ textAlign: 'center' }}>{enr.monthlySessions || '\u2014'}</td>
                        <td style={{ textAlign: 'right' }}>{hpPerSession.toLocaleString('vi-VN')}\u0111</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ĐIỂM DANH */}
      {activeTab === 'attendance' && (
        <div className="glass-panel p-4" style={{ overflowX: 'auto', overflowY: 'hidden', paddingBottom: '8px', position: 'relative' }}>
          {loadingAttendance ? (
            <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải...</p></div>
          ) : (
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 12, background: '#f1f5f9', padding: '10px 12px', whiteSpace: 'nowrap', borderBottom: '2px solid #cbd5e1', minWidth: '160px', textAlign: 'left' }}>Học viên</th>
                  <th style={{ position: 'sticky', top: 0, left: '160px', zIndex: 12, background: '#f1f5f9', padding: '10px 12px', whiteSpace: 'nowrap', borderBottom: '2px solid #cbd5e1', minWidth: '160px', textAlign: 'left' }}>Lớp</th>
                  {daysList.map(d => (
                    <th key={d} style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f1f5f9', padding: '10px 6px', textAlign: 'center', borderBottom: '2px solid #cbd5e1', minWidth: '48px', fontSize: '0.95rem', fontWeight: '700' }}>
                      {parseInt(d.split('-')[2], 10)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getFilteredEnrollments().map(enr => (
                  <tr key={enr.id}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 9, background: '#fff', padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: '600', borderBottom: '1px solid #e2e8f0' }}>{enr.student?.name}</td>
                    <td style={{ position: 'sticky', left: '160px', zIndex: 9, background: '#fff', padding: '10px 12px', whiteSpace: 'nowrap', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>{enr.classCode}</td>
                    {daysList.map(d => {
                      const att = attendanceData.attendances.find(a => a.studentId === enr.studentId && a.classCode === enr.classCode && a.date.startsWith(d));
                      let icon = '';
                      let bgColor = 'transparent';
                      let color = '';
                      if (att?.status === 'Có mặt') { icon = 'fa-check'; color = '#10b981'; bgColor = '#ecfdf5'; }
                      else if (att?.status === 'Vắng') { icon = 'fa-times'; color = '#ef4444'; bgColor = '#fef2f2'; }
                      return (
                        <td key={d} style={{ textAlign: 'center', cursor: 'pointer', padding: '8px 4px', borderBottom: '1px solid #e2e8f0', background: bgColor, transition: 'background 0.15s' }}
                          onClick={() => handleToggleAttendance(enr.studentId, enr.classCode, d, att?.status || 'Trống')}>
                          {icon && <i className={'fa-solid ' + icon} style={{ fontSize: '1.2rem', color: color }}></i>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: THƯ BÁO HP */}
      {activeTab === 'notices' && (
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="table-container glass-panel p-4" style={{ flex: 1 }}>
            {loadingNotices ? (
              <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>
            ) : getFilteredNotices().length === 0 ? (
              <div className="empty-table-state"><p>Không có dữ liệu học phí tháng {monthYear}.</p></div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input type="checkbox" checked={selectedRows.length === getFilteredNotices().length && getFilteredNotices().length > 0} onChange={toggleSelectAll} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                    </th>
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
                  {getFilteredNotices().map((row, index) => {
                    const rowKey = row.studentId + '-' + row.classCode;
                    return (
                      <tr key={rowKey} style={{ background: previewRecord && (previewRecord.studentId + '-' + previewRecord.classCode) === rowKey ? '#eff6ff' : 'transparent' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={selectedRows.includes(rowKey)} onChange={() => toggleSelectRow(rowKey)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        </td>
                        <td>{index + 1}</td>
                        <td style={{ fontWeight: '600' }}>{row.studentName}</td>
                        <td>{row.classCode}</td>
                        <td>{row.billingType === 'MONTHLY_PREPAID' ? 'Trước (Prepaid)' : 'Sau (Postpaid)'}</td>
                        <td style={{ textAlign: 'center' }}>{row.committedSessions}</td>
                        <td style={{ textAlign: 'center' }}>{row.actualSessions}</td>
                        <td style={{ textAlign: 'right' }}>{row.feePerSession.toLocaleString('vi-VN')}\u0111</td>
                        <td style={{ textAlign: 'right', color: row.excessMissing > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
                          {row.excessMissing.toLocaleString('vi-VN')}\u0111
                        </td>
                        <td style={{ textAlign: 'right', color: row.previousDebt > 0 ? 'var(--color-danger)' : 'inherit' }}>
                          {row.previousDebt.toLocaleString('vi-VN')}\u0111
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{row.totalToPay.toLocaleString('vi-VN')}\u0111</td>
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
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button className="btn btn-sm btn-outline" title="Xem trước thư báo"
                              onClick={() => setPreviewRecord(previewRecord && (previewRecord.studentId + '-' + previewRecord.classCode) === rowKey ? null : row)}
                              style={{ padding: '4px 8px' }}>
                              <i className={'fa-solid ' + (previewRecord && (previewRecord.studentId + '-' + previewRecord.classCode) === rowKey ? 'fa-eye-slash' : 'fa-eye')}></i>
                            </button>
                            {row.status === 'NOT_GENERATED' ? (
                              <button className="btn btn-sm btn-primary" onClick={() => handleGenerateInvoice(row)} disabled={isProcessing}>
                                <i className="fa-solid fa-file-invoice"></i> Chốt sổ
                              </button>
                            ) : (
                              <>
                                <MonthlyTuitionAction record={row} />
                                {row.status === 'UNPAID' && (
                                  <button className="btn btn-sm" style={{ backgroundColor: '#f59e0b', color: 'white' }} onClick={() => { setPayInvoice(row); setShowPayModal(true); }}>
                                    Thu tiền
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {selectedRows.length > 0 && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', color: '#1d4ed8' }}>
                  <i className="fa-solid fa-check-double"></i> Đã chọn {selectedRows.length} học viên
                </span>
                <button className="btn btn-sm btn-primary" onClick={() => {
                  alert('Đã chọn ' + selectedRows.length + ' HV. Vui lòng bấm "Thư báo" từng bé để xuất ảnh.');
                }}>
                  <i className="fa-solid fa-file-export"></i> Xuất thư báo ({selectedRows.length})
                </button>
              </div>
            )}
          </div>

          {previewRecord && (
            <div style={{ width: '420px', flexShrink: 0 }}>
              <div className="glass-panel p-3" style={{ position: 'sticky', top: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}><i className="fa-solid fa-eye"></i> Xem trước Thư báo</h3>
                  <button className="btn btn-sm btn-outline" onClick={() => setPreviewRecord(null)}><i className="fa-solid fa-times"></i></button>
                </div>
                <div style={{ transform: 'scale(0.62)', transformOrigin: 'top center', marginBottom: '-35%' }}>
                  <MonthlyTuitionAction record={previewRecord} inlinePreview={true} />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL THÊM HỌC VIÊN */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-user-plus"></i> Thêm Học viên HP Tháng</h2>
              <button className="close-btn" onClick={() => { setShowAddModal(false); setSelectedEnrollment(null); setSearchResults([]); setSearchStudent(''); }}><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <input type="text" placeholder="Tìm tên hoặc SĐT học viên..." className="form-control" style={{ flex: 1 }} value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()} />
                <button className="btn btn-primary" onClick={handleSearchStudent}><i className="fa-solid fa-search"></i> Tìm</button>
              </div>
              {searchResults.length > 0 && !selectedEnrollment && (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '15px' }}>
                  {searchResults.map(s => (
                    <div key={s.id} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{s.name} <span style={{ color: '#64748b', fontWeight: '400', fontSize: '0.85rem' }}>\u2014 {s.phone}</span></div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {s.enrollments?.map(e => (
                          <button key={e.id} className="btn btn-sm btn-outline" onClick={() => setSelectedEnrollment({ ...e, studentName: s.name })}>
                            <i className="fa-solid fa-chalkboard"></i> {e.classCode}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedEnrollment && (
                <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '15px' }}>
                  <div style={{ background: '#f1f5f9', padding: '12px 16px', borderRadius: '8px', marginBottom: '15px' }}>
                    <strong style={{ color: '#085E8A' }}>{selectedEnrollment.studentName}</strong> \u2014 Lớp: <strong>{selectedEnrollment.classCode}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Loại HP</label>
                      <select className="form-control" value={newBillingType} onChange={(e) => setNewBillingType(e.target.value)}>
                        <option value="MONTHLY_PREPAID">Trả trước (Prepaid)</option>
                        <option value="MONTHLY_POSTPAID">Trả sau (Postpaid)</option>
                      </select>
                    </div>
                    <div style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Học phí / Tháng (\u0111)</label>
                      <input type="number" className="form-control" placeholder="VD: 250000" value={newMonthlyRate} onChange={(e) => setNewMonthlyRate(e.target.value)} />
                    </div>
                    <div style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>Số buổi cam kết</label>
                      <input type="number" className="form-control" placeholder="VD: 8" value={newMonthlySessions} onChange={(e) => setNewMonthlySessions(e.target.value)} />
                    </div>
                    <div style={{ margin: 0 }}>
                      <label style={{ fontWeight: '600', marginBottom: '4px', display: 'block' }}>HP/Buổi (tự tính)</label>
                      <input type="text" className="form-control" readOnly value={newMonthlyRate && newMonthlySessions ? Math.round(parseFloat(newMonthlyRate) / parseInt(newMonthlySessions, 10)).toLocaleString('vi-VN') + '\u0111' : '\u2014'} style={{ background: '#f8fafc' }} />
                    </div>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '15px', padding: '10px' }} onClick={handleUpdateBilling}>
                    <i className="fa-solid fa-save"></i> Lưu cấu hình
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL THU TIỀN */}
      {showPayModal && payInvoice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Thu tiền HP Tháng - {payInvoice.studentName}</h2>
              <button className="close-btn" onClick={() => { setShowPayModal(false); setEReceiptData(null); }}><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-body">
              {!eReceiptData ? (
                <div>
                  <div style={{ background: '#FFFBEB', border: '1px solid #FFCA29', borderRadius: '8px', padding: '12px 16px', marginBottom: '15px' }}>
                    <p style={{ margin: 0 }}>Số tiền cần thu: <strong style={{ fontSize: '1.2rem', color: '#085E8A' }}>{payInvoice.totalToPay.toLocaleString('vi-VN')}\u0111</strong></p>
                  </div>
                  <div className="form-group">
                    <label>Phương thức thanh toán:</label>
                    <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      <option value="Chuyển khoản">Chuyển khoản</option>
                      <option value="Tiền mặt">Tiền mặt</option>
                      <option value="Quẹt thẻ">Quẹt thẻ</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', padding: '10px' }} onClick={handlePayInvoice}><i className="fa-solid fa-check-circle"></i> Xác nhận Thu tiền</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div ref={receiptRef} style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', position: 'relative', width: '100%', maxWidth: '440px', margin: '0 auto' }}>
                    <div style={{ height: '6px', background: 'linear-gradient(90deg, #0D88C4 0%, #0D88C4 60%, #FFCA29 60%, #FFCA29 100%)' }}></div>
                    <div style={{ padding: '1.5rem 1.75rem', textAlign: 'left', color: '#1E293B', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
                        <img src="/logo.png" alt="Anh ngữ Nhật Mỹ" style={{ height: '54px', width: 'auto', objectFit: 'contain' }} crossOrigin="anonymous" />
                        <div style={{ flex: 1, textAlign: 'center', paddingRight: '10px' }}>
                          <h2 style={{ margin: '0 0 0.35rem 0', color: '#085E8A', fontSize: '1.25rem', fontWeight: '900', letterSpacing: '0.5px' }}>ANH NGỮ NHẬT MỸ</h2>
                          <div style={{ display: 'inline-block', background: '#FFCA29', color: '#085E8A', padding: '0.2rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800' }}>
                            PHIẾU THU ĐIỆN TỬ
                          </div>
                        </div>
                      </div>
                      <div style={{ margin: '1rem 0', borderTop: '2px dashed #E2E8F0', borderBottom: '2px dashed #E2E8F0', padding: '0.85rem 0', fontSize: '0.95rem', lineHeight: '1.7' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Học viên:</span>
                          <strong style={{ color: '#085E8A', fontSize: '1.05rem' }}>{eReceiptData.studentName.toUpperCase()}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Tháng thu:</span>
                          <strong style={{ color: '#085E8A' }}>{eReceiptData.monthYear}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Ngày lập:</span>
                          <span>{eReceiptData.date} {eReceiptData.time}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Hình thức:</span>
                          <span style={{ fontWeight: '600' }}>{eReceiptData.paymentMethod}</span>
                        </div>
                      </div>
                      <div style={{ margin: '0.75rem 0', fontSize: '0.95rem', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí cần đóng:</span>
                          <span>{Number(eReceiptData.oldDebt || 0).toLocaleString('vi-VN')}\u0111</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí đóng đợt này:</span>
                          <span style={{ fontWeight: 'bold', color: '#0D88C4' }}>+ {Number(eReceiptData.tuitionPaid || 0).toLocaleString('vi-VN')}\u0111</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí còn lại:</span>
                          <span style={{ fontWeight: 'bold', color: Number(eReceiptData.remainingDebt || 0) > 0 ? '#E11D48' : '#10B981' }}>
                            {Number(eReceiptData.remainingDebt || 0).toLocaleString('vi-VN')}\u0111 {Number(eReceiptData.remainingDebt || 0) === 0 ? '(Đã hoàn tất)' : ''}
                          </span>
                        </div>
                      </div>
                      <div style={{ marginTop: '1rem', background: '#FFFBEB', border: '2px solid #FFCA29', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '800', fontSize: '1rem', color: '#085E8A' }}>TỔNG THU ĐỢT NÀY:</span>
                        <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#0D88C4' }}>{Number(eReceiptData.totalPaid || 0).toLocaleString('vi-VN')}\u0111</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
                    <button className="btn" style={{ background: '#085E8A', color: '#fff', padding: '10px 20px', fontWeight: '700' }} onClick={copyReceiptImage}>
                      <i className="fa-solid fa-copy"></i> Copy Ảnh (Dán Zalo)
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '10px 20px' }} onClick={downloadReceiptImage}>
                      <i className="fa-solid fa-download"></i> Tải Ảnh
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
