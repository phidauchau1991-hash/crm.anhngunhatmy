'use client';

import React, { useRef, useState } from 'react';
import * as htmlToImage from 'html-to-image';

export default function TutoringLetterModal({ isOpen, onClose, plan }) {
  const letterRef = useRef(null);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen || !plan) return null;

  const studentName = plan.student?.name || 'Học viên';
  const studentPhone = plan.student?.phone || '';
  const classCode = plan.classCode || plan.class?.code || 'Lớp học tại trung tâm';
  const tutorName = plan.tutorName || plan.teacher?.fullName || 'Giáo viên phụ trách';
  const sessionType = plan.sessionType || 'Bù bài học viên vắng (Makeup)';
  const focusSkills = plan.focusSkills || 'Tổng hợp / Toàn diện';
  const content = plan.content || 'Ôn tập và củng cố kiến thức theo chương trình';
  const instructions = plan.instructions || 'Mang theo đầy đủ sách vở và đồ dùng học tập';
  const sessions = plan.sessions && plan.sessions.length > 0 ? plan.sessions : [
    {
      sessionNumber: 1,
      teachingDate: new Date().toISOString().split('T')[0],
      startTimeText: '04:30 CH',
      endTimeText: '05:30 CH',
      roomName: 'Phòng học tại trung tâm'
    }
  ];

  // Helper format ngày tiếng Việt
  const formatDateVi = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[d.getDay()];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${dayName}, ngày ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  // Cập nhật timestamp xuất thư
  const markExported = async () => {
    try {
      await fetch(`/api/tutoring/${plan.id}/letter-exported`, { method: 'PATCH' });
    } catch (e) {
      console.error(e);
    }
  };

  // Copy ảnh vào Clipboard
  const handleCopyImage = async () => {
    if (!letterRef.current || copying) return;
    setCopying(true);
    setCopySuccess(false);

    try {
      const dataUrl = await htmlToImage.toPng(letterRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        setCopySuccess(true);
        markExported();
        setTimeout(() => setCopySuccess(false), 3500);
      } else {
        // Fallback: Tải file ảnh
        handleDownloadImage();
      }
    } catch (err) {
      console.error('Lỗi copy ảnh:', err);
      handleDownloadImage();
    } finally {
      setCopying(false);
    }
  };

  // Tải file ảnh PNG
  const handleDownloadImage = async () => {
    if (!letterRef.current || downloading) return;
    setDownloading(true);

    try {
      const dataUrl = await htmlToImage.toPng(letterRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });

      const filename = `Thu_Hen_Phu_Dao_${studentName.replace(/\s+/g, '_')}_${plan.planCode || 'Pass'}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      markExported();
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      alert('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      setDownloading(false);
    }
  };

  // Mở Zalo phụ huynh
  const handleOpenZalo = () => {
    if (studentPhone) {
      const cleanPhone = studentPhone.replace(/\D/g, '');
      window.open(`https://zalo.me/${cleanPhone}`, '_blank');
    } else {
      window.open('https://chat.zalo.me/', '_blank');
    }
  };

  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header Modal */}
        <div className="lm-header">
          <div className="lm-header-left">
            <div className="lm-icon-badge">
              <i className="fa-solid fa-envelope-open-text"></i>
            </div>
            <div>
              <h3>Thư Hẹn Phụ Huynh (Bản xem trước)</h3>
              <p>Xuất ảnh chất lượng cao gửi Zalo cho phụ huynh học viên</p>
            </div>
          </div>
          <button className="lm-close-btn" onClick={onClose} aria-label="Đóng">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Khung cuộn chứa Giấy Thư */}
        <div className="lm-preview-viewport">
          <div className="letter-paper" ref={letterRef}>

            {/* Header Thương hiệu */}
            <div className="letter-brand-row">
              <div className="letter-brand-logo">
                <div className="brand-logo-badge">
                  <span>NM</span>
                </div>
                <div>
                  <div className="brand-title">ANH NGỮ QUỐC TẾ NHẬT MỸ</div>
                  <div className="brand-slogan">DEDICATED TO EXCELLENCE</div>
                </div>
              </div>
              <div className="letter-code-col">
                <span className="plan-badge-pass">{plan.planCode || 'TUTOR-PASS'}</span>
                <span className="direct-teach-note">Dạy trực tiếp tại cơ sở</span>
              </div>
            </div>

            <div className="letter-gold-line"></div>

            {/* Tiêu đề thư */}
            <div className="letter-title-section">
              <span className="session-type-pill">{sessionType}</span>
              <h1 className="letter-main-title">GIẤY HẸN PHỤ ĐẠO & BÙ BÀI</h1>
              <p className="letter-subtitle">
                Hỗ trợ củng cố kiến thức và đồng hành cùng tiến độ học tập của bé
              </p>
            </div>

            {/* Thông tin học viên */}
            <div className="letter-student-box">
              <div className="student-info-row">
                <span className="info-label">Kính gửi Quý Phụ huynh em:</span>
                <span className="info-value-name">{studentName}</span>
              </div>
              <div className="student-info-row">
                <span className="info-label">Lớp học chính khóa:</span>
                <span className="info-value-class">{classCode}</span>
              </div>
              <div className="student-info-row">
                <span className="info-label">Giáo viên / Trợ giảng kèm:</span>
                <span className="info-value-tutor">{tutorName}</span>
              </div>
            </div>

            {/* Lịch học kèm chi tiết */}
            <div className="letter-sessions-section">
              <div className="sessions-section-title">
                <i className="fa-solid fa-calendar-day"></i> LỊCH HỌC KÈM CHI TIẾT (TRỰC TIẾP):
              </div>

              <div className="sessions-slots-container">
                {sessions.map((s, idx) => (
                  <div key={idx} className="session-slot-card">
                    <div className="slot-top-row">
                      <div className="slot-date-info">
                        <span className="slot-idx-circle">{idx + 1}</span>
                        <strong className="slot-date-text">{formatDateVi(s.teachingDate)}</strong>
                      </div>
                      <span className="slot-time-highlight">
                        {s.startTimeText || '16:30'} – {s.endTimeText || '17:30'}
                      </span>
                    </div>

                    <div className="slot-room-row">
                      <i className="fa-solid fa-location-dot"></i>
                      <span>Địa điểm học: <strong>{s.roomName || 'Phòng học tại trung tâm'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nội dung ôn tập & Kỹ năng */}
            <div className="letter-content-box">
              <div className="content-item">
                <span className="content-item-label">🎯 Kỹ năng trọng tâm:</span>
                <span className="content-item-value-skill">{focusSkills}</span>
              </div>
              <div className="content-item">
                <span className="content-item-label">📝 Nội dung ôn tập:</span>
                <span className="content-item-value">{content}</span>
              </div>
              <div className="content-item">
                <span className="content-item-label">🎒 Đồ dùng mang theo:</span>
                <span className="content-item-value-bold">{instructions}</span>
              </div>
            </div>

            {/* Lời nhắn nhủ */}
            <div className="letter-polite-note">
              "Vì sự tiến bộ của con, kính mong Quý Phụ huynh sắp xếp nhắc nhở và đưa đón bé tham dự đầy đủ, đúng giờ."
            </div>

            {/* Chân trang & Xác nhận */}
            <div className="letter-footer-row">
              <div className="footer-left">
                <div className="center-name">TRUNG TÂM ANH NGỮ NHẬT MỸ</div>
                <div className="department-name">Bộ Phận Chuyên Môn & CSKH</div>
                <div className="hotline-text">Hotline hỗ trợ phụ huynh: 090x xxx xxx</div>
              </div>

              <div className="footer-right">
                <div className="confirm-stamp">
                  <i className="fa-solid fa-certificate"></i> XÁC NHẬN TỔ CHỨC
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Thanh Điều Khiển & Hành Động */}
        <div className="lm-action-bar">
          <div className="action-feedback">
            {copySuccess && (
              <span className="copy-success-badge">
                <i className="fa-solid fa-circle-check"></i> Đã sao chép ảnh! Hãy mở Zalo bấm Ctrl+V
              </span>
            )}
          </div>

          <div className="action-buttons-group">
            <button type="button" onClick={handleOpenZalo} className="btn-zalo">
              <i className="fa-solid fa-comment-dots"></i> Mở Zalo
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={downloading}
              className="btn-download"
            >
              {downloading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-download"></i>
              )}
              Tải Ảnh (.PNG)
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={copying}
              className="btn-copy-png"
            >
              {copying ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-copy"></i>
              )}
              Copy Ảnh Gửi Zalo
            </button>
          </div>
        </div>

      </div>

      {/* Scoped CSS */}
      <style jsx>{`
        .lm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: lmFade 0.2s ease;
        }
        @keyframes lmFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .lm-modal {
          background: #ffffff;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 94vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px -12px rgba(15, 23, 42, 0.4);
          animation: lmSlide 0.25s ease;
        }
        @keyframes lmSlide {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .lm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .lm-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .lm-icon-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: #e0f2fe;
          color: #085e8a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }
        .lm-header h3 {
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .lm-header p {
          font-size: 12px;
          color: #64748b;
          margin: 0;
        }
        .lm-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.15s ease;
        }
        .lm-close-btn:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        /* Viewport */
        .lm-preview-viewport {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
          background: #64748b;
          display: flex;
          justify-content: center;
        }

        /* Giấy Thư Hẹn */
        .letter-paper {
          width: 520px;
          background: #ffffff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
          border: 2px solid #FFCA29;
          font-family: inherit;
          color: #1e293b;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .letter-brand-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .letter-brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .brand-logo-badge {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: linear-gradient(135deg, #085e8a 0%, #0D88C4 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFCA29;
          font-weight: 900;
          font-size: 18px;
          border: 1.5px solid #FFCA29;
          box-shadow: 0 2px 6px rgba(13, 136, 196, 0.3);
        }
        .brand-title {
          font-size: 13.5px;
          font-weight: 900;
          color: #085e8a;
          letter-spacing: 0.03em;
        }
        .brand-slogan {
          font-size: 10px;
          font-weight: 700;
          color: #cca120;
          letter-spacing: 0.08em;
        }
        .letter-code-col {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .plan-badge-pass {
          background: #fef3c7;
          border: 1px solid #fde68a;
          color: #92400e;
          font-size: 10.5px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 5px;
          font-family: monospace;
        }
        .direct-teach-note {
          font-size: 10px;
          color: #64748b;
        }

        .letter-gold-line {
          height: 2px;
          background: linear-gradient(90deg, #FFCA29 0%, #0D88C4 100%);
          border-radius: 2px;
        }

        /* Title */
        .letter-title-section {
          text-align: center;
          padding: 2px 0;
        }
        .session-type-pill {
          display: inline-block;
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 800;
          padding: 3px 12px;
          border-radius: 999px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .letter-main-title {
          font-size: 18px;
          font-weight: 900;
          color: #085e8a;
          letter-spacing: 0.02em;
          margin: 0 0 4px 0;
        }
        .letter-subtitle {
          font-size: 11.5px;
          color: #64748b;
          font-style: italic;
          margin: 0;
        }

        /* Student Box */
        .letter-student-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
        }
        .student-info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .info-label {
          color: #64748b;
        }
        .info-value-name {
          font-size: 14px;
          font-weight: 800;
          color: #085e8a;
        }
        .info-value-class {
          font-weight: 700;
          color: #1e293b;
        }
        .info-value-tutor {
          font-weight: 700;
          color: #0369a1;
        }

        /* Sessions */
        .letter-sessions-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .sessions-section-title {
          font-size: 11.5px;
          font-weight: 800;
          color: #085e8a;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .sessions-section-title i {
          color: #d97706;
        }
        .sessions-slots-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .session-slot-card {
          background: #fffbeb;
          border: 1px solid #fef3c7;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 12px;
        }
        .slot-top-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .slot-date-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .slot-idx-circle {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #f59e0b;
          color: #ffffff;
          font-size: 10px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .slot-date-text {
          color: #0f172a;
          font-size: 12.5px;
        }
        .slot-time-highlight {
          font-weight: 800;
          color: #b45309;
          font-size: 12.5px;
        }
        .slot-room-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #64748b;
          padding-left: 28px;
        }
        .slot-room-row i {
          color: #f59e0b;
        }
        .slot-room-row strong {
          color: #1e293b;
        }

        /* Content Box */
        .letter-content-box {
          background: #f0f9ff;
          border: 1px solid #e0f2fe;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11.5px;
        }
        .content-item {
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }
        .content-item-label {
          font-weight: 800;
          color: #085e8a;
          white-space: nowrap;
        }
        .content-item-value-skill {
          font-weight: 700;
          color: #0284c7;
        }
        .content-item-value {
          color: #334155;
        }
        .content-item-value-bold {
          font-weight: 700;
          color: #1e293b;
        }

        /* Polite Note */
        .letter-polite-note {
          font-size: 11px;
          color: #64748b;
          text-align: center;
          font-style: italic;
          line-height: 1.4;
          padding: 2px 0;
        }

        /* Footer */
        .letter-footer-row {
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 11px;
        }
        .center-name {
          font-size: 10px;
          color: #94a3b8;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .department-name {
          font-size: 12px;
          font-weight: 800;
          color: #085e8a;
        }
        .hotline-text {
          color: #64748b;
          font-size: 10.5px;
        }
        .confirm-stamp {
          background: #fef3c7;
          border: 1.5px solid #FFCA29;
          color: #92400e;
          font-size: 10.5px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        /* Action Bar */
        .lm-action-bar {
          padding: 12px 20px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
        }
        .action-feedback {
          min-height: 24px;
        }
        .copy-success-badge {
          background: #d1fae5;
          color: #065f46;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }
        .action-buttons-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn-zalo {
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          color: #0369a1;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
        }
        .btn-zalo:hover {
          background: #0284c7;
          color: #ffffff;
        }
        .btn-download {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
        }
        .btn-download:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .btn-copy-png {
          background: linear-gradient(135deg, #0D88C4 0%, #085e8a 100%);
          border: none;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px -2px rgba(13, 136, 196, 0.4);
          transition: all 0.15s ease;
        }
        .btn-copy-png:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -2px rgba(13, 136, 196, 0.55);
        }

        @media (max-width: 600px) {
          .letter-paper {
            width: 100%;
            padding: 16px;
          }
          .action-buttons-group {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
}
