'use client';

import { useState, useEffect } from 'react';
import PayrollTab from './PayrollTab';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('tuition'); // tuition, payroll
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ totalRevenue: 0, totalDebt: 0, totalOrdersCount: 0, unpaidOrdersCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Students & Classes list for manual invoice
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  // Modals state
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyOrder, setHistoryOrder] = useState(null);

  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiOrder, setAiOrder] = useState(null);
  const [aiTone, setAiTone] = useState('encouraging');
  const [aiMessage, setAiMessage] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Forms state
  const [manualForm, setManualForm] = useState({
    studentId: '',
    classCode: '',
    feeToPay: '',
    amountPaid: '0',
    promoType: 'Tạo thủ công',
    notes: '',
    paymentPolicy: 'Đóng trước',
  });

  const [collectForm, setCollectForm] = useState({
    orderId: '',
    studentName: '',
    classCode: '',
    remainingDebt: 0,
    collectAmount: '',
    paymentMethod: 'Chuyển khoản',
    notes: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/api/finance?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}&preset=${preset}`;
      if (preset === 'custom') {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data);
        setStats(json.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndClasses = async () => {
    try {
      const resStd = await fetch('/api/students');
      const jsonStd = await resStd.json();
      if (jsonStd.success) setStudents(jsonStd.data);

      const resCls = await fetch('/api/classes');
      const jsonCls = await resCls.json();
      if (jsonCls.success) setClasses(jsonCls.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [searchTerm, statusFilter, preset, startDate, endDate]);

  useEffect(() => {
    fetchStudentsAndClasses();
  }, []);

  const openManualModal = () => {
    setManualForm({
      studentId: '',
      classCode: '',
      feeToPay: '',
      amountPaid: '0',
      promoType: 'Tạo thủ công',
      notes: '',
      paymentPolicy: 'Đóng trước',
    });
    setShowManualModal(true);
  };

  const openCollectModal = (order) => {
    setCollectForm({
      orderId: order.id,
      studentName: order.student.name,
      classCode: order.classCode,
      remainingDebt: order.feeToPay - order.amountPaid,
      collectAmount: (order.feeToPay - order.amountPaid).toLocaleString('vi-VN'),
      paymentMethod: 'Chuyển khoản',
      notes: `Thu học phí hóa đơn ${order.id}`,
    });
    setShowCollectModal(true);
  };

  // Helper formatting currencies
  const formatNumber = (val) => {
    if (val === undefined || val === null || val === '') return '0';
    const clean = val.toString().replace(/[^0-9-]/g, '');
    if (clean === '') return '0';
    const num = parseInt(clean);
    return num.toLocaleString('vi-VN');
  };

  const parseNumber = (val) => {
    if (!val) return 0;
    const clean = val.toString().replace(/[^0-9-]/g, '');
    return parseInt(clean) || 0;
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...manualForm,
          feeToPay: parseNumber(manualForm.feeToPay),
          amountPaid: parseNumber(manualForm.amountPaid),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message });
        setShowManualModal(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  const handleCollectSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      // Gọi API nạp học phí của student
      const studentId = orders.find(o => o.id === collectForm.orderId)?.studentId;
      if (!studentId) {
        setMessage({ type: 'error', text: 'Không tìm thấy thông tin học viên của hóa đơn này.' });
        return;
      }

      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'collectTuition',
          amountPaid: parseNumber(collectForm.collectAmount),
          paymentMethod: collectForm.paymentMethod,
          notes: collectForm.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Ghi nhận thu tiền thành công!' });
        setShowCollectModal(false);
        fetchData();
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  const openAiModal = (order) => {
    setAiOrder(order);
    setAiMessage('');
    setAiTone('encouraging');
    setShowAiModal(true);
  };

  const openHistoryModal = (order) => {
    setHistoryOrder(order);
    setShowHistoryModal(true);
  };

  const handleGenerateAiMessage = async () => {
    if (!aiOrder) return;
    setIsGeneratingAi(true);
    setAiMessage('');
    try {
      const res = await fetch('/api/ai/tuition-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: aiOrder.student?.name || 'con',
          amount: aiOrder.feeToPay - aiOrder.amountPaid,
          deadline: aiOrder.paymentDeadline,
          policy: aiOrder.paymentPolicy,
          tone: aiTone
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiMessage(data.data);
      } else {
        alert(data.error || 'Lỗi sinh tin nhắn AI');
      }
    } catch (error) {
      alert('Lỗi kết nối AI');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyAiMessage = () => {
    navigator.clipboard.writeText(aiMessage);
    alert('Đã chép vào bộ nhớ tạm! Bạn có thể dán vào Zalo ngay.');
  };

  const handleExportPDF = () => {
    import('jspdf').then((jsPDF) => {
      import('jspdf-autotable').then(() => {
        const doc = new jsPDF.default();
        
        const removeAccents = (str) => {
          if(!str) return '';
          return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
        };

        doc.setFontSize(16);
        doc.text('Bao Cao Tai Chinh - Nhat My CRM', 14, 20);
        doc.setFontSize(10);
        doc.text(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, 14, 28);
        
        const tableColumn = ["Hoa don", "Hoc vien", "Lop", "Can thu", "Da thu", "Con no", "Trang thai"];
        const tableRows = [];

        let totalFee = 0;
        let totalPaid = 0;

        orders.forEach(order => {
          totalFee += order.feeToPay;
          totalPaid += order.amountPaid;
          const rowData = [
            order.id,
            removeAccents(order.student?.name || ''),
            order.classCode,
            formatNumber(order.feeToPay),
            formatNumber(order.amountPaid),
            formatNumber(order.feeToPay - order.amountPaid),
            removeAccents(order.paymentStatus)
          ];
          tableRows.push(rowData);
        });

        tableRows.push(["T.CONG", "", "", formatNumber(totalFee), formatNumber(totalPaid), formatNumber(totalFee - totalPaid), ""]);

        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 35,
          styles: { font: 'helvetica' },
        });

        doc.save(`Bao_Cao_Tai_Chinh_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.pdf`);
      });
    });
  };

  return (
    <div className="page-container">
      <div className="page-header-actions">
        <div>
          <h1><i className="fa-solid fa-file-invoice-dollar"></i> Quản lý Học phí & Công nợ (Finance)</h1>
          <p>Kiểm soát toàn bộ hóa đơn học phí, nợ đọng và thù lao giáo viên.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className={`btn ${activeTab === 'tuition' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('tuition')}>
            <i className="fa-solid fa-wallet"></i> Thu học phí
          </button>
          <button className={`btn ${activeTab === 'payroll' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('payroll')}>
            <i className="fa-solid fa-file-invoice"></i> Số tiết dạy & Thù lao
          </button>
        </div>
      </div>

      {activeTab === 'tuition' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '15px' }}>
            <button className="btn btn-primary" onClick={openManualModal}>
              <i className="fa-solid fa-plus"></i> Tạo Hóa Đơn Thủ Công
            </button>
          </div>

      {message.text && (
        <div className={`alert-box alert-${message.type} animated-scale`}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* MỐC THỜI GIAN FILTER TOOLBAR */}
      <div className="toolbar-panel glass-panel animated-scale" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-calendar-days"></i> Mốc thời gian báo cáo học phí:
            </span>
            
            <div className="preset-buttons" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'today', label: 'Hôm nay' },
                { id: 'thisWeek', label: 'Tuần này' },
                { id: 'thisMonth', label: 'Tháng này' },
                { id: 'lastMonth', label: 'Tháng trước' },
                { id: 'thisQuarter', label: 'Quý này' },
                { id: 'thisYear', label: 'Năm nay' },
                { id: 'custom', label: 'Tùy chọn' },
              ].map(p => (
                <button
                  key={p.id}
                  type="button"
                  className={`btn-preset ${preset === p.id ? 'active' : ''}`}
                  onClick={() => setPreset(p.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: preset === p.id ? 'none' : '1px solid var(--color-border)',
                    background: preset === p.id ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: preset === p.id ? '#fff' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              />
              <span>đến</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <div className="stat-info">
            <h3>Doanh thu thu thực tế</h3>
            <p className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.totalRevenue.toLocaleString('vi-VN')}đ</p>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Giao dịch phát sinh trong kỳ</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
            <i className="fa-solid fa-circle-exmark"></i>
          </div>
          <div className="stat-info">
            <h3>Công nợ tồn đọng trong kỳ</h3>
            <p className="stat-value" style={{ color: 'var(--color-error)' }}>{stats.totalDebt.toLocaleString('vi-VN')}đ</p>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phát sinh chưa thu đủ</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
            <i className="fa-solid fa-receipt"></i>
          </div>
          <div className="stat-info">
            <h3>Hóa đơn chưa hoàn thành</h3>
            <p className="stat-value">{stats.unpaidOrdersCount} / {stats.totalOrdersCount}</p>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Tổng giao dịch: {stats.totalOrdersCount}</span>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={handleExportPDF} style={{ width: '100%', height: '100%', fontWeight: 'bold' }}>
            <i className="fa-solid fa-file-pdf text-danger"></i> Xuất Báo Cáo PDF
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="toolbar-panel glass-panel">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Tìm theo hóa đơn, tên HV, mã HV, mã lớp..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label><i className="fa-solid fa-filter"></i> Trạng thái hóa đơn:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="paid">Đã đóng đủ</option>
            <option value="partial">Chưa đóng đủ</option>
            <option value="unpaid">Chưa đóng</option>
          </select>
        </div>
      </div>

      {/* FINANCE TABLE */}
      <div className="table-container glass-panel">
        {loading ? (
          <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu tài chính...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-table-state">
            <i className="fa-solid fa-wallet"></i>
            <p>Không tìm thấy hóa đơn học phí nào.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Hóa Đơn</th>
                <th>Học Viên</th>
                <th>Lớp Học</th>
                <th>Khuyến mãi / Ghi chú</th>
                <th>Hạn thanh toán</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Phải đóng</th>
                <th style={{ textAlign: 'right' }}>Đã đóng</th>
                <th style={{ textAlign: 'right' }}>Nợ còn lại</th>
                <th style={{ textAlign: 'center' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => {
                const debt = order.feeToPay - order.amountPaid;
                const badgeColor = 
                  order.paymentStatus === 'Đã đóng' ? 'bg-success-light' : 
                  order.paymentStatus === 'Chưa đóng' ? 'bg-danger-light' : 'bg-warning-light';

                return (
                  <tr key={order.id} className="table-row">
                    <td className="std-id">
                      {order.id}
                      <span style={{ 
                        display: 'block', 
                        fontSize: '0.7rem', 
                        color: order.paymentPolicy === 'Đóng sau' ? 'var(--color-warning)' : 'var(--color-primary-dark)',
                        fontWeight: 'bold',
                        marginTop: '0.15rem'
                      }}>
                        <i className="fa-solid fa-clock-rotate-left"></i> {order.paymentPolicy || 'Đóng trước'}
                      </span>
                    </td>
                    <td className="std-name">{order.student?.name} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({order.studentId})</span></td>
                    <td style={{ fontWeight: '600' }}>{order.classCode}</td>
                    <td style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={order.promoType}>
                      {order.promoType || 'N/A'}
                    </td>
                    <td>{order.paymentDeadline ? new Date(order.paymentDeadline).toLocaleDateString('vi-VN') : 'N/A'}</td>
                    <td>
                      <span className={`status-badge-profile ${badgeColor}`}>
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{order.feeToPay.toLocaleString('vi-VN')}đ</td>
                    <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>{order.amountPaid.toLocaleString('vi-VN')}đ</td>
                    <td style={{ textAlign: 'right', color: debt > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: 'bold' }}>
                      {debt.toLocaleString('vi-VN')}đ
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {debt > 0 ? (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-success" onClick={() => openCollectModal(order)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', background: 'var(--color-success)', color: 'white', flex: 1 }}>
                            <i className="fa-solid fa-coins"></i> Thu
                          </button>
                          <button className="btn btn-sm btn-primary" onClick={() => openAiModal(order)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', background: 'var(--color-primary)', color: 'white', flex: 1 }} title="AI Nhắc phí">
                            <i className="fa-solid fa-wand-magic-sparkles"></i> AI
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}><i className="fa-regular fa-circle-check text-success"></i> Đã hoàn thành</span>
                      )}
                      
                      {order.paymentLogs && order.paymentLogs.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => openHistoryModal(order)} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>
                            <i className="fa-solid fa-clock-rotate-left"></i> Lịch sử
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {activeTab === 'payroll' && (
        <PayrollTab />
      )}

      {/* MODAL: MANUAL INVOICE */}
      {showManualModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-file-invoice"></i> Tạo Hóa Đơn Học Phí Thủ Công</h2>
              <button className="close-btn" onClick={() => setShowManualModal(false)}>&times;</button>
            </div>
            <form className="modal-body modal-form" onSubmit={handleManualSubmit}>
              <div className="form-group">
                <label>Chọn Học Viên: *</label>
                <select 
                  value={manualForm.studentId} 
                  onChange={e => setManualForm({...manualForm, studentId: e.target.value})}
                  required
                >
                  <option value="">-- Chọn học viên --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id}) - {s.phone || 'N/A'}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Chọn Lớp Học liên kết: *</label>
                <select 
                  value={manualForm.classCode} 
                  onChange={e => setManualForm({...manualForm, classCode: e.target.value})}
                  required
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map(c => (
                    <option key={c.code} value={c.code}>{c.code} ({c.teacherName || 'Chưa phân bổ'})</option>
                  ))}
                </select>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Mức học phí phải đóng (VND): *</label>
                  <input 
                    type="text" 
                    value={manualForm.feeToPay} 
                    onChange={e => setManualForm({...manualForm, feeToPay: formatNumber(e.target.value)})}
                    required
                    placeholder="Ví dụ: 3.000.000"
                  />
                </div>
                <div className="form-group">
                  <label>Số tiền đóng ngay đợt này (VND):</label>
                  <input 
                    type="text" 
                    value={manualForm.amountPaid} 
                    onChange={e => setManualForm({...manualForm, amountPaid: formatNumber(e.target.value)})}
                    placeholder="Ví dụ: 0 hoặc 1.000.000"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Loại miễn giảm / Ghi chú hóa đơn:</label>
                <input 
                  type="text" 
                  value={manualForm.notes} 
                  onChange={e => setManualForm({...manualForm, notes: e.target.value})}
                  placeholder="VD: Hóa đơn bổ sung do học giữa chừng, học phí kèm..."
                />
              </div>

              <div className="form-group">
                <label>Chính sách đóng phí tháng:</label>
                <select 
                  value={manualForm.paymentPolicy} 
                  onChange={e => setManualForm({...manualForm, paymentPolicy: e.target.value})}
                >
                  <option value="Đóng trước">Đóng trước (Thu trước học phí khi vào tháng)</option>
                  <option value="Đóng sau">Đóng sau (Thu học phí sau khi học xong tháng)</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowManualModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-save"></i> Tạo hóa đơn</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT TUITION */}
      {showCollectModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-coins"></i> Ghi nhận Thu tiền</h2>
              <button className="close-btn" onClick={() => setShowCollectModal(false)}>&times;</button>
            </div>
            <form className="modal-body modal-form" onSubmit={handleCollectSubmit}>
              <div className="info-panel" style={{ fontSize: '0.9rem' }}>
                <p><strong>Học viên:</strong> {collectForm.studentName}</p>
                <p><strong>Lớp học:</strong> {collectForm.classCode}</p>
                <p><strong>Dư nợ hiện tại:</strong> <span className="text-danger" style={{ fontWeight: 'bold' }}>{collectForm.remainingDebt.toLocaleString()}đ</span></p>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Số tiền thu đợt này: *</label>
                  <input 
                    type="text" 
                    value={collectForm.collectAmount} 
                    onChange={e => setCollectForm({...collectForm, collectAmount: formatNumber(e.target.value)})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phương thức:</label>
                  <select value={collectForm.paymentMethod} onChange={e => setCollectForm({...collectForm, paymentMethod: e.target.value})}>
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú thu tiền:</label>
                <input 
                  type="text" 
                  value={collectForm.notes} 
                  onChange={e => setCollectForm({...collectForm, notes: e.target.value})}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCollectModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-circle-check"></i> Xác nhận thu tiền</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI REMINDER */}
      {showAiModal && aiOrder && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--color-primary-dark)' }}>
                <i className="fa-solid fa-wand-magic-sparkles"></i> Trợ Lý AI Nhắc Phí: {aiOrder.student?.name?.toUpperCase()}
              </h2>
              <button className="close-btn" onClick={() => setShowAiModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Giọng điệu AI:</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button type="button" className={`btn-preset ${aiTone === 'encouraging' ? 'active' : ''}`} onClick={() => setAiTone('encouraging')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: aiTone === 'encouraging' ? '1px solid var(--color-success)' : '1px solid #e2e8f0', background: aiTone === 'encouraging' ? '#f0fdf4' : 'transparent', color: aiTone === 'encouraging' ? '#166534' : '#475569' }}>
                    <i className="fa-solid fa-circle" style={{ color: 'var(--color-success)', marginRight: '4px', fontSize: '0.6rem' }}></i> Ấm áp & Thân thiện
                  </button>
                  <button type="button" className={`btn-preset ${aiTone === 'solution' ? 'active' : ''}`} onClick={() => setAiTone('solution')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: aiTone === 'solution' ? '1px solid var(--color-warning)' : '1px solid #e2e8f0', background: aiTone === 'solution' ? '#fffbeb' : 'transparent', color: aiTone === 'solution' ? '#b45309' : '#475569' }}>
                    <i className="fa-solid fa-circle" style={{ color: 'var(--color-warning)', marginRight: '4px', fontSize: '0.6rem' }}></i> Khéo léo gợi mở
                  </button>
                  <button type="button" className={`btn-preset ${aiTone === 'formal' ? 'active' : ''}`} onClick={() => setAiTone('formal')} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', borderRadius: '4px', border: aiTone === 'formal' ? '1px solid var(--color-danger)' : '1px solid #e2e8f0', background: aiTone === 'formal' ? '#fef2f2' : 'transparent', color: aiTone === 'formal' ? '#991b1b' : '#475569' }}>
                    <i className="fa-solid fa-circle" style={{ color: 'var(--color-danger)', marginRight: '4px', fontSize: '0.6rem' }}></i> Lịch sự & Chuyên nghiệp
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative' }}>
                <textarea 
                  value={aiMessage}
                  onChange={(e) => setAiMessage(e.target.value)}
                  placeholder="Tin nhắn do AI tạo ra sẽ hiển thị ở đây..."
                  style={{ width: '100%', height: '180px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)', fontSize: '0.9rem', resize: 'none' }}
                />
                {isGeneratingAi && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(255,255,255,0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--color-primary)', marginBottom: '0.5rem' }}></i>
                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>AI đang soạn lời nhắn...</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-warning" onClick={handleGenerateAiMessage} disabled={isGeneratingAi}>
                <i className="fa-solid fa-rotate"></i> {aiMessage ? 'Tạo lại tin khác' : 'Tạo lời nhắc'}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowAiModal(false)}>Đóng</button>
                {aiMessage && (
                  <button className="btn btn-success" onClick={handleCopyAiMessage}>
                    <i className="fa-brands fa-whatsapp"></i> Copy Gửi Zalo
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAYMENT HISTORY */}
      {showHistoryModal && historyOrder && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-clock-rotate-left"></i> Lịch Sử Thu Tiền</h2>
              <button className="close-btn" onClick={() => setShowHistoryModal(false)}>&times;</button>
            </div>
            <div className="modal-body" style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(13, 136, 196, 0.05)', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Học viên:</strong> {historyOrder.student?.name} ({historyOrder.studentId})</p>
                <p style={{ margin: '0 0 0.5rem 0' }}><strong>Lớp học:</strong> {historyOrder.classCode}</p>
                <p style={{ margin: '0' }}><strong>Tổng đã thu:</strong> {historyOrder.amountPaid.toLocaleString('vi-VN')}đ / {historyOrder.feeToPay.toLocaleString('vi-VN')}đ</p>
              </div>

              <table className="data-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Ngày thu</th>
                    <th>Số tiền</th>
                    <th>Phương thức</th>
                    <th>Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {historyOrder.paymentLogs && historyOrder.paymentLogs.length > 0 ? (
                    historyOrder.paymentLogs.map((log, index) => (
                      <tr key={index}>
                        <td>{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                        <td style={{ fontWeight: 'bold', color: 'var(--color-success)', textAlign: 'right' }}>+{log.amount.toLocaleString('vi-VN')}đ</td>
                        <td style={{ textAlign: 'center' }}>{log.paymentMethod}</td>
                        <td>{log.notes}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: '#64748b' }}>Chưa có lịch sử thanh toán chi tiết.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .page-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .page-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header-actions h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--color-text);
        }
        .page-header-actions p {
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        .stat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: var(--shadow-sm);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-info h3 {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text-muted);
          margin: 0 0 0.25rem 0;
        }
        .stat-info .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--color-text);
          line-height: 1;
          margin: 0;
        }
      `}</style>
    </div>
  );
}


