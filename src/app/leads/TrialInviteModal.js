'use client';

import React, { useState, useRef, useEffect } from 'react';
import TrialInviteTemplate from '../components/TrialInviteTemplate';
import { getClassScheduleDetails, formatClassCode } from '@/lib/classHelper';
import {
  BRAND,
  FONT_UNIFIED,
  INVITE_TONE_PROFILES,
  detectTeenAudience,
  formatVnShortDate,
  formatVnDateWithWeekday,
  getTodayVnShortDate,
  copyElementPng,
  downloadElementPng,
} from '@/lib/brandTheme';

export default function TrialInviteModal({ isOpen, onClose, lead, classList = [] }) {
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const templateRef = useRef(null);

  // Form State
  const [inviteType, setInviteType] = useState('TRIAL'); // 'TRIAL' | 'ASSESSMENT'
  const [toneMode, setToneMode] = useState('KIDS');      // 'KIDS' | 'TEEN'
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [rawClassCode, setRawClassCode] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startDateDisplay, setStartDateDisplay] = useState('');
  const [studyDays, setStudyDays] = useState('');
  const [studyHours, setStudyHours] = useState('');
  const [endDate, setEndDate] = useState('');
  const [centerPrep, setCenterPrep] = useState('');
  const [parentPrep, setParentPrep] = useState('');
  const [suggestedMessage, setSuggestedMessage] = useState('');

  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Xác định loại thư ban đầu khi mở modal
  useEffect(() => {
    if (isOpen && lead) {
      const isTrial = lead.status === 'Học thử' || Boolean(lead.trialClassCode);
      setInviteType(isTrial ? 'TRIAL' : 'ASSESSMENT');
    }
  }, [isOpen, lead?.id]);

  // Nạp dữ liệu mặc định thông minh theo Loại Thư + Hồ sơ Lead + Lớp học
  useEffect(() => {
    if (!isOpen || !lead) return;

    const cleanName = lead.name || '';
    setStudentName(cleanName);

    const rawStartSource = lead.trialStartDate || lead.followUpDate || new Date();
    const shortStart = formatVnShortDate(rawStartSource) || getTodayVnShortDate();
    const weekdayStart = formatVnDateWithWeekday(rawStartSource) || shortStart;
    setStartDate(shortStart);
    setStartDateDisplay(weekdayStart);

    if (inviteType === 'TRIAL') {
      const code = lead.trialClassCode || '';
      const matchedClass = Array.isArray(classList)
        ? classList.find((c) => c.code === code)
        : null;

      const isTeen = detectTeenAudience(
        `${code} ${matchedClass?.level || ''} ${matchedClass?.capDo || ''} ${lead.targetProgram || ''}`
      );
      const nextTone = isTeen ? 'TEEN' : 'KIDS';
      setToneMode(nextTone);

      const friendly = code ? formatClassCode(code) : '';
      setRawClassCode(code);
      setClassName(friendly ? `Lớp ${friendly}` : code || 'Lớp trải nghiệm chuẩn Cambridge');

      if (code) {
        const details = getClassScheduleDetails(
          code,
          matchedClass?.scheduleRaw || matchedClass?.schedule || ''
        );
        const cleanHours = (details.hours || '').replace(/'/g, '').trim();
        setStudyDays(matchedClass?.schedule || details.daysDisplay || '');
        setStudyHours(cleanHours);

        if (matchedClass?.teacherName) {
          setTeacherName(matchedClass.teacherName);
        } else {
          const parts = code.split('_');
          setTeacherName(parts.length >= 3 ? parts[2] : 'Ms My');
        }
        setRoom(matchedClass?.room || 'Phòng học tiêu chuẩn Nhật Mỹ');
      } else {
        setStudyDays('');
        setStudyHours('');
        setTeacherName('Giáo viên Nhật Mỹ');
        setRoom('');
      }

      setEndDate('02 buổi học thử');
      setCenterPrep(
        'Bộ tài liệu học thử độc quyền, vở bút viết, nước uống và không gian lớp học tương tác hiệu quả.'
      );
      setParentPrep(INVITE_TONE_PROFILES[nextTone].trialPrep2Default);
    } else {
      const isTeen = detectTeenAudience(`${lead.targetProgram || ''} ${lead.ageGroup || ''}`);
      const nextTone = isTeen ? 'TEEN' : 'KIDS';
      setToneMode(nextTone);

      setRawClassCode('');
      setClassName('Đánh giá 4 kỹ năng chuẩn Cambridge');
      setTeacherName('Giáo viên chuyên môn Nhật Mỹ');
      setRoom('Phòng đánh giá 1-1');
      setStudyDays(shortStart);
      setStudyHours('17:00 - 17:45');
      setEndDate('30 - 45 phút');
      setCenterPrep(
        'Đề kiểm tra chuẩn Cambridge, giáo viên chuyên môn phỏng vấn 1-1 và báo cáo phân tích chi tiết.'
      );
      setParentPrep(INVITE_TONE_PROFILES[nextTone].assessmentPrep2Default);
    }
  }, [isOpen, lead, inviteType, classList]);

  // Cập nhật gợi ý tin nhắn Zalo khi dữ liệu thay đổi
  useEffect(() => {
    const cleanHoursInline = String(studyHours || '').replace(/\r?\n+/g, '; ').trim();
    const isTeen = toneMode === 'TEEN';

    if (inviteType === 'TRIAL') {
      const msg = isTeen
        ? `Dạ Trung tâm Anh ngữ Nhật Mỹ xin kính gửi Quý Phụ huynh & em ${studentName} Thư Mời Tham Gia Lớp Học Thử.\n\n` +
          `📚 Lớp trải nghiệm: ${className}${rawClassCode ? ` (${rawClassCode})` : ''}\n` +
          `📅 Ngày bắt đầu: ${startDateDisplay || startDate}\n` +
          `⏰ Giờ học: ${cleanHoursInline || 'Theo lịch hẹn'} (${studyDays || 'Theo lịch lớp'})\n\n` +
          `Kính mong Quý Phụ huynh nhắc nhở em lưu lại hình ảnh thư mời và đến trước giờ học 05 - 10 phút để giáo viên hướng dẫn vào lớp ạ! ❤️\n` +
          `Hotline hỗ trợ: 0911 767 069`
        : `Dạ Trung tâm Anh ngữ Nhật Mỹ xin gửi ba mẹ Thư Mời Học Thử của bé ${studentName}.\n\n` +
          `📚 Lớp trải nghiệm: ${className}${rawClassCode ? ` (${rawClassCode})` : ''}\n` +
          `📅 Ngày bắt đầu: ${startDateDisplay || startDate}\n` +
          `⏰ Giờ học: ${cleanHoursInline || 'Theo lịch hẹn'} (${studyDays || 'Theo lịch lớp'})\n\n` +
          `Ba mẹ lưu ảnh thư mời này lại để nhớ lịch đưa đón con nhé. Trung tâm và thầy cô đã chuẩn bị sẵn sàng chào đón bé rồi ạ! ❤️\n` +
          `Hotline hỗ trợ: 0911 767 069`;
      setSuggestedMessage(msg);
    } else {
      const msg = isTeen
        ? `Dạ Trung tâm Anh ngữ Nhật Mỹ xin kính gửi Quý Phụ huynh & em ${studentName} Thư Mời Đánh Giá Năng Lực Tiếng Anh.\n\n` +
          `📝 Nội dung: ${className}\n` +
          `📅 Ngày hẹn: ${startDateDisplay || studyDays || startDate}\n` +
          `⏰ Khung giờ: ${cleanHoursInline || 'Theo lịch hẹn'} (Thời lượng: ${endDate || '30 - 45 phút'})\n\n` +
          `Kính mong Quý Phụ huynh nhắc nhở em có mặt đúng giờ hẹn với tinh thần thoải mái nhất để đạt kết quả chính xác ạ! ❤️\n` +
          `Hotline hỗ trợ: 0911 767 069`
        : `Dạ Trung tâm Anh ngữ Nhật Mỹ xin gửi ba mẹ Thư Mời Tham Gia Đánh Giá Năng Lực của bé ${studentName}.\n\n` +
          `📝 Nội dung: ${className}\n` +
          `📅 Ngày hẹn: ${startDateDisplay || studyDays || startDate}\n` +
          `⏰ Khung giờ: ${cleanHoursInline || 'Theo lịch hẹn'} (Thời lượng: ${endDate || '30 - 45 phút'})\n\n` +
          `Ba mẹ lưu ảnh thư mời này lại để nhớ lịch hẹn kiểm tra của con nhé. Trung tâm đã chuẩn bị sẵn sàng để đón tiếp bé rồi ạ! ❤️\n` +
          `Hotline hỗ trợ: 0911 767 069`;
      setSuggestedMessage(msg);
    }
  }, [
    inviteType,
    toneMode,
    studentName,
    className,
    rawClassCode,
    studyDays,
    studyHours,
    startDate,
    startDateDisplay,
    endDate,
  ]);

  const handleToneSwitch = (nextTone) => {
    setToneMode(nextTone);
    const profile = INVITE_TONE_PROFILES[nextTone] || INVITE_TONE_PROFILES.KIDS;
    setParentPrep(
      inviteType === 'ASSESSMENT' ? profile.assessmentPrep2Default : profile.trialPrep2Default
    );
  };

  const templateData = {
    inviteType,
    toneMode,
    studentName,
    className,
    rawClassCode,
    teacherName,
    room,
    studyDays,
    studyHours,
    startDate,
    startDateDisplay,
    endDate,
    centerPrep,
    parentPrep,
    issuedDate: getTodayVnShortDate(),
  };

  const safeSlugName = (studentName || 'HocVien').replace(/\s+/g, '_');
  const exportFilename =
    inviteType === 'ASSESSMENT'
      ? `ThuMoiDanhGia_${safeSlugName}.png`
      : `ThuMoiHocThu_${safeSlugName}.png`;

  const handleCopyImage = async () => {
    if (!templateRef.current) return;
    setIsCopying(true);
    try {
      const result = await copyElementPng(templateRef.current, exportFilename);
      if (result.status === 'COPIED') {
        showToast('✅ Đã copy Thư Mời vào Clipboard! Nhấn Ctrl+V dán ngay vào Zalo.', 'success');
      } else {
        showToast('Đã tải ảnh thư mời xuống máy (Trình duyệt chưa bật copy ảnh).', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi tạo ảnh thư mời.', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!templateRef.current) return;
    setIsDownloading(true);
    try {
      await downloadElementPng(templateRef.current, exportFilename);
      showToast('✅ Đã tải ảnh Thư Mời chất lượng cao về máy!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi tải ảnh thư mời.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(suggestedMessage);
    showToast('✅ Đã sao chép lời nhắn Zalo!', 'success');
  };

  if (!isOpen) return null;

  const inputStyle = {
    width: '100%',
    padding: '8px 11px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '13.5px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    fontWeight: '700',
    fontSize: '12.5px',
    color: '#334155',
    display: 'block',
    marginBottom: '5px',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      {/* Bản ẩn kích thước thực 800px để chụp ảnh Retina 2x không bị biến dạng bởi CSS scale */}
      <div
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '800px',
          pointerEvents: 'none',
          opacity: 1,
        }}
      >
        <TrialInviteTemplate ref={templateRef} data={templateData} />
      </div>

      {/* Modal chính 2 cột: Trái Form điều chỉnh - Phải Live Preview */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1260px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          fontFamily: FONT_UNIFIED,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '15px 24px',
            backgroundColor: BRAND.blue,
            color: BRAND.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `3px solid ${BRAND.gold}`,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '17.5px', fontWeight: '800', letterSpacing: '0.4px' }}>
              {inviteType === 'ASSESSMENT'
                ? '📝 TẠO THƯ MỜI ĐÁNH GIÁ NĂNG LỰC'
                : '✉️ TẠO THƯ MỜI THAM GIA LỚP HỌC THỬ'}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', opacity: 0.92 }}>
              Học viên: <strong>{studentName || 'Chưa nhập tên'}</strong> • Bộ nhận diện chuẩn Anh ngữ Nhật Mỹ (Be Vietnam Pro • Retina 2x)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              color: '#FFFFFF',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              fontSize: '22px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
            }}
            title="Đóng"
          >
            &times;
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div
            style={{
              padding: '9px 20px',
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

        {/* Body 2 cột */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '440px 1fr',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* CỘT TRÁI: FORM ĐIỀU CHỈNH */}
          <div
            style={{
              padding: '18px 20px',
              overflowY: 'auto',
              backgroundColor: '#F8FAFC',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '13px',
            }}
          >
            {/* Chọn Loại Thư */}
            <div>
              <span style={labelStyle}>Loại thư mời</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setInviteType('TRIAL')}
                  style={{
                    padding: '9px 10px',
                    borderRadius: '9px',
                    border: `2px solid ${inviteType === 'TRIAL' ? BRAND.blue : '#CBD5E1'}`,
                    backgroundColor: inviteType === 'TRIAL' ? BRAND.blueLight : '#FFFFFF',
                    color: inviteType === 'TRIAL' ? BRAND.blueDark : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  🎓 Thư Mời Học Thử
                </button>
                <button
                  type="button"
                  onClick={() => setInviteType('ASSESSMENT')}
                  style={{
                    padding: '9px 10px',
                    borderRadius: '9px',
                    border: `2px solid ${inviteType === 'ASSESSMENT' ? BRAND.goldDark : '#CBD5E1'}`,
                    backgroundColor: inviteType === 'ASSESSMENT' ? '#FEF3C7' : '#FFFFFF',
                    color: inviteType === 'ASSESSMENT' ? '#92400E' : '#475569',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  📝 Thư Mời Đánh Giá
                </button>
              </div>
            </div>

            {/* Chọn Văn phong Thiếu nhi / Thiếu niên */}
            <div>
              <span style={labelStyle}>Văn phong theo độ tuổi</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['KIDS', 'TEEN'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleToneSwitch(mode)}
                    style={{
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${toneMode === mode ? BRAND.blue : '#CBD5E1'}`,
                      backgroundColor: toneMode === mode ? '#E0F2FE' : '#FFFFFF',
                      color: toneMode === mode ? BRAND.blueDark : '#475569',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {mode === 'KIDS' ? '🧒 Thiếu nhi (bé / ba mẹ)' : '🎒 Thiếu niên / Lớn (em)'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Tên Học Viên</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {inviteType === 'ASSESSMENT' ? 'Bài Đánh Giá' : 'Lớp Học Thử'}
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => {
                    const newVal = e.target.value;
                    setClassName(newVal);
                    if (inviteType === 'TRIAL' && newVal) {
                      const details = getClassScheduleDetails(newVal);
                      if (details.daysDisplay) setStudyDays(details.daysDisplay);
                      if (details.hours) setStudyHours(details.hours);
                    }
                  }}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Giáo viên phụ trách</label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="VD: Ms My"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Phòng / Địa điểm</label>
                <input
                  type="text"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="VD: Phòng 201 (Lầu 1)"
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>
                  {inviteType === 'ASSESSMENT' ? 'Ngày hẹn (Hiển thị lớn)' : 'Ngày bắt đầu học thử'}
                </label>
                <input
                  type="text"
                  value={startDateDisplay}
                  onChange={(e) => setStartDateDisplay(e.target.value)}
                  placeholder="VD: Thứ 6, ngày 20/11/2026"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {inviteType === 'ASSESSMENT' ? 'Ngày đánh giá (ngắn)' : 'Lịch học hàng tuần'}
                </label>
                <input
                  type="text"
                  value={studyDays}
                  onChange={(e) => setStudyDays(e.target.value)}
                  placeholder={inviteType === 'ASSESSMENT' ? 'VD: 20/11/2026' : 'VD: Thứ 6, Thứ 7'}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>
                  {inviteType === 'ASSESSMENT' ? 'Giờ đánh giá' : 'Khung giờ học (Enter xuống dòng)'}
                </label>
                <textarea
                  rows={2}
                  value={studyHours}
                  onChange={(e) => setStudyHours(e.target.value)}
                  placeholder="VD: Thứ 6: 17:30 - 19:30&#10;Thứ 7: 18:30 - 20:30"
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.4 }}
                />
              </div>
              <div>
                <label style={labelStyle}>
                  {inviteType === 'ASSESSMENT' ? 'Thời gian làm bài' : 'Dự kiến / Số buổi'}
                </label>
                <input
                  type="text"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder={inviteType === 'ASSESSMENT' ? 'VD: 30 - 45 phút' : 'VD: 02 buổi học thử'}
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Trung tâm chuẩn bị</label>
              <textarea
                rows={2}
                value={centerPrep}
                onChange={(e) => setCenterPrep(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>{INVITE_TONE_PROFILES[toneMode].prep2Title}</label>
              <textarea
                rows={2}
                value={parentPrep}
                onChange={(e) => setParentPrep(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div
              style={{
                backgroundColor: '#F0F9FF',
                padding: '12px',
                borderRadius: '10px',
                border: '1px dashed #BAE6FD',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: '800', fontSize: '12.5px', color: '#0369A1' }}>
                  💬 Tin nhắn Zalo gửi kèm
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  style={{
                    backgroundColor: '#0EA5E9',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Copy Lời Nhắn
                </button>
              </div>
              <textarea
                rows={4}
                value={suggestedMessage}
                onChange={(e) => setSuggestedMessage(e.target.value)}
                style={{ ...inputStyle, resize: 'vertical', fontSize: '12.5px', lineHeight: 1.45 }}
              />
            </div>
          </div>

          {/* CỘT PHẢI: XEM TRƯỚC TRỰC TIẾP */}
          <div
            style={{
              backgroundColor: '#E2E8F0',
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: '12.5px',
                fontWeight: '700',
                color: '#334155',
                marginBottom: '10px',
              }}
            >
              👁️ BẢN XEM TRƯỚC THIỆP GỬI ZALO (Font Đồng Nhất • Chuẩn Retina 2x)
            </div>
            <div
              style={{
                transform: 'scale(0.76)',
                transformOrigin: 'top center',
                marginBottom: '-170px',
              }}
            >
              <TrialInviteTemplate data={templateData} />
            </div>
          </div>
        </div>

        {/* Footer hành động */}
        <div
          style={{
            padding: '14px 24px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '12.5px', color: '#64748B' }}>
            💡 Nhấn <strong>Copy Ảnh (Dán Zalo)</strong> rồi bấm <strong>Ctrl+V</strong> trong khung chat Zalo để gửi ảnh sắc nét ngay.
          </span>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleCopyText}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#F8FAFC',
                color: '#1E293B',
                fontWeight: '700',
                fontSize: '13.5px',
                cursor: 'pointer',
              }}
            >
              Copy Lời Nhắn
            </button>
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={isDownloading || isCopying}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#0F766E',
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '13.5px',
                cursor: isDownloading ? 'wait' : 'pointer',
              }}
            >
              {isDownloading ? 'Đang tạo PNG...' : '⬇️ Tải Ảnh PNG'}
            </button>
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isCopying || isDownloading}
              style={{
                padding: '10px 22px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: BRAND.blue,
                color: '#FFFFFF',
                fontWeight: '800',
                fontSize: '13.5px',
                cursor: isCopying ? 'wait' : 'pointer',
                boxShadow: '0 4px 12px rgba(13, 136, 196, 0.25)',
              }}
            >
              {isCopying ? 'Đang xử lý...' : '📋 Copy Thư (Dán Zalo)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
