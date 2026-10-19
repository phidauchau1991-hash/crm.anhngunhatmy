'use client';

import React, { useState } from 'react';

export default function TutoringCompleteModal({ isOpen, onClose, onSuccess, session, plan }) {
  const [attendanceStatus, setAttendanceStatus] = useState(session?.attendanceStatus || 'Có mặt');
  const [evaluation, setEvaluation] = useState(session?.evaluation || 'Tốt');
  const [evaluationNotes, setEvaluationNotes] = useState(session?.evaluationNotes || '');
  const [homeworkAssigned, setHomeworkAssigned] = useState(session?.homeworkAssigned || '');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-lg">
              <i className="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Điểm Danh & Đánh Giá Buổi Kèm</h3>
              <p className="text-xs text-gray-500">
                Buổi {session.sessionNumber} ({session.teachingDate} • {session.startTimeText || '16:30'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Nội dung form */}
        <div className="p-6 space-y-4 text-sm">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Thông tin học viên tóm tắt */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-gray-500 block">Học viên:</span>
              <strong className="text-gray-900 text-sm">{studentName}</strong>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block">Lớp:</span>
              <strong className="text-gray-800">{classCode}</strong>
            </div>
          </div>

          {/* 1. Trạng thái tham gia */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Trạng thái tham gia</label>
            <div className="grid grid-cols-3 gap-2">
              {['Có mặt', 'Đi trễ', 'Vắng mặt'].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAttendanceStatus(status)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                    attendanceStatus === status
                      ? status === 'Có mặt'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : status === 'Đi trễ'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                        : 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {status === 'Có mặt' && <i className="fa-solid fa-check mr-1.5"></i>}
                  {status === 'Đi trễ' && <i className="fa-regular fa-clock mr-1.5"></i>}
                  {status === 'Vắng mặt' && <i className="fa-solid fa-xmark mr-1.5"></i>}
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Mức độ tiếp thu */}
          <div>
            <label className="block font-semibold text-gray-700 mb-2">Mức độ tiếp thu bài học</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Xuất sắc', star: '⭐⭐⭐⭐' },
                { label: 'Tốt', star: '⭐⭐⭐' },
                { label: 'Trung bình', star: '⭐⭐' },
                { label: 'Cần cố gắng', star: '⭐' }
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setEvaluation(item.label)}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                    evaluation === item.label
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span>{item.label}</span>
                    <span className="text-[11px]">{item.star}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Nhận xét của giáo viên */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">Nhận xét chi tiết của giáo viên</label>
            <textarea
              rows={2}
              value={evaluationNotes}
              onChange={(e) => setEvaluationNotes(e.target.value)}
              placeholder="VD: Bé nắm từ vựng nhanh, hiểu ngữ pháp bài vắng, tự tin phát âm..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs"
            />
          </div>

          {/* 4. Bài tập về nhà bổ sung */}
          <div>
            <label className="block font-semibold text-gray-700 mb-1.5">Bài tập về nhà bổ sung (nếu có)</label>
            <input
              type="text"
              value={homeworkAssigned}
              onChange={(e) => setHomeworkAssigned(e.target.value)}
              placeholder="VD: Hoàn thành 5 câu bài tập trang 24 Workbook..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold text-xs hover:bg-gray-100 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
          >
            {submitting ? (
              <i className="fa-solid fa-spinner fa-spin"></i>
            ) : (
              <i className="fa-solid fa-check-double"></i>
            )}
            Lưu Đánh Giá & Hoàn Thành
          </button>
        </div>
      </div>
    </div>
  );
}
