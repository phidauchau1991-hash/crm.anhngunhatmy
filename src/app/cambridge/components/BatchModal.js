'use client';

import React, { useState, useEffect } from 'react';
import { CAMBRIDGE_CONFIG, DEFAULT_LEVELS_CONFIG, parseBatchLevels, ALL_CAMBRIDGE_LEVELS } from '@/lib/cambridgeHelper';

export default function BatchModal({ isOpen, onClose, batch, onSaved }) {
  const [formData, setFormData] = useState({
    title: '',
    examDate: '',
    registrationDeadline: '',
    closeHour: '17:00',
    hotline: CAMBRIDGE_CONFIG.HOTLINE_CHUAN,
    authorizedCenter: CAMBRIDGE_CONFIG.DON_VI_UY_QUYEN,
    companyName: CAMBRIDGE_CONFIG.TEN_CONG_TY,
    centerName: CAMBRIDGE_CONFIG.TEN_TRUNG_TAM,
    bankAccount: CAMBRIDGE_CONFIG.SO_TAI_KHOAN,
    bankAccountName: CAMBRIDGE_CONFIG.TEN_TAI_KHOAN_QR,
    bankName: CAMBRIDGE_CONFIG.NGAN_HANG,
    status: 'OPEN',
    notes: '',
    levelsConfig: { ...DEFAULT_LEVELS_CONFIG }
  });

  const [activeLevels, setActiveLevels] = useState([...ALL_CAMBRIDGE_LEVELS]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (batch) {
      const parsed = parseBatchLevels(batch.levelsConfig);
      setActiveLevels(parsed.activeLevels);

      setFormData({
        title: batch.title || '',
        examDate: batch.examDate ? new Date(batch.examDate).toISOString().slice(0, 10) : '',
        registrationDeadline: batch.registrationDeadline ? new Date(batch.registrationDeadline).toISOString().slice(0, 10) : '',
        closeHour: batch.closeHour || '17:00',
        hotline: batch.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN,
        authorizedCenter: batch.authorizedCenter || CAMBRIDGE_CONFIG.DON_VI_UY_QUYEN,
        companyName: batch.companyName || CAMBRIDGE_CONFIG.TEN_CONG_TY,
        centerName: batch.centerName || CAMBRIDGE_CONFIG.TEN_TRUNG_TAM,
        bankAccount: batch.bankAccount || CAMBRIDGE_CONFIG.SO_TAI_KHOAN,
        bankAccountName: batch.bankAccountName || CAMBRIDGE_CONFIG.TEN_TAI_KHOAN_QR,
        bankName: batch.bankName || CAMBRIDGE_CONFIG.NGAN_HANG,
        status: batch.status || 'OPEN',
        notes: batch.notes || '',
        levelsConfig: parsed.fees
      });
    } else {
      // Giá trị mặc định khi tạo mới
      const defaultExamDate = new Date();
      defaultExamDate.setMonth(defaultExamDate.getMonth() + 1);
      const defaultDeadline = new Date(defaultExamDate);
      defaultDeadline.setDate(defaultDeadline.getDate() - 10);

      setActiveLevels([...ALL_CAMBRIDGE_LEVELS]);
      setFormData({
        title: `Kỳ thi Cambridge Quốc tế Tháng ${defaultExamDate.getMonth() + 1}/${defaultExamDate.getFullYear()}`,
        examDate: defaultExamDate.toISOString().slice(0, 10),
        registrationDeadline: defaultDeadline.toISOString().slice(0, 10),
        closeHour: '17:00',
        hotline: CAMBRIDGE_CONFIG.HOTLINE_CHUAN,
        authorizedCenter: CAMBRIDGE_CONFIG.DON_VI_UY_QUYEN,
        companyName: CAMBRIDGE_CONFIG.TEN_CONG_TY,
        centerName: CAMBRIDGE_CONFIG.TEN_TRUNG_TAM,
        bankAccount: CAMBRIDGE_CONFIG.SO_TAI_KHOAN,
        bankAccountName: CAMBRIDGE_CONFIG.TEN_TAI_KHOAN_QR,
        bankName: CAMBRIDGE_CONFIG.NGAN_HANG,
        status: 'OPEN',
        notes: '',
        levelsConfig: { ...DEFAULT_LEVELS_CONFIG }
      });
    }
    setError('');
  }, [batch, isOpen]);

  if (!isOpen) return null;

  const handleToggleLevel = (lvl) => {
    setActiveLevels(prev => {
      if (prev.includes(lvl)) {
        if (prev.length <= 1) {
          setError('Đợt thi phải mở ít nhất 1 cấp độ!');
          return prev;
        }
        setError('');
        return prev.filter(k => k !== lvl);
      } else {
        setError('');
        return [...prev, lvl];
      }
    });
  };

  const handleLevelFeeChange = (lvl, val) => {
    const num = parseInt(val.toString().replace(/[^0-9]/g, ''), 10) || 0;
    setFormData(prev => ({
      ...prev,
      levelsConfig: {
        ...prev.levelsConfig,
        [lvl]: num
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Vui lòng nhập tên đợt thi');
      return;
    }
    if (!formData.examDate) {
      setError('Vui lòng chọn ngày thi chính thức');
      return;
    }
    if (!formData.registrationDeadline) {
      setError('Vui lòng chọn hạn chót đăng ký');
      return;
    }
    if (activeLevels.length === 0) {
      setError('Vui lòng chọn ít nhất 1 cấp độ tổ chức thi');
      return;
    }

    setSaving(true);
    try {
      const url = batch ? `/api/cambridge/batches/${batch.id}` : '/api/cambridge/batches';
      const method = batch ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        levelsConfig: {
          activeLevels,
          fees: formData.levelsConfig
        }
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onSaved(data.batch);
        onClose();
      } else {
        setError(data.error || 'Có lỗi xảy ra khi lưu đợt thi');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      backdropFilter: 'blur(3px)',
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '720px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0c83c1 0%, #09618f 100%)',
          color: 'white',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              <i className="fa-solid fa-calendar-check"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
                {batch ? 'Cấu Hình Đợt Thi Cambridge' : 'Tạo Đợt Thi Cambridge Mới'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>
                Hội đồng Khảo thí Đại học Cambridge (VN120)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Thông tin chung */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
              Tên đợt thi <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="VD: Kỳ thi Cambridge Quốc tế Tháng 12/2026"
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem'
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Ngày thi chính thức <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.examDate}
                onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Hạn chót đăng ký <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.registrationDeadline}
                onChange={(e) => setFormData({ ...formData, registrationDeadline: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Giờ đóng form
              </label>
              <input
                type="text"
                value={formData.closeHour}
                onChange={(e) => setFormData({ ...formData, closeHour: e.target.value })}
                placeholder="17:00"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Hotline hỗ trợ phụ huynh
              </label>
              <input
                type="text"
                value={formData.hotline}
                onChange={(e) => setFormData({ ...formData, hotline: e.target.value })}
                placeholder="0911.767.069"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Hội đồng ủy quyền
              </label>
              <input
                type="text"
                value={formData.authorizedCenter}
                onChange={(e) => setFormData({ ...formData, authorizedCenter: e.target.value })}
                placeholder="VN120"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Trạng thái đợt thi
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              >
                <option value="OPEN">🟢 Đang mở đăng ký</option>
                <option value="CLOSED">🔴 Đã đóng form</option>
                <option value="COMPLETED">🔵 Đã thi xong / Hoàn tất</option>
              </select>
            </div>
          </div>

          {/* Section 2: Chọn cấp độ tổ chức & Biểu phí */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#0c83c1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-tags"></i> Cấp độ tổ chức thi & Biểu phí (VNĐ)
              </h4>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                * Tích chọn cấp độ mở trong đợt này ({activeLevels.length}/5 cấp độ)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
              {ALL_CAMBRIDGE_LEVELS.map((lvl) => {
                const isActive = activeLevels.includes(lvl);
                return (
                  <div
                    key={lvl}
                    style={{
                      background: isActive ? 'white' : '#f1f5f9',
                      border: isActive ? '2px solid #0c83c1' : '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '10px',
                      opacity: isActive ? 1 : 0.6,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', marginBottom: '6px' }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={() => handleToggleLevel(lvl)}
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: isActive ? '#0c83c1' : '#64748b' }}>
                        {lvl}
                      </span>
                    </label>

                    <input
                      type="text"
                      disabled={!isActive}
                      value={(formData.levelsConfig[lvl] || 0).toLocaleString('vi-VN')}
                      onChange={(e) => handleLevelFeeChange(lvl, e.target.value)}
                      placeholder={isActive ? 'Lệ phí' : 'Không mở'}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.6rem',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        color: isActive ? '#10b981' : '#94a3b8',
                        background: isActive ? 'white' : '#e2e8f0',
                        cursor: isActive ? 'text' : 'not-allowed'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: Ngân hàng & VietQR */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fef3c7',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: '#92400e'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="fa-solid fa-qrcode"></i> Tài khoản thụ hưởng VietQR (Chuẩn hóa tự động):
            </div>
            <div>• Ngân hàng: <b>MB Bank</b> - Số tài khoản: <b>{formData.bankAccount}</b></div>
            <div>• Tên thụ hưởng: <b>{formData.bankAccountName}</b></div>
            <div style={{ marginTop: '4px', fontSize: '0.8rem', color: '#b45309' }}>
              * Cú pháp chuyển khoản tự động gán theo tên thí sinh: <code>CAM - &lt;HỌ TÊN KHÔNG DẤU&gt;</code>
            </div>
          </div>

          {/* Section 4: Ghi chú */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
              Ghi chú nội bộ
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="VD: Hội trường thi tại cơ sở 1, phụ huynh nộp hồ sơ trước ngày 10/11..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0c83c1',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(12, 131, 193, 0.3)'
              }}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> {batch ? 'Cập Nhật Đợt Thi' : 'Tạo Đợt Thi Ngay (30s)'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
