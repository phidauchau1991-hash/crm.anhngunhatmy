'use client';

import React, { useState, useEffect } from 'react';

export default function TutoringCompleteModal({ isOpen, onClose, onSuccess, session, plan }) {
  const [attendanceStatus, setAttendanceStatus] = useState(session?.attendanceStatus || 'Có mặt');
  const [evaluation, setEvaluation] = useState(session?.evaluation || 'Tốt');
  const [evaluationNotes, setEvaluationNotes] = useState(session?.evaluationNotes || '');
  const [homeworkAssigned, setHomeworkAssigned] = useState(session?.homeworkAssigned || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (session) {
      setAttendanceStatus(session.attendanceStatus || 'Có mặt');
      setEvaluation(session.evaluation || 'Tốt');
      setEvaluationNotes(session.evaluationNotes || '');
      setHomeworkAssigned(session.homeworkAssigned || '');
      setErrorMsg('');
    }
  }, [session, isOpen]);

  if (!isOpen || !session) return null;

  const studentName = plan?.student?.name || 'Học viên';
  const classCode = plan?.classCode || plan?.class?.code || '—';

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/tutoring/sessions/${session.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceStatus,
          evaluation,
          evaluationNotes,
          homeworkAssigned
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Lỗi ghi nhận kết quả');
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi hoàn thành buổi phụ đạo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tcm-overlay" onClick={onClose}>
      <div className="tcm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="tcm-header">
          <div className="tcm-header-left">
            <div className="tcm-icon-badge">
              <i className="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <h3>Điểm Danh & Đánh Giá Buổi Kèm</h3>
              <p>
                Buổi {session.sessionNumber} ({session.teachingDate} • {session.startTimeText || '16:30'})
              </p>
            </div>
          </div>
          <button className="tcm-close-btn" onClick={onClose} aria-label="Đóng">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Form Body */}
        <div className="tcm-body">
          {errorMsg && (
            <div className="tcm-error-alert">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Thẻ tóm tắt học viên */}
          <div className="student-summary-card">
            <div>
              <span className="summary-label">Học viên phụ đạo:</span>
              <strong className="summary-student-name">{studentName}</strong>
            </div>
            <div className="text-right">
              <span className="summary-label">Lớp học:</span>
              <strong className="summary-class-code">{classCode}</strong>
            </div>
          </div>

          {/* 1. Trạng thái tham gia */}
          <div className="form-group">
            <label className="group-label">1. Tình trạng tham gia buổi học</label>
            <div className="status-button-grid">
              {[
                { id: 'Có mặt', label: 'Có mặt', icon: 'fa-check', activeClass: 'active-present' },
                { id: 'Đi trễ', label: 'Đi trễ', icon: 'fa-clock', activeClass: 'active-late' },
                { id: 'Vắng mặt', label: 'Vắng mặt', icon: 'fa-xmark', activeClass: 'active-absent' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAttendanceStatus(item.id)}
                  className={`status-btn ${attendanceStatus === item.id ? item.activeClass : ''}`}
                >
                  <i className={`fa-solid ${item.icon}`}></i> {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Đánh giá mức độ tiếp thu */}
          <div className="form-group">
            <label className="group-label">2. Mức độ tiếp thu & tiến bộ của học viên</label>
            <div className="rating-button-grid">
              {[
                { id: 'Xuất sắc', label: 'Xuất sắc', stars: '⭐⭐⭐' },
                { id: 'Tốt', label: 'Tốt', stars: '⭐⭐' },
                { id: 'Trung bình', label: 'Trung bình', stars: '⭐' },
                { id: 'Cần cố gắng', label: 'Cần cố gắng', stars: '⚠️' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setEvaluation(item.id)}
                  className={`rating-btn ${evaluation === item.id ? 'active-rating' : ''}`}
                >
                  <span className="rating-label">{item.label}</span>
                  <span className="rating-stars">{item.stars}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nhận xét chi tiết */}
          <div className="form-group">
            <label className="group-label">3. Nhận xét của giáo viên phụ trách kèm</label>
            <textarea
              rows={3}
              value={evaluationNotes}
              onChange={(e) => setEvaluationNotes(e.target.value)}
              placeholder="Nhận xét sự tiến bộ, phần bài đã giải quyết, lỗ hổng cần củng cố thêm..."
              className="tcm-textarea"
            />
          </div>

          {/* 4. Bài tập về nhà / Hướng dẫn thêm */}
          <div className="form-group">
            <label className="group-label">4. Bài tập về nhà / Yêu cầu rèn luyện thêm (nếu có)</label>
            <textarea
              rows={2}
              value={homeworkAssigned}
              onChange={(e) => setHomeworkAssigned(e.target.value)}
              placeholder="Ví dụ: Làm bài tập trang 24 sách Workbook, quay video đọc từ vựng..."
              className="tcm-textarea"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="tcm-footer">
          <button type="button" className="btn-cancel" onClick={onClose} disabled={submitting}>
            Hủy bỏ
          </button>
          <button type="button" className="btn-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
              </>
            ) : (
              <>
                <i className="fa-solid fa-check"></i> Hoàn Tất & Điểm Danh
              </>
            )}
          </button>
        </div>

      </div>

      {/* Scoped CSS */}
      <style jsx>{`
        .tcm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: tcmFade 0.2s ease;
        }
        @keyframes tcmFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .tcm-modal {
          background: #ffffff;
          border-radius: 16px;
          max-width: 540px;
          width: 100%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px -12px rgba(15, 23, 42, 0.35);
          animation: tcmSlide 0.25s ease;
        }
        @keyframes tcmSlide {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .tcm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #ffffff;
        }
        .tcm-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .tcm-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #ffffff;
          flex-shrink: 0;
        }
        .tcm-header h3 {
          font-size: 16px;
          font-weight: 800;
          margin: 0 0 2px 0;
        }
        .tcm-header p {
          font-size: 12px;
          margin: 0;
          color: #d1fae5;
        }
        .tcm-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.15s ease;
        }
        .tcm-close-btn:hover {
          background: rgba(255, 255, 255, 0.28);
        }

        /* Body */
        .tcm-body {
          padding: 20px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #f8fafc;
        }
        .tcm-error-alert {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12.5px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .student-summary-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .summary-label {
          display: block;
          font-size: 11px;
          color: #64748b;
        }
        .summary-student-name {
          font-size: 14px;
          font-weight: 800;
          color: #085e8a;
        }
        .summary-class-code {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
        }
        .text-right { text-align: right; }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .group-label {
          font-size: 12px;
          font-weight: 700;
          color: #334155;
        }

        /* Status Buttons */
        .status-button-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .status-btn {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #475569;
          padding: 10px 8px;
          border-radius: 9px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .status-btn:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }
        .active-present {
          background: #d1fae5 !important;
          border-color: #10b981 !important;
          color: #065f46 !important;
        }
        .active-late {
          background: #fef3c7 !important;
          border-color: #f59e0b !important;
          color: #92400e !important;
        }
        .active-absent {
          background: #fee2e2 !important;
          border-color: #ef4444 !important;
          color: #991b1b !important;
        }

        /* Rating Buttons */
        .rating-button-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .rating-btn {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #475569;
          padding: 8px 6px;
          border-radius: 9px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          transition: all 0.15s ease;
        }
        .rating-btn:hover {
          border-color: #94a3b8;
          background: #f1f5f9;
        }
        .active-rating {
          background: #e0f2fe !important;
          border-color: #0D88C4 !important;
          color: #0369a1 !important;
        }
        .rating-label {
          font-size: 11.5px;
          font-weight: 800;
        }
        .rating-stars {
          font-size: 11px;
        }

        .tcm-textarea {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #1e293b;
          background: #ffffff;
          outline: none;
          font-family: inherit;
          resize: vertical;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .tcm-textarea:focus {
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
        }

        /* Footer */
        .tcm-footer {
          padding: 14px 20px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }
        .btn-cancel {
          background: transparent;
          border: none;
          color: #64748b;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .btn-cancel:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .btn-submit {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          border: none;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
          padding: 9px 18px;
          border-radius: 8px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 12px -2px rgba(16, 185, 129, 0.4);
          transition: all 0.15s ease;
        }
        .btn-submit:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -2px rgba(16, 185, 129, 0.55);
        }
        .btn-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 480px) {
          .rating-button-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
