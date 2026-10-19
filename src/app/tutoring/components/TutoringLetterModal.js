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
  const sessions = plan.sessions || [];

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
    if (!letterRef.current) return;
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
        setTimeout(() => setCopySuccess(false), 3000);
      } else {
        // Fallback: Tự động tải ảnh nếu clipboard không hỗ trợ blob
        handleDownloadImage();
      }
    } catch (err) {
      console.error('Lỗi copy ảnh:', err);
      // Fallback
      handleDownloadImage();
    } finally {
      setCopying(false);
    }
  };

  // Tải file ảnh PNG độ nét cao
  const handleDownloadImage = async () => {
    if (!letterRef.current) return;
    setDownloading(true);

    try {
      const dataUrl = await htmlToImage.toPng(letterRef.current, {
        pixelRatio: 2.5,
        cacheBust: true,
        backgroundColor: '#ffffff'
      });

      const filename = `Thu_Phu_Dao_${studentName.replace(/\s+/g, '_')}_${plan.planCode || 'Pass'}.png`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-6 overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Action Bar */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
              <i className="fa-solid fa-envelope-open-text"></i>
            </span>
            <div>
              <h4 className="font-bold text-gray-800 text-sm">Thư Hẹn Phụ Huynh (Bản xem trước)</h4>
              <p className="text-xs text-gray-500">Xuất ảnh nét cao gửi Zalo cho phụ huynh học viên</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        {/* Khung Hiển Thị Thư Hẹn (Render Node) */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            ref={letterRef}
            style={{ width: '520px', fontFamily: "'Be Vietnam Pro', system-ui, sans-serif" }}
            className="bg-white rounded-2xl shadow-md border border-amber-200/60 overflow-hidden text-slate-800 p-6 space-y-4"
          >
            {/* Header Thương hiệu */}
            <div className="flex items-center justify-between border-b-2 border-amber-500/30 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-amber-400 flex items-center justify-center text-xl shadow-sm">
                  <i className="fa-solid fa-graduation-cap"></i>
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-wider text-indigo-950 uppercase">
                    Anh Ngữ Quốc Tế Nhật Mỹ
                  </h2>
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-widest">
                    Dedicated To Excellence
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  {plan.planCode || 'TUTOR-PASS'}
                </span>
                <p className="text-[10px] text-gray-400 mt-0.5">Dạy trực tiếp tại cơ sở</p>
              </div>
            </div>

            {/* Tiêu đề thư */}
            <div className="text-center pt-1 pb-1">
              <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-900 text-xs font-bold uppercase tracking-wider mb-1">
                {sessionType}
              </span>
              <h1 className="text-lg font-black text-indigo-950 uppercase tracking-wide">
                GIẤY HẸN PHỤ ĐẠO & BÙ BÀI
              </h1>
              <p className="text-xs text-gray-500 italic mt-0.5">
                Hỗ trợ củng cố kiến thức và đồng hành cùng tiến độ học tập của bé
              </p>
            </div>

            {/* Thông tin học viên */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Kính gửi Quý Phụ huynh em:</span>
                <span className="font-bold text-sm text-indigo-950">{studentName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Lớp học chính khóa:</span>
                <span className="font-semibold text-gray-800">{classCode}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Giáo viên / Trợ giảng kèm:</span>
                <span className="font-semibold text-indigo-900">{tutorName}</span>
              </div>
            </div>

            {/* Lịch học kèm chi tiết */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950">
                <i className="fa-solid fa-calendar-day text-amber-600"></i>
                <span>LỊCH HỌC KÈM CHI TIẾT:</span>
              </div>

              <div className="space-y-2">
                {sessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-indigo-950">
                      <span className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px]">
                          {idx + 1}
                        </span>
                        {formatDateVi(s.teachingDate)}
                      </span>
                      <span className="text-amber-800 font-extrabold">
                        {s.startTimeText || '16:30'} – {s.endTimeText || '17:30'}
                      </span>
                    </div>
                    <div className="text-gray-600 flex items-center gap-1 pl-6">
                      <i className="fa-solid fa-location-dot text-amber-600 text-[11px]"></i>
                      <span>Địa điểm: <strong className="text-gray-800">{s.roomName || 'Phòng học tại trung tâm'}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nội dung ôn tập & Kỹ năng */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-950 whitespace-nowrap">🎯 Kỹ năng trọng tâm:</span>
                <span className="text-indigo-900 font-medium">{focusSkills}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-950 whitespace-nowrap">📝 Nội dung ôn tập:</span>
                <span className="text-gray-700">{content}</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="font-bold text-indigo-950 whitespace-nowrap">🎒 Đồ dùng mang theo:</span>
                <span className="text-gray-700 font-medium">{instructions}</span>
              </div>
            </div>

            {/* Lời nhắn nhủ & Chân trang */}
            <div className="text-[11px] text-gray-500 text-center italic leading-relaxed pt-1">
              "Vì sự tiến bộ của con, kính mong Quý Phụ huynh sắp xếp nhắc nhở và đưa đón bé tham dự đầy đủ, đúng giờ."
            </div>

            <div className="border-t border-gray-200/70 pt-3 flex items-end justify-between text-xs">
              <div>
                <p className="text-[10px] text-gray-400">TRUNG TÂM ANH NGỮ NHẬT MỸ</p>
                <p className="text-xs font-bold text-indigo-950">Bộ Phận Chuyên Môn & CSKH</p>
                <p className="text-[11px] text-gray-500">Hotline: 090x xxx xxx</p>
              </div>
              <div className="text-right">
                <div className="inline-block px-3 py-1 rounded bg-amber-100 text-amber-900 font-bold text-[10px] border border-amber-300">
                  XÁC NHẬN TỔ CHỨC
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Điều Khiển & Hành Động */}
        <div className="px-5 py-3.5 bg-white border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {copySuccess && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <i className="fa-solid fa-circle-check"></i> Đã sao chép ảnh! Hãy mở Zalo bấm Ctrl+V
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenZalo}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              <i className="fa-solid fa-comment-dots"></i>
              Mở Zalo
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs transition-colors flex items-center gap-1.5"
            >
              {downloading ? (
                <i className="fa-solid fa-spinner fa-spin"></i>
              ) : (
                <i className="fa-solid fa-download"></i>
              )}
              Tải File Ảnh (.PNG)
            </button>

            <button
              onClick={handleCopyImage}
              disabled={copying}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
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
    </div>
  );
}
