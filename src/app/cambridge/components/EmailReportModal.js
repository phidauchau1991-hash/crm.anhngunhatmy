'use client';

import React from 'react';

export default function EmailReportModal({ isOpen, onClose, reportData }) {
  if (!isOpen || !reportData) return null;

  const { total = 0, sent = 0, failed = 0, details = [], message } = reportData;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      backdropFilter: 'blur(3px)',
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '650px',
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
              <i className="fa-solid fa-envelope-circle-check"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                Kết Quả Gửi Email Biên Lai Điện Tử
              </h2>
              <p style={{ margin: 0, fontSize: '0.825rem', opacity: 0.9 }}>
                Hệ thống xác nhận lệ phí thi Cambridge
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

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          {reportData.isSimulated && (
            <div style={{
              padding: '0.85rem 1rem',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              color: '#92400e',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ color: '#d97706' }}></i>
                CHẾ ĐỘ MÔ PHỎNG (CHƯA CẤU HÌNH TÀI KHOẢN GỬI MAIL SMTP):
              </div>
              <div>
                Hệ thống CRM hiện chưa được cấu hình tài khoản Email gửi thư trong file môi trường. Thư chưa thực sự được gửi ra hộp thư Internet của người nhận. Sau khi quản trị viên cung cấp thông tin Email và Mật khẩu ứng dụng, hệ thống sẽ gửi thư thực tế ngay lập tức.
              </div>
            </div>
          )}

          {message && !reportData.isSimulated && (
            <div style={{
              padding: '0.85rem 1rem',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              color: '#0369a1',
              borderRadius: '8px',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-circle-info"></i>
              <span>{message}</span>
            </div>
          )}

          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>TỔNG XỬ LÝ</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>{total}</div>
            </div>

            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#047857', fontWeight: 'bold' }}>THÀNH CÔNG</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{sent}</div>
            </div>

            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 'bold' }}>THẤT BẠI</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#ef4444' }}>{failed}</div>
            </div>
          </div>

          {/* Details List */}
          {details.length > 0 && (
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#334155', marginBottom: '8px' }}>
                Chi tiết từng thí sinh:
              </div>
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                maxHeight: '260px',
                overflowY: 'auto'
              }}>
                {details.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 14px',
                      borderBottom: idx < details.length - 1 ? '1px solid #f1f5f9' : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.875rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                        {item.fullName}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {item.email || 'Không có email'} {item.receiptCode ? `• Mã BL: ${item.receiptCode}` : ''}
                      </div>
                    </div>

                    <div>
                      {item.status === 'SUCCESS' ? (
                        <span style={{
                          background: '#d1fae5',
                          color: '#065f46',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <i className="fa-solid fa-check"></i> Đã gửi {item.simulated ? '(Mô phỏng)' : ''}
                        </span>
                      ) : (
                        <span style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }} title={item.error}>
                          <i className="fa-solid fa-xmark"></i> {item.error || 'Lỗi gửi'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Action */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0c83c1',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Đóng và Cập nhật dữ liệu
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
