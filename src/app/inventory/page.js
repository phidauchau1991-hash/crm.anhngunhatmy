'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'report'
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, outOfStock: 0, totalInventoryValue: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states
  const [currentItem, setCurrentItem] = useState(null); // For edit
  const [itemForm, setItemForm] = useState({
    id: '',
    name: '',
    category: 'Giáo trình',
    unit: 'Cái',
    unitCost: 0,
    unitPrice: 0,
    threshold: 5
  });
  
  const [transForm, setTransForm] = useState({
    actionType: 'NHAP',
    type: 'NHAP_MOI',
    targetType: 'SYSTEM',
    targetName: '',
    notes: '',
    inventoryId: '',
    quantity: 1,
    unitCost: 0,
    campaignName: '',
  });

  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  // Report state
  const currentDate = new Date();
  const [reportFilter, setReportFilter] = useState({
    month: currentDate.getMonth() + 1,
    year: currentDate.getFullYear(),
    category: 'ALL',
  });
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const formatVND = (val) => new Intl.NumberFormat('vi-VN').format(Math.round(val || 0)) + ' đ';

  // 1. TẢI DANH MỤC KHO
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
        setStats(json.stats || { totalItems: json.data.length, lowStock: 0, outOfStock: 0, totalInventoryValue: 0 });
      }
    } catch (error) {
      console.error('Lỗi khi tải kho:', error);
    } finally {
      setLoading(false);
    }
  };

  // 2. TẢI BÁO CÁO XUẤT - NHẬP - TỒN & MARKETING
  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const query = new URLSearchParams({
        month: String(reportFilter.month),
        year: String(reportFilter.year),
        category: reportFilter.category,
      });
      const res = await fetch(`/api/inventory/report?${query.toString()}`);
      const json = await res.json();
      if (json.success) {
        setReportData(json);
      } else {
        setMessage({ type: 'error', text: json.error || 'Không thể tải báo cáo Xuất Nhập Tồn' });
      }
    } catch (error) {
      console.error('Lỗi khi tải báo cáo NXT:', error);
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi tải báo cáo Xuất Nhập Tồn' });
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  useEffect(() => {
    if (activeTab === 'report') {
      fetchReport();
    }
  }, [activeTab, reportFilter.month, reportFilter.year, reportFilter.category]);

  // ITEM MANAGEMENT
  const openItemModal = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setItemForm({
        id: item.id,
        name: item.name,
        category: item.category || 'Giáo trình',
        unit: item.unit || 'Cái',
        unitCost: item.unitCost || 0,
        unitPrice: item.unitPrice || 0,
        threshold: item.threshold || 5
      });
    } else {
      setCurrentItem(null);
      setItemForm({
        id: '',
        name: '',
        category: 'Tặng phẩm',
        unit: 'Cái',
        unitCost: 0,
        unitPrice: 0,
        threshold: 5
      });
    }
    setShowItemModal(true);
  };

  const saveItem = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/inventory', {
        method: currentItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemForm),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message || 'Lưu vật tư thành công!' });
        setShowItemModal(false);
        fetchInventory();
        if (activeTab === 'report') fetchReport();
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Có lỗi xảy ra khi lưu vật tư' });
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa vật tư này?')) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchInventory();
        if (activeTab === 'report') fetchReport();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa vật tư');
    }
  };

  // TRANSACTION MANAGEMENT
  const openTransModal = (type, item) => {
    const isNhap = type.startsWith('NHAP');
    setTransForm({
      actionType: isNhap ? 'NHAP' : (type.startsWith('XUAT') ? 'XUAT' : 'KIEM_KE'),
      type,
      targetType: isNhap ? 'SUPPLIER' : 'STUDENT',
      targetName: '',
      notes: '',
      inventoryId: item.id,
      quantity: 1,
      unitCost: item.unitCost || 0,
      campaignName: '',
    });
    setShowTransModal(true);
  };

  const openGeneralTransModal = (type) => {
    const isNhap = type.startsWith('NHAP');
    const firstItem = items[0];
    setTransForm({
      actionType: isNhap ? 'NHAP' : (type.startsWith('XUAT') ? 'XUAT' : 'KIEM_KE'),
      type,
      targetType: isNhap ? 'SUPPLIER' : 'STUDENT',
      targetName: '',
      notes: '',
      inventoryId: firstItem ? firstItem.id : '',
      quantity: 1,
      unitCost: firstItem ? (firstItem.unitCost || 0) : 0,
      campaignName: '',
    });
    setShowTransModal(true);
  };

  const handleTransItemChange = (invId) => {
    const it = items.find(i => i.id === invId);
    setTransForm(prev => ({
      ...prev,
      inventoryId: invId,
      unitCost: it ? (it.unitCost || 0) : prev.unitCost
    }));
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type: transForm.type,
        targetType: transForm.targetType,
        targetName: transForm.targetName,
        notes: transForm.notes,
        campaignName: transForm.campaignName || null,
        items: [{
          inventoryId: transForm.inventoryId,
          quantity: parseInt(transForm.quantity),
          unitCost: parseFloat(transForm.unitCost) || 0
        }]
      };

      const res = await fetch('/api/inventory/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: `Tạo phiếu thành công: ${json.data.receiptCode}` });
        setShowTransModal(false);
        fetchInventory();
        if (activeTab === 'report') fetchReport();
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert('Có lỗi xảy ra khi tạo phiếu');
    }
  };

  // HISTORY MANAGEMENT
  const viewHistory = async (item) => {
    setHistoryItem(item);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryLogs([]);
    try {
      const res = await fetch(`/api/inventory/logs?inventoryId=${item.id}`);
      const json = await res.json();
      if (json.success) {
        setHistoryLogs(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // XUẤT EXCEL BÁO CÁO XUẤT NHẬP TỒN
  const exportNxtExcel = () => {
    if (!reportData || !reportData.nxtTable || reportData.nxtTable.length === 0) {
      alert('Chưa có dữ liệu để xuất file Excel');
      return;
    }

    const headers = [
      'STT',
      'Mã VT',
      'Tên Vật Tư',
      'Danh Mục',
      'ĐVT',
      'Giá Vốn (đ)',
      'Giá Bán (đ)',
      'Tồn Đầu Kỳ (SL)',
      'Trị Giá Đầu Kỳ (đ)',
      'Tổng Nhập (SL)',
      'Nhập Mới',
      'Nhập Trả',
      'Trị Giá Nhập (đ)',
      'Tổng Xuất (SL)',
      'Xuất Tặng Marketing (SL)',
      'Xuất Bán (SL)',
      'Xuất Khác/Hỏng',
      'Chi Phí Tặng Phẩm MKT (đ)',
      'Doanh Thu Bán (đ)',
      'Tồn Cuối Kỳ (SL)',
      'Trị Giá Tồn Cuối (đ)'
    ];

    const rows = reportData.nxtTable.map((r, idx) => [
      idx + 1,
      r.id,
      r.name,
      r.category,
      r.unit,
      r.unitCost,
      r.unitPrice,
      r.openingStock,
      r.openingValue,
      r.inQty,
      r.nhapMoi,
      r.nhapTra,
      r.inValue,
      r.outQty,
      r.xuatTang,
      r.xuatBan,
      r.xuatMuon + r.xuatHong,
      r.giftCost,
      r.soldRevenue,
      r.closingStock,
      r.closingValue
    ]);

    // Hàng tổng kết
    rows.push([
      '',
      'TỔNG CỘNG TOÀN KHO',
      '',
      '',
      '',
      '',
      '',
      reportData.nxtTable.reduce((s, r) => s + r.openingStock, 0),
      reportData.kpis.totalOpeningValue,
      reportData.nxtTable.reduce((s, r) => s + r.inQty, 0),
      reportData.nxtTable.reduce((s, r) => s + r.nhapMoi, 0),
      reportData.nxtTable.reduce((s, r) => s + r.nhapTra, 0),
      reportData.kpis.totalInValue,
      reportData.nxtTable.reduce((s, r) => s + r.outQty, 0),
      reportData.kpis.totalGiftQuantity,
      reportData.nxtTable.reduce((s, r) => s + r.xuatBan, 0),
      reportData.nxtTable.reduce((s, r) => s + (r.xuatMuon + r.xuatHong), 0),
      reportData.kpis.totalGiftCost,
      reportData.kpis.totalSoldRevenue,
      reportData.nxtTable.reduce((s, r) => s + r.closingStock, 0),
      reportData.kpis.totalInventoryValue
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([
      [`BÁO CÁO XUẤT - NHẬP - TỒN & CHI PHÍ QUÀ TẶNG MARKETING THÁNG ${reportFilter.month}/${reportFilter.year}`],
      [`Đơn vị: TRUNG TÂM ANH NGỮ NHẬT MỸ - Hệ thống CRM (Xuất lúc: ${new Date().toLocaleString('vi-VN')})`],
      [],
      headers,
      ...rows
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `NXT_T${reportFilter.month}_${reportFilter.year}`);
    XLSX.writeFile(workbook, `Bao_Cao_Xuat_Nhap_Ton_T${reportFilter.month}_${reportFilter.year}.xlsx`);
  };

  return (
    <div className="page-container">
      {/* HEADER & TABS NAVIGATION */}
      <div className="page-header-actions">
        <div>
          <h1><i className="fa-solid fa-boxes-stacked"></i> Quản Lý Kho & Vật Tư (Inventory)</h1>
          <p>Kiểm soát chặt chẽ giáo trình, tặng phẩm marketing và báo cáo xuất - nhập - tồn định kỳ.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => openGeneralTransModal('NHAP_MOI')} style={{ color: 'white', background: 'var(--color-success)', cursor: 'pointer' }}>
            <i className="fa-solid fa-file-import"></i> Lập Phiếu Nhập
          </button>
          <button className="btn" onClick={() => openGeneralTransModal('XUAT_TANG')} style={{ color: 'white', background: '#e11d48', cursor: 'pointer' }}>
            <i className="fa-solid fa-gift"></i> Xuất Tặng Marketing
          </button>
          <button className="btn btn-primary" onClick={() => openItemModal()}>
            <i className="fa-solid fa-plus"></i> Thêm Mã Vật Tư
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`alert-box alert-${message.type} animated-scale`}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* TAB SWITCHER */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <i className="fa-solid fa-cubes"></i> 1. Danh Mục & Tồn Kho Thực Tế ({items.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'report' ? 'active' : ''}`}
          onClick={() => setActiveTab('report')}
        >
          <i className="fa-solid fa-chart-pie"></i> 2. Báo Cáo Xuất - Nhập - Tồn & Chi Phí Marketing
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DANH MỤC & TỒN KHO THỰC TẾ                               */}
      {/* ============================================================== */}
      {activeTab === 'catalog' && (
        <>
          {/* DASHBOARD WIDGETS */}
          <div className="dashboard-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                <i className="fa-solid fa-box-open"></i>
              </div>
              <div className="stat-info">
                <h3>Tổng danh mục vật tư</h3>
                <p className="stat-value">{stats.totalItems}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <i className="fa-solid fa-vault"></i>
              </div>
              <div className="stat-info">
                <h3>Tổng giá trị lưu kho</h3>
                <p className="stat-value" style={{ color: '#059669', fontSize: '1.45rem' }}>{formatVND(stats.totalInventoryValue)}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div className="stat-info">
                <h3>Sắp hết hàng (≤ định mức)</h3>
                <p className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.lowStock}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
                <i className="fa-solid fa-circle-xmark"></i>
              </div>
              <div className="stat-info">
                <h3>Đã hết hàng</h3>
                <p className="stat-value" style={{ color: 'var(--color-error)' }}>{stats.outOfStock}</p>
              </div>
            </div>
          </div>

          {/* INVENTORY TABLE */}
          <div className="table-container glass-panel">
            {loading ? (
              <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu kho...</p></div>
            ) : items.length === 0 ? (
              <div className="empty-table-state">
                <i className="fa-solid fa-box"></i>
                <p>Kho đang trống. Vui lòng thêm mã vật tư mới.</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Mã (ID)</th>
                    <th>Tên Vật Tư</th>
                    <th>Danh Mục</th>
                    <th style={{ textAlign: 'center' }}>ĐVT</th>
                    <th style={{ textAlign: 'right' }}>Giá Vốn (VND)</th>
                    <th style={{ textAlign: 'right' }}>Giá Bán (VND)</th>
                    <th style={{ textAlign: 'center' }}>Tồn Kho</th>
                    <th style={{ textAlign: 'right' }}>Trị Giá Tồn</th>
                    <th style={{ textAlign: 'center' }}>Thao Tác Nhanh</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => {
                    const isLow = item.currentStock > 0 && item.currentStock <= item.threshold;
                    const isOut = item.currentStock === 0;
                    const itemValue = item.currentStock * (item.unitCost || 0);
                    return (
                      <tr key={item.id} className="table-row">
                        <td className="std-id" style={{ width: '110px' }}><code>{item.id}</code></td>
                        <td className="std-name" style={{ fontWeight: '600' }}>
                          {item.name}
                          {item.category === 'Tặng phẩm' && (
                            <span style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '2px 6px', background: '#ffe4e6', color: '#e11d48', borderRadius: '4px', fontWeight: 'bold' }}>
                              🎁 TẶNG PHẨM
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="status-badge" style={{ background: 'var(--color-bg-alt)' }}>
                            {item.category}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{item.unit || 'Cái'}</td>
                        <td style={{ textAlign: 'right', fontWeight: '500', color: '#0f766e' }}>
                          {formatVND(item.unitCost)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '500', color: '#0369a1' }}>
                          {item.unitPrice > 0 ? formatVND(item.unitPrice) : <span style={{ color: '#94a3b8' }}>-</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span className={`accumulated-badge ${isOut ? 'text-error' : isLow ? 'text-warning' : 'text-success'}`} style={{ fontSize: '1.1rem', padding: '0.3rem 0.8rem' }}>
                              {item.currentStock}
                            </span>
                            {(isLow || isOut) && (
                              <span style={{ fontSize: '0.7rem', color: isOut ? 'var(--color-error)' : 'var(--color-warning)', marginTop: '2px', fontWeight: 'bold' }}>
                                {isOut ? 'HẾT HÀNG' : `DƯỚI MỨC ${item.threshold}`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#334155' }}>
                          {formatVND(itemValue)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-buttons" style={{ justifyContent: 'center' }}>
                            <button className="btn-icon" title="Nhập hàng" onClick={() => openTransModal('NHAP_MOI', item)} style={{ color: 'var(--color-success)' }}><i className="fa-solid fa-arrow-right-to-bracket"></i></button>
                            <button className="btn-icon" title="Xuất tặng/bán" onClick={() => openTransModal('XUAT_TANG', item)} style={{ color: 'var(--color-error)' }}><i className="fa-solid fa-arrow-right-from-bracket"></i></button>
                            <button className="btn-icon" title="Lịch sử giao dịch" onClick={() => viewHistory(item)} style={{ color: 'var(--color-primary)' }}><i className="fa-solid fa-clock-rotate-left"></i></button>
                            <button className="btn-icon" title="Chỉnh sửa thông tin & giá vốn" onClick={() => openItemModal(item)}><i className="fa-solid fa-pen"></i></button>
                            <button className="btn-icon text-error" title="Xóa" onClick={() => deleteItem(item.id)}><i className="fa-solid fa-trash"></i></button>
                          </div>
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

      {/* ============================================================== */}
      {/* TAB 2: BÁO CÁO XUẤT - NHẬP - TỒN & CHI PHÍ MARKETING             */}
      {/* ============================================================== */}
      {activeTab === 'report' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* FILTER BAR & EXPORT EXCEL BUTTON */}
          <div className="report-filter-bar glass-panel">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="filter-item">
                <label><i className="fa-solid fa-calendar-days"></i> Tháng:</label>
                <select
                  value={reportFilter.month}
                  onChange={e => setReportFilter({ ...reportFilter, month: parseInt(e.target.value) })}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label><i className="fa-solid fa-clock"></i> Năm:</label>
                <select
                  value={reportFilter.year}
                  onChange={e => setReportFilter({ ...reportFilter, year: parseInt(e.target.value) })}
                >
                  {[2025, 2026, 2027, 2028].map(y => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label><i className="fa-solid fa-filter"></i> Phân loại:</label>
                <select
                  value={reportFilter.category}
                  onChange={e => setReportFilter({ ...reportFilter, category: e.target.value })}
                >
                  <option value="ALL">-- Tất cả danh mục --</option>
                  <option value="Tặng phẩm">🎁 Tặng phẩm (Quà Marketing)</option>
                  <option value="Giáo trình">📚 Giáo trình học</option>
                  <option value="Vật phẩm bán">🛍️ Vật phẩm bán</option>
                  <option value="Dụng cụ nội bộ">🏢 Dụng cụ nội bộ</option>
                </select>
              </div>

              <button className="btn btn-secondary" onClick={fetchReport} style={{ height: '38px', marginTop: 'auto' }}>
                <i className="fa-solid fa-arrows-rotate"></i> Xem Báo Cáo
              </button>
            </div>

            <div>
              <button
                className="btn"
                onClick={exportNxtExcel}
                style={{ background: '#107c41', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                title="Tải bảng tính Excel chuẩn định dạng kế toán"
              >
                <i className="fa-solid fa-file-excel"></i> Xuất Báo Cáo Excel (.xlsx)
              </button>
            </div>
          </div>

          {reportLoading ? (
            <div className="loading-state" style={{ padding: '3rem' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
              <p>Đang tổng hợp số liệu Xuất - Nhập - Tồn & Phân tích chi phí Marketing...</p>
            </div>
          ) : !reportData ? (
            <div className="empty-state" style={{ padding: '3rem', textAlign: 'center' }}>
              <i className="fa-solid fa-chart-line" style={{ fontSize: '3rem', color: '#94a3b8' }}></i>
              <p style={{ marginTop: '1rem', color: '#64748b' }}>Vui lòng chọn thời gian để tải dữ liệu báo cáo.</p>
            </div>
          ) : (
            <>
              {/* 4 EXECUTIVE KPI CARDS FOR MARKETING & INVENTORY */}
              <div className="dashboard-grid">
                <div className="stat-card" style={{ borderLeft: '4px solid #e11d48' }}>
                  <div className="stat-icon" style={{ background: '#ffe4e6', color: '#e11d48' }}>
                    <i className="fa-solid fa-gift"></i>
                  </div>
                  <div className="stat-info">
                    <h3>Chi phí Quà Tặng Marketing</h3>
                    <p className="stat-value" style={{ color: '#e11d48', fontSize: '1.5rem' }}>
                      {formatVND(reportData.kpis.totalGiftCost)}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Đã tặng: <strong>{reportData.kpis.totalGiftQuantity}</strong> món quà
                    </span>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #0284c7' }}>
                  <div className="stat-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}>
                    <i className="fa-solid fa-user-plus"></i>
                  </div>
                  <div className="stat-info">
                    <h3>Chi phí Quà / Học viên mới (CAC)</h3>
                    <p className="stat-value" style={{ color: '#0284c7', fontSize: '1.5rem' }}>
                      {formatVND(reportData.kpis.cacGift)}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      HV mới trong tháng: <strong>{reportData.kpis.newStudentsCount}</strong> bạn
                    </span>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #059669' }}>
                  <div className="stat-icon" style={{ background: '#d1fae5', color: '#059669' }}>
                    <i className="fa-solid fa-vault"></i>
                  </div>
                  <div className="stat-info">
                    <h3>Giá trị Tồn Kho cuối kỳ</h3>
                    <p className="stat-value" style={{ color: '#059669', fontSize: '1.5rem' }}>
                      {formatVND(reportData.kpis.totalInventoryValue)}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Đầu kỳ: {formatVND(reportData.kpis.totalOpeningValue)}
                    </span>
                  </div>
                </div>

                <div className="stat-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                  <div className="stat-icon" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                    <i className="fa-solid fa-bullhorn"></i>
                  </div>
                  <div className="stat-info">
                    <h3>Chiến dịch Marketing</h3>
                    <p className="stat-value" style={{ color: '#7c3aed', fontSize: '1.5rem' }}>
                      {reportData.kpis.totalCampaigns}
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                      Thu bán vật tư: <strong>{formatVND(reportData.kpis.totalSoldRevenue)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION A: BẢNG CHI TIẾT XUẤT NHẬP TỒN */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e293b', margin: 0 }}>
                      <i className="fa-solid fa-table-list" style={{ color: 'var(--color-primary)' }}></i> Bảng Tổng Hợp Xuất - Nhập - Tồn (Tháng {reportFilter.month}/{reportFilter.year})
                    </h2>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      Theo dõi dòng luân chuyển hàng hóa và xác định chi phí quà tặng tiếp thị thực tế.
                    </p>
                  </div>
                </div>

                <div className="table-responsive" style={{ overflowX: 'auto' }}>
                  <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th rowSpan="2" style={{ textAlign: 'center', width: '40px' }}>STT</th>
                        <th rowSpan="2">Mã VT</th>
                        <th rowSpan="2">Tên Vật Tư</th>
                        <th rowSpan="2" style={{ textAlign: 'center' }}>ĐVT</th>
                        <th rowSpan="2" style={{ textAlign: 'right' }}>Giá Vốn (đ)</th>
                        <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(59, 130, 246, 0.08)' }}>TỒN ĐẦU KỲ</th>
                        <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.08)' }}>NHẬP TRONG KỲ</th>
                        <th colSpan="3" style={{ textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)' }}>XUẤT TRONG KỲ</th>
                        <th rowSpan="2" style={{ textAlign: 'right', background: '#ffe4e6', color: '#e11d48' }}>Chi Phí Tặng Phẩm (đ)</th>
                        <th colSpan="2" style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.06)' }}>TỒN CUỐI KỲ</th>
                      </tr>
                      <tr>
                        <th style={{ textAlign: 'center', background: 'rgba(59, 130, 246, 0.04)' }}>SL</th>
                        <th style={{ textAlign: 'right', background: 'rgba(59, 130, 246, 0.04)' }}>Trị Giá (đ)</th>
                        <th style={{ textAlign: 'center', background: 'rgba(16, 185, 129, 0.04)' }}>SL</th>
                        <th style={{ textAlign: 'right', background: 'rgba(16, 185, 129, 0.04)' }}>Trị Giá (đ)</th>
                        <th style={{ textAlign: 'center', background: 'rgba(239, 68, 68, 0.04)' }}>Tổng</th>
                        <th style={{ textAlign: 'center', background: '#ffe4e6', color: '#e11d48' }}>Tặng</th>
                        <th style={{ textAlign: 'center', background: 'rgba(239, 68, 68, 0.04)' }}>Bán</th>
                        <th style={{ textAlign: 'center', background: 'rgba(15, 23, 42, 0.03)' }}>SL</th>
                        <th style={{ textAlign: 'right', background: 'rgba(15, 23, 42, 0.03)' }}>Trị Giá (đ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.nxtTable.map((row, idx) => (
                        <tr key={row.id} className="table-row">
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                          <td><code>{row.id}</code></td>
                          <td style={{ fontWeight: '600' }}>
                            {row.name}
                            {row.category === 'Tặng phẩm' && (
                              <span style={{ marginLeft: '4px', fontSize: '0.65rem', padding: '1px 4px', background: '#ffe4e6', color: '#e11d48', borderRadius: '3px' }}>
                                Quà
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', color: '#64748b' }}>{row.unit}</td>
                          <td style={{ textAlign: 'right', color: '#0f766e', fontWeight: '500' }}>{formatVND(row.unitCost)}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.openingStock}</td>
                          <td style={{ textAlign: 'right', color: '#475569' }}>{formatVND(row.openingValue)}</td>
                          <td style={{ textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>
                            {row.inQty > 0 ? `+${row.inQty}` : '0'}
                          </td>
                          <td style={{ textAlign: 'right', color: '#059669' }}>{formatVND(row.inValue)}</td>
                          <td style={{ textAlign: 'center', color: '#e11d48', fontWeight: 'bold' }}>
                            {row.outQty > 0 ? `-${row.outQty}` : '0'}
                          </td>
                          <td style={{ textAlign: 'center', color: '#e11d48', fontWeight: '800', background: '#fff1f2' }}>
                            {row.xuatTang > 0 ? row.xuatTang : '-'}
                          </td>
                          <td style={{ textAlign: 'center', color: '#0284c7' }}>
                            {row.xuatBan > 0 ? row.xuatBan : '-'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: '#e11d48', background: '#fff1f2' }}>
                            {row.giftCost > 0 ? formatVND(row.giftCost) : '-'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: '800', color: row.closingStock === 0 ? '#ef4444' : '#0f172a' }}>
                            {row.closingStock}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                            {formatVND(row.closingValue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f8fafc', fontWeight: '800', borderTop: '2px solid #cbd5e1' }}>
                        <td colSpan="5" style={{ textAlign: 'center', color: '#0f172a' }}>
                          TỔNG CỘNG TOÀN KHO
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {reportData.nxtTable.reduce((s, r) => s + r.openingStock, 0)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#0f172a' }}>
                          {formatVND(reportData.kpis.totalOpeningValue)}
                        </td>
                        <td style={{ textAlign: 'center', color: '#10b981' }}>
                          +{reportData.nxtTable.reduce((s, r) => s + r.inQty, 0)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#059669' }}>
                          {formatVND(reportData.kpis.totalInValue)}
                        </td>
                        <td style={{ textAlign: 'center', color: '#e11d48' }}>
                          -{reportData.nxtTable.reduce((s, r) => s + r.outQty, 0)}
                        </td>
                        <td style={{ textAlign: 'center', color: '#e11d48', background: '#ffe4e6' }}>
                          {reportData.kpis.totalGiftQuantity}
                        </td>
                        <td style={{ textAlign: 'center', color: '#0284c7' }}>
                          {reportData.nxtTable.reduce((s, r) => s + r.xuatBan, 0)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#e11d48', background: '#ffe4e6', fontSize: '0.9rem' }}>
                          {formatVND(reportData.kpis.totalGiftCost)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {reportData.nxtTable.reduce((s, r) => s + r.closingStock, 0)}
                        </td>
                        <td style={{ textAlign: 'right', color: '#0f172a', fontSize: '0.9rem' }}>
                          {formatVND(reportData.kpis.totalInventoryValue)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* SECTION B: PHÂN BỔ CHI PHÍ MARKETING THEO CHIẾN DỊCH */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fa-solid fa-bullseye" style={{ color: '#e11d48' }}></i> Chi Phí Quà Tặng Theo Chiến Dịch / Sự Kiện
                  </h3>

                  {reportData.campaigns.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      <i className="fa-solid fa-box-open" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></i>
                      <p>Chưa có phiếu xuất quà tặng nào trong tháng này.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                        <thead>
                          <tr>
                            <th>Tên Chiến Dịch / Sự Kiện</th>
                            <th style={{ textAlign: 'center' }}>Số Lượng Tặng</th>
                            <th>Chi Tiết Tặng Phẩm</th>
                            <th style={{ textAlign: 'center' }}>Học Viên Nhận</th>
                            <th style={{ textAlign: 'right' }}>Tổng Chi Phí</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.campaigns.map((camp, idx) => (
                            <tr key={idx} className="table-row">
                              <td style={{ fontWeight: '700', color: '#1e293b' }}>
                                <i className="fa-solid fa-tag" style={{ color: '#f43f5e', marginRight: '6px' }}></i>
                                {camp.campaignName}
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: '800', color: '#e11d48' }}>
                                {camp.totalQuantity} món
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {camp.items.map((it, i) => (
                                    <span key={i} style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                      {it.name}: <strong>{it.quantity}</strong> {it.unit}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: '600' }}>
                                {camp.recipientsCount} người
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: '800', color: '#e11d48' }}>
                                {formatVND(camp.totalCost)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* SECTION C: NHẬT KÝ XUẤT QUÀ GẦN NHẤT */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <i className="fa-solid fa-clock-rotate-left" style={{ color: 'var(--color-primary)' }}></i> Nhật Ký Xuất Tặng Gần Nhất
                  </h3>

                  {reportData.recentGiftLogs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      <p>Chưa có giao dịch phát quà nào gần đây.</p>
                    </div>
                  ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {reportData.recentGiftLogs.map(log => (
                        <div key={log.id} style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>{log.recipient}</strong>
                              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>({log.receiptCode})</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                              🎁 {log.inventoryName} <span style={{ color: '#e11d48', fontWeight: 'bold' }}>x{log.quantity}</span> | {log.campaignName}
                            </div>
                            {log.notes && (
                              <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>
                                &quot;{log.notes}&quot;
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: '800', color: '#e11d48', fontSize: '0.85rem' }}>
                              {formatVND(log.totalCost)}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              {new Date(log.createdAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ITEM FORM (THÊM / SỬA VẬT TƯ & GIÁ VỐN)                 */}
      {/* ============================================================== */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content animated-scale" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h2>{currentItem ? 'Chỉnh Sửa Vật Tư & Giá Vốn' : 'Thêm Mã Vật Tư Mới'}</h2>
              <button className="btn-close" onClick={() => setShowItemModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form className="modal-body" onSubmit={saveItem}>
              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Mã (ID) Vật Tư: <span className="text-error">*</span></label>
                  <input
                    type="text"
                    value={itemForm.id}
                    onChange={e => setItemForm({ ...itemForm, id: e.target.value })}
                    placeholder="VD: BALO_01, AOTHUN_01, GT_FF1"
                    disabled={!!currentItem}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Đơn vị tính (ĐVT):</label>
                  <input
                    type="text"
                    value={itemForm.unit}
                    onChange={e => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="VD: Cái, Bộ, Cuốn..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Tên Vật Tư / Tặng Phẩm: <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={e => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="VD: Balo Nhật Mỹ cao cấp, Áo thun học viên, Sách SuperKids 1"
                  required
                />
              </div>

              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Danh Mục:</label>
                  <select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })}>
                    <option value="Tặng phẩm">🎁 Tặng phẩm (Quà Marketing)</option>
                    <option value="Giáo trình">📚 Giáo trình</option>
                    <option value="Vật phẩm bán">🛍️ Vật phẩm bán</option>
                    <option value="Dụng cụ nội bộ">🏢 Dụng cụ nội bộ</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Mức cảnh báo tồn:</label>
                  <input
                    type="number"
                    min="0"
                    value={itemForm.threshold}
                    onChange={e => setItemForm({ ...itemForm, threshold: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Đơn Giá Vốn Nhập (VND):</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={itemForm.unitCost}
                    onChange={e => setItemForm({ ...itemForm, unitCost: e.target.value })}
                    placeholder="VD: 50000"
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Dùng tính giá trị tồn kho & chi phí quà tặng.
                  </small>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Đơn Giá Bán Niêm Yết (VND):</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={itemForm.unitPrice}
                    onChange={e => setItemForm({ ...itemForm, unitPrice: e.target.value })}
                    placeholder="VD: 120000"
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Để 0đ nếu chỉ dùng để tặng miễn phí.
                  </small>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-save"></i> Lưu Vật Tư</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: TRANSACTION (PHIẾU NHẬP / XUẤT / TẶNG MARKETING)         */}
      {/* ============================================================== */}
      {showTransModal && (
        <div className="modal-overlay">
          <div className="modal-content animated-scale" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h2>
                <i className={`fa-solid ${transForm.actionType === 'NHAP' ? 'fa-arrow-down' : (transForm.type === 'XUAT_TANG' ? 'fa-gift' : 'fa-arrow-up')}`} style={{ color: transForm.actionType === 'NHAP' ? '#10b981' : '#e11d48' }}></i>{' '}
                {transForm.actionType === 'NHAP' ? 'Lập Phiếu Nhập Kho' : (transForm.type === 'XUAT_TANG' ? 'Lập Phiếu Xuất Tặng Quà Marketing' : 'Lập Phiếu Xuất Kho')}
              </h2>
              <button className="btn-close" onClick={() => setShowTransModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form className="modal-body" onSubmit={submitTransaction}>
              
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Chọn Vật Tư giao dịch: <span className="text-error">*</span></label>
                <select 
                  value={transForm.inventoryId} 
                  onChange={e => handleTransItemChange(e.target.value)}
                  required
                >
                  <option value="">-- Chọn vật tư trong kho --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.id}) - Tồn: {item.currentStock} {item.unit || 'Cái'} | Giá vốn: {formatVND(item.unitCost)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Loại Phiếu:</label>
                  <select value={transForm.type} onChange={e => setTransForm({ ...transForm, type: e.target.value })}>
                    {transForm.actionType === 'NHAP' && (
                      <optgroup label="PHIẾU NHẬP">
                        <option value="NHAP_MOI">Nhập Hàng Mới</option>
                        <option value="NHAP_TRA">Nhập Trả (Trả lại kho)</option>
                      </optgroup>
                    )}
                    {transForm.actionType === 'XUAT' && (
                      <optgroup label="PHIẾU XUẤT">
                        <option value="XUAT_TANG">🎁 Xuất Cấp Phát / Tặng Học Viên</option>
                        <option value="XUAT_BAN">🛍️ Xuất Bán Thu Tiền</option>
                        <option value="XUAT_MUON">Xuất Mượn Dạy Học</option>
                        <option value="XUAT_HONG">Xuất Tiêu Hủy / Hỏng Hóc</option>
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ width: '130px' }}>
                  <label>Số lượng: <span className="text-error">*</span></label>
                  <input
                    type="number"
                    min="1"
                    value={transForm.quantity}
                    onChange={e => setTransForm({ ...transForm, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* GIÁ VỐN & CHIẾN DỊCH MARKETING */}
              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>
                    {transForm.actionType === 'NHAP' ? 'Đơn giá nhập vào (VND):' : 'Đơn giá vốn xuất (VND):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={transForm.unitCost}
                    onChange={e => setTransForm({ ...transForm, unitCost: e.target.value })}
                    placeholder="VD: 50000"
                  />
                  <small style={{ color: '#64748b', fontSize: '0.72rem' }}>
                    Thành tiền vốn: <strong>{formatVND((parseFloat(transForm.unitCost) || 0) * (parseInt(transForm.quantity) || 0))}</strong>
                  </small>
                </div>

                <div className="form-group" style={{ flex: 1.2 }}>
                  <label>Chiến dịch / Sự kiện Marketing:</label>
                  <input
                    type="text"
                    value={transForm.campaignName}
                    onChange={e => setTransForm({ ...transForm, campaignName: e.target.value })}
                    placeholder="VD: Tuyển sinh Tháng 11, Ghi danh mới, Mini Game..."
                  />
                </div>
              </div>

              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Đối tượng Nhận / Giao:</label>
                  <select value={transForm.targetType} onChange={e => setTransForm({ ...transForm, targetType: e.target.value })}>
                    <option value="STUDENT">Học viên</option>
                    <option value="TEACHER">Giáo viên</option>
                    <option value="STAFF">Nhân viên</option>
                    <option value="SUPPLIER">Nhà cung cấp</option>
                    <option value="SYSTEM">Hệ thống / Sự kiện khác</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1.5 }}>
                  <label>Tên Người / Đơn vị:</label>
                  <input
                    type="text"
                    value={transForm.targetName}
                    onChange={e => setTransForm({ ...transForm, targetName: e.target.value })}
                    placeholder="VD: Nguyễn Văn A, Phụ huynh em Vy..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú Phiếu:</label>
                <textarea
                  rows="2"
                  value={transForm.notes}
                  onChange={e => setTransForm({ ...transForm, notes: e.target.value })}
                  placeholder="VD: Tặng quà nhập học khóa M1, Khen thưởng học sinh giỏi..."
                  className="detail-text-input"
                ></textarea>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransModal(false)}>Hủy</button>
                <button
                  type="submit"
                  className="btn"
                  style={{
                    background: transForm.actionType === 'NHAP' ? 'var(--color-success)' : '#e11d48',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                >
                  <i className="fa-solid fa-file-invoice"></i> {transForm.actionType === 'NHAP' ? 'Xác Nhận Nhập Kho' : 'Xác Nhận Xuất Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: HISTORY TIMELINE                                         */}
      {/* ============================================================== */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content slide-over-panel">
            <div className="modal-header">
              <h2>Lịch Sử Giao Dịch Kho: {historyItem?.name}</h2>
              <button className="btn-close" onClick={() => setShowHistoryModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="modal-body" style={{ padding: '0', overflowY: 'auto' }}>
              {historyLoading ? (
                <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải lịch sử...</p></div>
              ) : historyLogs.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                  <i className="fa-solid fa-folder-open" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
                  <p>Chưa có giao dịch nào cho vật tư này.</p>
                </div>
              ) : (
                <ul className="timeline-list" style={{ padding: '1.5rem' }}>
                  {historyLogs.map(log => {
                    const isImport = log.quantity > 0;
                    const logCost = (log.unitCost > 0 ? log.unitCost : (log.inventory?.unitCost || 0));
                    return (
                      <li key={log.id} className="timeline-item">
                        <div className="timeline-marker" style={{ background: isImport ? 'var(--color-success)' : '#e11d48' }}>
                          <i className={`fa-solid ${isImport ? 'fa-arrow-down' : (log.type === 'XUAT_TANG' ? 'fa-gift' : 'fa-arrow-up')}`}></i>
                        </div>
                        <div className="timeline-content glass-panel" style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                            <strong style={{ color: isImport ? 'var(--color-success)' : '#e11d48' }}>
                              {log.type === 'XUAT_TANG' ? '🎁 XUẤT TẶNG' : log.type} {log.quantity > 0 ? `+${log.quantity}` : log.quantity} {log.inventory?.unit || 'Cái'}
                            </strong>
                            <span className="text-sm text-gray">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}><strong>Phiếu:</strong> <code>{log.receiptCode}</code></p>
                          {(log.targetName || log.student?.name) && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem' }}>
                              <strong>Đối tượng:</strong> [{log.targetType}] {log.targetName || log.student?.name}
                            </p>
                          )}
                          {log.campaignName && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#e11d48', fontWeight: 'bold' }}>
                              <i className="fa-solid fa-bullseye"></i> {log.campaignName}
                            </p>
                          )}
                          {logCost > 0 && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#0f766e' }}>
                              <strong>Trị giá:</strong> {formatVND(Math.abs(log.quantity) * logCost)} ({formatVND(logCost)}/đv)
                            </p>
                          )}
                          {log.notes && <p style={{ margin: '0', fontSize: '0.8rem', color: '#64748b' }}><em>Lý do: {log.notes}</em></p>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STYLES */}
      <style>{`
        .page-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .page-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .page-header-actions h1 {
          font-size: 1.7rem;
          font-weight: 800;
          color: var(--color-text);
          margin: 0;
        }
        .page-header-actions p {
          color: var(--color-text-muted);
          font-size: 0.9rem;
          margin: 4px 0 0 0;
        }

        /* Tab navigation */
        .tab-navigation {
          display: flex;
          gap: 0.5rem;
          border-bottom: 2px solid var(--color-border);
          padding-bottom: 2px;
        }
        .tab-btn {
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 3px solid transparent;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--color-text-muted);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          color: var(--color-primary);
        }
        .tab-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
          background: rgba(13, 136, 196, 0.05);
          border-radius: 6px 6px 0 0;
        }

        /* Report filter bar */
        .report-filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          gap: 1rem;
          flex-wrap: wrap;
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .filter-item label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--color-text-muted);
        }
        .filter-item select {
          padding: 0.5rem 0.8rem;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          font-weight: 600;
          font-size: 0.85rem;
        }

        /* Dashboard Grid & Stat Cards */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        .stat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 1.25rem;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: var(--shadow-sm);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.35rem;
          flex-shrink: 0;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-info h3 {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--color-text-muted);
          margin: 0 0 0.25rem 0;
        }
        .stat-info .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--color-text);
          line-height: 1.1;
          margin: 0;
        }

        /* Table container and Table */
        .table-container {
          padding: 0;
          overflow-x: auto;
          border-radius: 12px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .custom-table th {
          background-color: rgba(13, 136, 196, 0.05);
          color: var(--color-text);
          font-weight: 700;
          padding: 0.85rem;
          font-size: 0.82rem;
          border-bottom: 2px solid var(--color-border);
          border-right: 1px solid var(--color-border);
        }
        .custom-table td {
          padding: 0.85rem;
          font-size: 0.82rem;
          border-bottom: 1px solid var(--color-border);
          border-right: 1px solid var(--color-border);
          color: var(--color-text);
          vertical-align: middle;
        }
        .custom-table th:last-child, .custom-table td:last-child {
          border-right: none;
        }
        .table-row {
          transition: background-color var(--transition-fast);
        }
        .table-row:hover {
          background-color: rgba(13, 136, 196, 0.02);
        }

        /* Modals & Forms */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 95%;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--color-surface);
          padding: 2rem;
          border-radius: 16px;
          box-shadow: var(--shadow-lg);
          border: var(--glass-border);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 0.75rem;
        }
        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 0;
        }
        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--color-text-muted);
          line-height: 1;
        }
        .btn-close:hover {
          color: var(--color-danger);
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text);
        }
        .form-group input, .form-group select, .form-group textarea {
          padding: 0.6rem 0.8rem;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: inherit;
          font-size: 0.9rem;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(13, 136, 196, 0.15);
        }
        .form-group-horizontal {
          display: flex;
          gap: 1rem;
        }
        @media (max-width: 600px) {
          .form-group-horizontal {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--color-border);
          padding-top: 1.25rem;
        }

        /* Slide-over panel specifics */
        .slide-over-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 460px;
          border-radius: 0;
          animation: slideInRight 0.3s ease-out;
          height: 100vh;
          display: flex;
          flex-direction: column;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .timeline-list {
          list-style: none;
          margin: 0;
          position: relative;
        }
        .timeline-list::before {
          content: '';
          position: absolute;
          left: 1.5rem;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e2e8f0;
          transform: translateX(11px);
        }
        .timeline-item {
          position: relative;
          padding-left: 3.5rem;
          margin-bottom: 1.25rem;
        }
        .timeline-marker {
          position: absolute;
          left: 1.5rem;
          top: 0;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          z-index: 1;
        }

        /* Action buttons in Table */
        .action-buttons {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }
        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
          transition: all var(--transition-fast);
          padding: 0;
        }
        .btn-icon:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
          background: var(--color-bg);
          border-color: var(--color-primary-light);
        }
        .btn-icon.text-error {
          color: var(--color-danger);
        }
        .btn-icon.text-error:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: var(--color-danger);
        }
      `}</style>
    </div>
  );
}
