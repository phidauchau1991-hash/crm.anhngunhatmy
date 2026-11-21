'use client';

import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import { formatClassCode } from '@/lib/classHelper';

const FONT_UNIFIED = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';
const CENTER_ADDRESS = 'Số 15, Đường D9, KDC Phú Tân, Phường Bình Dương, Thành phố Hồ Chí Minh';

const BRAND = {
  blue: '#0D88C4',
  blueDark: '#08557B',
  blueLight: '#E8F5FD',
  gold: '#FFCA29',
  goldDark: '#D97706',
  ink: '#0F172A',
  muted: '#475569',
  white: '#FFFFFF',
};

function SvgIconCalendar({ color = '#D97706', size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
      <rect x="3" y="4" width="18" height="17" rx="3" stroke={color} strokeWidth="2.2" />
      <path d="M8 2V6M16 2V6M3 10H21" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function SvgIconPin({ color = '#D97706', size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
      <path
        d="M12 21C12 21 19 14.5 19 9.5C19 5.63401 15.866 2.5 12 2.5C8.13401 2.5 5 5.63401 5 9.5C5 14.5 12 21 12 21Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.5" stroke={color} strokeWidth="2.2" />
    </svg>
  );
}

function SvgIconTarget({ color = '#0D88C4', size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
      <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2.2" />
      <circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" />
      <circle cx="12" cy="12" r="1.8" fill={color} />
    </svg>
  );
}

function SvgIconNote({ color = '#0D88C4', size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="2.2" />
      <path d="M8 8H16M8 12H16M8 16H13" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SvgIconBag({ color = '#D97706', size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, display: 'block' }}>
      <path d="M6 8H18L19 20H5L6 8Z" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M9 8V6C9 4.34315 10.3431 3 12 3C13.6569 3 15 4.34315 15 6V8" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function TutoringLetterModal({ isOpen, onClose, plan = null, plans = null }) {
  const letterRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    if (isOpen) {
      setActiveIdx(0);
      setCopySuccess('');
    }
  }, [isOpen, plan, plans]);

  const planList = Array.isArray(plans) && plans.length > 0 ? plans : (plan ? [plan] : []);
  const activePlan = planList[activeIdx] || planList[0];

  if (!isOpen || !activePlan) return null;

  const studentName = activePlan.student?.name || 'Học viên';
  const studentPhone = activePlan.student?.phone || '';
  const rawClassCode = activePlan.classCode || activePlan.class?.code || '';
  const classCode = rawClassCode ? `${formatClassCode(rawClassCode)} (${rawClassCode})` : 'Lớp học tại trung tâm';
  const tutorName = activePlan.tutorName || activePlan.teacher?.fullName || 'Giáo viên phụ trách';
  const sessionType = activePlan.sessionType || 'Bù bài học viên vắng (Makeup)';
  const focusSkills = activePlan.focusSkills || 'Tổng hợp / Toàn diện';
  const content = activePlan.content || 'Ôn tập và củng cố kiến thức theo chương trình';
  const instructions = activePlan.instructions || 'Mang theo đầy đủ sách vở và đồ dùng học tập';
  const todayVnDisplay = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const sessions = activePlan.sessions && activePlan.sessions.length > 0 ? activePlan.sessions : [
    {
      sessionNumber: 1,
      teachingDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()),
      startTimeText: '16:30',
      endTimeText: '17:30',
      roomName: 'Phòng học tại trung tâm',
    },
  ];

  // Format ngày tiếng Việt chuẩn không lệch múi giờ
  const formatDateVi = (dateStr) => {
    if (!dateStr) return '';
    try {
      const isoMatch = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
      const d = isoMatch ? new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T12:00:00.000Z`) : new Date(dateStr);
      const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
      const dayName = days[d.getUTCDay()];
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${dayName}, ngày ${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const markExported = async (targetPlanId = activePlan.id) => {
    try {
      await fetch(`/api/tutoring/${targetPlanId}/letter-exported`, { method: 'PATCH' });
    } catch (e) {
      console.error(e);
    }
  };

  // Chụp ảnh chuẩn Retina 2x bằng html2canvas + đợi load đầy đủ font Be Vietnam Pro
  const captureLetterCanvas = async () => {
    if (typeof document !== 'undefined' && document.fonts) {
      try {
        await document.fonts.ready;
        const criticalFonts = [
          '500 16px "Be Vietnam Pro"',
          '600 16px "Be Vietnam Pro"',
          '700 16px "Be Vietnam Pro"',
          '800 16px "Be Vietnam Pro"',
          '900 16px "Be Vietnam Pro"',
        ];
        await Promise.allSettled(
          criticalFonts.map((f) => document.fonts.load(f, 'ANH NGỮ NHẬT MỸ Ữ Ậ Ỹ Đ'))
        );
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      } catch {
        // Fallback nếu font API bị giới hạn
      }
    }

    return html2canvas(letterRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#FFFFFF',
      logging: false,
    });
  };

  const handleCopyImage = async () => {
    if (!letterRef.current || copying) return;
    setCopying(true);
    setCopySuccess('');

    try {
      const canvas = await captureLetterCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownloadImage();
          return;
        }
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setCopySuccess(`Đã sao chép ảnh của ${studentName}! Mở Zalo bấm Ctrl+V`);
            markExported(activePlan.id);
            setTimeout(() => setCopySuccess(''), 3500);
          } else {
            handleDownloadImage();
          }
        } catch (clipErr) {
          console.warn('Clipboard fallback to download:', clipErr);
          handleDownloadImage();
        } finally {
          setCopying(false);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Lỗi copy ảnh:', err);
      setCopying(false);
      handleDownloadImage();
    }
  };

  const handleCopyZaloText = async () => {
    const slotLines = sessions
      .map((s, i) => `• Buổi ${i + 1}: ${formatDateVi(s.teachingDate)} (${s.startTimeText || '16:30'} – ${s.endTimeText || '17:30'}) • ${s.roomName || 'Phòng học tại trung tâm'}`)
      .join('\n');
    const msg =
      `Dạ Trung tâm Anh ngữ Nhật Mỹ kính gửi Quý Phụ huynh Giấy Hẹn Phụ Đạo & Bù Bài của bé ${studentName} (${classCode}):\n\n` +
      `${slotLines}\n` +
      `👨‍🏫 Giáo viên kèm: ${tutorName}\n` +
      `📝 Nội dung: ${content}\n` +
      `🎒 Dặn dò: ${instructions}\n\n` +
      `Kính mong Quý Phụ huynh sắp xếp cho con tham dự đầy đủ và đúng giờ ạ! ❤️`;
    try {
      await navigator.clipboard.writeText(msg);
      setCopySuccess(`Đã chép lời nhắn Zalo cho bé ${studentName}!`);
      setTimeout(() => setCopySuccess(''), 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadImage = async () => {
    if (!letterRef.current || downloading) return;
    setDownloading(true);

    try {
      const canvas = await captureLetterCanvas();
      const filename = `Thu_Hen_Phu_Dao_${studentName.replace(/\s+/g, '_')}_${activePlan.planCode || 'Pass'}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();

      markExported(activePlan.id);
    } catch (err) {
      console.error('Lỗi tải ảnh:', err);
      alert('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadAllZip = async () => {
    if (planList.length <= 1 || zipLoading) return;
    setZipLoading(true);
    const prevIdx = activeIdx;
    try {
      const JSZip = (await import('jszip')).default;
      const { saveAs } = await import('file-saver');
      const zip = new JSZip();

      for (let i = 0; i < planList.length; i++) {
        const p = planList[i];
        setActiveIdx(i);
        setZipProgress(`Đang xuất ${i + 1}/${planList.length}: ${p.student?.name || ''}...`);
        await new Promise((r) => setTimeout(r, 250));
        if (!letterRef.current) continue;
        const canvas = await captureLetterCanvas();
        const dataUrl = canvas.toDataURL('image/png');
        const base64 = dataUrl.split(',')[1];
        const safeName = (p.student?.name || p.studentId || 'HV').replace(/\s+/g, '_');
        zip.file(`${i + 1}_${safeName}_${p.planCode}.png`, base64, { base64: true });
        markExported(p.id);
      }

      const blob = await zip.generateAsync({ type: 'blob' });
      const groupLabel = activePlan.groupCode || activePlan.planCode || 'NhomPhuDao';
      saveAs(blob, `Thu_Hen_Phu_Dao_${groupLabel}.zip`);
      setCopySuccess(`Đã tải trọn bộ ${planList.length} thư (.ZIP)!`);
      setTimeout(() => setCopySuccess(''), 4000);
    } catch (err) {
      console.error('Lỗi tải ZIP thư phụ đạo:', err);
      alert('Không thể nén file ZIP. Vui lòng tải từng ảnh!');
    } finally {
      setActiveIdx(prevIdx);
      setZipProgress('');
      setZipLoading(false);
    }
  };

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
              <h3>Thư Hẹn Phụ Huynh (Bản xem trước chuẩn Bộ nhận diện)</h3>
              <p>Logo / Font Be Vietnam Pro sắc nét chuẩn gửi Zalo phụ huynh</p>
            </div>
          </div>
          <button className="lm-close-btn" onClick={onClose} aria-label="Đóng">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Thanh chuyển học viên khi xuất thư nhóm */}
        {planList.length > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              overflowX: 'auto',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '4px' }}>
              Nhóm ({planList.length} HV):
            </span>
            {planList.map((p, idx) => (
              <button
                key={p.id || idx}
                type="button"
                onClick={() => setActiveIdx(idx)}
                style={{
                  padding: '5px 11px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: activeIdx === idx ? '1.5px solid #0D88C4' : '1px solid #cbd5e1',
                  background: activeIdx === idx ? '#e0f2fe' : '#ffffff',
                  color: activeIdx === idx ? '#0369a1' : '#334155',
                }}
              >
                {idx + 1}. {p.student?.name || p.studentId}
              </button>
            ))}
          </div>
        )}

        {/* Khung cuộn chứa Giấy Thư */}
        <div className="lm-preview-viewport">
          <div
            ref={letterRef}
            style={{
              width: '660px',
              backgroundColor: BRAND.white,
              color: BRAND.ink,
              fontFamily: FONT_UNIFIED,
              lineHeight: 1.5,
              boxSizing: 'border-box',
              position: 'relative',
              margin: '0 auto',
              overflow: 'hidden',
              border: `3px solid ${BRAND.gold}`,
              borderRadius: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.16)',
              WebkitFontSmoothing: 'antialiased',
            }}
          >
            {/* 1. HEADER BỘ NHẬN DIỆN CHUẨN NHẬT MỸ — LOGO 1:1 NGUYÊN BẢN */}
            <div
              style={{
                backgroundColor: BRAND.white,
                padding: '18px 28px 14px 28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: `3px solid ${BRAND.gold}`,
                fontFamily: FONT_UNIFIED,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <img
                  src="/logo.png"
                  alt="Logo Anh ngữ Nhật Mỹ"
                  width={72}
                  height={72}
                  style={{
                    width: '72px',
                    height: '72px',
                    display: 'block',
                    flexShrink: 0,
                  }}
                  crossOrigin="anonymous"
                />
                <div>
                  <div
                    style={{
                      fontFamily: FONT_UNIFIED,
                      fontSize: '23px',
                      fontWeight: '900',
                      color: BRAND.blue,
                      letterSpacing: '0.5px',
                      lineHeight: '1.15',
                      textTransform: 'uppercase',
                    }}
                  >
                    ANH NGỮ NHẬT MỸ
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_UNIFIED,
                      fontSize: '13px',
                      fontStyle: 'italic',
                      fontWeight: '600',
                      color: BRAND.goldDark,
                      letterSpacing: '0.35px',
                      marginTop: '3px',
                    }}
                  >
                    Dedicated to Excellence
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontFamily: FONT_UNIFIED }}>
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#FEF3C7',
                    border: '1px solid #FDE68A',
                    color: '#92400E',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  {activePlan.planCode || 'TUTOR-PASS'}
                </div>
                <div
                  style={{
                    fontFamily: FONT_UNIFIED,
                    fontSize: '11.5px',
                    fontWeight: '600',
                    color: BRAND.muted,
                    marginTop: '4px',
                  }}
                >
                  Dạy trực tiếp tại cơ sở
                </div>
              </div>
            </div>

            {/* 2. BODY NỘI DUNG */}
            <div style={{ padding: '22px 28px 18px 28px', backgroundColor: '#FAFDFE', fontFamily: FONT_UNIFIED }}>
              {/* Tiêu đề thư */}
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <div
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#E0F2FE',
                    color: '#0369A1',
                    fontSize: '12px',
                    fontWeight: '800',
                    padding: '4px 14px',
                    borderRadius: '999px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  {sessionType}
                </div>
                <div
                  style={{
                    fontFamily: FONT_UNIFIED,
                    fontSize: '25px',
                    fontWeight: '900',
                    color: BRAND.blueDark,
                    letterSpacing: '0.4px',
                    lineHeight: '1.2',
                    textTransform: 'uppercase',
                  }}
                >
                  GIẤY HẸN PHỤ ĐẠO & BÙ BÀI
                </div>
                <div
                  style={{
                    fontFamily: FONT_UNIFIED,
                    fontSize: '13px',
                    fontWeight: '500',
                    fontStyle: 'italic',
                    color: BRAND.muted,
                    marginTop: '4px',
                  }}
                >
                  Hỗ trợ củng cố kiến thức và đồng hành cùng tiến độ học tập của bé
                </div>
              </div>

              {/* Thông tin học viên */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '7px',
                  fontFamily: FONT_UNIFIED,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: BRAND.muted }}>
                    Kính gửi Quý Phụ huynh em:
                  </span>
                  <span style={{ fontSize: '17px', fontWeight: '900', color: BRAND.blueDark }}>
                    {studentName}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: BRAND.muted }}>
                    Lớp học chính khóa:
                  </span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: BRAND.ink }}>
                    {classCode}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: '600', color: BRAND.muted }}>
                    Giáo viên / Trợ giảng kèm:
                  </span>
                  <span style={{ fontSize: '14.5px', fontWeight: '800', color: BRAND.blue }}>
                    {tutorName}
                  </span>
                </div>
              </div>

              {/* Lịch học kèm chi tiết */}
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    fontSize: '13px',
                    fontWeight: '800',
                    color: BRAND.blueDark,
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    marginBottom: '8px',
                  }}
                >
                  <SvgIconCalendar color="#D97706" size={16} />
                  <span>LỊCH HỌC KÈM CHI TIẾT (TRỰC TIẾP):</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {sessions.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: '#FFFBEB',
                        border: '1.5px solid #FDE68A',
                        borderRadius: '11px',
                        padding: '11px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '5px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <span
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: '#F59E0B',
                              color: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <strong style={{ color: BRAND.ink, fontSize: '14.5px', fontWeight: '800' }}>
                            {formatDateVi(s.teachingDate)}
                          </strong>
                        </div>
                        <span style={{ fontWeight: '900', color: '#B45309', fontSize: '14.5px' }}>
                          {s.startTimeText || '16:30'} – {s.endTimeText || '17:30'}
                        </span>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          color: BRAND.muted,
                          paddingLeft: '31px',
                        }}
                      >
                        <SvgIconPin color="#D97706" size={14} />
                        <span>
                          Địa điểm học: <strong style={{ color: BRAND.ink, fontWeight: '800' }}>{s.roomName || 'Phòng học tại trung tâm'}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nội dung ôn tập & Dặn dò */}
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1.5px solid #BAE6FD',
                  borderRadius: '12px',
                  padding: '13px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13.5px' }}>
                  <SvgIconTarget color={BRAND.blue} size={16} />
                  <div>
                    <strong style={{ color: BRAND.ink, fontWeight: '800' }}>Kỹ năng trọng tâm: </strong>
                    <span style={{ color: BRAND.blueDark, fontWeight: '800' }}>{focusSkills}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13.5px' }}>
                  <SvgIconNote color={BRAND.blue} size={16} />
                  <div>
                    <strong style={{ color: BRAND.ink, fontWeight: '800' }}>Nội dung ôn tập: </strong>
                    <span style={{ color: '#1E293B', fontWeight: '600' }}>{content}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13.5px' }}>
                  <SvgIconBag color="#D97706" size={16} />
                  <div>
                    <strong style={{ color: BRAND.ink, fontWeight: '800' }}>Đồ dùng mang theo: </strong>
                    <span style={{ color: '#0F172A', fontWeight: '700' }}>{instructions}</span>
                  </div>
                </div>
              </div>

              {/* Lời nhắn + Mộc đỏ Nhật Mỹ */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px',
                  gap: '14px',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    fontStyle: 'italic',
                    color: BRAND.muted,
                    lineHeight: 1.55,
                    backgroundColor: '#FFFFFF',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '10px',
                    padding: '10px 14px',
                  }}
                >
                  “Vì sự tiến bộ của con, kính mong Quý Phụ huynh sắp xếp nhắc nhở và đưa đón bé tham dự đầy đủ, đúng giờ.”
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <OfficialRedSeal
                    title="XÁC NHẬN"
                    subtitle="PHỤ ĐẠO & BÙ BÀI"
                    size={112}
                    date={todayVnDisplay}
                  />
                </div>
              </div>
            </div>

            {/* 3. FOOTER THƯƠNG HIỆU NHẬT MỸ */}
            <div
              style={{
                backgroundColor: BRAND.blue,
                padding: '14px 28px',
                color: BRAND.white,
                textAlign: 'center',
                borderTop: `3px solid ${BRAND.gold}`,
                fontFamily: FONT_UNIFIED,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '15.5px',
                  fontWeight: '900',
                  letterSpacing: '0.8px',
                  color: BRAND.white,
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                ANH NGỮ NHẬT MỸ
              </div>
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '12px',
                  fontStyle: 'italic',
                  fontWeight: '500',
                  color: BRAND.white,
                  opacity: 0.95,
                  letterSpacing: '0.35px',
                  marginTop: '2px',
                  marginBottom: '6px',
                }}
              >
                Dedicated to Excellence
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '12.5px', fontWeight: '500', opacity: 0.96 }}>
                Hotline hỗ trợ phụ huynh: <strong style={{ fontWeight: '800' }}>0911 767 069</strong> • Website:{' '}
                <strong style={{ fontWeight: '800' }}>anhngunhatmy.edu.vn</strong>
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.5px', fontWeight: '500', opacity: 0.9, marginTop: '2px' }}>
                Địa chỉ: {CENTER_ADDRESS}
              </div>
            </div>
          </div>
        </div>

        {/* Thanh Điều Khiển & Hành Động */}
        <div className="lm-action-bar">
          <div className="action-feedback">
            {(zipProgress || copySuccess) && (
              <span className="copy-success-badge">
                <i className="fa-solid fa-circle-check"></i> {zipProgress || copySuccess}
              </span>
            )}
          </div>

          <div className="action-buttons-group" style={{ flexWrap: 'wrap' }}>
            <button type="button" onClick={handleCopyZaloText} className="btn-download">
              <i className="fa-solid fa-message"></i> Copy Lời Nhắn
            </button>

            <button type="button" onClick={handleOpenZalo} className="btn-zalo">
              <i className="fa-solid fa-comment-dots"></i> Mở Zalo
            </button>

            {planList.length > 1 && (
              <button
                type="button"
                onClick={handleDownloadAllZip}
                disabled={zipLoading}
                className="btn-download"
                style={{ background: '#dcfce7', color: '#166534', borderColor: '#86efac' }}
              >
                <i className={`fa-solid ${zipLoading ? 'fa-spinner fa-spin' : 'fa-file-zipper'}`}></i>
                Tải Trọn Bộ ({planList.length} ảnh .ZIP)
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={downloading}
              className="btn-download"
            >
              {downloading ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-download"></i>}
              Tải Ảnh (.PNG)
            </button>

            <button
              type="button"
              onClick={handleCopyImage}
              disabled={copying}
              className="btn-copy-png"
            >
              {copying ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-copy"></i>}
              Copy Ảnh Gửi Zalo
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .lm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.72);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .lm-modal {
          background: #ffffff;
          border-radius: 16px;
          max-width: 740px;
          width: 100%;
          max-height: 94vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px -12px rgba(15, 23, 42, 0.45);
        }
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
        .lm-header h3 { font-size: 15px; font-weight: 800; color: #0f172a; margin: 0; }
        .lm-header p { font-size: 12px; color: #64748b; margin: 0; }
        .lm-close-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          font-size: 16px;
        }
        .lm-preview-viewport {
          padding: 16px;
          overflow-y: auto;
          flex: 1;
          background: #64748b;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .lm-action-bar {
          padding: 12px 20px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .action-feedback {
          min-height: 20px;
          display: flex;
          align-items: center;
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
        }
      `}</style>
    </div>
  );
}
