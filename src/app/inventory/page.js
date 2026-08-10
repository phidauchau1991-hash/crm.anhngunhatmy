'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ totalItems: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Modals state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Form states
  const [currentItem, setCurrentItem] = useState(null); // For edit
  const [itemForm, setItemForm] = useState({ id: '', name: '', category: 'Giáo trình', threshold: 5 });
  
  const [transForm, setTransForm] = useState({
    type: 'NHAP_MOI',
    targetType: 'SYSTEM',
    targetName: '',
    notes: '',
    inventoryId: '',
    quantity: 1,
  });

  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
      const json = await res.json();
      if (json.success) {
        setItems(json.data);
        setStats(json.stats);
      }
    } catch (error) {
      console.error('Lỗi khi tải kho:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  // ITEM MANAGEMENT
  const openItemModal = (item = null) => {
    if (item) {
      setCurrentItem(item);
      setItemForm({ id: item.id, name: item.name, category: item.category, threshold: item.threshold });
    } else {
      setCurrentItem(null);
      setItemForm({ id: '', name: '', category: 'Giáo trình', threshold: 5 });
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
        setMessage({ type: 'success', text: json.message });
        setShowItemModal(false);
        fetchInventory();
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
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert('Có lỗi xảy ra khi xóa vật tư');
    }
  };

  // TRANSACTION MANAGEMENT
  const openTransModal = (type, item) => {
    setTransForm({
      actionType: type.startsWith('NHAP') ? 'NHAP' : (type.startsWith('XUAT') ? 'XUAT' : 'KIEM_KE'),
      type,
      targetType: type.startsWith('NHAP') ? 'SUPPLIER' : 'STUDENT',
      targetName: '',
      notes: '',
      inventoryId: item.id,
      quantity: 1,
    });
    setShowTransModal(true);
  };

  const openGeneralTransModal = (type) => {
    setTransForm({
      actionType: type.startsWith('NHAP') ? 'NHAP' : (type.startsWith('XUAT') ? 'XUAT' : 'KIEM_KE'),
      type,
      targetType: type.startsWith('NHAP') ? 'SUPPLIER' : 'STUDENT',
      targetName: '',
      notes: '',
      inventoryId: '',
      quantity: 1,
    });
    setShowTransModal(true);
  };

  const submitTransaction = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        type: transForm.type,
        targetType: transForm.targetType,
        targetName: transForm.targetName,
        notes: transForm.notes,
        items: [{ inventoryId: transForm.inventoryId, quantity: parseInt(transForm.quantity) }]
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
      } else {
        alert(json.error);
      }
    } catch (err) {
      alert('Có lỗi xảy ra khi tạo phiếu');
    }
  };

  // HISTORY MANAGEMENT
  const viewHistory = async (item) => {
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

  return (
    <div className="page-container">
      <div className="page-header-actions">
        <div>
          <h1><i className="fa-solid fa-boxes-stacked"></i> Quản lý Kho (Inventory)</h1>
          <p>Kiểm soát vật tư, giáo trình và quà tặng. Lập phiếu xuất/nhập an toàn.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={() => openGeneralTransModal('NHAP_MOI')} style={{ color: 'white', background: 'var(--color-success)', cursor: 'pointer' }}>
            <i className="fa-solid fa-file-import"></i> Lập Phiếu Nhập
          </button>
          <button className="btn" onClick={() => openGeneralTransModal('XUAT_TANG')} style={{ color: 'white', background: 'var(--color-danger)', cursor: 'pointer' }}>
            <i className="fa-solid fa-file-export"></i> Lập Phiếu Xuất
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

      {/* DASHBOARD WIDGETS */}
      <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
            <i className="fa-solid fa-box-open"></i>
          </div>
          <div className="stat-info">
            <h3>Tổng loại vật tư</h3>
            <p className="stat-value">{stats.totalItems}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className="stat-info">
            <h3>Sắp hết hàng</h3>
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
                <th style={{ textAlign: 'center' }}>Tồn Kho</th>
                <th>Thao Tác Nhanh</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const isLow = item.currentStock > 0 && item.currentStock <= item.threshold;
                const isOut = item.currentStock === 0;
                return (
                  <tr key={item.id} className="table-row">
                    <td className="std-id" style={{ width: '120px' }}>{item.id}</td>
                    <td className="std-name" style={{ fontWeight: '600' }}>{item.name}</td>
                    <td><span className="status-badge" style={{ background: 'var(--color-bg-alt)' }}>{item.category}</span></td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                        <span className={`accumulated-badge ${isOut ? 'text-error' : isLow ? 'text-warning' : 'text-success'}`} style={{ fontSize: '1.2rem', padding: '0.4rem 1rem' }}>
                          {item.currentStock}
                        </span>
                        {(isLow || isOut) && (
                          <span style={{ fontSize: '0.75rem', color: isOut ? 'var(--color-error)' : 'var(--color-warning)', marginTop: '4px', fontWeight: 'bold' }}>
                            {isOut ? 'HẾT HÀNG' : `DƯỚI MỨC ${item.threshold}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon" title="Nhập hàng" onClick={() => openTransModal('NHAP_MOI', item)} style={{ color: 'var(--color-success)' }}><i className="fa-solid fa-arrow-right-to-bracket"></i></button>
                        <button className="btn-icon" title="Xuất kho" onClick={() => openTransModal('XUAT_TANG', item)} style={{ color: 'var(--color-error)' }}><i className="fa-solid fa-arrow-right-from-bracket"></i></button>
                        <button className="btn-icon" title="Lịch sử" onClick={() => viewHistory(item)} style={{ color: 'var(--color-primary)' }}><i className="fa-solid fa-clock-rotate-left"></i></button>
                        <button className="btn-icon" title="Sửa thông tin" onClick={() => openItemModal(item)}><i className="fa-solid fa-pen"></i></button>
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

      {/* MODAL: ITEM FORM */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content animated-scale" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{currentItem ? 'Chỉnh Sửa Vật Tư' : 'Thêm Mã Vật Tư Mới'}</h2>
              <button className="btn-close" onClick={() => setShowItemModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form className="modal-body" onSubmit={saveItem}>
              <div className="form-group">
                <label>Mã (ID) Vật Tư: <span className="text-error">*</span></label>
                <input type="text" value={itemForm.id} onChange={e => setItemForm({...itemForm, id: e.target.value})} placeholder="VD: BALO_01, GT_FF1" disabled={!!currentItem} required />
              </div>
              <div className="form-group">
                <label>Tên Vật Tư: <span className="text-error">*</span></label>
                <input type="text" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} placeholder="VD: Balo Nhật Mỹ, Sách Family & Friends 1" required />
              </div>
              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Danh Mục:</label>
                  <select value={itemForm.category} onChange={e => setItemForm({...itemForm, category: e.target.value})}>
                    <option value="Giáo trình">Giáo trình</option>
                    <option value="Tặng phẩm">Tặng phẩm (Balo, Áo)</option>
                    <option value="Vật phẩm bán">Vật phẩm bán</option>
                    <option value="Dụng cụ nội bộ">Dụng cụ nội bộ</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Mức cảnh báo tồn:</label>
                  <input type="number" min="0" value={itemForm.threshold} onChange={e => setItemForm({...itemForm, threshold: e.target.value})} />
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

      {/* MODAL: TRANSACTION (PHIẾU GIAO NHẬN) */}
      {showTransModal && (
        <div className="modal-overlay">
          <div className="modal-content animated-scale" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2><i className={`fa-solid ${transForm.actionType === 'NHAP' ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i> {transForm.actionType === 'NHAP' ? 'Lập Phiếu Nhập Kho' : 'Lập Phiếu Xuất Kho'}</h2>
              <button className="btn-close" onClick={() => setShowTransModal(false)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form className="modal-body" onSubmit={submitTransaction}>
              
              {transForm.inventoryId ? (
                <div className="info-panel" style={{ marginBottom: '1rem' }}>
                  <p><strong>Vật tư:</strong> {items.find(i => i.id === transForm.inventoryId)?.name} ({transForm.inventoryId})</p>
                  <p><strong>Tồn kho hiện tại:</strong> <span className="text-primary" style={{ fontWeight: 'bold' }}>{items.find(i => i.id === transForm.inventoryId)?.currentStock}</span></p>
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label>Chọn Vật Tư giao dịch: <span className="text-error">*</span></label>
                  <select 
                    value={transForm.inventoryId} 
                    onChange={e => setTransForm({...transForm, inventoryId: e.target.value})}
                    required
                  >
                    <option value="">-- Chọn vật tư trong kho --</option>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.id}) - Tồn: {item.currentStock}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Loại Phiếu:</label>
                  <select value={transForm.type} onChange={e => setTransForm({...transForm, type: e.target.value})}>
                    {transForm.actionType === 'NHAP' && (
                      <optgroup label="PHIẾU NHẬP">
                        <option value="NHAP_MOI">Nhập Hàng Mới</option>
                        <option value="NHAP_TRA">Nhập Trả (Trả lại kho)</option>
                      </optgroup>
                    )}
                    {transForm.actionType === 'XUAT' && (
                      <optgroup label="PHIẾU XUẤT">
                        <option value="XUAT_TANG">Xuất Cấp Phát / Tặng</option>
                        <option value="XUAT_MUON">Xuất Mượn</option>
                        <option value="XUAT_BAN">Xuất Bán</option>
                        <option value="XUAT_HONG">Xuất Tiêu Hủy / Hỏng hóc</option>
                      </optgroup>
                    )}
                  </select>
                </div>
                <div className="form-group" style={{ width: '120px' }}>
                  <label>Số lượng: <span className="text-error">*</span></label>
                  <input type="number" min="1" value={transForm.quantity} onChange={e => setTransForm({...transForm, quantity: e.target.value})} required />
                </div>
              </div>

              <div className="form-group-horizontal">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Đối tượng Nhận / Giao:</label>
                  <select value={transForm.targetType} onChange={e => setTransForm({...transForm, targetType: e.target.value})}>
                    <option value="STUDENT">Học viên</option>
                    <option value="TEACHER">Giáo viên</option>
                    <option value="STAFF">Nhân viên</option>
                    <option value="SUPPLIER">Nhà cung cấp</option>
                    <option value="SYSTEM">Hệ thống / Khác</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 2 }}>
                  <label>Tên Người / Đơn vị:</label>
                  <input type="text" value={transForm.targetName} onChange={e => setTransForm({...transForm, targetName: e.target.value})} placeholder="VD: Nguyễn Văn A, Giáo viên Mỹ" />
                </div>
              </div>

              <div className="form-group">
                <label>Ghi chú Phiếu:</label>
                <textarea rows="2" value={transForm.notes} onChange={e => setTransForm({...transForm, notes: e.target.value})} placeholder="VD: Tặng quà nhập học, Giáo viên mượn đồ dạy..." className="detail-text-input"></textarea>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransModal(false)}>Hủy</button>
                <button type="submit" className={`btn ${transForm.actionType === 'NHAP' ? 'btn-primary' : 'btn-error'}`}>
                  <i className="fa-solid fa-file-invoice"></i> {transForm.actionType === 'NHAP' ? 'Tạo Phiếu Nhập' : 'Tạo Phiếu Xuất'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: HISTORY */}
      {showHistoryModal && (
        <div className="modal-overlay">
          <div className="modal-content slide-over-panel">
            <div className="modal-header">
              <h2>Lịch sử Giao dịch Kho</h2>
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
                    return (
                      <li key={log.id} className="timeline-item">
                        <div className="timeline-marker" style={{ background: isImport ? 'var(--color-success)' : 'var(--color-error)' }}>
                          <i className={`fa-solid ${isImport ? 'fa-arrow-down' : 'fa-arrow-up'}`}></i>
                        </div>
                        <div className="timeline-content glass-panel" style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <strong style={{ color: isImport ? 'var(--color-success)' : 'var(--color-error)' }}>
                              {log.type} {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                            </strong>
                            <span className="text-sm text-gray">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                          </div>
                          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}><strong>Phiếu:</strong> {log.receiptCode}</p>
                          {(log.targetName || log.student?.name) && (
                            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>
                              <strong>Đối tượng:</strong> [{log.targetType}] {log.targetName || log.student?.name}
                            </p>
                          )}
                          {log.notes && <p style={{ margin: '0', fontSize: '0.9rem', color: '#64748b' }}><em>Lý do: {log.notes}</em></p>}
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

      <style>{`
        /* Page Layout & Header */
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

        /* Dashboard Grid & Stat Cards */
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }
        @media (max-width: 768px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
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
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--color-text);
          line-height: 1;
          margin: 0;
        }

        /* Table container and Table */
        .table-container {
          padding: 0;
          overflow: hidden;
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
          padding: 1rem;
          font-size: 0.85rem;
          border-bottom: 2px solid var(--color-border);
        }
        .custom-table td {
          padding: 1rem;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text);
          vertical-align: middle;
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
          gap: 1.5rem;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1rem;
          margin-bottom: 0.5rem;
        }
        .modal-header h2 {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
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
            gap: 0;
          }
        }
        .info-panel {
          background: rgba(13, 136, 196, 0.03);
          border: 1px solid rgba(13, 136, 196, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }
        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--color-border);
          padding-top: 1.5rem;
        }

        /* Slide-over panel specifics */
        .slide-over-panel {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          max-width: 450px;
          border-radius: 0;
          transform: translateX(0);
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
          margin-bottom: 1.5rem;
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
          gap: 0.65rem;
          align-items: center;
        }
        .btn-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1.1rem;
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
