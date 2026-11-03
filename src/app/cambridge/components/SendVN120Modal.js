'use client';

import React, { useState, useEffect } from 'react';

const OFFICIAL_VN120_EMAIL = 'thien.vn120@sit.edu.vn';
const TEST_ADMIN_EMAIL = 'phidau.chau.1991@gmail.com';
const OFFICIAL_CC_EMAIL = 'phanthitrucmy@gmail.com, cambridge@anhngunhatmy.edu.vn';

export default function SendVN120Modal({ isOpen, onClose, batch, registrations = [], onSuccess }) {
  const [recipientEmail, setRecipientEmail] = useState(OFFICIAL_VN120_EMAIL);
  const [ccEmail, setCcEmail] = useState(OFFICIAL_CC_EMAIL);
  const [filter, setFilter] = useState('paid'); // 'paid' or 'all'
  const [customMessage, setCustomMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setIsLoading(false);
      setCustomMessage('');
      if (!recipientEmail) {
        setRecipientEmail(OFFICIAL_VN120_EMAIL);
      }
      if (ccEmail === undefined) {
        setCcEmail(OFFICIAL_CC_EMAIL);
      }
    }
  }, [isOpen]);

  if (!isOpen || !batch) return null;

  const paidCount = registrations.filter(r => r.paymentStatus === 'DA_DONG').length;
  const totalCount = registrations.length;
  const currentCount = filter === 'paid' ? paidCount : totalCount;

  const isTestMode = recipientEmail.toLowerCase().includes('phidau') || recipientEmail.toLowerCase().includes('test');

  const handleSelectPreset = (mode) => {
    if (mode === 'test') {
      setRecipientEmail(TEST_ADMIN_EMAIL);
      setCcEmail(''); // Không CC khi test theo chỉ đạo của Quản lý
    } else {
      setRecipientEmail(OFFICIAL_VN120_EMAIL);
      setCcEmail(OFFICIAL_CC_EMAIL);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!recipientEmail || !recipientEmail.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ của người nhận!');
      return;
    }

    if (currentCount === 0) {
      setErrorMsg(
        filter === 'paid'
          ? 'Chưa có thí sinh nào hoàn tất đóng phí để gửi danh sách!'
          : 'Không có thí sinh nào trong đợt thi này!'
      );
      return;
    }

    const targetType = isTestMode ? 'THỬ NGHIỆM NỘI BỘ' : 'CHÍNH THỨC CHO HỘI ĐỒNG VN120';
    const confirmMsg = `Xác nhận gửi email [${targetType}] danh sách ${currentCount} thí sinh đợt thi "${batch.title}" đến địa chỉ: ${recipientEmail}?`;
    if (!window.confirm(confirmMsg)) return;

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/cambridge/send-vn120', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batch.id,
          recipientEmail: recipientEmail.trim(),
          ccEmail: ccEmail ? ccEmail.trim() : '',
          filter,
          customMessage: customMessage.trim()
        })
      });

      const data = await res.json();
      if (data.success) {
        if (onSuccess) {
          onSuccess(data);
        }
        onClose();
      } else {
        setErrorMsg(data.error || 'Có lỗi xảy ra khi gửi email');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi kết nối máy chủ khi gửi email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '580px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          background: isTestMode
            ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
            : 'linear-gradient(135deg, #0c83c1 0%, #0369a1 100%)',
          padding: '1.25rem 1.5rem',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'background 0.3s'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className={isTestMode ? "fa-solid fa-flask" : "fa-solid fa-paper-plane"}></i>
              {isTestMode ? 'Gửi Thử Nghiệm Danh Sách (Kiểm Tra)' : 'Gửi Danh Sách Cho Hội Đồng VN120'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', opacity: 0.95 }}>
              Gửi trực tiếp từ hòm thư chính thức: <b>cambridge@anhngunhatmy.edu.vn</b>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', maxHeight: '85vh', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fecaca',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: '0.875rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Quick presets (Chọn nhanh mục tiêu gửi) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>
              CHỌN NHANH CHẾ ĐỘ GỬI:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => handleSelectPreset('test')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: isTestMode ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                  background: isTestMode ? '#fffbeb' : '#f8fafc',
                  color: isTestMode ? '#b45309' : '#475569',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🧪 Gửi Thử Cho Quản Lý
                <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#64748b', marginTop: '2px' }}>
                  {TEST_ADMIN_EMAIL}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('official')}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: !isTestMode ? '2px solid #0c83c1' : '1px solid #e2e8f0',
                  background: !isTestMode ? '#f0f9ff' : '#f8fafc',
                  color: !isTestMode ? '#0369a1' : '#475569',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                🏛️ Gửi Chính Thức VN120
                <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#64748b', marginTop: '2px' }}>
                  {OFFICIAL_VN120_EMAIL}
                </div>
              </button>
            </div>
          </div>

          {/* Thông tin đợt thi */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '0.875rem 1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '2px' }}>Đợt thi áp dụng:</div>
            <div style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '0.95rem' }}>
              {batch.title}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#0c83c1', marginTop: '4px' }}>
              Ngày thi: <b>{batch.examDate ? new Date(batch.examDate).toLocaleDateString('vi-VN') : 'Chưa định ngày'}</b>
            </div>
          </div>

          {/* Bộ lọc thí sinh gửi */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Đối tượng thí sinh đưa vào file Excel:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div
                onClick={() => !isLoading && setFilter('paid')}
                style={{
                  border: filter === 'paid' ? '2px solid #10b981' : '1px solid #cbd5e1',
                  background: filter === 'paid' ? '#ecfdf5' : '#ffffff',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: filter === 'paid' ? '#047857' : '#475569' }}>
                  ✓ Đã đóng phí
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
                  {paidCount} thí sinh
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Khuyến nghị nộp</div>
              </div>

              <div
                onClick={() => !isLoading && setFilter('all')}
                style={{
                  border: filter === 'all' ? '2px solid #0c83c1' : '1px solid #cbd5e1',
                  background: filter === 'all' ? '#f0f9ff' : '#ffffff',
                  padding: '10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: filter === 'all' ? '#0369a1' : '#475569' }}>
                  Tất cả đăng ký
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0c83c1', marginTop: '2px' }}>
                  {totalCount} thí sinh
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>Cả chưa đóng phí</div>
              </div>
            </div>
          </div>

          {/* Email người nhận */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Email Người Nhận (To) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="thien.vn120@sit.edu.vn"
              required
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: isTestMode ? '2px solid #f59e0b' : '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {isTestMode ? (
              <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '4px', fontWeight: 'bold' }}>
                ⚠️ Chế độ TEST: Gửi trực tiếp đến hòm thư Quản lý để đối soát.
              </div>
            ) : (
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                Email chuyên trách tiếp nhận thí sinh của Hội đồng Cambridge VN120 (Thầy Thiện).
              </div>
            )}
          </div>

          {/* Email CC lưu vết */}
          <div style={{ marginBottom: '1.1rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Email Đồng Kính Gửi (CC Nội Bộ):
            </label>
            <input
              type="text"
              value={ccEmail}
              onChange={(e) => setCcEmail(e.target.value)}
              placeholder="Để trống nếu không muốn CC"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              {isTestMode ? 'Để trống nếu không muốn gửi bản sao lưu cho ai khác.' : 'Đồng kính gửi cho Quản lý & hòm thư cambridge@anhngunhatmy.edu.vn.'}
            </div>
          </div>

          {/* File đính kèm thông báo */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: '#f1f5f9',
            padding: '8px 12px',
            borderRadius: '8px',
            marginBottom: '1.25rem',
            fontSize: '0.825rem',
            color: '#334155'
          }}>
            <i className="fa-solid fa-file-excel" style={{ color: '#10b981', fontSize: '1.25rem' }}></i>
            <div>
              Đính kèm tự động: <b>Danh_sach_Cambridge_VN120.xlsx</b> (Chuẩn 100% biểu mẫu kẻ ô, màu chữ đỏ VN120)
            </div>
          </div>

          {/* Lời nhắn bổ sung */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', marginBottom: '6px' }}>
              Lời nhắn hoặc ghi chú thêm (Tùy chọn):
            </label>
            <textarea
              rows={2}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Ví dụ: Trung tâm xin gửi danh sách đăng ký đợt 1..."
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                cursor: isLoading ? 'not-allowed' : 'pointer'
              }}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isLoading || currentCount === 0}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: isLoading || currentCount === 0
                  ? '#94a3b8'
                  : (isTestMode ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #0c83c1 0%, #0284c7 100%)'),
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                cursor: isLoading || currentCount === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: isTestMode ? '0 4px 6px -1px rgba(245, 158, 11, 0.3)' : '0 4px 6px -1px rgba(12, 131, 193, 0.3)'
              }}
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  Đang đóng gói & gửi thư...
                </>
              ) : (
                <>
                  <i className={isTestMode ? "fa-solid fa-flask" : "fa-solid fa-paper-plane"}></i>
                  {isTestMode ? `Gửi Thử Nghiệm (${currentCount})` : `Gửi Hội Đồng VN120 (${currentCount})`}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
