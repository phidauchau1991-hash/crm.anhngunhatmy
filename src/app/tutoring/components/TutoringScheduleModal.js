'use client';

import React, { useState, useEffect } from 'react';

export default function TutoringScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  prefillData = null,
  students = [],
  classes = [],
  teachers = []
}) {
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedClassCode, setSelectedClassCode] = useState('');
  const [sessionType, setSessionType] = useState('Bù bài học viên vắng (Makeup)');
  const [focusSkills, setFocusSkills] = useState('Tổng hợp / Toàn diện');
  const [teacherId, setTeacherId] = useState('');
  const [tutorName, setTutorName] = useState('');
  const [content, setContent] = useState('');
  const [instructions, setInstructions] = useState('');
  const [sessions, setSessions] = useState([
    {
      teachingDate: new Date().toISOString().split('T')[0],
      startTimeText: '04:30 CH',
      endTimeText: '05:30 CH',
      roomName: 'Phòng học tại trung tâm',
      notes: ''
    }
  ]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Tự động điền dữ liệu khi mở từ cảnh báo (prefillData)
  useEffect(() => {
    if (prefillData) {
      setSelectedStudentId(prefillData.studentId || '');
      setSelectedClassCode(prefillData.classCode || '');
      setSessionType(prefillData.recommendedSessionType || 'Bù bài học viên vắng (Makeup)');
      setFocusSkills(prefillData.recommendedSkills || 'Tổng hợp / Toàn diện');
      setTeacherId(prefillData.teacherId || '');
      setTutorName(prefillData.teacherName || '');
      setContent(prefillData.reason ? `Bù bài học viên vắng: ${prefillData.reason}` : '');
      setInstructions('Mang theo sách Student Book và vở ghi chép bài tập...');
      setSessions([
        {
          teachingDate: new Date().toISOString().split('T')[0],
          startTimeText: '04:30 CH',
          endTimeText: '05:30 CH',
          roomName: 'Phòng học tại trung tâm',
          notes: ''
        }
      ]);
    } else {
      setSelectedStudentId('');
      setSelectedClassCode('');
      setSessionType('Bù bài học viên vắng (Makeup)');
      setFocusSkills('Tổng hợp / Toàn diện');
      setTeacherId('');
      setTutorName('');
      setContent('');
      setInstructions('Mang theo sách vở và đồ dùng học tập đầy đủ');
      setSessions([
        {
          teachingDate: new Date().toISOString().split('T')[0],
          startTimeText: '04:30 CH',
          endTimeText: '05:30 CH',
          roomName: 'Phòng học tại trung tâm',
          notes: ''
        }
      ]);
    }
    setErrorMsg('');
  }, [prefillData, isOpen]);

  // Khi chọn học viên, nếu chưa chọn lớp thì gợi ý lớp của học viên
  const handleStudentChange = (stId) => {
    setSelectedStudentId(stId);
    const st = students.find((s) => s.id === stId);
    if (st && st.enrollments && st.enrollments.length > 0) {
      setSelectedClassCode(st.enrollments[0].classCode);
    }
  };

  // Khi chọn giáo viên
  const handleTeacherChange = (tId) => {
    setTeacherId(tId);
    const teacher = teachers.find((t) => t.id === tId);
    if (teacher) {
      setTutorName(teacher.fullName || teacher.shortName || '');
    } else {
      setTutorName('');
    }
  };

  // Thêm một ngày/buổi phụ đạo mới vào đợt
  const handleAddSession = () => {
    const lastSession = sessions[sessions.length - 1];
    let nextDate = new Date();
    if (lastSession && lastSession.teachingDate) {
      const d = new Date(lastSession.teachingDate);
      d.setDate(d.getDate() + 2); // Cách 2 ngày
      nextDate = d;
    }

    setSessions([
      ...sessions,
      {
        teachingDate: nextDate.toISOString().split('T')[0],
        startTimeText: lastSession?.startTimeText || '04:30 CH',
        endTimeText: lastSession?.endTimeText || '05:30 CH',
        roomName: lastSession?.roomName || 'Phòng học tại trung tâm',
        notes: ''
      }
    ]);
  };

  // Xóa một buổi khỏi đợt
  const handleRemoveSession = (index) => {
    if (sessions.length <= 1) return;
    setSessions(sessions.filter((_, idx) => idx !== index));
  };

  // Cập nhật trường của một buổi
  const handleSessionChange = (index, field, value) => {
    const newSessions = [...sessions];
    newSessions[index] = { ...newSessions[index], [field]: value };
    setSessions(newSessions);
  };

  // Lưu lịch phụ đạo
  const handleSubmit = async (andExportLetter = false) => {
    if (!selectedStudentId) {
      setErrorMsg('Vui lòng chọn học viên cần phụ đạo');
      return;
    }

    for (let i = 0; i < sessions.length; i++) {
      if (!sessions[i].teachingDate) {
        setErrorMsg(`Vui lòng chọn ngày học cho Buổi số ${i + 1}`);
        return;
      }
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/tutoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudentId,
          classCode: selectedClassCode || null,
          teacherId: teacherId || null,
          tutorName: tutorName || null,
          sessionType,
          focusSkills,
          content,
          instructions,
          sessions
        })
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Không thể tạo lịch phụ đạo');
      }

      onSuccess(json.data, andExportLetter);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi lưu lịch phụ đạo');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="tsm-overlay" onClick={onClose}>
      <div className="tsm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header Modal */}
        <div className="tsm-header">
          <div className="tsm-header-left">
            <div className="tsm-icon-badge">
              <i className="fa-solid fa-calendar-plus"></i>
            </div>
            <div>
              <h2>Lên Lịch Phụ Đạo & Bù Bài</h2>
              <p>Thiết lập ngày, giờ và nội dung kèm trực tiếp tại trung tâm</p>
            </div>
          </div>
          <button className="tsm-close-btn" onClick={onClose} aria-label="Đóng">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Nội dung Form */}
        <div className="tsm-body">
          {errorMsg && (
            <div className="tsm-error-alert">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nhóm 1: Học viên & Lớp */}
          <div className="tsm-section">
            <div className="tsm-section-title">1. Thông tin học viên & lớp học</div>
            <div className="tsm-grid-2">
              <div className="tsm-field">
                <label>
                  Học viên <span className="req">*</span>
                </label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="tsm-select"
                >
                  <option value="">-- Chọn học viên --</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.id}) {st.phone ? `- ${st.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tsm-field">
                <label>Lớp học</label>
                <select
                  value={selectedClassCode}
                  onChange={(e) => setSelectedClassCode(e.target.value)}
                  className="tsm-select"
                >
                  <option value="">-- Chọn lớp học --</option>
                  {classes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.level || 'Lớp'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Nhóm 2: Loại buổi & Kỹ năng trọng tâm */}
          <div className="tsm-section">
            <div className="tsm-section-title">2. Phân loại buổi & kỹ năng trọng tâm</div>
            <div className="tsm-grid-2">
              <div className="tsm-field">
                <label>Loại buổi học</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="tsm-select"
                >
                  <option value="Bù bài học viên vắng (Makeup)">Bù bài học viên vắng (Makeup)</option>
                  <option value="Phụ đạo học lực yếu (Tutoring)">Phụ đạo học lực yếu (Tutoring)</option>
                  <option value="Ôn thi / Kiểm tra bổ sung">Ôn thi / Kiểm tra bổ sung</option>
                  <option value="Phụ đạo theo yêu cầu PH">Phụ đạo theo yêu cầu PH</option>
                </select>
              </div>

              <div className="tsm-field">
                <label>Kỹ năng trọng tâm</label>
                <select
                  value={focusSkills}
                  onChange={(e) => setFocusSkills(e.target.value)}
                  className="tsm-select"
                >
                  <option value="Tổng hợp / Toàn diện">Tổng hợp / Toàn diện</option>
                  <option value="Ngữ pháp (Grammar)">Ngữ pháp (Grammar)</option>
                  <option value="Từ vựng (Vocabulary)">Từ vựng (Vocabulary)</option>
                  <option value="Nghe - Nói (Listening & Speaking)">Nghe - Nói (Listening & Speaking)</option>
                  <option value="Đọc - Viết (Reading & Writing)">Đọc - Viết (Reading & Writing)</option>
                  <option value="Phản xạ giao tiếp (Reflex / Fluency)">Phản xạ giao tiếp (Reflex / Fluency)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nhóm 3: Giáo viên phụ trách */}
          <div className="tsm-section">
            <div className="tsm-section-title">3. Giáo viên / Trợ giảng phụ trách kèm</div>
            <div className="tsm-grid-2">
              <div className="tsm-field">
                <label>Giáo viên phụ trách</label>
                <select
                  value={teacherId}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  className="tsm-select"
                >
                  <option value="">-- Chọn giáo viên / trợ giảng --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.shortName ? `(${t.shortName})` : ''} - {t.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tsm-field">
                <label>Tên hiển thị trên thư phụ huynh</label>
                <input
                  type="text"
                  value={tutorName}
                  onChange={(e) => setTutorName(e.target.value)}
                  placeholder="Ví dụ: Thầy Nam / Cô Mai"
                  className="tsm-input"
                />
              </div>
            </div>
          </div>

          {/* Nhóm 4: Lịch học chi tiết (Hỗ trợ nhiều buổi/ngày, dạy trực tiếp, giờ tự nhập) */}
          <div className="tsm-section">
            <div className="tsm-section-header-row">
              <div className="tsm-section-title-alt">
                <i className="fa-solid fa-calendar-day text-amber"></i> Lịch học kèm (Trực tiếp tại trung tâm)
              </div>
              <button
                type="button"
                onClick={handleAddSession}
                className="tsm-btn-add-slot"
              >
                <i className="fa-solid fa-plus"></i> Thêm ngày / buổi học
              </button>
            </div>

            <div className="tsm-slots-list">
              {sessions.map((slot, idx) => (
                <div key={idx} className="tsm-slot-card">
                  <div className="tsm-slot-header">
                    <span className="tsm-slot-badge">Buổi số {idx + 1}</span>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSession(idx)}
                        className="tsm-slot-delete-btn"
                        title="Xóa buổi này"
                      >
                        <i className="fa-regular fa-trash-can"></i> Xóa
                      </button>
                    )}
                  </div>

                  <div className="tsm-slot-grid">
                    {/* Ngày học: date picker */}
                    <div className="tsm-field">
                      <label>
                        Ngày học <span className="req">*</span>
                      </label>
                      <input
                        type="date"
                        value={slot.teachingDate}
                        onChange={(e) => handleSessionChange(idx, 'teachingDate', e.target.value)}
                        className="tsm-input"
                      />
                    </div>

                    {/* Giờ bắt đầu: tự nhập */}
                    <div className="tsm-field">
                      <label>Giờ bắt đầu</label>
                      <input
                        type="text"
                        value={slot.startTimeText}
                        onChange={(e) => handleSessionChange(idx, 'startTimeText', e.target.value)}
                        placeholder="VD: 04:30 CH hoặc 16:30"
                        className="tsm-input"
                      />
                    </div>

                    {/* Giờ kết thúc: tự nhập */}
                    <div className="tsm-field">
                      <label>Giờ kết thúc</label>
                      <input
                        type="text"
                        value={slot.endTimeText}
                        onChange={(e) => handleSessionChange(idx, 'endTimeText', e.target.value)}
                        placeholder="VD: 05:30 CH hoặc 17:30"
                        className="tsm-input"
                      />
                    </div>

                    {/* Phòng học: trực tiếp */}
                    <div className="tsm-field">
                      <label>Phòng học trực tiếp</label>
                      <input
                        type="text"
                        value={slot.roomName}
                        onChange={(e) => handleSessionChange(idx, 'roomName', e.target.value)}
                        placeholder="VD: Phòng 201 hoặc P.Lab"
                        className="tsm-input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nhóm 5: Nội dung & Dặn dò */}
          <div className="tsm-section">
            <div className="tsm-section-title">5. Nội dung ôn tập & dặn dò học viên</div>
            <div className="tsm-field mb-3">
              <label>Nội dung bài học / Kiến thức cần bù</label>
              <textarea
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ví dụ: Ôn tập Unit 4, luyện thì Hiện tại hoàn thành, bổ trợ nghe..."
                className="tsm-textarea"
              />
            </div>

            <div className="tsm-field">
              <label>Dặn dò học viên (sách vở, dụng cụ mang theo)</label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ví dụ: Mang theo sách Student Book, vở ghi chép bài tập..."
                className="tsm-textarea"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="tsm-footer">
          <button type="button" className="tsm-btn tsm-btn-ghost" onClick={onClose} disabled={saving}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="tsm-btn tsm-btn-secondary"
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
            Lưu Lịch
          </button>
          <button
            type="button"
            className="tsm-btn tsm-btn-primary"
            onClick={() => handleSubmit(true)}
            disabled={saving}
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-envelope-open-text"></i>}
            Lưu & Xuất Thư Báo Zalo
          </button>
        </div>

      </div>

      {/* Scoped CSS */}
      <style jsx>{`
        .tsm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          animation: tsmFade 0.2s ease;
        }
        @keyframes tsmFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .tsm-modal {
          background: #ffffff;
          border-radius: 16px;
          max-width: 820px;
          width: 100%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px -12px rgba(15, 23, 42, 0.35);
          animation: tsmSlide 0.25s ease;
        }
        @keyframes tsmSlide {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Header */
        .tsm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 24px;
          background: linear-gradient(135deg, #085e8a 0%, #0D88C4 100%);
          color: #ffffff;
          position: relative;
        }
        .tsm-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FFCA29, #cca120);
        }
        .tsm-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tsm-icon-badge {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          color: #FFCA29;
          flex-shrink: 0;
        }
        .tsm-header h2 {
          font-size: 18px;
          font-weight: 800;
          margin: 0 0 2px 0;
          letter-spacing: -0.01em;
        }
        .tsm-header p {
          font-size: 12.5px;
          margin: 0;
          color: #e0f2fe;
        }
        .tsm-close-btn {
          width: 34px;
          height: 34px;
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
        .tsm-close-btn:hover {
          background: rgba(255, 255, 255, 0.28);
        }

        /* Body */
        .tsm-body {
          padding: 22px 24px;
          overflow-y: auto;
          flex: 1;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .tsm-error-alert {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }

        .tsm-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 16px;
        }
        .tsm-section-title {
          font-size: 12px;
          font-weight: 800;
          color: #085e8a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 12px;
        }
        .tsm-section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tsm-section-title-alt {
          font-size: 12.5px;
          font-weight: 800;
          color: #085e8a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .text-amber { color: #d97706; }

        .tsm-btn-add-slot {
          background: #e0f2fe;
          border: 1px solid #bae6fd;
          color: #0369a1;
          font-size: 12px;
          font-weight: 700;
          padding: 5px 12px;
          border-radius: 7px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s ease;
        }
        .tsm-btn-add-slot:hover {
          background: #0D88C4;
          color: #ffffff;
          border-color: #0D88C4;
        }

        .tsm-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .tsm-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .mb-3 { margin-bottom: 12px; }
        .tsm-field label {
          font-size: 12px;
          font-weight: 700;
          color: #475569;
        }
        .req { color: #ef4444; }

        .tsm-input, .tsm-select, .tsm-textarea {
          width: 100%;
          padding: 8px 12px;
          border-radius: 8px;
          border: 1px solid #cbd5e1;
          font-size: 13px;
          color: #1e293b;
          background: #ffffff;
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
          box-sizing: border-box;
        }
        .tsm-input:focus, .tsm-select:focus, .tsm-textarea:focus {
          border-color: #0D88C4;
          box-shadow: 0 0 0 3px rgba(13, 136, 196, 0.15);
        }
        .tsm-textarea {
          resize: vertical;
        }

        /* Slots list */
        .tsm-slots-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tsm-slot-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
        }
        .tsm-slot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .tsm-slot-badge {
          background: #e0f2fe;
          color: #0369a1;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 5px;
        }
        .tsm-slot-delete-btn {
          background: transparent;
          border: none;
          color: #ef4444;
          font-size: 11.5px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .tsm-slot-delete-btn:hover {
          text-decoration: underline;
        }
        .tsm-slot-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr 1.2fr;
          gap: 10px;
        }

        /* Footer */
        .tsm-footer {
          padding: 14px 24px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .tsm-btn {
          border: none;
          padding: 9px 18px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.15s ease;
        }
        .tsm-btn-ghost {
          background: transparent;
          color: #64748b;
        }
        .tsm-btn-ghost:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .tsm-btn-secondary {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .tsm-btn-secondary:hover {
          background: #e2e8f0;
          color: #0f172a;
        }
        .tsm-btn-primary {
          background: linear-gradient(135deg, #0D88C4 0%, #085e8a 100%);
          color: #ffffff;
          box-shadow: 0 4px 12px -2px rgba(13, 136, 196, 0.4);
        }
        .tsm-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -2px rgba(13, 136, 196, 0.55);
        }

        @media (max-width: 768px) {
          .tsm-grid-2 { grid-template-columns: 1fr; }
          .tsm-slot-grid { grid-template-columns: 1fr; }
          .tsm-body { padding: 16px; }
          .tsm-footer { padding: 12px 16px; }
        }
      `}</style>
    </div>
  );
}
