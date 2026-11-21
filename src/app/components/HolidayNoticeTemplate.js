'use client';

import React, { forwardRef } from 'react';
import BrandLetterShell from '@/components/BrandLetterShell';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import { BRAND, FONT_UNIFIED, getTodayVnShortDate } from '@/lib/brandTheme';

export const HOLIDAY_CATEGORY_PRESETS = {
  HOLIDAY: {
    key: 'HOLIDAY',
    label: 'Nghỉ Lễ',
    eyebrow: 'THÔNG BÁO NGHỈ LỄ CHÍNH THỨC',
    badgeSub: 'Official Holiday Notice',
    defaultTitle: 'THÔNG BÁO LỊCH NGHỈ LỄ',
    subtitleEn: 'Official Center Holiday Schedule',
    sealTitle: 'THÔNG BÁO LỄ',
    accentBg: BRAND.blueSoft,
    accentBorder: BRAND.blueBorder,
    defaultReason: 'Nghỉ Lễ theo quy định Nhà nước',
    defaultMakeupNote:
      'Số buổi nghỉ lễ đã được hệ thống tự động tịnh tiến dời ngày kết thúc khóa học để đảm bảo đủ 100% số buổi của học viên.',
    defaultMessage:
      'Kính chúc Quý Phụ huynh và các em học viên có một kỳ nghỉ lễ thật vui vẻ, bình an và ý nghĩa bên gia đình!',
  },
  TET: {
    key: 'TET',
    label: 'Nghỉ Tết',
    eyebrow: 'THÔNG BÁO NGHỈ TẾT CỔ TRUYỀN',
    badgeSub: 'Lunar New Year Schedule',
    defaultTitle: 'THÔNG BÁO LỊCH NGHỈ TẾT',
    subtitleEn: 'Lunar New Year Holiday Notice',
    sealTitle: 'CHÚC MỪNG NĂM MỚI',
    accentBg: BRAND.goldBg,
    accentBorder: BRAND.gold,
    defaultReason: 'Nghỉ Tết Nguyên Đán',
    defaultMakeupNote:
      'Toàn bộ lịch học trong thời gian nghỉ Tết được hệ thống tự động bảo lưu và cộng bù đầy đủ vào lộ trình khóa học.',
    defaultMessage:
      'Nhân dịp năm mới, Trung tâm Anh ngữ Nhật Mỹ kính chúc Quý Phụ huynh và gia đình An Khang - Thịnh Vượng - Vạn Sự Như Ý!',
  },
  UNEXPECTED: {
    key: 'UNEXPECTED',
    label: 'Nghỉ Đột Xuất',
    eyebrow: 'THÔNG BÁO ĐIỀU CHỈNH LỊCH ĐỘT XUẤT',
    badgeSub: 'Urgent Schedule Notice',
    defaultTitle: 'THÔNG BÁO NGHỈ HỌC ĐỘT XUẤT',
    subtitleEn: 'Urgent Class Suspension & Makeup Plan',
    sealTitle: 'THÔNG BÁO KHẨN',
    accentBg: '#FEF2F2',
    accentBorder: '#FECACA',
    defaultReason: 'Điều chỉnh lịch học đột xuất / Bảo trì cơ sở',
    defaultMakeupNote:
      'Buổi học nghỉ đột xuất sẽ được giáo viên sắp xếp lịch học bù hoặc tự động dời ngày kết thúc khóa, không mất quyền lợi của học viên.',
    defaultMessage:
      'Trung tâm Anh ngữ Nhật Mỹ rất mong Quý Phụ huynh thông cảm vì sự bất tiện này và cảm ơn sự phối hợp của gia đình!',
  },
  CUSTOM: {
    key: 'CUSTOM',
    label: 'Tùy chỉnh khác',
    eyebrow: 'THÔNG BÁO TỪ TRUNG TÂM',
    badgeSub: 'Official Center Notice',
    defaultTitle: 'THÔNG BÁO LỊCH HỌC',
    subtitleEn: 'Official Schedule Announcement',
    sealTitle: 'THÔNG BÁO',
    accentBg: BRAND.blueSoft,
    accentBorder: BRAND.blueBorder,
    defaultReason: 'Thông báo lịch sinh hoạt / sự kiện nội bộ',
    defaultMakeupNote:
      'Mọi lịch học hoặc thay đổi phòng/ca học (nếu có) sẽ được giáo viên chủ nhiệm thông báo trực tiếp tới Quý Phụ huynh.',
    defaultMessage:
      'Trân trọng cảm ơn Quý Phụ huynh và các em học viên đã luôn đồng hành cùng Trung tâm Anh ngữ Nhật Mỹ!',
  },
};

