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
      setInstructions('');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-lg">
              <i className="fa-solid fa-calendar-plus"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Lên Lịch Phụ Đạo & Bù Bài</h3>
              <p className="text-xs text-gray-500">Thiết lập ngày, giờ và nội dung kèm riêng cho học viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Nội dung Form */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-sm">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Dòng 1: Học viên & Lớp */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">
                Học viên <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleStudentChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              >
                <option value="">-- Chọn học viên --</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.id}) {st.phone ? `- ${st.phone}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">Lớp học</label>
              <select
                value={selectedClassCode}
                onChange={(e) => setSelectedClassCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              >
                <option value="">-- Chọn lớp học --</option>
                {classes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dòng 2: Loại buổi & Kỹ năng trọng tâm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">Loại buổi học</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              >
                <option value="Bù bài học viên vắng (Makeup)">Bù bài học viên vắng (Makeup)</option>
                <option value="Phụ đạo học lực yếu (Tutoring)">Phụ đạo học lực yếu (Tutoring)</option>
                <option value="Ôn thi / Kiểm tra bổ sung">Ôn thi / Kiểm tra bổ sung</option>
                <option value="Phụ đạo theo yêu cầu PH">Phụ đạo theo yêu cầu PH</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-gray-700 mb-1.5">Kỹ năng trọng tâm</label>
              <select
                value={focusSkills}
                onChange={(e) => setFocusSkills(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              >
                <option value="Tổng hợp / Toàn diện">Tổng hợp / Toàn diện</option>
                <option value="Ngữ pháp (Grammar)">Ngữ pháp (Grammar)</option>
                <option value="Nghe - Nói (Listening & Speaking)">Nghe - Nói (Listening & Speaking)</option>
                <option value="Đọc - Viết (Reading & Writing)">Đọc - Viết (Reading & Writing)</option>
                <option value="Từ vựng & Phát âm (Vocabulary & Phonics)">Từ vựng & Phát âm (Vocabulary & Phonics)</option>
                <option value="Phản xạ giao tiếp">Phản xạ giao tiếp</option>
              </select>
            </div>
          </div>

          {/* Dòng 3: Khung lịch học (Hỗ trợ 1 hoặc nhiều buổi/ngày) */}
          <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 flex items-center gap-2">
                <i className="fa-solid fa-calendar-check text-indigo-600"></i>
                Lịch Học Kèm ({sessions.length} buổi dự kiến)
              </span>
              <button
                type="button"
                onClick={handleAddSession}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <i className="fa-solid fa-plus"></i>
                Thêm ngày/buổi tiếp theo
              </button>
            </div>

            <div className="space-y-3">
              {sessions.map((s, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-indigo-100 rounded-xl p-3.5 shadow-sm relative space-y-2.5"
                >
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md">
                      Buổi {idx + 1}
                    </span>
                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSession(idx)}
                        className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1 transition-colors"
                      >
                        <i className="fa-regular fa-trash-can"></i>
                        Xóa buổi này
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Ngày phụ đạo <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={s.teachingDate}
                        onChange={(e) => handleSessionChange(idx, 'teachingDate', e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Giờ bắt đầu</label>
                      <input
                        type="text"
                        value={s.startTimeText}
                        onChange={(e) => handleSessionChange(idx, 'startTimeText', e.target.value)}
                        placeholder="VD: 04:30 CH hoặc 16:30"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Giờ kết thúc</label>
                      <input
                        type="text"
                        value={s.endTimeText}
                        onChange={(e) => handleSessionChange(idx, 'endTimeText', e.target.value)}
                        placeholder="VD: 05:30 CH hoặc 17:30"
                        className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Địa điểm / Phòng học (Trực tiếp)</label>
                    <input
                      type="text"
                      value={s.roomName}
                      onChange={(e) => handleSessionChange(idx, 'roomName', e.target.value)}
                      placeholder="Phòng học tại trung tâm (VD: P.101, P.202...)"
                      className="w-full px-3 py-1.5 rounded-lg border border-gray-300 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dòng 4: Giáo viên kèm */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">Giáo viên / Trợ giảng kèm</label>
            <select
              value={teacherId}
              onChange={(e) => {
                setTeacherId(e.target.value);
                const t = teachers.find((u) => u.id === e.target.value);
                if (t) setTutorName(t.shortName || t.fullName);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
            >
              <option value="">-- Phân công giáo viên sau --</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName} {t.shortName ? `(${t.shortName})` : ''} - {t.role}
                </option>
              ))}
            </select>
          </div>

          {/* Dòng 5: Nội dung bài học */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">Nội dung bài học & mục tiêu bù bài</label>
            <textarea
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="VD: Ôn lại từ vựng Unit 3, luyện cấu trúc ngữ pháp thì hiện tại đơn, bù bài học ngày vắng..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Dòng 6: Dặn dò */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">
              Dặn dò học viên / Phụ huynh (Đồ dùng mang theo)
            </label>
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="VD: Mang theo sách Student Book và vở ghi chép bài tập..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-gray-200 text-gray-800 font-semibold hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-regular fa-bookmark"></i>}
            Lưu lịch
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
            Lưu & Xuất Thư Hẹn Phụ Huynh
          </button>
        </div>
      </div>
    </div>
  );
}
