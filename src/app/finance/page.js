'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import PayrollTab from './PayrollTab';
import ClassSelect from '../components/ClassSelect';
import PaidStamp from '@/components/PaidStamp';

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState('tuition'); // tuition, payroll
  const [subView, setSubView] = useState('orders'); // orders, cashflow
  const [orders, setOrders] = useState([]);
  const [cashflowLogs, setCashflowLogs] = useState([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    courseRevenue: 0,
    monthlyRevenue: 0,
    cashRevenue: 0,
    transferRevenue: 0,
    totalDebt: 0,
    monthlyDebt: 0,
    totalOrdersCount: 0,
    unpaidOrdersCount: 0,
    paymentLogsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 25;

  // Students & Classes list for manual invoice
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);

  // Modals state
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyOrder, setHistoryOrder] = useState(null);

  // E-Receipt Modal state
  const [showEReceiptModal, setShowEReceiptModal] = useState(false);
  const [eReceiptData, setEReceiptData] = useState(null);
  const [copyingReceipt, setCopyingReceipt] = useState(false);
  const receiptRef = useRef(null);

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
        setOrders(json.data || []);
        setCashflowLogs(json.cashflowLogs || []);
        setStats(json.stats || {});
        setCurrentPage(1);
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
          targetOrderId: collectForm.orderId,
          amountPaid: parseNumber(collectForm.collectAmount),
          paymentMethod: collectForm.paymentMethod,
          notes: collectForm.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Ghi nhận thu tiền thành công!' });
        setShowCollectModal(false);
        const now = new Date();
        const snap = json.receiptSummary || {};
        setEReceiptData({
          receiptCode: json.receiptCode || '',
          studentName: collectForm.studentName,
          classCode: collectForm.classCode,
          paymentMethod: collectForm.paymentMethod,
          date: now.toLocaleDateString('vi-VN'),
          time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          originalFee: snap.originalFee || 0,
          discountAmount: snap.discountAmount || 0,
          discountLabel: snap.discountLabel || 'Ưu đãi / Giảm trừ',
          feeAfterDiscount: snap.feeAfterDiscount || 0,
          previouslyPaid: snap.previouslyPaid || 0,
          oldDebt: snap.oldDebt ?? collectForm.remainingDebt,
          tuitionPaid: snap.tuitionPaid ?? parseNumber(collectForm.collectAmount),
          remainingDebt: snap.remainingDebt ?? Math.max(0, collectForm.remainingDebt - parseNumber(collectForm.collectAmount)),
          totalPaid: snap.totalCollected ?? parseNumber(collectForm.collectAmount),
        });
        setShowEReceiptModal(true);
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

  const handleExportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const orderRows = orders.map((o, idx) => ({
      STT: idx + 1,
      'Mã Hóa Đơn': o.id,
      'Mã HV': o.studentId,
      'Học Viên': o.student?.name || '',
      'Lớp Học': o.classCode,
      'Chính Sách': o.paymentPolicy || 'Đóng trước',
      'Trạng Thái': o.paymentStatus,
      'Phải Đóng (VNĐ)': Math.round(o.feeToPay || 0),
      'Đã Đóng (VNĐ)': Math.round(o.amountPaid || 0),
      'Còn Nợ (VNĐ)': Math.max(0, Math.round((o.feeToPay || 0) - (o.amountPaid || 0))),
      'Ghi Chú': o.promoType || '',
    }));
    const ws1 = XLSX.utils.json_to_sheet(orderRows);
    XLSX.utils.book_append_sheet(wb, ws1, 'HoaDonHocPhi');

    const logRows = cashflowLogs.map((l, idx) => ({
      STT: idx + 1,
      'Ngày Thu': new Date(l.createdAt).toLocaleString('vi-VN'),
      'Phân Loại': l.type === 'MONTHLY' ? 'Học phí Tháng' : 'Học phí Khóa',
      'Mã Chứng Từ': l.refId,
      'Học Viên': l.studentName,
      'Lớp': l.classCode,
      'Số Tiền Thực Thu (VNĐ)': Math.round(l.amount || 0),
      'Hình Thức': l.paymentMethod,
      'Ghi Chú': l.notes || '',
    }));
    const ws2 = XLSX.utils.json_to_sheet(logRows);
    XLSX.utils.book_append_sheet(wb, ws2, 'NhatKyDongTien');

    XLSX.writeFile(wb, `Bao_Cao_Tai_Chinh_NhatMy_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.xlsx`);
  };

  const handlePrintVietnamesePDF = () => {
    const win = window.open('', '_blank', 'width=1024,height=768');
    if (!win) {
      alert('Vui lòng cho phép trình duyệt mở cửa sổ in.');
      return;
    }
    const rowsHtml = orders
      .map(
        (o, idx) => `
      <tr>
        <td style="text-align:center">${idx + 1}</td>
        <td>${o.id}</td>
        <td><strong>${o.student?.name || ''}</strong> (${o.studentId})</td>
        <td>${o.classCode}</td>
        <td>${o.paymentStatus}</td>
        <td style="text-align:right">${Math.round(o.feeToPay || 0).toLocaleString('vi-VN')}đ</td>
        <td style="text-align:right">${Math.round(o.amountPaid || 0).toLocaleString('vi-VN')}đ</td>
        <td style="text-align:right;color:#dc2626">${Math.max(0, Math.round((o.feeToPay || 0) - (o.amountPaid || 0))).toLocaleString('vi-VN')}đ</td>
      </tr>`
      )
      .join('');

    win.document.write(`
      <!doctype html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>Báo Cáo Tài Chính - Anh Ngữ Nhật Mỹ</title>
        <link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;600;700;800&display=swap" rel="stylesheet" />
        <style>
          body { font-family: 'Be Vietnam Pro', Arial, sans-serif; padding: 24px; color: #1e293b; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d88c4; padding-bottom: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; }
          th { background: #eff6ff; color: #085e8a; }
          .summary { display: flex; gap: 24px; margin-bottom: 14px; font-size: 13px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div style="font-size:18px;font-weight:800;color:#085e8a">ANH NGỮ NHẬT MỸ</div>
            <div style="font-style:italic;font-size:12px;color:#64748b">Dedicated to Excellence</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:16px;font-weight:800;color:#0d88c4">BÁO CÁO TÀI CHÍNH &amp; CÔNG NỢ</div>
            <div style="font-size:12px;color:#64748b">Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        </div>
        <div class="summary">
          <div><strong>Thực thu trong kỳ:</strong> ${Number(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ</div>
          <div><strong>Công nợ khóa:</strong> ${Number(stats.totalDebt || 0).toLocaleString('vi-VN')}đ</div>
          <div><strong>Công nợ tháng:</strong> ${Number(stats.monthlyDebt || 0).toLocaleString('vi-VN')}đ</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>STT</th><th>Mã HĐ</th><th>Học viên</th><th>Lớp</th><th>Trạng thái</th><th>Phải đóng</th><th>Đã đóng</th><th>Còn nợ</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.onload = () => setTimeout(() => window.print(), 350);</script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const handleCopyReceiptImage = async () => {
    if (!receiptRef.current || copyingReceipt) return;
    setCopyingReceipt(true);
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
      const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG error'))), 'image/png', 1));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      alert('✅ Đã copy Phiếu thu điện tử vào Clipboard! Bạn có thể dán (Ctrl+V) vào Zalo ngay.');
    } catch {
      alert('Không thể copy trực tiếp. Vui lòng bấm Tải Ảnh PNG.');
    } finally {
      setCopyingReceipt(false);
    }
  };

  const handleDownloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    if (document.fonts?.ready) await document.fonts.ready;
    const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    const link = document.createElement('a');
    link.download = `PhieuThu_${eReceiptData?.receiptCode || 'NhatMy'}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
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
            <h3>Thực thu trong kỳ (Dòng tiền thật)</h3>
            <p className="stat-value" style={{ color: 'var(--color-success)' }}>{(stats.totalRevenue || 0).toLocaleString('vi-VN')}đ</p>
            <span style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.25rem' }}>
              Khóa: {(stats.courseRevenue || 0).toLocaleString('vi-VN')}đ · Tháng: {(stats.monthlyRevenue || 0).toLocaleString('vi-VN')}đ
            </span>
            <span style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: '600' }}>
              TM: {(stats.cashRevenue || 0).toLocaleString('vi-VN')}đ · CK/POS: {(stats.transferRevenue || 0).toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
            <i className="fa-solid fa-circle-exmark"></i>
          </div>
          <div className="stat-info">
            <h3>Công nợ tồn đọng</h3>
            <p className="stat-value" style={{ color: 'var(--color-error)' }}>{(stats.totalDebt || 0).toLocaleString('vi-VN')}đ</p>
            <span style={{ fontSize: '0.73rem', color: '#64748b', marginTop: '0.25rem' }}>
              Nợ khóa học: {(stats.totalDebt || 0).toLocaleString('vi-VN')}đ
            </span>
            <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: '600' }}>
              Nợ học phí tháng hiện tại: {(stats.monthlyDebt || 0).toLocaleString('vi-VN')}đ
            </span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
            <i className="fa-solid fa-receipt"></i>
          </div>
          <div className="stat-info">
            <h3>Hóa đơn chưa hoàn thành</h3>
            <p className="stat-value">{stats.unpaidOrdersCount || 0} / {stats.totalOrdersCount || 0}</p>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              Tổng giao dịch thực thu: {stats.paymentLogsCount || cashflowLogs.length} lượt
            </span>
          </div>
        </div>
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={handleExportExcel} style={{ width: '100%', fontWeight: 'bold', background: '#16a34a', borderColor: '#16a34a' }}>
            <i className="fa-solid fa-file-excel"></i> Xuất Báo Cáo Excel (.xlsx)
          </button>
          <button className="btn btn-secondary" onClick={handlePrintVietnamesePDF} style={{ width: '100%', fontWeight: 'bold' }}>
            <i className="fa-solid fa-print text-primary"></i> In / Lưu PDF (Có dấu)
          </button>
        </div>
      </div>

      {/* SUB-VIEW TOGGLE: HÓA ĐƠN vs NHẬT KÝ DÒNG TIỀN */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className={`btn btn-sm ${subView === 'orders' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSubView('orders')}
            style={{ fontWeight: '700', padding: '0.45rem 0.9rem' }}
          >
            <i className="fa-solid fa-file-invoice"></i> Danh sách Hóa đơn ({orders.length})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${subView === 'cashflow' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSubView('cashflow')}
            style={{ fontWeight: '700', padding: '0.45rem 0.9rem' }}
          >
            <i className="fa-solid fa-money-bill-trend-up"></i> Nhật ký Dòng tiền Thực thu ({cashflowLogs.length})
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
      {subView === 'orders' ? (
      <div className="table-container glass-panel">
        {loading ? (
          <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu tài chính...</p></div>
        ) : orders.length === 0 ? (
          <div className="empty-table-state">
            <i className="fa-solid fa-wallet"></i>
            <p>Không tìm thấy hóa đơn học phí nào.</p>
          </div>
        ) : (
          <>
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
              {orders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE).map(order => {
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
          {orders.length > PAGE_SIZE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', borderTop: '1px solid #e2e8f0', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, orders.length)} / {orders.length} hóa đơn
              </span>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  &laquo; Trước
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.85rem', padding: '0 0.5rem' }}>
                  Trang {currentPage} / {Math.ceil(orders.length / PAGE_SIZE)}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  disabled={currentPage >= Math.ceil(orders.length / PAGE_SIZE)}
                  onClick={() => setCurrentPage((p) => Math.min(Math.ceil(orders.length / PAGE_SIZE), p + 1))}
                >
                  Sau &raquo;
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
      ) : (
      <div className="table-container glass-panel">
        {loading ? (
          <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải nhật ký dòng tiền...</p></div>
        ) : cashflowLogs.length === 0 ? (
          <div className="empty-table-state">
            <i className="fa-solid fa-money-bill-wave"></i>
            <p>Không phát sinh giao dịch thu tiền thực tế nào trong mốc thời gian này.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Thời gian thu thật</th>
                <th>Phân loại</th>
                <th>Mã chứng từ</th>
                <th>Học viên</th>
                <th>Lớp / Tháng</th>
                <th>Hình thức</th>
                <th style={{ textAlign: 'right' }}>Số tiền thực thu</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {cashflowLogs.slice(0, 100).map((log) => (
                <tr key={log.id} className="table-row">
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {new Date(log.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <span className={`status-badge-profile ${log.type === 'MONTHLY' ? 'bg-warning-light' : 'bg-success-light'}`}>
                      {log.type === 'MONTHLY' ? 'Học phí Tháng' : 'Học phí Khóa'}
                    </span>
                  </td>
                  <td className="std-id">{log.refId}</td>
                  <td className="std-name">{log.studentName} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>({log.studentId})</span></td>
                  <td style={{ fontWeight: '600' }}>{log.classCode}</td>
                  <td>{log.paymentMethod}</td>
                  <td style={{ textAlign: 'right', fontWeight: '800', color: 'var(--color-success)' }}>
                    +{Math.round(log.amount || 0).toLocaleString('vi-VN')}đ
                  </td>
                  <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{log.notes || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}
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
                <ClassSelect value={manualForm.classCode} onChange={e => setManualForm({...manualForm, classCode: e.target.value})} required classes={classes} placeholder="-- Chọn lớp học --" />
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

      {/* MODAL: PHIẾU THU ĐIỆN TỬ SAU KHI THU TIỀN */}
      {showEReceiptModal && eReceiptData && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '480px', padding: '1.25rem' }}>
            <div className="modal-header" style={{ marginBottom: '0.75rem' }}>
              <h2 style={{ margin: 0, color: '#085E8A' }}><i className="fa-solid fa-receipt"></i> Phiếu Thu Điện Tử</h2>
              <button className="close-btn" onClick={() => setShowEReceiptModal(false)}>&times;</button>
            </div>
            <div ref={receiptRef} style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', position: 'relative' }}>
              <div style={{ height: '6px', background: 'linear-gradient(90deg, #0D88C4 0%, #0D88C4 60%, #FFCA29 60%, #FFCA29 100%)' }}></div>
              <div style={{ padding: '1.5rem 1.75rem 2.25rem 1.75rem', textAlign: 'left', color: '#1E293B', fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif", position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
                  <img src="/logo.png" alt="Anh ngữ Nhật Mỹ" style={{ height: '54px', width: '54px', objectFit: 'contain' }} crossOrigin="anonymous" />
                  <div style={{ flex: 1, textAlign: 'center', paddingRight: '10px' }}>
                    <h2 style={{ margin: '0 0 0.1rem 0', color: '#085E8A', fontSize: '1.2rem', fontWeight: '900' }}>ANH NGỮ NHẬT MỸ</h2>
                    <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: '#64748b', marginBottom: '0.3rem' }}>Dedicated to Excellence</div>
                    <div style={{ display: 'inline-block', background: '#FFCA29', color: '#085E8A', padding: '0.2rem 0.85rem', borderRadius: '20px', fontSize: '0.78rem', fontWeight: '800' }}>
                      PHIẾU THU ĐIỆN TỬ
                    </div>
                    {eReceiptData.receiptCode && (
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '700', marginTop: '0.25rem' }}>
                        Số: {eReceiptData.receiptCode}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ margin: '1rem 0', borderTop: '2px dashed #E2E8F0', borderBottom: '2px dashed #E2E8F0', padding: '0.85rem 0', fontSize: '0.92rem', lineHeight: '1.7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Học viên:</span>
                    <strong style={{ color: '#085E8A' }}>{eReceiptData.studentName?.toUpperCase()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Lớp học:</span>
                    <strong>{eReceiptData.classCode}</strong>
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
                <div style={{ margin: '0.75rem 0', fontSize: '0.92rem', lineHeight: '1.8' }}>
                  {Number(eReceiptData.discountAmount || 0) > 0 && Number(eReceiptData.originalFee || 0) > 0 && (
                    <div style={{ marginBottom: '0.4rem', paddingBottom: '0.4rem', borderBottom: '1px dashed #E2E8F0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748B' }}>Học phí gốc khóa học:</span>
                        <span style={{ color: '#64748B' }}>{Number(eReceiptData.originalFee).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#059669', fontWeight: '600' }}>{eReceiptData.discountLabel || 'Ưu đãi / Giảm trừ'}:</span>
                        <span style={{ fontWeight: '700', color: '#E11D48' }}>- {Number(eReceiptData.discountAmount).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Học phí chưa hoàn thành:</span>
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
                <div style={{ marginTop: '1rem', background: '#FFFBEB', border: '2px solid #FFCA29', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: '800', fontSize: '0.95rem', color: '#085E8A' }}>TỔNG THU ĐỢT NÀY:</span>
                  <span style={{ fontWeight: '900', fontSize: '1.35rem', color: '#0D88C4' }}>{Number(eReceiptData.totalPaid || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748B', fontStyle: 'italic' }}>
                  <p style={{ margin: 0 }}>Cảm ơn Quý phụ huynh &amp; Học viên đã tin tưởng và đồng hành cùng Anh ngữ Nhật Mỹ!</p>
                </div>
                <PaidStamp date={eReceiptData.date} time={eReceiptData.time} receiptCode={eReceiptData.receiptCode} size={138} style={{ right: '10px', bottom: '20px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button type="button" className="btn btn-primary" disabled={copyingReceipt} onClick={handleCopyReceiptImage}>
                <i className="fa-regular fa-copy"></i> {copyingReceipt ? 'Đang copy...' : 'Copy Ảnh Gửi Zalo'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleDownloadReceiptImage}>
                <i className="fa-solid fa-download"></i> Tải Ảnh PNG
              </button>
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
          flex-wrap: wrap;
          gap: 1rem;
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
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 1.25rem;
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


