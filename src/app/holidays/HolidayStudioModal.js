'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import HolidayNoticeTemplate, { HOLIDAY_CATEGORY_PRESETS } from '../components/HolidayNoticeTemplate';
import {
  BRAND,
  FONT_UNIFIED,
  formatVnShortDate,
  copyElementPng,
  downloadElementPng,
} from '@/lib/brandTheme';

function inferCategoryFromName(name = '') {
  const lower = String(name).toLowerCase();
  if (/tết|xuân|năm mới|lunar/i.test(lower)) return 'TET';
  if (/đột xuất|bảo trì|bão|mưa|khẩn|sự cố|nghỉ bù|điện/i.test(lower)) return 'UNEXPECTED';
  return 'HOLIDAY';
}

function buildScopeText(holiday) {
  if (!holiday) return 'Toàn hệ thống Trung tâm Anh ngữ Nhật Mỹ';
  if (holiday.scope === 'SHIFT') return `Các lớp học Ca ${holiday.targetId || ''}`;
  if (holiday.scope === 'CLASS') return `Lớp ${holiday.targetId || ''}`;
  return 'Toàn hệ thống Trung tâm Anh ngữ Nhật Mỹ';
}

export default function HolidayStudioModal({ isOpen, onClose, holiday }) {
  const captureRef = useRef(null);
  const [formData, setFormData] = useState({
    noticeCategory: 'HOLIDAY',
    customTitle: HOLIDAY_CATEGORY_PRESETS.HOLIDAY.defaultTitle,
    holidayName: '',
    scopeLabel: 'Toàn hệ thống Trung tâm Anh ngữ Nhật Mỹ',
    startDate: '',
    endDate: '',
    returnDate: '',
    makeupNote: HOLIDAY_CATEGORY_PRESETS.HOLIDAY.defaultMakeupNote,
    message: HOLIDAY_CATEGORY_PRESETS.HOLIDAY.defaultMessage,
  });

  const [aiContent, setAiContent] = useState({ zaloOptions: [], fbOptions: [] });
  const [loadingAi, setLoadingAi] = useState(false);
  const [activeTab, setActiveTab] = useState('Zalo');
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (text, type = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (holiday) {
      const cat = inferCategoryFromName(holiday.name);
      const preset = HOLIDAY_CATEGORY_PRESETS[cat] || HOLIDAY_CATEGORY_PRESETS.HOLIDAY;
      const start = holiday.startDate ? formatVnShortDate(holiday.startDate) : '';
      const end = holiday.endDate ? formatVnShortDate(holiday.endDate) : '';

      setFormData({
        noticeCategory: cat,
        customTitle: preset.defaultTitle,
        holidayName: holiday.name || '',
        scopeLabel: buildScopeText(holiday),
        startDate: start,
        endDate: end,
        returnDate: '',
        makeupNote: preset.defaultMakeupNote,
        message: preset.defaultMessage,
      });
    } else {
      const preset = HOLIDAY_CATEGORY_PRESETS.UNEXPECTED;
      const todayVn = formatVnShortDate(new Date());
      setFormData({
        noticeCategory: 'UNEXPECTED',
        customTitle: preset.defaultTitle,
        holidayName: '',
        scopeLabel: 'Toàn hệ thống Trung tâm Anh ngữ Nhật Mỹ',
        startDate: todayVn,
        endDate: todayVn,
        returnDate: '',
        makeupNote: preset.defaultMakeupNote,
        message: preset.defaultMessage,
      });
    }
    setAiContent({ zaloOptions: [], fbOptions: [] });
  }, [holiday, isOpen]);

  const handleCategorySwitch = (catKey) => {
    const preset = HOLIDAY_CATEGORY_PRESETS[catKey] || HOLIDAY_CATEGORY_PRESETS.HOLIDAY;
    setFormData((prev) => ({
      ...prev,
      noticeCategory: catKey,
      customTitle: preset.defaultTitle,
      makeupNote: preset.defaultMakeupNote,
      message: preset.defaultMessage,
    }));
  };

  // Nội dung mẫu realtime tự động theo từng ký tự (không lệ thuộc AI)
  const builtInMessages = useMemo(() => {
    const titleText = (formData.customTitle || 'THÔNG BÁO LỊCH NGHỈ').toUpperCase();
    const reasonText = formData.holidayName || HOLIDAY_CATEGORY_PRESETS[formData.noticeCategory]?.defaultReason || '';
    const dateLine =
      formData.startDate && formData.endDate && formData.startDate !== formData.endDate
        ? `Từ ngày ${formData.startDate} đến hết ngày ${formData.endDate}`
        : formData.startDate
        ? `Ngày ${formData.startDate}`
        : 'Theo lịch thông báo đính kèm';

    const zalo1 =
      `📢 [ANH NGỮ NHẬT MỸ] ${titleText}\n\n` +
      `Kính gửi Quý Phụ huynh & các em học viên,\n` +
      `Trung tâm xin trân trọng thông báo lịch nghỉ: ${reasonText}.\n` +
      `📍 Phạm vi: ${formData.scopeLabel}\n` +
      `📅 Thời gian nghỉ: ${dateLine}\n` +
      `🎓 Thời gian học lại: ${formData.returnDate || 'Theo lịch học tiếp theo'}\n\n` +
      `✅ ${formData.makeupNote}\n` +
      `${formData.message}\n` +
      `Hotline hỗ trợ: 0911 767 069`;

    const zalo2 =
      `Dạ Trung tâm Anh ngữ Nhật Mỹ kính gửi Quý Phụ huynh thông báo "${reasonText}" (${dateLine}). ` +
      `Các lớp sẽ đi học trở lại vào: ${formData.returnDate || 'buổi học kế tiếp theo TKB'}. ` +
      `${formData.makeupNote} ${formData.message} ❤️`;

    const fb1 =
      `✨ ${titleText} — HỆ THỐNG ANH NGỮ NHẬT MỸ ✨\n\n` +
      `Quý Phụ huynh và các em học viên thân mến,\n` +
      `Trung tâm Anh ngữ Nhật Mỹ trân trọng thông báo lịch nghỉ (${reasonText}):\n` +
      `▪️ Phạm vi áp dụng: ${formData.scopeLabel}\n` +
      `▪️ Thời gian nghỉ: ${dateLine}\n` +
      `▪️ Thời gian trở lại lớp: ${formData.returnDate || 'Theo lịch học chính khóa'}\n\n` +
      `📌 Lưu ý: ${formData.makeupNote}\n\n` +
      `${formData.message}\n` +
      `------------------\n` +
      `🏫 ANH NGỮ NHẬT MỸ — Dedicated to Excellence\n` +
      `☎️ Hotline: 0911 767 069 | 🌐 anhngunhatmy.edu.vn`;

    return {
      Zalo: [zalo1, zalo2],
      Facebook: [fb1],
    };
  }, [formData]);

  const fetchAiContent = async () => {
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/holiday-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holidayName: formData.holidayName || formData.customTitle,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiContent(data.data);
        showToast('✅ Đã sinh thêm gợi ý nội dung từ AI!', 'success');
      } else {
        showToast(data.error || 'Chưa kết nối được AI — Thầy dùng mẫu soạn sẵn bên dưới nhé!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Không thể kết nối AI. Đang hiển thị mẫu chuẩn soạn sẵn.', 'error');
    } finally {
      setLoadingAi(false);
    }
  };

  const slug = (formData.holidayName || formData.noticeCategory || 'ThongBao').replace(/\s+/g, '_');
  const exportFilename = `ThongBao_${slug}.png`;

  const handleCopyImage = async () => {
    if (!captureRef.current) return;
    setIsCopying(true);
    try {
      const result = await copyElementPng(captureRef.current, exportFilename);
      if (result.status === 'COPIED') {
        showToast('✅ Đã copy ảnh Thông báo! Nhấn Ctrl+V dán vào Zalo ngay.', 'success');
      } else {
        showToast('Đã tải ảnh PNG xuống máy.', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tạo ảnh thông báo.', 'error');
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!captureRef.current) return;
    setIsDownloading(true);
    try {
      await downloadElementPng(captureRef.current, exportFilename);
      showToast('✅ Đã tải ảnh PNG sắc nét về máy!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải ảnh thông báo.', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    showToast('✅ Đã sao chép nội dung bài đăng!', 'success');
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
    marginBottom: '4px',
  };

  const aiList = activeTab === 'Zalo' ? aiContent.zaloOptions : aiContent.fbOptions;
  const displayedMessages = aiList && aiList.length > 0 ? aiList : builtInMessages[activeTab];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      {/* Bản ẩn 800px Retina 2x để xuất ảnh */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '800px', pointerEvents: 'none' }}>
        <HolidayNoticeTemplate ref={captureRef} data={formData} />
      </div>

      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '1320px',
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
              🎨 STUDIO THÔNG BÁO NGHỈ LỄ / TẾT / ĐỘT XUẤT
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12.5px', opacity: 0.92 }}>
              Tùy chỉnh nội dung Realtime • Xem trước trực tiếp • Chuẩn nhận diện Anh ngữ Nhật Mỹ (Retina 2x)
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
        {toastMsg && (
          <div
            style={{
              padding: '9px 20px',
              backgroundColor: toastMsg.type === 'error' ? '#EF4444' : '#10B981',
              color: '#FFFFFF',
              fontSize: '13.5px',
              fontWeight: '700',
              textAlign: 'center',
            }}
          >
            {toastMsg.text}
          </div>
        )}

        {/* Body 2 Cột: Trái Chỉnh Sửa Realtime + Tin Nhắn - Phải Live Preview */}
        <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', flex: 1, overflow: 'hidden' }}>
          {/* Cột Trái */}
          <div
            style={{
              padding: '18px 20px',
              overflowY: 'auto',
              backgroundColor: '#F8FAFC',
              borderRight: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Chọn nhanh loại thông báo */}
            <div>
              <span style={labelStyle}>Chọn loại thông báo</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {[
                  { key: 'HOLIDAY', label: '🎉 Nghỉ Lễ' },
                  { key: 'TET', label: '🏮 Nghỉ Tết' },
                  { key: 'UNEXPECTED', label: '⚡ Đột Xuất' },
                  { key: 'CUSTOM', label: '📢 Tùy chỉnh' },
                ].map((item) => {
                  const active = formData.noticeCategory === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => handleCategorySwitch(item.key)}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: `2px solid ${active ? BRAND.blue : '#CBD5E1'}`,
                        backgroundColor: active ? BRAND.blueLight : '#FFFFFF',
                        color: active ? BRAND.blueDark : '#475569',
                        fontWeight: '800',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Tiêu đề lớn trên thư (Realtime)</label>
              <input
                type="text"
                value={formData.customTitle}
                onChange={(e) => setFormData({ ...formData, customTitle: e.target.value })}
                placeholder="VD: THÔNG BÁO LỊCH NGHỈ LỄ"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tên ngày lễ / Lý do nghỉ</label>
              <input
                type="text"
                value={formData.holidayName}
                onChange={(e) => setFormData({ ...formData, holidayName: e.target.value })}
                placeholder="VD: Nghỉ Lễ 30/04 - 01/05 hoặc Mất điện khu vực..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Phạm vi / Lớp áp dụng</label>
              <input
                type="text"
                value={formData.scopeLabel}
                onChange={(e) => setFormData({ ...formData, scopeLabel: e.target.value })}
                placeholder="VD: Toàn Trung tâm hoặc Lớp S2 - T7CN - Ca 1"
                style={inputStyle}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Từ ngày</label>
                <input
                  type="text"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  placeholder="VD: 30/04/2027"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Đến hết ngày</label>
                <input
                  type="text"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  placeholder="VD: 01/05/2027"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Thời gian đi học lại</label>
              <input
                type="text"
                value={formData.returnDate}
                onChange={(e) => setFormData({ ...formData, returnDate: e.target.value })}
                placeholder="VD: Thứ Hai, ngày 03/05/2027"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Ghi chú học bù / bảo lưu lộ trình</label>
              <textarea
                rows={2}
                value={formData.makeupNote}
                onChange={(e) => setFormData({ ...formData, makeupNote: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Lời chúc / Lời nhắn Phụ huynh</label>
              <textarea
                rows={2}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            {/* Khối nội dung bài viết Zalo / Facebook */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #CBD5E1', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                <span style={{ fontWeight: '800', fontSize: '12.5px', color: BRAND.blueDark }}>
                  💬 Tin nhắn gửi kèm (Realtime)
                </span>
                <button
                  type="button"
                  onClick={fetchAiContent}
                  disabled={loadingAi}
                  style={{
                    backgroundColor: '#7C3AED',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: loadingAi ? 'wait' : 'pointer',
                  }}
                >
                  {loadingAi ? 'Đang viết...' : '✨ Viết lại bằng AI'}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {['Zalo', 'Facebook'].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1,
                      padding: '6px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: activeTab === tab ? BRAND.blue : '#E2E8F0',
                      color: activeTab === tab ? '#FFFFFF' : '#334155',
                      fontWeight: '700',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '190px', overflowY: 'auto' }}>
                {displayedMessages.map((opt, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px',
                      backgroundColor: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      position: 'relative',
                      paddingRight: '56px',
                    }}
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => copyText(opt)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        backgroundColor: BRAND.blue,
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '5px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                    >
                      Copy
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cột Phải: Xem Trước Trực Tiếp */}
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
            <div style={{ fontSize: '12.5px', fontWeight: '700', color: '#334155', marginBottom: '10px' }}>
              👁️ XEM TRƯỚC REALTIME (Cập nhật tức thì khi Thầy gõ bên trái)
            </div>
            <div style={{ transform: 'scale(0.75)', transformOrigin: 'top center', marginBottom: '-140px' }}>
              <HolidayNoticeTemplate data={formData} />
            </div>
          </div>
        </div>

        {/* Footer Action Bar */}
        <div
          style={{
            padding: '13px 24px',
            backgroundColor: '#FFFFFF',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '12.5px', color: '#64748B' }}>
            💡 Thầy có thể chỉnh sửa mọi dòng thông báo (Lễ, Tết, Đột xuất) và Copy dán thẳng vào nhóm Zalo lớp mà không làm thay đổi lịch khóa học nếu không bấm Lưu ngày nghỉ.
          </span>
          <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
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
