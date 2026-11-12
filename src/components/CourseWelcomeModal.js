'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import CourseWelcomeTemplate, { FIXED_NOTE_1, FIXED_NOTE_2 } from '@/app/components/CourseWelcomeTemplate';
import { getClassScheduleDetails, formatClassCode } from '@/lib/classHelper';

/**
 * Helper parse chuỗi ngày (hỗ trợ cả ISO "2026-11-14", Date object, lẫn chuỗi vi-VN "14/11/2026")
 */
function parseAnyDate(rawDate, isoDate) {
  const candidate = isoDate || rawDate;
  if (!candidate) return null;

  const str = String(candidate).trim();
  // Kiểm tra định dạng YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    return new Date(y, m, d);
  }

  // Kiểm tra định dạng DD/MM/YYYY
  const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (vnMatch) {
    const d = Number(vnMatch[1]);
    const m = Number(vnMatch[2]) - 1;
    const y = Number(vnMatch[3]);
    return new Date(y, m, d);
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Chuyển ngày thành "Thứ 7, ngày 14/11/2026"
 */
function formatVietnameseDateWithDay(rawDate, isoDate) {
  const d = parseAnyDate(rawDate, isoDate);
  if (!d) return String(rawDate || '').trim() || '';

  const daysOfWeek = [
    'Chủ Nhật',
    'Thứ 2',
    'Thứ 3',
    'Thứ 4',
    'Thứ 5',
    'Thứ 6',
    'Thứ 7',
  ];
  const dayName = daysOfWeek[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${dayName}, ngày ${dd}/${mm}/${yyyy}`;
}

/**
 * Chuyển ngày kết thúc từ lớp học thành "28/02/2027" hoặc "Học liên tục"
 */
function formatEndDateFromClass(rawEndDate, isoEndDate) {
  const rawStr = String(rawEndDate || '').trim();
  if (/học\s*liên\s*tục/i.test(rawStr)) return 'Học liên tục';

  const d = parseAnyDate(rawEndDate, isoEndDate);
  if (d) {
    if (d.getFullYear() > 2090) return 'Học liên tục';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  if (rawStr) return rawStr;
  return 'Theo lộ trình khóa';
}

export default function CourseWelcomeModal({
  isOpen,
  onClose,
  data = null, // Có thể là lead hoặc student
  classList = [],
}) {
  const templateRef = useRef(null);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Form State
  const [studentName, setStudentName] = useState('');
  const [studentCode, setStudentCode] = useState('');
  const [programLevel, setProgramLevel] = useState('');
  const [selectedClassCode, setSelectedClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('Phòng 202 (Lầu 1)');
  const [startDateText, setStartDateText] = useState('');
  const [scheduleDays, setScheduleDays] = useState('');
  const [studyHours, setStudyHours] = useState('');
  const [endDateText, setEndDateText] = useState('');
  const [suggestedMessage, setSuggestedMessage] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Nạp thông tin ban đầu khi mở modal
  useEffect(() => {
    if (isOpen && data) {
      const name = data.name || data.fullName || '';
      const rawId = String(data.id || data.studentId || '').trim();
      // Chỉ hiển thị mã học viên nếu là mã chuẩn HV... (tránh hiển thị ID số của Lead)
      const isOfficialStudentCode = /^HV/i.test(rawId);
      setStudentName(name);
      setStudentCode(isOfficialStudentCode ? rawId : '');

      // Xác định lớp ban đầu
      const initialClassCode =
        data.classCode ||
        data.trialClassCode ||
        data.enrolledClassCode ||
        (classList.length > 0 ? classList[0].code : '');
      setSelectedClassCode(initialClassCode);
    }
  }, [isOpen, data, classList]);

  // Khi chọn hoặc đổi lớp: Tự động tra cứu lịch, giờ học, ngày bắt đầu, ngày kết thúc dự kiến, giáo viên
  useEffect(() => {
    if (!selectedClassCode) return;

    const targetClass = classList.find(c => c.code === selectedClassCode);

    // Format tên lớp hiển thị
    const friendlyName = formatClassCode(selectedClassCode);
    setClassName(friendlyName ? `Lớp ${friendlyName}` : selectedClassCode);

    // Tính toán lịch học & giờ học từ helper chuẩn
    const scheduleDetails = getClassScheduleDetails(
      selectedClassCode,
      targetClass?.scheduleRaw || targetClass?.schedule
    );
    setScheduleDays(targetClass?.schedule || scheduleDetails.daysDisplay || 'Thứ 7, Chủ Nhật');
    setStudyHours(
      scheduleDetails.hours
        ? `${scheduleDetails.hours} (${scheduleDetails.shiftName || 'Ca 1'})`
        : scheduleDetails.shiftName || 'Ca 1'
    );

    // Giáo viên
    if (targetClass?.teacherName) {
      setTeacherName(targetClass.teacherName);
    } else {
      const parts = selectedClassCode.split('_');
      setTeacherName(parts.length >= 3 ? parts[2] : 'Ms My');
    }

    // Ngày bắt đầu học (lấy từ lớp học)
    if (targetClass?.startDate || targetClass?.startDateIso) {
      setStartDateText(formatVietnameseDateWithDay(targetClass.startDate, targetClass.startDateIso));
    } else {
      setStartDateText(formatVietnameseDateWithDay(new Date()));
    }

    // Ngày kết thúc dự kiến (tự động xuất chuẩn xác từ hệ thống)
    if (targetClass?.expectedEndDate || targetClass?.expectedEndDateIso) {
      setEndDateText(formatEndDateFromClass(targetClass.expectedEndDate, targetClass.expectedEndDateIso));
    } else {
      setEndDateText('Theo lộ trình khóa');
    }

    // Cấp độ / Chương trình
    const level = targetClass?.level || selectedClassCode.split('_')[1] || '';
    if (level.startsWith('S') || level.includes('Starter')) {
      setProgramLevel(`Tiếng Anh Thiếu Nhi Starters (${level})`);
    } else if (level.startsWith('M') || level.includes('Mover')) {
      setProgramLevel(`Tiếng Anh Thiếu Nhi Movers (${level})`);
    } else if (level.startsWith('F') || level.includes('Flyer')) {
      setProgramLevel(`Tiếng Anh Thiếu Nhi Flyers (${level})`);
    } else if (level.includes('KET')) {
      setProgramLevel(`Tiếng Anh Thiếu Niên Cambridge KET (${level})`);
    } else if (level.includes('PET')) {
      setProgramLevel(`Tiếng Anh Thiếu Niên Cambridge PET (${level})`);
    } else {
      setProgramLevel(`Tiếng Anh Chuẩn Cambridge Quốc Tế`);
    }
  }, [selectedClassCode, classList]);

  // Cập nhật lời nhắn Zalo soạn sẵn
  useEffect(() => {
    const msg =
      `Dạ Trung tâm Anh ngữ Nhật Mỹ xin kính gửi Quý Phụ huynh Thư Chào Mừng & Thông Báo Lịch Học Chính Thức của bé ${studentName}.\n\n` +
      `📅 Ngày bắt đầu học: ${startDateText}\n` +
      `⏰ Giờ học: ${studyHours} (${scheduleDays})\n` +
      `🎯 Dự kiến kết thúc khóa: ${endDateText}\n` +
      `🏫 ${className} • GV: ${teacherName} • ${room}\n\n` +
      `Ba mẹ lưu lại hình ảnh thư này để nhớ lịch đưa đón con nhé. Trung tâm và thầy cô đã chuẩn bị sẵn sàng chào đón bé rồi ạ! ❤️\n` +
      `Hotline hỗ trợ: 0911 767 069`;
    setSuggestedMessage(msg);
  }, [studentName, className, teacherName, room, startDateText, scheduleDays, studyHours, endDateText]);

  // Nhóm danh sách lớp theo cấp độ
  const groupedClasses = useMemo(() => {
    const groups = {};
    classList.forEach(cls => {
      let capDo = cls.capDo || 'Khác';
      if (!cls.capDo) {
        const lvl = (cls.level || '').toUpperCase();
        if (lvl.startsWith('S') || lvl.includes('STARTER')) capDo = 'Starters (Mầm non & Tiểu học)';
        else if (lvl.startsWith('M') || lvl.includes('MOVER')) capDo = 'Movers (Tiểu học)';
        else if (lvl.startsWith('F') || lvl.includes('FLYER')) capDo = 'Flyers (Tiểu học & THCS)';
        else if (lvl.includes('KET') || lvl.includes('PET')) capDo = 'Cambridge KET / PET';
        else capDo = 'Các lớp học khác';
      }
      if (!groups[capDo]) groups[capDo] = [];
      groups[capDo].push(cls);
    });
    return groups;
  }, [classList]);

  const templateData = {
    studentName,
    studentCode,
    programLevel,
    className,
    rawClassCode: selectedClassCode,
    teacherName,
    room,
    startDateText,
    scheduleDays,
    studyHours,
    endDateText,
    issuedDate: new Date().toLocaleDateString('vi-VN'),
  };

  // Helper chung đảm bảo load đầy đủ font tiếng Việt Be Vietnam Pro trước khi chụp Retina 2x
  const captureTemplateCanvas = async () => {
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
        const criticalFonts = [
          '400 16px "Be Vietnam Pro"',
          '500 16px "Be Vietnam Pro"',
          '600 16px "Be Vietnam Pro"',
          '700 16px "Be Vietnam Pro"',
          '800 16px "Be Vietnam Pro"',
          '900 16px "Be Vietnam Pro"',
          'italic 500 16px "Be Vietnam Pro"',
        ];
        await Promise.allSettled(
          criticalFonts.map((f) => document.fonts.load(f, 'ANH NGỮ NHẬT MỸ Ữ Ậ Ỹ Ễ Ỗ'))
        );
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve))
        );
      } catch (e) {
        // Bỏ qua nếu font API bị giới hạn
      }
    }

    return html2canvas(templateRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    });
  };

  // Sao chép thư trực tiếp vào Clipboard (PNG Retina 2x)
  const handleCopyImage = async () => {
    if (!templateRef.current) return;
    setIsCopying(true);
    try {
      const canvas = await captureTemplateCanvas();

      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast('Không thể tạo file ảnh từ thư.', 'error');
          setIsCopying(false);
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          showToast('✅ Đã copy Thư Lịch Học! Nhấn Ctrl+V dán ngay vào Zalo.', 'success');
        } catch (clipErr) {
          console.warn('Clipboard write failed, falling back to download:', clipErr);
          const link = document.createElement('a');
          link.download = `ThuLichHoc_${studentName.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
          showToast('Đã tải ảnh thư xuống máy (Trình duyệt chưa bật quyền dán ảnh trực tiếp).', 'info');
        } finally {
          setIsCopying(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Lỗi xuất ảnh thư:', err);
      showToast('Có lỗi xảy ra khi tạo ảnh thư.', 'error');
      setIsCopying(false);
    }
  };

  // Tải ảnh PNG về máy
  const handleDownloadImage = async () => {
    if (!templateRef.current) return;
    setIsDownloading(true);
    try {
      const canvas = await captureTemplateCanvas();

      const link = document.createElement('a');
      link.download = `ThuLichHoc_${studentName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('✅ Đã tải ảnh Thư Lịch Học chất lượng cao (Retina 2x)!', 'success');
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      showToast('Không thể tải ảnh.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Copy lời nhắn Zalo
  const handleCopyZaloText = () => {
    navigator.clipboard.writeText(suggestedMessage);
    showToast('✅ Đã copy lời nhắn Zalo! Dán gửi kèm ảnh cho phụ huynh.', 'success');
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Khung ẩn chứa thẻ Template full size 800px để capture Retina */}
      <div
        style={{
          position: 'fixed',
          top: '-99999px',
          left: '-99999px',
          width: '800px',
        }}
      >
        <CourseWelcomeTemplate ref={templateRef} data={templateData} />
      </div>

      {/* MODAL CONTAINER */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1280px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeInScale 0.2s ease-out',
        }}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#0D88C4',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '3px solid #FFCA29',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>📢</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', letterSpacing: '0.5px' }}>
                CHÀO MỪNG HỌC VIÊN MỚI — THÔNG BÁO LỊCH HỌC CHÍNH THỨC
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                Học viên: <strong>{studentName}</strong> • {className} • Kết thúc dự kiến: <strong>{endDateText}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '28px',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 6px',
            }}
            title="Đóng"
          >
            &times;
          </button>
        </div>

        {/* TOAST MESSAGE */}
        {toastMessage && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: toastMessage.type === 'error' ? '#EF4444' : '#10B981',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {toastMessage.text}
          </div>
        )}

        {/* MODAL BODY (CHIA 2 CỘT: TRÁI CHỈNH SỬA - PHẢI XEM TRƯỚC) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '450px 1fr',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* CỘT TRÁI: FORM ĐIỀU CHỈNH NHANH */}
          <div
            style={{
              padding: '20px',
              overflowY: 'auto',
              backgroundColor: '#F8FAFC',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0D88C4', borderBottom: '2px solid #E2E8F0', paddingBottom: '6px' }}>
              ⚙️ THÔNG TIN KHÓA HỌC &amp; HỌC VIÊN
            </div>

            {/* Họ tên & Mã học viên */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Họ và tên học viên *
                </label>
                <input
                  type="text"
                  value={studentName}
                  onChange={e => setStudentName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: '700' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Mã học viên (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value)}
                  placeholder="VD: HV2611_001"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Chọn Lớp học */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Lớp học tiếp nhận * (Tự động xuất Ngày Bắt đầu &amp; Kết thúc)
              </label>
              <select
                value={selectedClassCode}
                onChange={e => setSelectedClassCode(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #0D88C4', fontSize: '13px', fontWeight: '700', backgroundColor: '#FFFFFF' }}
              >
                <option value="">-- Chọn lớp học --</option>
                {Object.entries(groupedClasses).map(([groupTitle, clsList]) => (
                  <optgroup key={groupTitle} label={groupTitle}>
                    {clsList.map(cls => (
                      <option key={cls.code} value={cls.code}>
                        {formatClassCode(cls.code)} ({cls.code})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Giáo viên & Phòng học */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Giáo viên phụ trách
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={e => setTeacherName(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Phòng học
                </label>
                <input
                  type="text"
                  value={room}
                  onChange={e => setRoom(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Ngày bắt đầu học & Ngày kết thúc dự kiến */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0D88C4', marginBottom: '4px' }}>
                  🗓️ Ngày bắt đầu học chính thức
                </label>
                <input
                  type="text"
                  value={startDateText}
                  onChange={e => setStartDateText(e.target.value)}
                  placeholder="VD: Thứ 7, ngày 14/11/2026"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '2px solid #FFCA29', fontSize: '13px', fontWeight: '800', backgroundColor: '#FFFDF5' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#D97706', marginBottom: '4px' }}>
                  🎯 Dự kiến kết thúc
                </label>
                <input
                  type="text"
                  value={endDateText}
                  onChange={e => setEndDateText(e.target.value)}
                  placeholder="VD: 28/02/2027"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1.5px solid #FCD34D', fontSize: '13px', fontWeight: '800', backgroundColor: '#FFFDF5' }}
                />
              </div>
            </div>

            {/* Lịch học & Khung giờ học */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Lịch học trong tuần
                </label>
                <input
                  type="text"
                  value={scheduleDays}
                  onChange={e => setScheduleDays(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                  Khung giờ học
                </label>
                <input
                  type="text"
                  value={studyHours}
                  onChange={e => setStudyHours(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Khung hiển thị 2 lưu ý cố định */}
            <div style={{ backgroundColor: '#F0F9FF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #BAE6FD', fontSize: '12px', color: '#0369A1' }}>
              <div style={{ fontWeight: '800', marginBottom: '4px' }}>📌 2 Lưu ý cố định trên thư:</div>
              <div style={{ marginBottom: '4px', lineHeight: 1.4 }}>
                <strong>1. Trang phục &amp; Đồ dùng:</strong> {FIXED_NOTE_1}
              </div>
              <div style={{ lineHeight: 1.4 }}>
                <strong>2. Thời gian có mặt:</strong> {FIXED_NOTE_2}
              </div>
            </div>

            {/* Lời nhắn Zalo mẫu */}
            <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF' }}>
                  💬 Mẫu tin nhắn Zalo gửi phụ huynh
                </span>
                <button
                  type="button"
                  onClick={handleCopyZaloText}
                  style={{
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Sao chép tin
                </button>
              </div>
              <textarea
                rows={4}
                value={suggestedMessage}
                onChange={e => setSuggestedMessage(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #93C5FD', fontSize: '11.5px', color: '#1E293B', backgroundColor: '#FFFFFF' }}
              />
            </div>
          </div>

          {/* CỘT PHẢI: LIVE PREVIEW THƯ (THU PHÓNG TỶ LỆ) */}
          <div
            style={{
              padding: '20px',
              backgroundColor: '#334155',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                fontSize: '12.5px',
                color: '#CBD5E1',
                marginBottom: '12px',
                textAlign: 'center',
                fontWeight: '600',
              }}
            >
              👁️ BẢN XEM TRƯỚC THIỆP GỬI ZALO (1 Font Đồng Nhất • Retina 2x):
            </div>

            <div
              style={{
                transform: 'scale(0.68)',
                transformOrigin: 'top center',
                marginBottom: '-290px',
              }}
            >
              <CourseWelcomeTemplate data={templateData} />
            </div>
          </div>
        </div>

        {/* MODAL FOOTER ACTION BAR */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#F1F5F9',
            borderTop: '1px solid #CBD5E1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '13px', color: '#64748B' }}>
            💡 Mẹo: Nhấn <strong>&quot;📋 Copy Thư (Dán Zalo)&quot;</strong> rồi qua cửa sổ Zalo bấm <strong>Ctrl+V</strong> để gửi ngay thiệp ảnh sắc nét.
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={handleCopyZaloText}
              style={{
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                border: '1px solid #93C5FD',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              💬 Copy Lời Nhắn
            </button>

            <button
              onClick={handleDownloadImage}
              disabled={isDownloading}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                border: '1.5px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: isDownloading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isDownloading ? '⏳ Đang tạo...' : '💾 Tải Ảnh PNG'}
            </button>

            <button
              onClick={handleCopyImage}
              disabled={isCopying}
              style={{
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontSize: '13.5px',
                fontWeight: '800',
                cursor: isCopying ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)',
              }}
            >
              {isCopying ? '⏳ Đang sao chép...' : '📋 Copy Thư (Dán Zalo)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