const HolidayNoticeTemplate = forwardRef(({ data }, ref) => {
  const {
    noticeCategory = 'HOLIDAY',
    customTitle = '',
    holidayName = '',
    scopeLabel = 'Toàn hệ thống Trung tâm Anh ngữ Nhật Mỹ',
    startDate = '',
    endDate = '',
    returnDate = '',
    makeupNote = '',
    message = '',
  } = data || {};

  const preset = HOLIDAY_CATEGORY_PRESETS[noticeCategory] || HOLIDAY_CATEGORY_PRESETS.HOLIDAY;
  const resolvedTitle = (customTitle || '').trim() || preset.defaultTitle;
  const isUnexpected = noticeCategory === 'UNEXPECTED';
  const isSameDay = startDate && endDate && startDate.trim() === endDate.trim();

  const dateRangeText = isSameDay
    ? `Ngày ${startDate}`
    : startDate && endDate
    ? `Từ ${startDate} đến hết ${endDate}`
    : startDate || endDate || 'Theo thông báo đính kèm';

  return (
    <BrandLetterShell
      ref={ref}
      id="holiday-notice-capture"
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub={preset.badgeSub}
      eyebrow={preset.eyebrow}
      title={resolvedTitle}
      subtitleEn={preset.subtitleEn}
    >
      {/* 1. KHỐI SỰ KIỆN / LÝ DO & PHẠM VI ÁP DỤNG */}
      <div
        style={{
          backgroundColor: preset.accentBg,
          borderRadius: '14px',
          border: `1.5px solid ${preset.accentBorder}`,
          padding: '16px 22px',
          marginBottom: '16px',
          textAlign: 'center',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            backgroundColor: isUnexpected ? '#DC2626' : BRAND.blue,
            color: BRAND.white,
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '11.5px',
            fontWeight: '800',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            marginBottom: '8px',
          }}
        >
          {preset.label}
        </div>
        <div
          style={{
            fontSize: '23px',
            fontWeight: '900',
            color: isUnexpected ? '#991B1B' : BRAND.blueDark,
            lineHeight: 1.3,
            textTransform: 'uppercase',
          }}
        >
          {holidayName || preset.defaultReason}
        </div>
        {scopeLabel && (
          <div
            style={{
              marginTop: '6px',
              fontSize: '13.5px',
              fontWeight: '600',
              color: BRAND.slate,
            }}
          >
            Phạm vi áp dụng: <strong style={{ color: BRAND.ink }}>{scopeLabel}</strong>
          </div>
        )}
      </div>

      {/* 2. THỜI GIAN NGHỈ & NGÀY HỌC LẠI */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `2px solid ${BRAND.blue}`,
          overflow: 'hidden',
          marginBottom: '16px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 0,
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderRight: `1px solid ${BRAND.border}`,
              backgroundColor: '#FFFDF7',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '800',
                color: '#DC2626',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              📅 THỜI GIAN TẠM NGHỈ
            </div>
            <div
              style={{
                fontSize: '17.5px',
                fontWeight: '900',
                color: '#B91C1C',
                marginTop: '6px',
                lineHeight: 1.4,
              }}
            >
              {dateRangeText}
            </div>
          </div>

          <div
            style={{
              padding: '16px 20px',
              backgroundColor: BRAND.blueSoft,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '800',
                color: BRAND.blueDark,
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              🎓 THỜI GIAN HỌC LẠI
            </div>
            <div
              style={{
                fontSize: '17.5px',
                fontWeight: '900',
                color: BRAND.blueDark,
                marginTop: '6px',
                lineHeight: 1.4,
              }}
            >
              {returnDate || 'Theo lịch học tiếp theo'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. GHI CHÚ HỌC BÙ / QUYỀN LỢI + LỜI NHẮN + MỘC ĐỎ */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.border}`,
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: '1fr 122px',
          gap: '16px',
          alignItems: 'center',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          {(makeupNote || preset.defaultMakeupNote) && (
            <div
              style={{
                backgroundColor: BRAND.greenBadgeBg,
                borderLeft: `4px solid ${BRAND.greenBadge}`,
                borderRadius: '6px',
                padding: '9px 13px',
                fontSize: '13px',
                color: '#065F46',
                lineHeight: 1.55,
                marginBottom: '12px',
                whiteSpace: 'pre-line',
              }}
            >
              <strong style={{ fontWeight: '800' }}>✓ Bảo lưu &amp; Lộ trình:</strong>{' '}
              {makeupNote || preset.defaultMakeupNote}
            </div>
          )}

          <div
            style={{
              fontSize: '14px',
              fontStyle: 'italic',
              fontWeight: '500',
              color: BRAND.slate,
              lineHeight: 1.6,
              whiteSpace: 'pre-line',
            }}
          >
            &ldquo;{message || preset.defaultMessage}&rdquo;
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <OfficialRedSeal
            title={preset.sealTitle}
            subtitle="BAN GIÁM ĐỐC"
            size={106}
            date={getTodayVnShortDate()}
          />
        </div>
      </div>
    </BrandLetterShell>
  );
});

HolidayNoticeTemplate.displayName = 'HolidayNoticeTemplate';
export default HolidayNoticeTemplate;
