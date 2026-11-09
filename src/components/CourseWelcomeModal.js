'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import html2canvas from 'html2canvas';
import CourseWelcomeTemplate from '@/app/components/CourseWelcomeTemplate';
import { getClassScheduleDetails, formatClassCode } from '@/lib/classHelper';

/**
 * Helper chuyển ngày Date / ISO string thành "Thứ Bảy, ngày 14/11/2026"
 */
function formatVietnameseDateWithDay(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const daysOfWeek = [
    'Chủ Nhật',
    'Thứ Hai',
    'Thứ Ba',
    'Thứ Tư',
    'Thứ Năm',
    'Thứ Sáu',
    'Thứ Bảy',
  ];
  const dayName = daysOfWeek[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();

  return `${dayName}, ngày ${dd}/${mm}/${yyyy}`;
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
  const [room, setRoom] = useState('Phòng 01 (Lầu 1)');
  const [branchName, setBranchName] = useState('Cơ sở 1 - Nhật Mỹ Bình Dương');
  const [startDateText, setStartDateText] = useState('');
  const [scheduleDays, setScheduleDays] = useState('');
  const [studyHours, setStudyHours] = useState('');
  const [endDateText, setEndDateText] = useState('');
  const [notesUniform, setNotesUniform] = useState(
    'Bé mặc trang phục gọn gàng/đồng phục, mang theo tập vở và bút. Giáo trình chính khóa và Thẻ học liệu số sẽ được thầy cô trao tận tay bé trong buổi học đầu tiên.'
  );
  const [notesArrival, setNotesArrival] = useState(
    'Ba mẹ vui lòng đưa bé đến trước giờ học 10 - 15 phút trong ngày khai giảng để thầy cô đón bé, ổn định chỗ ngồi và làm quen không khí lớp học.'
  );
  const [notesPickup, setNotesPickup] = useState(
    'Giờ tan học đúng giờ theo ca, thầy cô bàn giao bé tận tay tại sảnh đón. Hotline hỗ trợ phụ huynh: 0911 767 069.'
  );
  const [suggestedMessage, setSuggestedMessage] = useState('');

  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Nạp thông tin ban đầu khi mở modal
  useEffect(() => {
    if (isOpen && data) {
      const name = data.name || data.fullName || '';
      const code = data.id || (data.studentId ? data.studentId : `HV-${Date.now().toString().slice(-4)}`);
      setStudentName(name);
      setStudentCode(code);

      // Xác định lớp ban đầu
      const initialClassCode =
        data.classCode ||
        data.trialClassCode ||
        data.enrolledClassCode ||
        (classList.length > 0 ? classList[0].code : '');
      setSelectedClassCode(initialClassCode);
    }
  }, [isOpen, data, classList]);

  // Khi chọn hoặc đổi lớp: Tự động tra cứu lịch, giờ học, ngày khai giảng, giáo viên
  useEffect(() => {
    if (!selectedClassCode) return;

    // Tìm lớp trong classList
    const targetClass = classList.find(c => c.code === selectedClassCode);

    // Format tên lớp hiển thị
    const friendlyName = formatClassCode(selectedClassCode);
    setClassName(friendlyName ? `Lớp ${friendlyName}` : selectedClassCode);

    // Tính toán lịch học & giờ học từ helper chuẩn
    const scheduleDetails = getClassScheduleDetails(
      selectedClassCode,
      targetClass?.schedule
    );
    setScheduleDays(scheduleDetails.daysDisplay || 'Thứ 7 & Chủ Nhật');
    setStudyHours(scheduleDetails.hours ? `${scheduleDetails.hours} (${scheduleDetails.shiftName || 'Ca 1'})` : (scheduleDetails.shiftName || 'Ca 1'));

    // Giáo viên
    if (targetClass?.teacherName) {
      setTeacherName(targetClass.teacherName);
    } else {
      // Thử bóc tách từ tên lớp: e.g. CN1_M1_MsMy_7CN_Ca1 -> Ms My
      const parts = selectedClassCode.split('_');
      setTeacherName(parts.length >= 3 ? parts[2] : 'Ms Trúc My');
    }

    // Ngày khai giảng
    if (targetClass?.startDateIso || targetClass?.startDate) {
      setStartDateText(formatVietnameseDateWithDay(targetClass.startDateIso || targetClass.startDate));
    } else {
      setStartDateText(formatVietnameseDateWithDay(new Date()));
    }

    // Ngày kết thúc
    if (targetClass?.expectedEndDate) {
      const d = new Date(targetClass.expectedEndDate);
      setEndDateText(!isNaN(d.getTime()) ? `${d.toLocaleDateString('vi-VN')} (Dự kiến)` : 'Đang cập nhật');
    } else {
      setEndDateText('Khóa 32 buổi (Dự kiến)');
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
      setProgramLevel(`Tiếng Anh Thiếu Niên Cambridge KET (A2)`);
    } else if (level.includes('PET')) {
      setProgramLevel(`Tiếng Anh Thiếu Niên Cambridge PET (B1)`);
    } else {
      setProgramLevel(`Tiếng Anh Chuẩn Cambridge Quốc Tế`);
    }
  }, [selectedClassCode, classList]);

  // Cập nhật lời nhắn Zalo soạn sẵn
  useEffect(() => {
    const msg = `Dạ Trung tâm Anh ngữ Nhật Mỹ xin kính gửi Quý Phụ huynh Thư Chào Mừng & Thông Báo Khai Giảng chính thức của bé ${studentName}.\n\n` +
      `📅 Ngày khai giảng: ${startDateText}\n` +
      `⏰ Giờ học: ${studyHours} (${scheduleDays})\n` +
      `🏫 Lớp: ${className} • GV: ${teacherName} • ${room}\n\n` +
      `Ba mẹ lưu lại hình ảnh thư này để nhớ lịch đưa đón con nhé. Trung tâm và thầy cô đã chuẩn bị sẵn sàng chào đón bé trong buổi học đầu tiên rồi ạ! ❤️\n` +
      `Hotline hỗ trợ: 0911 767 069`;
    setSuggestedMessage(msg);
  }, [studentName, className, teacherName, room, startDateText, scheduleDays, studyHours]);

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
    branchName,
    startDateText,
    scheduleDays,
    studyHours,
    endDateText,
    notesUniform,
    notesArrival,
    notesPickup,
    issuedDate: new Date().toLocaleDateString('vi-VN'),
  };

  // Sao chép thư trực tiếp vào Clipboard (PNG Retina 2x)
  const handleCopyImage = async () => {
    if (!templateRef.current) return;
    setIsCopying(true);
    try {
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
      }
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

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
          showToast('✅ Đã copy Thư Khai Giảng! Nhấn Ctrl+V dán ngay vào Zalo.', 'success');
        } catch (clipErr) {
          console.warn('Clipboard write failed, falling back to download:', clipErr);
          // Fallback tải xuống nếu trình duyệt chặn ClipboardItem
          const link = document.createElement('a');
          link.download = `ThuKhaiGiang_${studentName.replace(/\s+/g, '_')}.png`;
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
      if (typeof document !== 'undefined' && document.fonts?.ready) {
        await document.fonts.ready;
      }
      const canvas = await html2canvas(templateRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `ThuKhaiGiang_${studentName.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('✅ Đã tải ảnh Thư Khai Giảng chất lượng cao (Retina 2x)!', 'success');
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
                THƯ CHÀO MỪNG & THÔNG BÁO KHAI GIẢNG KHÓA MỚI
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                Học viên: <strong>{studentName}</strong> • {className}
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
            gridTemplateColumns: '460px 1fr',
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
              gap: '16px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '800', color: '#0D88C4', borderBottom: '2px solid #E2E8F0', paddingBottom: '6px' }}>
              ⚙️ THÔNG TIN KHÓA HỌC & HỌC VIÊN
            </div>

            {/* Họ tên & Mã định danh */}
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
                  Mã định danh
                </label>
                <input
                  type="text"
                  value={studentCode}
                  onChange={e => setStudentCode(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Chọn Lớp học */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Lớp học tiếp nhận *
              </label>
              <select
                value={selectedClassCode}
                onChange={e => setSelectedClassCode(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #0D88C4', fontSize: '13px', fontWeight: '600', backgroundColor: '#FFFFFF' }}
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

            {/* Ngày khai giảng (to rõ) */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#0D88C4', marginBottom: '4px' }}>
                🗓️ Ngày khai giảng chính thức (Hiển thị to rõ trên thiệp)
              </label>
              <input
                type="text"
                value={startDateText}
                onChange={e => setStartDateText(e.target.value)}
                placeholder="VD: Thứ Bảy, ngày 14/11/2026"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '2px solid #FFCA29', fontSize: '13.5px', fontWeight: '800', backgroundColor: '#FFFDF5' }}
              />
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

            {/* Lời dặn dò */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Lưu ý số 1 (Trang phục & Sách)
              </label>
              <textarea
                rows={2}
                value={notesUniform}
                onChange={e => setNotesUniform(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>
                Lưu ý số 2 (Thời gian có mặt)
              </label>
              <textarea
                rows={2}
                value={notesArrival}
                onChange={e => setNotesArrival(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
              />
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
              👁️ BẢN XEM TRƯỚC THIỆP GỬI ZALO (Retina 2x Sắc Nét):
            </div>

            {/* Wrapper thu nhỏ 0.65 để vừa vặn khung preview máy tính */}
            <div
              style={{
                transform: 'scale(0.66)',
                transformOrigin: 'top center',
                marginBottom: '-320px',
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
