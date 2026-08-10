'use client';

import { useState, useEffect } from 'react';

export default function ConfigsPage() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState('courses'); // 'courses' or 'alerts'

  // Alert Config State
  const [alertConfig, setAlertConfig] = useState({
    consecutiveAbsences: 2,
    totalAbsencesLimit: 5,
    missingWbLimit: 2,
    missingVideoLimit: 2,
    copyErrorLimit: 2,
  });
  const [savingAlerts, setSavingAlerts] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [currentConfig, setCurrentConfig] = useState(null);
  const [form, setForm] = useState({
    program: 'THIẾU NHI',
    capDo: 'STARTERS',
    level: '',
    price: '',
    totalSessions: '32',
    bookName: '',
    bookPrice: '0',
  });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const [resCourses, resAlerts] = await Promise.all([
        fetch('/api/course-configs'),
        fetch('/api/configs/alerts')
      ]);
      const jsonCourses = await resCourses.json();
      if (jsonCourses.success) {
        setConfigs(jsonCourses.data);
      }
      const jsonAlerts = await resAlerts.json();
      if (jsonAlerts.success && jsonAlerts.data) {
        setAlertConfig(jsonAlerts.data);
      }
    } catch (error) {
      console.error('Không thể tải cấu hình:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const [isCustomCapDo, setIsCustomCapDo] = useState(false);

  const getCapDoOptions = (prog) => {
    const defaultMap = {
      'THIẾU NHI': ['STARTERS', 'MOVERS', 'FLYERS'],
      'THIẾU NIÊN': ['KET', 'PET', 'Học kèm'],
      'KHÁC': ['Học kèm', 'Giao tiếp', 'Khác']
    };
    const existing = configs
      .filter(c => c.program === prog && c.capDo)
      .map(c => c.capDo);
    return Array.from(new Set([...(defaultMap[prog] || ['STARTERS']), ...existing]));
  };

  const openConfigModal = (config = null) => {
    setMessage({ type: '', text: '' });
    setIsCustomCapDo(false);
    if (config) {
      setCurrentConfig(config);
      setForm({
        program: config.program || 'THIẾU NHI',
        capDo: config.capDo || 'STARTERS',
        level: config.level || '',
        price: config.price ? config.price.toLocaleString('vi-VN') : '',
        totalSessions: config.totalSessions ? config.totalSessions.toString() : '32',
        bookName: config.bookName || '',
        bookPrice: config.bookPrice ? config.bookPrice.toLocaleString('vi-VN') : '0',
      });
    } else {
      setCurrentConfig(null);
      setForm({
        program: 'THIẾU NHI',
        capDo: 'STARTERS',
        level: '',
        price: '',
        totalSessions: '32',
        bookName: '',
        bookPrice: '0',
      });
    }
    setShowModal(true);
  };

  // Currency helper functions
  const formatNumber = (val) => {
    if (val === undefined || val === null || val === '') return '';
    const clean = val.toString().replace(/[^0-9]/g, '');
    if (clean === '') return '';
    return parseInt(clean).toLocaleString('vi-VN');
  };

  const parseNumber = (val) => {
    if (!val) return 0;
    const clean = val.toString().replace(/[^0-9]/g, '');
    return parseInt(clean) || 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'price' || name === 'bookPrice') {
      setForm(prev => ({ ...prev, [name]: formatNumber(value) }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    const payload = {
      ...form,
      price: parseNumber(form.price),
      totalSessions: parseInt(form.totalSessions) || 32,
      bookPrice: parseNumber(form.bookPrice),
    };

    try {
      const res = await fetch('/api/course-configs', {
        method: currentConfig ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentConfig ? { ...payload, id: currentConfig.id } : payload),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message });
        setShowModal(false);
        fetchConfigs();
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  const deleteConfig = async (id) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cấu hình khóa học này?')) return;
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`/api/course-configs?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message });
        fetchConfigs();
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    }
  };

  const filteredConfigs = configs.filter(cfg => 
    cfg.level.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cfg.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cfg.capDo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cfg.bookName && cfg.bookName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const saveAlertConfig = async (e) => {
    e.preventDefault();
    setSavingAlerts(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/configs/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertConfig),
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: json.message });
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối máy chủ.' });
    } finally {
      setSavingAlerts(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header-actions" style={{ marginBottom: '1rem' }}>
        <div>
          <h1><i className="fa-solid fa-gears"></i> Cấu hình Hệ thống</h1>
          <p>Thiết lập thông số khóa học, giáo trình và cảnh báo thông minh.</p>
        </div>
        {activeTab === 'courses' && (
          <button className="btn btn-primary" onClick={() => openConfigModal()}>
            <i className="fa-solid fa-plus"></i> Thêm Cấu Hình
          </button>
        )}
      </div>

      <div className="tabs-container" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', borderBottom: '2px solid var(--color-border)' }}>
        <button 
          className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('courses'); setMessage({ type: '', text: '' }); }}
          style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold', borderBottom: activeTab === 'courses' ? '3px solid var(--color-primary)' : '3px solid transparent', color: activeTab === 'courses' ? 'var(--color-primary)' : 'var(--color-text-muted)', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <i className="fa-solid fa-book"></i> Khóa học & Giáo trình
        </button>
        <button 
          className={`tab-button ${activeTab === 'alerts' ? 'active' : ''}`} 
          onClick={() => { setActiveTab('alerts'); setMessage({ type: '', text: '' }); }}
          style={{ padding: '0.75rem 1.5rem', fontWeight: 'bold', borderBottom: activeTab === 'alerts' ? '3px solid var(--color-primary)' : '3px solid transparent', color: activeTab === 'alerts' ? 'var(--color-primary)' : 'var(--color-text-muted)', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          <i className="fa-solid fa-bell"></i> Ngưỡng Cảnh báo
        </button>
      </div>

      {message.text && (
        <div className={`alert-box alert-${message.type} animated-scale`}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      {activeTab === 'courses' ? (
        <>
          {/* SEARCH AND FILTERS */}
          <div className="toolbar-panel glass-panel">
            <div className="search-box">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input 
                type="text" 
                placeholder="Tìm theo độ tuổi, cấp độ, khóa học, giáo trình..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* CONFIGS TABLE */}
          <div className="table-container glass-panel">
            {loading ? (
              <div className="loading-state"><i className="fa-solid fa-spinner fa-spin"></i><p>Đang tải dữ liệu cấu hình...</p></div>
            ) : filteredConfigs.length === 0 ? (
              <div className="empty-table-state">
                <i className="fa-solid fa-gears"></i>
                <p>Không có cấu hình khóa học nào phù hợp.</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Độ tuổi (DO_TUOI)</th>
                    <th>Cấp độ (CAP_DO)</th>
                    <th>Khóa học (KHOA_HOC)</th>
                    <th>Học phí (HOC_PHI)</th>
                    <th style={{ textAlign: 'center' }}>Số buổi (SO_BUOI_HOC)</th>
                    <th>Giáo trình (GIAO_TRINH)</th>
                    <th style={{ textAlign: 'right' }}>Giá giáo trình (GIA_GIAO_TRINH)</th>
                    <th style={{ textAlign: 'center' }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredConfigs.map(cfg => (
                    <tr key={cfg.id} className="table-row">
                      <td style={{ fontWeight: '600' }}>{cfg.program}</td>
                      <td style={{ fontWeight: '700', color: 'var(--color-primary-dark)' }}>{cfg.capDo}</td>
                      <td className="std-name" style={{ fontWeight: '700' }}>
                        <span className="badge-class">{cfg.level}</span>
                      </td>
                      <td style={{ fontWeight: 'bold' }}>{cfg.price.toLocaleString('vi-VN')}đ</td>
                      <td style={{ textAlign: 'center', fontWeight: '600' }}>{cfg.totalSessions} buổi</td>
                      <td>{cfg.bookName || 'Chưa thiết lập'}</td>
                      <td style={{ textAlign: 'right' }}>
                        {cfg.bookPrice ? `${cfg.bookPrice.toLocaleString('vi-VN')}đ` : '0đ'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons">
                          <button className="action-btn edit-btn" title="Chỉnh sửa" onClick={() => openConfigModal(cfg)}>
                            <i className="fa-regular fa-pen-to-square"></i>
                          </button>
                          <button className="action-btn edit-btn" style={{ color: 'var(--color-danger)' }} title="Xóa" onClick={() => deleteConfig(cfg.id)}>
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className="glass-panel" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--color-text)' }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ color: 'var(--color-warning)' }}></i> Ngưỡng Cảnh Báo Thông Minh
          </h2>
          <form onSubmit={saveAlertConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--color-primary-dark)' }}>Cảnh báo Chuyên cần</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label>Số buổi NGHỈ LIÊN TIẾP báo động:</label>
                  <input type="number" min="1" value={alertConfig.consecutiveAbsences} onChange={e => setAlertConfig({...alertConfig, consecutiveAbsences: e.target.value})} className="detail-text-input" style={{ width: '100%' }} />
                  <small style={{ color: 'var(--color-text-muted)' }}>VD: 2 (Nghỉ 2 buổi liên tiếp sẽ bị cảnh báo đỏ)</small>
                </div>
                <div className="form-group">
                  <label>Tổng số buổi vắng TRONG KHÓA:</label>
                  <input type="number" min="1" value={alertConfig.totalAbsencesLimit} onChange={e => setAlertConfig({...alertConfig, totalAbsencesLimit: e.target.value})} className="detail-text-input" style={{ width: '100%' }} />
                  <small style={{ color: 'var(--color-text-muted)' }}>VD: 5 (Quá 5 buổi nghỉ sẽ cảnh báo)</small>
                </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: '#d97706' }}>Cảnh báo Bài tập về nhà</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group">
                  <label>Thiếu Workbook (số lần LIÊN TIẾP):</label>
                  <input type="number" min="1" value={alertConfig.missingWbLimit} onChange={e => setAlertConfig({...alertConfig, missingWbLimit: e.target.value})} className="detail-text-input" style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label>Thiếu Video (số lần LIÊN TIẾP):</label>
                  <input type="number" min="1" value={alertConfig.missingVideoLimit} onChange={e => setAlertConfig({...alertConfig, missingVideoLimit: e.target.value})} className="detail-text-input" style={{ width: '100%' }} />
                </div>
                <div className="form-group">
                  <label>Lỗi Copy (số lần LIÊN TIẾP):</label>
                  <input type="number" min="1" value={alertConfig.copyErrorLimit} onChange={e => setAlertConfig({...alertConfig, copyErrorLimit: e.target.value})} className="detail-text-input" style={{ width: '100%' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={savingAlerts}>
                {savingAlerts ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>} Lưu Ngưỡng Cảnh Báo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE/EDIT CONFIG */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{currentConfig ? 'Chỉnh sửa Cấu hình Khóa Học' : 'Thêm Cấu hình Khóa Học Mới'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form className="modal-body modal-form" onSubmit={saveConfig}>
              <div className="form-grid-3">
                <div className="form-group">
                  <label>Độ tuổi (DO_TUOI) *</label>
                  <select 
                    name="program" 
                    value={form.program} 
                    onChange={(e) => {
                      const newProg = e.target.value;
                      const opts = getCapDoOptions(newProg);
                      setIsCustomCapDo(false);
                      setForm(prev => ({
                        ...prev,
                        program: newProg,
                        capDo: opts[0] || 'STARTERS'
                      }));
                    }}
                  >
                    <option value="THIẾU NHI">THIẾU NHI</option>
                    <option value="THIẾU NIÊN">THIẾU NIÊN</option>
                    <option value="KHÁC">KHÁC</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cấp độ (CAP_DO) *</label>
                  {!isCustomCapDo ? (
                    <select 
                      name="capDo" 
                      value={form.capDo} 
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCustomCapDo(true);
                          setForm(prev => ({ ...prev, capDo: '' }));
                        } else {
                          setForm(prev => ({ ...prev, capDo: e.target.value }));
                        }
                      }}
                    >
                      {getCapDoOptions(form.program).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                      <option value="__NEW__">+ Thêm cấp độ mới...</option>
                    </select>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <input 
                        type="text" 
                        name="capDo" 
                        value={form.capDo} 
                        onChange={handleInputChange} 
                        required 
                        placeholder="Nhập cấp độ..." 
                        autoFocus
                      />
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        style={{ padding: '0 0.5rem', fontSize: '0.8rem' }}
                        onClick={() => {
                          setIsCustomCapDo(false);
                          const opts = getCapDoOptions(form.program);
                          setForm(prev => ({ ...prev, capDo: opts[0] || 'STARTERS' }));
                        }}
                        title="Chọn từ danh sách"
                      >
                        <i className="fa-solid fa-list"></i>
                      </button>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Khóa học (KHOA_HOC) *</label>
                  <input 
                    type="text" 
                    name="level" 
                    value={form.level} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="S1, S2, KET 1, Lớp 9..." 
                    disabled={!!currentConfig}
                  />
                </div>
              </div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label>Học phí khóa học (VND) *</label>
                  <input 
                    type="text" 
                    name="price" 
                    value={form.price} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Ví dụ: 3.150.000"
                  />
                </div>
                <div className="form-group">
                  <label>Số buổi học của khóa *</label>
                  <input 
                    type="number" 
                    name="totalSessions" 
                    value={form.totalSessions} 
                    onChange={handleInputChange} 
                    required 
                    placeholder="Ví dụ: 32"
                    min="1"
                  />
                </div>
              </div>

              <div className="form-section" style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--color-border)', paddingTop: '1rem' }}>
                <h3>Thông tin Giáo trình kèm theo</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Tên giáo trình (GIAO_TRINH)</label>
                    <input 
                      type="text" 
                      name="bookName" 
                      value={form.bookName} 
                      onChange={handleInputChange} 
                      placeholder="Ví dụ: BEEHIVE STARTERS"
                    />
                  </div>
                  <div className="form-group">
                    <label>Giá giáo trình gốc (VND)</label>
                    <input 
                      type="text" 
                      name="bookPrice" 
                      value={form.bookPrice} 
                      onChange={handleInputChange} 
                      placeholder="Ví dụ: 250.000"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary"><i className="fa-solid fa-save"></i> Lưu cấu hình</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
