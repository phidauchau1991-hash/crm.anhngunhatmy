'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState({ total: 0, newLeads: 0, inProgress: 0, converted: 0, lost: 0 });
  const [classList, setClassList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [toastMessage, setToastMessage] = useState('');

  // AI Zalo Modal State
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [zaloLoading, setZaloLoading] = useState(false);
  const [zaloText, setZaloText] = useState('');
  const [zaloLead, setZaloLead] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);
  const [leadToDelete, setLeadToDelete] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    dob: '',
    email: '',
    address: '',
    painPoints: '',
    goals: '',
    status: 'Mới',
    trialClassCode: '',
    trialStartDate: '',
    followUpDate: '',
    followUpNote: '',
    salesRep: '',
    notes: '',
  });

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leads?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
        setStats(json.stats);
      }
    } catch (error) {
      console.error('Không thể tải danh sách Leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassesList = async () => {
    try {
      const res = await fetch('/api/classes');
      const json = await res.json();
      if (json.success) {
        setClassList(json.data || []);
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách lớp:', error);
    }
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchLeads();
    fetchClassesList();
  }, [searchTerm, statusFilter]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const openLeadModal = (lead = null) => {
    if (lead) {
      setCurrentLead(lead);
      setForm({
        name: lead.name || '',
        phone: lead.phone || '',
        dob: lead.dob ? lead.dob.substring(0, 10) : '',
        email: lead.email || '',
        address: lead.address || '',
        painPoints: lead.painPoints || '',
        goals: lead.goals || '',
        status: lead.status || 'Mới',
        trialClassCode: lead.trialClassCode || '',
        trialStartDate: lead.trialStartDate ? lead.trialStartDate.substring(0, 10) : '',
        followUpDate: lead.followUpDate ? lead.followUpDate.substring(0, 10) : '',
        followUpNote: lead.followUpNote || '',
        salesRep: lead.salesRep || '',
        notes: lead.notes || '',
      });
    } else {
      setCurrentLead(null);
      setForm({
        name: '',
        phone: '',
        dob: '',
        email: '',
        address: '',
        painPoints: '',
        goals: '',
        status: 'Mới',
        trialClassCode: '',
        trialStartDate: '',
        followUpDate: '',
        followUpNote: '',
        salesRep: '',
        notes: '',
      });
    }
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const saveLead = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/leads', {
        method: currentLead ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentLead ? { ...form, id: currentLead.id } : form),
      });
      const json = await res.json();
      if (json.success) {
        const isNewLead = !currentLead;
        const savedLeadData = json.data || { ...form, id: currentLead?.id };
        setMessage({ type: 'success', text: json.message });
        setShowModal(false);
        fetchLeads();
        // Mở Popup AI Zalo sau khi lưu thành công!
        triggerAIZaloMessage(savedLeadData, isNewLead);
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return;
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`/api/leads?id=${leadToDelete.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Xóa khách hàng tiềm năng thành công!' });
        setLeadToDelete(null);
        fetchLeads();
      } else {
        setMessage({ type: 'error', text: json.error || 'Lỗi khi xóa khách hàng.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  const getFollowUpStatus = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fDate = new Date(dateStr);
    fDate.setHours(0, 0, 0, 0);
    const diffTime = fDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return { type: 'urgent', text: diffDays === 0 ? 'Hôm nay' : `Quá hạn ${Math.abs(diffDays)} ngày`, days: diffDays };
    if (diffDays <= 2) return { type: 'warning', text: `Còn ${diffDays} ngày`, days: diffDays };
    return { type: 'normal', text: `Còn ${diffDays} ngày`, days: diffDays };
  };

  const urgentCount = leads.filter(l => getFollowUpStatus(l.followUpDate)?.type === 'urgent').length;
  const warningCount = leads.filter(l => getFollowUpStatus(l.followUpDate)?.type === 'warning').length;

  const triggerAIZaloMessage = async (leadData, isNewLead) => {
    setZaloLead(leadData);
    setShowZaloModal(true);
    setZaloLoading(true);
    setZaloText('');
    try {
      const res = await fetch('/api/ai/zalo-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...leadData, isNew: isNewLead })
      });
      const json = await res.json();
      if (json.success) {
        setZaloText(json.data);
      } else {
        setZaloText('Không thể tạo tin nhắn AI: ' + (json.error || 'Lỗi không xác định'));
      }
    } catch (err) {
      setZaloText('Lỗi kết nối khi gọi AI DeepSeek.');
    } finally {
      setZaloLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(zaloText);
    setToastMessage('Đã sao chép tin nhắn vào bộ nhớ tạm! Mở Zalo và dán ngay.');
    setTimeout(() => setToastMessage(''), 4000);
  };

  const filteredLeads = leads.filter(lead => {
    if (alertFilter === 'urgent') return getFollowUpStatus(lead.followUpDate)?.type === 'urgent';
    if (alertFilter === 'warning') return getFollowUpStatus(lead.followUpDate)?.type === 'warning';
    return true;
  });

  // Convert success rate
  const conversionRate = stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(0) : 0;

  return (
    <div className="page-container">
      <div className="page-header-actions">
        <div>
          <h1><i className="fa-solid fa-people-group"></i> Khách Hàng Tiềm Năng (Leads CRM)</h1>
          <p>Thu thập và chăm sóc học viên tiềm năng trước khi ghi danh xếp lớp.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openLeadModal()}>
          <i className="fa-solid fa-plus"></i> Thêm Khách Hàng
        </button>
      </div>

      {message.text && (
        <div className={`alert-box alert-${message.type} animated-scale`}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* DASHBOARD STATS & ALERTS */}
      <div className="dashboard-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
            <i className="fa-solid fa-user-tag"></i>
          </div>
          <div className="stat-info">
            <h3>Tổng Lead</h3>
            <p className="stat-value">{stats.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)' }}>
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div className="stat-info">
            <h3>Đang chăm sóc / Tư vấn</h3>
            <p className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.inProgress}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)' }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div className="stat-info">
            <h3>Tỷ lệ chốt thành công</h3>
            <p className="stat-value" style={{ color: 'var(--color-success)' }}>{conversionRate}% ({stats.converted} chốt)</p>
          </div>
        </div>
        <div 
          className="stat-card animated-scale" 
          style={{ cursor: 'pointer', background: alertFilter === 'urgent' ? '#fef2f2' : 'var(--color-surface)', border: alertFilter === 'urgent' ? '2px solid #ef4444' : '1px solid var(--color-border)', transition: 'all 0.2s' }}
          onClick={() => setAlertFilter(alertFilter === 'urgent' ? 'all' : 'urgent')}
          title="Bấm để lọc các khách hàng cần gọi gấp hôm nay hoặc quá hạn"
        >
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            <i className="fa-solid fa-bell fa-shake"></i>
          </div>
          <div className="stat-info">
            <h3 style={{ color: '#ef4444', fontWeight: 'bold' }}>🚨 Cần gọi gấp</h3>
            <p className="stat-value" style={{ color: '#ef4444' }}>{urgentCount}</p>
          </div>
        </div>
        <div 
          className="stat-card animated-scale" 
          style={{ cursor: 'pointer', background: alertFilter === 'warning' ? '#fffbeb' : 'var(--color-surface)', border: alertFilter === 'warning' ? '2px solid #f59e0b' : '1px solid var(--color-border)', transition: 'all 0.2s' }}
          onClick={() => setAlertFilter(alertFilter === 'warning' ? 'all' : 'warning')}
          title="Bấm để lọc các khách hàng hẹn gọi trong 1-2 ngày tới"
        >
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <i className="fa-solid fa-clock"></i>
          </div>
          <div className="stat-info">
            <h3 style={{ color: '#d97706', fontWeight: 'bold' }}>⏰ Sắp đến lịch</h3>
            <p className="stat-value" style={{ color: '#d97706' }}>{warningCount}</p>
          </div>
        </div>
      </div>

      {/* FILTERS */}
      <div className="toolbar-panel glass-panel">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Tìm theo tên, số điện thoại, email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label><i className="fa-solid fa-filter"></i> Trạng thái:</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="Mới">Mới nhận</option>
            <option value="Đang tư vấn">Đang tư vấn</option>
            <option value="Học thử">Học thử</option>
            <option value="Đã chốt">Đã chốt (Học viên)</option>
            <option value="Trượt">Trượt / Không tiềm năng</option>
          </select>
        </div>
      </div>

      {/* LEADS TABLE */}
      <div className="table-container glass-panel">
        {loading ? (
          <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải danh sách KHTN...</p></div>
        ) : leads.length === 0 ? (
          <div className="empty-table-state">
            <i className="fa-solid fa-users-slash"></i>
            <p>Không có khách hàng tiềm năng nào phù hợp.</p>
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Họ và Tên</th>
                <th>Điện thoại</th>
                <th>Trạng thái</th>
                <th>Nhân viên phụ trách</th>
                <th>Ngày chăm sóc cuối</th>
                <th>📅 Lịch hẹn gọi lại</th>
                <th>Vấn đề gặp phải / Mục tiêu</th>
                <th style={{ textAlign: 'center' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => {
                const badgeColor = 
                  lead.status === 'Đã chốt' ? 'bg-success-light' : 
                  lead.status === 'Trượt' ? 'bg-danger-light' : 
                  lead.status === 'Mới' ? 'bg-info-light' : 'bg-warning-light';

                const followUpStatus = getFollowUpStatus(lead.followUpDate);
                const rowBg = 
                  followUpStatus?.type === 'urgent' ? '#fef2f2' :
                  followUpStatus?.type === 'warning' ? '#fffbeb' : 'transparent';

                return (
                  <tr key={lead.id} className="table-row" style={{ backgroundColor: rowBg }}>
                    <td className="std-name" style={{ fontWeight: '700' }}>{lead.name}</td>
                    <td>{lead.phone || 'N/A'}</td>
                    <td>
                      <span className={`status-badge-profile ${badgeColor}`}>
                        {lead.status}
                      </span>
                      {lead.status === 'Học thử' && lead.trialClassCode && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-dark)', marginTop: '0.25rem', fontWeight: '600' }}>
                          <i className="fa-solid fa-graduation-cap"></i> {lead.trialClassCode}
                          {lead.trialStartDate && <><br /><span>từ {new Date(lead.trialStartDate).toLocaleDateString('vi-VN')}</span></>}
                        </div>
                      )}
                    </td>
                    <td>{lead.salesRep || 'Chưa phân bổ'}</td>
                    <td>{lead.lastContacted ? new Date(lead.lastContacted).toLocaleDateString('vi-VN') : 'N/A'}</td>
                    <td>
                      {lead.followUpDate ? (
                        <div>
                          <div style={{ fontWeight: '700', color: '#1e293b' }}>
                            <i className="fa-regular fa-calendar-check"></i> {new Date(lead.followUpDate).toLocaleDateString('vi-VN')}
                          </div>
                          {followUpStatus?.type === 'urgent' && (
                            <div className="animated-pulse" style={{ background: '#ef4444', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', display: 'inline-block', boxShadow: '0 2px 4px rgba(239,68,68,0.3)' }}>
                              🚨 {followUpStatus.text}
                            </div>
                          )}
                          {followUpStatus?.type === 'warning' && (
                            <div style={{ background: '#fffbeb', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginTop: '4px', display: 'inline-block', border: '1px solid #fbbf24' }}>
                              ⏰ {followUpStatus.text}
                            </div>
                          )}
                          {followUpStatus?.type === 'normal' && (
                            <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                              {followUpStatus.text}
                            </div>
                          )}
                          {lead.followUpNote && (
                            <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                              &quot;{lead.followUpNote}&quot;
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Chưa hẹn</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <strong>Vấn đề:</strong> {lead.painPoints || 'Chưa rõ'} <br />
                      <strong>Mục tiêu:</strong> {lead.goals || 'Chưa rõ'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div className="action-buttons">
                        <button 
                          className="action-btn" 
                          style={{ color: '#0068ff', background: '#f0f9ff', border: '1px solid #bae6fd', padding: '2px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '4px' }} 
                          title="Soạn tin Zalo với AI" 
                          onClick={() => triggerAIZaloMessage(lead, false)}
                        >
                          🤖 Zalo AI
                        </button>
                        {lead.status === 'Đã chốt' && (
                          <Link 
                            href={`/students?convertName=${encodeURIComponent(lead.name)}&convertPhone=${encodeURIComponent(lead.phone || '')}&convertDob=${encodeURIComponent(lead.dob ? lead.dob.substring(0,10) : '')}&convertAddress=${encodeURIComponent(lead.address || '')}&convertLeadId=${lead.id}&convertTrialClass=${encodeURIComponent(lead.trialClassCode || '')}`} 
                            className="action-btn view-btn"
                            style={{ display: 'inline-flex', padding: '0 0.5rem', width: 'auto', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 'bold' }}
                            title="Chuyển thành Học Viên"
                          >
                            <i className="fa-solid fa-user-graduate"></i> Ghi danh
                          </Link>
                        )}
                        <button className="action-btn edit-btn" title="Chăm sóc / Sửa" onClick={() => openLeadModal(lead)}>
                          <i className="fa-regular fa-pen-to-square"></i>
                        </button>
                        <button className="action-btn edit-btn" style={{ color: 'var(--color-danger)' }} title="Xóa" onClick={() => setLeadToDelete(lead)}>
                          <i className="fa-regular fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL: CREATE/EDIT LEAD */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '1100px', width: '95%', maxHeight: '92vh', overflowY: 'auto', overflowX: 'hidden', padding: '1.5rem 2rem' }}>
            <div className="modal-header">
              <h2>{currentLead ? 'Cập nhật chăm sóc Lead' : 'Thêm Khách Hàng Tiềm Năng mới'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form className="modal-body modal-form" onSubmit={saveLead}>
              <div className="form-grid">
                <div className="form-section">
                  <h3>Thông tin liên hệ</h3>
                  <div className="form-group">
                    <label>Họ và Tên *</label>
                    <input type="text" name="name" value={form.name} onChange={handleInputChange} required placeholder="Họ và tên" />
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Số điện thoại</label>
                      <input type="text" name="phone" value={form.phone} onChange={handleInputChange} placeholder="Số điện thoại" />
                    </div>
                    <div className="form-group">
                      <label>Ngày sinh</label>
                      <input type="date" name="dob" value={form.dob} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleInputChange} placeholder="Email liên hệ" />
                  </div>
                  <div className="form-group">
                    <label>Địa chỉ</label>
                    <input type="text" name="address" value={form.address} onChange={handleInputChange} placeholder="Địa chỉ thường trú" />
                  </div>
                </div>

                <div className="form-section">
                  <h3>Nghiệp vụ tư vấn & Sale</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Trạng thái chăm sóc</label>
                      <select name="status" value={form.status} onChange={handleInputChange}>
                        <option value="Mới">Mới nhận</option>
                        <option value="Đang tư vấn">Đang tư vấn</option>
                        <option value="Học thử">Cho học thử</option>
                        <option value="Đã chốt">Đã chốt (Ghi danh)</option>
                        <option value="Trượt">Trượt / Không tiềm năng</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Nhân viên phụ trách</label>
                      <input type="text" name="salesRep" value={form.salesRep} onChange={handleInputChange} placeholder="Tên Sale phụ trách" />
                    </div>
                  </div>

                  {form.status === 'Học thử' && (
                    <div className="trial-class-box animated-scale" style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px dashed var(--color-warning)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-warning)', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-solid fa-graduation-cap"></i> Thiết lập Lớp học thử
                      </h4>
                      <div className="form-grid-2">
                        <div className="form-group">
                          <label>Chọn Lớp học thử *</label>
                          <select name="trialClassCode" value={form.trialClassCode} onChange={handleInputChange} required={form.status === 'Học thử'}>
                            <option value="">-- Chọn lớp cho học thử --</option>
                            {classList.map(cls => (
                              <option key={cls.code} value={cls.code}>{cls.code} ({cls.teacherName || 'Chưa phân công'} - {cls.schedule})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Bắt đầu học từ ngày *</label>
                          <input type="date" name="trialStartDate" value={form.trialStartDate} onChange={handleInputChange} required={form.status === 'Học thử'} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Vấn đề học viên gặp phải (Pain Points)</label>
                    <input type="text" name="painPoints" value={form.painPoints} onChange={handleInputChange} placeholder="VD: Mất gốc tiếng Anh, Ngại giao tiếp..." />
                  </div>
                  <div className="form-group">
                    <label>Mục tiêu mong muốn (Goals)</label>
                    <input type="text" name="goals" value={form.goals} onChange={handleInputChange} placeholder="VD: Thi Starters 15 khiên, giao tiếp tự tin..." />
                  </div>

                  <div className="follow-up-box" style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '0.75rem 1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <i className="fa-regular fa-calendar-check" style={{ color: '#0D88C4' }}></i> Thiết lập Lịch hẹn liên lạc lại
                    </h4>
                    <div className="form-grid-2">
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>📅 Ngày hẹn liên lạc lại</label>
                        <input type="date" name="followUpDate" value={form.followUpDate || ''} onChange={handleInputChange} />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.8rem' }}>Nội dung / Lý do hẹn gọi</label>
                        <input type="text" name="followUpNote" value={form.followUpNote || ''} onChange={handleInputChange} placeholder="VD: Hỏi cảm nhận học thử, báo ưu đãi..." />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label>Nhật ký cuộc gọi & ghi chú</label>
                <textarea name="notes" rows="3" value={form.notes} onChange={handleInputChange} placeholder="Ghi nhận nhật ký tư vấn chi tiết..." className="detail-text-input" style={{ height: 'auto' }}></textarea>
              </div>

              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-save"></i> Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AI ZALO MESSAGE POPUP */}
      {showZaloModal && zaloLead && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '650px', width: '95%', padding: '1.5rem 2rem', borderTop: '4px solid #0068ff' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0068ff', fontSize: '1.3rem', margin: 0 }}>
                <i className="fa-solid fa-comment-dots"></i> ✨ Tin Nhắn Zalo Chăm Sóc (AI Soạn Tự Động)
              </h2>
              <button className="close-btn" onClick={() => setShowZaloModal(false)}>&times;</button>
            </div>
            
            <div className="modal-body" style={{ padding: '1rem 0' }}>
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', color: '#0369a1' }}>
                <strong>👤 Học viên:</strong> {zaloLead.name} {zaloLead.phone ? `(${zaloLead.phone})` : ''} <br />
                <strong>💡 Trạng thái:</strong> {zaloLead.status} | <strong>Nhân viên:</strong> {zaloLead.salesRep || 'Chuyên viên tư vấn'}
              </div>

              {zaloLoading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#0068ff', marginBottom: '1rem' }}></i>
                  <p style={{ fontWeight: '700', color: '#334155', margin: 0 }}>🤖 DeepSeek R1 đang phân tích nhật ký & soạn tin nhắn Zalo...</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.4rem' }}>Vui lòng đợi trong giây lát...</p>
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontWeight: '700', color: '#334155', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    📝 Kịch bản Zalo cá nhân hóa (Bạn có thể chỉnh sửa tự do trước khi gửi):
                  </label>
                  <textarea 
                    rows="8" 
                    value={zaloText} 
                    onChange={(e) => setZaloText(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', lineHeight: '1.5', fontFamily: 'inherit', resize: 'vertical' }}
                  ></textarea>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => triggerAIZaloMessage(zaloLead, !zaloLead.id)}
                disabled={zaloLoading}
                title="Yêu cầu AI soạn lại phiên bản khác"
              >
                <i className="fa-solid fa-rotate"></i> Soạn lại với AI
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowZaloModal(false)}>
                  Đóng
                </button>
                {zaloLead.phone && (
                  <a 
                    href={`https://zalo.me/${zaloLead.phone.replace(/\D/g, '')}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn" 
                    style={{ background: '#0068ff', color: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square"></i> Mở Zalo App
                  </a>
                )}
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  style={{ background: '#10b981', borderColor: '#10b981' }} 
                  onClick={copyToClipboard}
                  disabled={zaloLoading || !zaloText}
                >
                  <i className="fa-regular fa-copy"></i> Sao chép tin nhắn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {leadToDelete && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '420px', width: '90%', textAlign: 'center' }}>
            <div className="modal-header" style={{ borderBottom: 'none', justifyContent: 'center' }}>
              <h2 style={{ color: 'var(--color-danger)', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Xác nhận xóa
              </h2>
            </div>
            <div className="modal-body" style={{ padding: '1rem 0' }}>
              <p>Bạn có chắc chắn muốn xóa khách hàng tiềm năng <strong>{leadToDelete.name}</strong> không?</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Hành động này không thể hoàn tác.</p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setLeadToDelete(null)}>Hủy</button>
              <button type="button" className="btn" style={{ background: 'var(--color-danger)', color: '#fff' }} onClick={confirmDeleteLead}>
                <i className="fa-regular fa-trash-can"></i> Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="animated-scale" style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: '#fff', padding: '14px 22px', borderRadius: '10px', boxShadow: '0 6px 16px rgba(0,0,0,0.2)', zIndex: 9999, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
          <i className="fa-solid fa-circle-check" style={{ fontSize: '1.2rem' }}></i> {toastMessage}
        </div>
      )}

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
