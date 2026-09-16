'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import MonthlyTuitionAction from './components/MonthlyTuitionAction';

export default function MonthlyBillingPage() {
  const currentDate = new Date();
  const currentMonthYear = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const [activeTab, setActiveTab] = useState('config'); // 'config', 'attendance', 'notices'
  const [monthYear, setMonthYear] = useState(currentMonthYear);
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

  const fetchConfigData = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch(`/api/finance/monthly/config`);
      const data = await res.json();
      if (res.ok) setConfigData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchAttendanceData = async () => {
    setLoadingAttendance(true);
    try {
      const res = await fetch(`/api/finance/monthly/attendance?monthYear=${encodeURIComponent(monthYear)}`);
      const data = await res.json();
      if (res.ok) setAttendanceData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchNoticesData = async () => {
    setLoadingNotices(true);
    try {
      const res = await fetch(`/api/finance/monthly?monthYear=${encodeURIComponent(monthYear)}`);
      const data = await res.json();
      if (res.ok) setNoticesData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotices(false);
    }
  };

  const handleSearchStudent = async () => {
    if (!searchStudent) return;
    try {
      const res = await fetch(`/api/students?search=${encodeURIComponent(searchStudent)}&status=all`);
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBilling = async () => {
    if (!selectedEnrollment) return;
    try {
      const res = await fetch(`/api/finance/monthly/config`, {
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
        fetchConfigData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleAttendance = async (studentId, classCode, date, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === '' || currentStatus === 'Trống') nextStatus = 'Có mặt';
    else if (currentStatus === 'Có mặt') nextStatus = 'Vắng';
    else nextStatus = 'Trống';

    // Optimistic update
    const updatedAttendances = [...attendanceData.attendances];
    const existingIndex = updatedAttendances.findIndex(a => a.studentId === studentId && a.classCode === classCode && a.date.startsWith(date));
    
    if (existingIndex >= 0) {
      if (nextStatus === 'Trống') {
        updatedAttendances.splice(existingIndex, 1);
      } else {
        updatedAttendances[existingIndex].status = nextStatus;
      }
    } else {
      updatedAttendances.push({ studentId, classCode, date: date + 'T00:00:00.000Z', status: nextStatus });
    }
    setAttendanceData({ ...attendanceData, attendances: updatedAttendances });

    try {
      await fetch(`/api/finance/monthly/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classCode, date, status: nextStatus }),
      });
    } catch (err) {
      console.error(err);
    }
  };

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
        fetchNoticesData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Lỗi khi tạo hóa đơn' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!payInvoice) return;
    try {
      const res = await fetch('/api/finance/monthly/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payInvoice.invoiceId,
          paymentMethod: payMethod,
          amountPaid: payInvoice.totalToPay
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Thu tiền thành công!' });
        setEReceiptData({
          studentName: payInvoice.studentName,
          totalPaid: payInvoice.totalToPay,
          oldDebt: payInvoice.previousDebt || 0,
          tuitionPaid: payInvoice.currentFee || payInvoice.totalToPay,
          remainingDebt: 0,
          monthYear: monthYear,
          paymentMethod: payMethod,
          date: new Date().toLocaleDateString('vi-VN'),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          cashier: 'Admin'
        });
        fetchNoticesData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `PhieuThu_${eReceiptData.studentName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  const getDaysInMonth = (my) => {
    const [m, y] = my.split('/');
    const days = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      return `${y}-${m.padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    });
  };

  const daysList = getDaysInMonth(monthYear);

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

      <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)' }}>
        <button className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('config')}>Cấu hình</button>
        <button className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('attendance')}>Điểm danh</button>
        <button className={`btn ${activeTab === 'notices' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('notices')}>Thư báo HP</button>
      </div>

      <div className="toolbar-panel glass-panel" style={{ marginBottom: '1rem' }}>
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

      {activeTab === 'config' && (
        <div className="glass-panel p-4">
          <button className="btn btn-primary mb-3" onClick={() => setShowAddModal(true)}>
            <i className="fa-solid fa-plus"></i> Thêm Học viên
          </button>
          
          <div className="table-container">
            {loadingConfig ? (
              <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải...</p></div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>HV</th>
                    <th>Lớp</th>
                    <th>Loại HP</th>
                    <th>HP/Tháng</th>
                    <th>Số buổi/Tháng</th>
                  </tr>
                </thead>
                <tbody>
                  {configData.map(enr => (
                    <tr key={enr.id}>
                      <td>{enr.student?.name}</td>
                      <td>{enr.classCode}</td>
                      <td>{enr.billingType}</td>
                      <td>{enr.monthlyRate?.toLocaleString('vi-VN')}đ</td>
                      <td>{enr.monthlySessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="glass-panel p-4" style={{ overflowX: 'auto', maxHeight: '70vh', position: 'relative' }}>
          {loadingAttendance ? (
             <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải...</p></div>
          ) : (
            <table className="custom-table" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 11, background: '#f8fafc' }}>Học viên</th>
                  <th style={{ position: 'sticky', top: 0, left: '150px', zIndex: 11, background: '#f8fafc' }}>Lớp</th>
                  {daysList.map(d => (
                    <th key={d} style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', minWidth: '40px', textAlign: 'center' }}>
                      {parseInt(d.split('-')[2], 10)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attendanceData.enrollments.map(enr => (
                  <tr key={enr.id}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 9, background: '#fff' }}>{enr.student?.name}</td>
                    <td style={{ position: 'sticky', left: '150px', zIndex: 9, background: '#fff' }}>{enr.classCode}</td>
                    {daysList.map(d => {
                      const att = attendanceData.attendances.find(a => a.studentId === enr.studentId && a.classCode === enr.classCode && a.date.startsWith(d));
                      let icon = '';
                      let color = '';
                      if (att?.status === 'Có mặt') { icon = 'fa-check'; color = 'green'; }
                      else if (att?.status === 'Vắng') { icon = 'fa-times'; color = 'red'; }
                      return (
                        <td 
                          key={d} 
                          style={{ textAlign: 'center', cursor: 'pointer', color: color }}
                          onClick={() => handleToggleAttendance(enr.studentId, enr.classCode, d, att?.status || 'Trống')}
                        >
                          {icon && <i className={`fa-solid ${icon}`}></i>}
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

      {activeTab === 'notices' && (
        <div className="table-container glass-panel p-4">
          {loadingNotices ? (
            <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu...</p></div>
          ) : noticesData.length === 0 ? (
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
                {noticesData.map((row, index) => (
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
                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                          <MonthlyTuitionAction record={row} />
                          {row.status === 'UNPAID' && (
                            <button className="btn btn-sm" style={{ backgroundColor: '#f59e0b', color: 'white' }} onClick={() => { setPayInvoice(row); setShowPayModal(true); }}>
                              Thu tiền
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal Thêm Học Viên Tháng */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Thêm Học viên HP Tháng</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                <input type="text" placeholder="Tìm tên/SĐT..." className="form-control" value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)} />
                <button className="btn btn-secondary" onClick={handleSearchStudent}>Tìm</button>
              </div>
              <ul style={{ maxHeight: '200px', overflowY: 'auto', listStyle: 'none', padding: 0 }}>
                {searchResults.map(s => (
                  <li key={s.id}>
                    <strong>{s.name}</strong> - {s.phone}
                    <ul style={{ paddingLeft: '20px' }}>
                      {s.enrollments?.map(e => (
                        <li key={e.id}>
                          {e.classCode} 
                          <button className="btn btn-sm btn-outline ml-2" onClick={() => setSelectedEnrollment(e)}>Chọn</button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              
              {selectedEnrollment && (
                <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px' }}>
                  <h4>Cấu hình cho {selectedEnrollment.classCode}</h4>
                  <div className="form-group">
                    <label>Loại HP</label>
                    <select className="form-control" value={newBillingType} onChange={(e) => setNewBillingType(e.target.value)}>
                      <option value="MONTHLY_PREPAID">Trả trước (Prepaid)</option>
                      <option value="MONTHLY_POSTPAID">Trả sau (Postpaid)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Học phí / Tháng</label>
                    <input type="number" className="form-control" value={newMonthlyRate} onChange={(e) => setNewMonthlyRate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Số buổi cam kết / Tháng</label>
                    <input type="number" className="form-control" value={newMonthlySessions} onChange={(e) => setNewMonthlySessions(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" onClick={handleUpdateBilling}>Cập nhật</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Thu Tiền */}
      {showPayModal && payInvoice && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Thu tiền HP Tháng - {payInvoice.studentName}</h2>
              <button className="close-btn" onClick={() => { setShowPayModal(false); setEReceiptData(null); }}><i className="fa-solid fa-times"></i></button>
            </div>
            <div className="modal-body">
              {!eReceiptData ? (
                <div>
                  <p>Số tiền cần thu: <strong>{payInvoice.totalToPay.toLocaleString('vi-VN')}đ</strong></p>
                  <div className="form-group">
                    <label>Phương thức thanh toán:</label>
                    <select className="form-control" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                      <option value="Chuyển khoản">Chuyển khoản</option>
                      <option value="Tiền mặt">Tiền mặt</option>
                      <option value="Quẹt thẻ">Quẹt thẻ</option>
                    </select>
                  </div>
                  <button className="btn btn-primary" onClick={handlePayInvoice}>Xác nhận Thu</button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                    <div ref={receiptRef} style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', position: 'relative', width: '100%', maxWidth: '440px', margin: '0 auto' }}>
                      {/* Dải line nhận diện thương hiệu Xanh & Vàng */}
                      <div style={{ height: '6px', background: 'linear-gradient(90deg, #0D88C4 0%, #0D88C4 60%, #FFCA29 60%, #FFCA29 100%)' }}></div>
                      
                      <div style={{ padding: '1.5rem 1.75rem', textAlign: 'left', color: '#1E293B', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        {/* Header: Logo bên trái, Tiêu đề ở giữa */}
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
                          <img src="/logo.png" alt="Anh ngữ Nhật Mỹ" style={{ height: '54px', width: 'auto', objectFit: 'contain' }} crossOrigin="anonymous" />
                          <div style={{ flex: 1, textAlign: 'center', paddingRight: '10px' }}>
                            <h2 style={{ margin: '0 0 0.35rem 0', color: '#085E8A', fontSize: '1.25rem', fontWeight: '900', letterSpacing: '0.5px' }}>ANH NGỮ NHẬT MỸ</h2>
                            <div style={{ display: 'inline-block', background: '#FFCA29', color: '#085E8A', padding: '0.2rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                              PHIẾU THU ĐIỆN TỬ
                            </div>
                          </div>
                        </div>
                        
                        {/* Thông tin học viên */}
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
                        
                        {/* Khối chi tiết Học phí */}
                        <div style={{ margin: '0.75rem 0', fontSize: '0.95rem', lineHeight: '1.8' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#475569' }}>Học phí cần đóng:</span>
                            <span>{Number(eReceiptData.oldDebt || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#475569' }}>Học phí đóng đợt này:</span>
                            <span style={{ fontWeight: 'bold', color: '#0D88C4' }}>+ {Number(eReceiptData.tuitionPaid || 0).toLocaleString('vi-VN')}đ</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#475569' }}>Học phí còn lại:</span>
                            <span style={{ fontWeight: 'bold', color: Number(eReceiptData.remainingDebt || 0) > 0 ? '#E11D48' : '#10B981' }}>
                              {Number(eReceiptData.remainingDebt || 0).toLocaleString('vi-VN')}đ {Number(eReceiptData.remainingDebt || 0) === 0 ? '(Đã hoàn tất)' : ''}
                            </span>
                          </div>
                        </div>

                        {/* Tổng thu */}
                        <div style={{ marginTop: '1rem', background: '#FFFBEB', border: '2px solid #FFCA29', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: '800', fontSize: '1rem', color: '#085E8A' }}>TỔNG THU ĐỢT NÀY:</span>
                          <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#0D88C4' }}>{Number(eReceiptData.totalPaid || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                      </div>
                    </div>
                  <div style={{ marginTop: '20px' }}>
                    <button className="btn btn-secondary" onClick={downloadReceiptImage}><i className="fa-solid fa-download"></i> Tải Biên Lai</button>
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
