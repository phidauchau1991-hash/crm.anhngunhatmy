'use client';

import React, { useState, useEffect } from 'react';
import { formatClassCode } from '@/lib/classHelper';

const STATUS_OPTIONS = [
  { id: 'Có mặt', label: 'Có mặt', icon: 'fa-check', activeClass: 'active-present' },
  { id: 'Đi trễ', label: 'Đi trễ', icon: 'fa-clock', activeClass: 'active-late' },
  { id: 'Vắng mặt', label: 'Vắng mặt', icon: 'fa-xmark', activeClass: 'active-absent' },
];

const RATING_OPTIONS = [
  { id: 'Xuất sắc', label: 'Xuất sắc', stars: '⭐⭐⭐' },
  { id: 'Tốt', label: 'Tốt', stars: '⭐⭐' },
  { id: 'Trung bình', label: 'Trung bình', stars: '⭐' },
  { id: 'Cần cố gắng', label: 'Cần cố gắng', stars: '⚠️' },
];

export default function TutoringCompleteModal({
  isOpen,
  onClose,
  onSuccess,
  session = null,
  plan = null,
  groupTargets = null, // Array of { session, plan } khi điểm danh cả nhóm
}) {
  const [entries, setEntries] = useState([]);
  const [commonNotes, setCommonNotes] = useState('');
  const [commonHomework, setCommonHomework] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const list =
      Array.isArray(groupTargets) && groupTargets.length > 0
        ? groupTargets
        : session && plan
          ? [{ session, plan }]
          : [];

    setEntries(
      list.map((item) => ({
        sessionId: item.session.id,
        studentName: item.plan?.student?.name || 'Học viên',
        classCode: item.plan?.classCode || item.plan?.class?.code || '—',
        sessionNumber: item.session.sessionNumber,
        teachingDate: item.session.teachingDate,
        startTimeText: item.session.startTimeText || '16:30',
        attendanceStatus: item.session.attendanceStatus || 'Có mặt',
        evaluation: item.session.evaluation || 'Tốt',
        evaluationNotes: item.session.evaluationNotes || '',
        homeworkAssigned: item.session.homeworkAssigned || '',
      }))
    );
    setCommonNotes('');
    setCommonHomework('');
    setErrorMsg('');
  }, [isOpen, session, plan, groupTargets]);

  if (!isOpen || entries.length === 0) return null;

  const isGroup = entries.length > 1;
  const firstEntry = entries[0];

  const updateEntry = (sessionId, field, value) => {
    setEntries((prev) =>
      prev.map((row) => (row.sessionId === sessionId ? { ...row, [field]: value } : row))
    );
  };

  const applyAllStatus = (statusVal) => {
    setEntries((prev) => prev.map((row) => ({ ...row, attendanceStatus: statusVal })));
  };

  const applyCommonFieldsToAll = () => {
    setEntries((prev) =>
      prev.map((row) => ({
        ...row,
        evaluationNotes: commonNotes.trim() ? commonNotes : row.evaluationNotes,
        homeworkAssigned: commonHomework.trim() ? commonHomework : row.homeworkAssigned,
      }))
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/tutoring/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: entries.map((e) => ({
            sessionId: e.sessionId,
            attendanceStatus: e.attendanceStatus,
            evaluation: e.evaluation,
            evaluationNotes: e.evaluationNotes,
            homeworkAssigned: e.homeworkAssigned,
          })),
        }),
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
      <div className={`tcm-modal ${isGroup ? 'tcm-modal-wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tcm-header">
          <div className="tcm-header-left">
            <div className="tcm-icon-badge">
              <i className="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <h3>{isGroup ? `Điểm Danh & Đánh Giá Nhóm (${entries.length} Học viên)` : 'Điểm Danh & Đánh Giá Buổi Kèm'}</h3>
              <p>
                Buổi {firstEntry.sessionNumber} ({firstEntry.teachingDate} • {firstEntry.startTimeText})
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

          {isGroup && (
            <div className="group-quick-panel">
              <div className="quick-row">
                <span className="quick-label">Điểm danh nhanh cả nhóm:</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => applyAllStatus(opt.id)}
                      className="quick-pill-btn"
                    >
                      <i className={`fa-solid ${opt.icon}`}></i> Tất cả {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="quick-inputs">
                <input
                  type="text"
                  value={commonNotes}
                  onChange={(e) => setCommonNotes(e.target.value)}
                  placeholder="Nhận xét chung cả nhóm (VD: Cả nhóm làm tốt phần thì HTĐ...)"
                  className="tcm-input-sm"
                />
                <input
                  type="text"
                  value={commonHomework}
                  onChange={(e) => setCommonHomework(e.target.value)}
                  placeholder="BTVN chung (VD: WB trang 24-25)"
                  className="tcm-input-sm"
                />
                <button
                  type="button"
                  onClick={applyCommonFieldsToAll}
                  className="btn-apply-common"
                >
                  Điền cho cả nhóm
                </button>
              </div>
            </div>
          )}

          <div className="entries-list">
            {entries.map((entry, idx) => (
              <div key={entry.sessionId} className="entry-card">
                <div className="student-summary-card">
                  <div>
                    <span className="summary-label">{isGroup ? `Học viên #${idx + 1}:` : 'Học viên phụ đạo:'}</span>
                    <strong className="summary-student-name">{entry.studentName}</strong>
                  </div>
                  <div className="text-right">
                    <span className="summary-label">Lớp học:</span>
                    <strong className="summary-class-code">
                      {entry.classCode !== '—' ? formatClassCode(entry.classCode) : '—'}
                    </strong>
                  </div>
                </div>

                <div className="form-group">
                  <label className="group-label">Tình trạng tham gia buổi học</label>
                  <div className="status-button-grid">
                    {STATUS_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateEntry(entry.sessionId, 'attendanceStatus', item.id)}
                        className={`status-btn ${entry.attendanceStatus === item.id ? item.activeClass : ''}`}
                      >
                        <i className={`fa-solid ${item.icon}`}></i> {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="group-label">Mức độ tiếp thu & tiến bộ</label>
                  <div className="rating-button-grid">
                    {RATING_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => updateEntry(entry.sessionId, 'evaluation', item.id)}
                        className={`rating-btn ${entry.evaluation === item.id ? 'active-rating' : ''}`}
                      >
                        <span className="rating-label">{item.label}</span>
                        <span className="rating-stars">{item.stars}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={isGroup ? 'tcm-grid-2' : 'tcm-stack'}>
                  <div className="form-group">
                    <label className="group-label">Nhận xét giáo viên</label>
                    <textarea
                      rows={2}
                      value={entry.evaluationNotes}
                      onChange={(e) => updateEntry(entry.sessionId, 'evaluationNotes', e.target.value)}
                      placeholder="Nhận xét tiến bộ, phần bài đã giải quyết..."
                      className="tcm-textarea"
                    />
                  </div>

                  <div className="form-group">
                    <label className="group-label">Bài tập về nhà (nếu có)</label>
                    <textarea
                      rows={2}
                      value={entry.homeworkAssigned}
                      onChange={(e) => updateEntry(entry.sessionId, 'homeworkAssigned', e.target.value)}
                      placeholder="VD: WB trang 24, quay video đọc từ vựng..."
                      className="tcm-textarea"
                    />
                  </div>
                </div>
              </div>
            ))}
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
                <i className="fa-solid fa-check"></i> {isGroup ? `Hoàn Tất & Điểm Danh (${entries.length} HV)` : 'Hoàn Tất & Điểm Danh'}
              </>
            )}
          </button>
        </div>
      </div>

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
        }
        .tcm-modal {
          background: #ffffff;
          border-radius: 16px;
          max-width: 560px;
          width: 100%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px -12px rgba(15, 23, 42, 0.35);
        }
        .tcm-modal-wide {
          max-width: 780px;
        }
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
        .tcm-header h3 { font-size: 16px; font-weight: 800; margin: 0 0 2px 0; }
        .tcm-header p { font-size: 12px; margin: 0; color: #d1fae5; }
        .tcm-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          cursor: pointer;
          font-size: 16px;
        }
        .tcm-body {
          padding: 18px 20px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 14px;
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
        .group-quick-panel {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          border-radius: 12px;
          padding: 12px 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .quick-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .quick-label { font-size: 12px; font-weight: 800; color: #065f46; }
        .quick-pill-btn {
          background: #ffffff;
          border: 1px solid #6ee7b7;
          color: #065f46;
          font-size: 11.5px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 999px;
          cursor: pointer;
        }
        .quick-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: center;
        }
        .tcm-input-sm {
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 12px;
          background: #ffffff;
        }
        .btn-apply-common {
          background: #059669;
          color: #ffffff;
          border: none;
          padding: 7px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .entries-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .entry-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .student-summary-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .summary-label { display: block; font-size: 11px; color: #64748b; }
        .summary-student-name { font-size: 14px; font-weight: 800; color: #085e8a; }
        .summary-class-code { font-size: 12.5px; font-weight: 700; color: #1e293b; }
        .text-right { text-align: right; }
        .tcm-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .tcm-stack { display: flex; flex-direction: column; gap: 12px; }
        .form-group { display: flex; flex-direction: column; gap: 6px; }
        .group-label { font-size: 12px; font-weight: 700; color: #334155; }
        .status-button-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .status-btn {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #475569;
          padding: 8px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .active-present { background: #d1fae5 !important; border-color: #10b981 !important; color: #065f46 !important; }
        .active-late { background: #fef3c7 !important; border-color: #f59e0b !important; color: #92400e !important; }
        .active-absent { background: #fee2e2 !important; border-color: #ef4444 !important; color: #991b1b !important; }
        .rating-button-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .rating-btn {
          background: #ffffff;
          border: 1.5px solid #cbd5e1;
          color: #475569;
          padding: 7px 6px;
          border-radius: 9px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }
        .active-rating { background: #e0f2fe !important; border-color: #0D88C4 !important; color: #0369a1 !important; }
        .rating-label { font-size: 11.5px; font-weight: 800; }
        .rating-stars { font-size: 11px; }
        .tcm-textarea {
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 12.5px;
          color: #1e293b;
          background: #ffffff;
          box-sizing: border-box;
          resize: vertical;
        }
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
          cursor: pointer;
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
        }
        @media (max-width: 640px) {
          .quick-inputs, .tcm-grid-2 { grid-template-columns: 1fr; }
          .rating-button-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </div>
  );
}
