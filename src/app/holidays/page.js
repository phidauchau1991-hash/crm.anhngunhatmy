'use client';

import { useState, useEffect } from 'react';

export default function HolidaysPage() {
  const [holidays, setHolidays] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    startDateStr: '',
    endDateStr: '',
    scope: 'GLOBAL',
    targetId: '',
  });
  const [holidayToDelete, setHolidayToDelete] = useState(null);

  const fetchHolidays = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/holidays');
      const result = await res.json();
      if (result.success) {
        setHolidays(result.data);
      }
    } catch (e) {
      console.error('Lỗi khi tải ngày nghỉ:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const result = await res.json();
      if (result.success) {
        setClasses(result.data);
      }
    } catch (e) {
      console.error('Lỗi khi tải lớp học:', e);
    }
  };

  useEffect(() => {
    fetchHolidays();
    fetchClasses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      // Reset targetId if changing scope to GLOBAL
      ...(name === 'scope' && value === 'GLOBAL' ? { targetId: '' } : {}),
      ...(name === 'scope' && value !== 'GLOBAL' && prev.scope === 'GLOBAL' ? { targetId: value === 'SHIFT' ? '24' : classes[0]?.code || '' } : {}),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    if (formData.scope !== 'GLOBAL' && !formData.targetId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn đối tượng áp dụng cho ngày nghỉ.' });
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const result = await res.json();

      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Thêm ngày nghỉ thành công!' });
        setFormData({
          name: '',
          startDateStr: '',
          endDateStr: '',
          scope: 'GLOBAL',
          targetId: '',
        });
        fetchHolidays();
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteHoliday = async () => {
    if (!holidayToDelete) return;
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`/api/holidays?id=${holidayToDelete.id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Xóa ngày nghỉ thành công!' });
        setHolidayToDelete(null);
        fetchHolidays();
      } else {
        setMessage({ type: 'error', text: result.error || 'Lỗi khi xóa ngày nghỉ.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    }
  };

  return (
    <div className="holidays-container" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--color-primary-dark)' }}>
            <i className="fa-solid fa-calendar-minus"></i> Quản lý Ngày nghỉ (Holidays)
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            Thiết lập lịch nghỉ toàn trung tâm, ca học hoặc lớp học. Hệ thống tự động tịnh tiến ngày kết thúc của lớp.
          </p>
        </div>
      </div>

      {message.text && (
        <div className={`alert-box alert-${message.type}`} style={{ margin: '0' }}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        
        {/* FORM THÊM NGÀY NGHỈ */}
        <div className="glass-panel" style={{ padding: '1.5rem', alignSelf: 'start' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-plus-circle"></i> Thêm ngày nghỉ lễ
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            <div className="form-group">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Lý do nghỉ / Tên ngày lễ *</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleInputChange} 
                required 
                placeholder="Ví dụ: Nghỉ Tết Nguyên Đán, Giỗ Tổ..." 
                className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:border-blue-500 bg-white text-gray-900"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Từ ngày *</label>
                <input 
                  type="date" 
                  name="startDateStr" 
                  value={formData.startDateStr} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:border-blue-500 bg-white text-gray-900"
                />
              </div>
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Đến ngày *</label>
                <input 
                  type="date" 
                  name="endDateStr" 
                  value={formData.endDateStr} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:border-blue-500 bg-white text-gray-900"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Phạm vi áp dụng (Scope)</label>
              <select 
                name="scope" 
                value={formData.scope} 
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:border-blue-500 bg-white text-gray-900"
              >
                <option value="GLOBAL">Toàn trung tâm (GLOBAL)</option>
                <option value="SHIFT">Theo ca / Lịch học tuần (SHIFT)</option>
                <option value="CLASS">Theo lớp học cụ thể (CLASS)</option>
              </select>
            </div>

            {formData.scope === 'SHIFT' && (
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chọn ca học (Lịch học tuần) *</label>
                <select 
                  name="targetId" 
                  value={formData.targetId} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:border-blue-500 bg-white text-gray-900"
                >
                  <option value="24">Thứ 2 & 4 (24)</option>
                  <option value="35">Thứ 3 & 5 (35)</option>
                  <option value="7CN">Thứ 7 & Chủ Nhật (7CN)</option>
                  <option value="246">Thứ 2, 4, 6 (246)</option>
                  <option value="357">Thứ 3, 5, 7 (357)</option>
                </select>
              </div>
            )}

            {formData.scope === 'CLASS' && (
              <div className="form-group">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Chọn lớp học *</label>
                <select 
                  name="targetId" 
                  value={formData.targetId} 
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring focus:border-blue-500 bg-white text-gray-900"
                >
                  {classes.map((cls) => (
                    <option key={cls.code} value={cls.code}>{cls.code}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              type="submit" 
              className="btn btn-primary w-full mt-2" 
              disabled={submitting} 
              style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', padding: '0.75rem' }}
            >
              {submitting ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Đang xử lý...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-calendar-check"></i> Xác nhận ngày nghỉ
                </>
              )}
            </button>
          </form>
        </div>

        {/* DANH SÁCH NGÀY NGHỈ LỄ */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-list-check"></i> Danh sách ngày nghỉ đã thiết lập
          </h2>

          {loading ? (
            <div className="loading-state">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Đang tải danh sách ngày nghỉ...</p>
            </div>
          ) : holidays.length === 0 ? (
            <div className="empty-table-state" style={{ padding: '3rem 1.5rem' }}>
              <i className="fa-regular fa-calendar-xmark" style={{ fontSize: '2.5rem', color: 'var(--color-text-muted)' }}></i>
              <p style={{ marginTop: '0.75rem' }}>Chưa có thiết lập ngày nghỉ nào.</p>
            </div>
          ) : (
            <table className="custom-table" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th>Tên ngày nghỉ</th>
                  <th>Từ ngày</th>
                  <th>Đến ngày</th>
                  <th>Phạm vi</th>
                  <th>Đối tượng áp dụng</th>
                  <th style={{ textAlign: 'center' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {holidays.map((h) => (
                  <tr key={h.id} className="table-row">
                    <td style={{ fontWeight: 'bold' }}>{h.name}</td>
                    <td>{new Date(h.startDate).toLocaleDateString('vi-VN')}</td>
                    <td>{new Date(h.endDate).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <span className={`status-badge-profile ${
                        h.scope === 'GLOBAL' ? 'bg-danger-light' :
                        h.scope === 'SHIFT' ? 'bg-warning-light' : 'bg-info-light'
                      }`} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                        {h.scope}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {h.scope === 'GLOBAL' ? 'Tất cả lớp' : h.targetId}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => setHolidayToDelete(h)} 
                        className="action-btn delete-btn" 
                        title="Xóa ngày nghỉ"
                        style={{ background: 'transparent', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                      >
                        <i className="fa-regular fa-trash-can" style={{ fontSize: '1.05rem' }}></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* MODAL: DELETE HOLIDAY CONFIRMATION */}
      {holidayToDelete && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '440px', width: '90%', textAlign: 'center' }}>
            <div className="modal-header" style={{ borderBottom: 'none', justifyContent: 'center' }}>
              <h2 style={{ color: 'var(--color-danger)', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Xác nhận xóa ngày nghỉ
              </h2>
            </div>
            <div className="modal-body" style={{ padding: '1rem 0' }}>
              <p>Bạn có chắc chắn muốn xóa ngày nghỉ <strong>{holidayToDelete.name}</strong> không?</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                Lịch học của các lớp bị ảnh hưởng sẽ tự động được hệ thống tịnh tiến cập nhật lại.
              </p>
            </div>
            <div className="modal-actions" style={{ justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setHolidayToDelete(null)}>Hủy</button>
              <button type="button" className="btn" style={{ background: 'var(--color-danger)', color: '#fff' }} onClick={confirmDeleteHoliday}>
                <i className="fa-regular fa-trash-can"></i> Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Local CSS mimicking Tailwind properties with premium style overrides */}
      <style>{`
        .form-group {
          display: flex;
          flex-direction: column;
          margin-bottom: 0.5rem;
        }
        .block {
          display: block;
        }
        .text-sm {
          font-size: 0.825rem;
        }
        .font-semibold {
          font-weight: 700;
        }
        .text-gray-700 {
          color: var(--color-text);
        }
        .mb-1 {
          margin-bottom: 0.35rem;
        }
        .w-full {
          width: 100%;
        }
        .p-3 {
          padding: 0.65rem 0.85rem;
        }
        .border {
          border: 1px solid var(--color-border);
        }
        .border-gray-300 {
          border-color: var(--color-border);
        }
        .rounded-md {
          border-radius: 6px;
        }
        .bg-white {
          background-color: var(--color-bg);
        }
        .text-gray-900 {
          color: var(--color-text);
        }
        .flex {
          display: flex;
        }
        .flex-col {
          flex-direction: column;
        }
        .gap-4 {
          gap: 1rem;
        }
        .mt-2 {
          margin-top: 0.5rem;
        }
        
        /* Focus ring emulation */
        .focus\\:ring:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px rgba(13, 136, 196, 0.18);
        }
      `}</style>

    </div>
  );
}
