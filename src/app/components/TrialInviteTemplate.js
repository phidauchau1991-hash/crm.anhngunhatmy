'use client';

import React, { forwardRef } from 'react';
import BrandLetterShell from '@/components/BrandLetterShell';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import {
  BRAND,
  FONT_UNIFIED,
  INVITE_TONE_PROFILES,
  getTodayVnShortDate,
} from '@/lib/brandTheme';

const TrialInviteTemplate = forwardRef(({ data }, ref) => {
  const {
    inviteType = 'TRIAL', // 'TRIAL' | 'ASSESSMENT'
    toneMode = 'KIDS',    // 'KIDS' | 'TEEN'
    studentName = 'HỌC VIÊN',
    className = '',
    rawClassCode = '',
    teacherName = '',
    room = '',
    studyDays = '',
    studyHours = '',
    startDate = '',
    startDateDisplay = '',
    endDate = '',
    centerPrep = '',
    parentPrep = '',
    issuedDate = '',
  } = data || {};

  const isAssessment = inviteType === 'ASSESSMENT';
  const profile = INVITE_TONE_PROFILES[toneMode] || INVITE_TONE_PROFILES.KIDS;
  const hourLines = String(studyHours || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const primaryDateBanner = startDateDisplay || startDate || studyDays || 'Theo lịch hẹn';
  const footerWish = isAssessment
    ? toneMode === 'TEEN'
      ? 'Chúc em tự tin, bình tĩnh và đạt kết quả tốt nhất trong buổi đánh giá năng lực!'
      : 'Chúc con tự tin, vui vẻ và đạt kết quả thật tốt trong buổi đánh giá tại Anh ngữ Nhật Mỹ!'
    : toneMode === 'TEEN'
      ? 'Trung tâm Anh ngữ Nhật Mỹ hân hạnh đồng hành cùng em trong buổi học trải nghiệm!'
      : 'Chào mừng con đến với lớp học trải nghiệm đầy hứng khởi tại Trung tâm Anh ngữ Nhật Mỹ!';

  return (
    <BrandLetterShell
      ref={ref}
      id="trial-invite-capture"
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub={isAssessment ? 'English Placement Assessment' : 'Trial Class Invitation'}
      eyebrow={isAssessment ? 'CHƯƠNG TRÌNH ĐÁNH GIÁ ĐẦU VÀO' : 'CHƯƠNG TRÌNH TRẢI NGHIỆM THỰC TẾ'}
      title={isAssessment ? 'THƯ MỜI ĐÁNH GIÁ NĂNG LỰC' : 'THƯ MỜI THAM GIA LỚP HỌC THỬ'}
      subtitleEn={
        isAssessment
          ? 'Official English Placement Assessment Invitation'
          : 'Official Trial Class Invitation'
      }
      footerNote={footerWish}
    >
      {/* 1. KHỐI THÔNG TIN HỌC VIÊN & LỚP / BÀI ĐÁNH GIÁ */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '18px 24px',
          marginBottom: '16px',
          boxShadow: '0 2px 10px rgba(13, 136, 196, 0.06)',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '14px',
            marginBottom: '14px',
            paddingBottom: '12px',
            borderBottom: `1px dashed ${BRAND.border}`,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '11.5px',
                fontWeight: '800',
                color: BRAND.subtle,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '4px',
              }}
            >
              HỌ VÀ TÊN HỌC VIÊN
            </div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '23px',
                fontWeight: '900',
                color: BRAND.blueDark,
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
                lineHeight: 1.2,
              }}
            >
              {studentName || 'HỌ VÀ TÊN HỌC VIÊN'}
            </div>
          </div>

          <div
            style={{
              backgroundColor: BRAND.greenBadgeBg,
              color: BRAND.greenBadge,
              border: `1.5px solid ${BRAND.greenBorder}`,
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontFamily: FONT_UNIFIED,
            }}
          >
            {isAssessment ? '✓ ĐÃ XÁC NHẬN LỊCH TEST' : '✓ ĐÃ XẾP LỊCH HỌC THỬ'}
          </div>
        </div>

        {/* Hàng Lớp / Bài đánh giá & Giáo viên / Phòng */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: teacherName || room ? '1.35fr 1fr' : '1fr',
            gap: '12px',
          }}
        >
          <div
            style={{
              backgroundColor: BRAND.blueSoft,
              borderRadius: '10px',
              padding: '12px 16px',
              borderLeft: `4px solid ${BRAND.blue}`,
            }}
          >
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '11px',
                fontWeight: '800',
                color: BRAND.blue,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {isAssessment ? 'BÀI ĐÁNH GIÁ CHUYÊN MÔN' : 'LỚP HỌC TRẢI NGHIỆM'}
            </div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '16px',
                fontWeight: '800',
                color: BRAND.ink,
                marginTop: '3px',
              }}
            >
              {className || (isAssessment ? 'Đánh giá 4 kỹ năng chuẩn Cambridge' : 'Đang cập nhật lớp')}
            </div>
            {!isAssessment && rawClassCode && rawClassCode !== className && (
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '12px',
                  fontWeight: '500',
                  color: BRAND.muted,
                  marginTop: '2px',
                }}
              >
                Mã lớp: {rawClassCode}
              </div>
            )}
          </div>

          {(teacherName || room) && (
            <div
              style={{
                backgroundColor: BRAND.blueSoft,
                borderRadius: '10px',
                padding: '12px 16px',
                borderLeft: `4px solid ${BRAND.gold}`,
              }}
            >
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '11px',
                  fontWeight: '800',
                  color: BRAND.goldDark,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                GIÁO VIÊN &amp; ĐỊA ĐIỂM
              </div>
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '15.5px',
                  fontWeight: '800',
                  color: BRAND.ink,
                  marginTop: '3px',
                }}
              >
                {teacherName || 'Giáo viên chuyên môn Nhật Mỹ'}
              </div>
              {room && (
                <div
                  style={{
                    fontFamily: FONT_UNIFIED,
                    fontSize: '12px',
                    fontWeight: '600',
                    color: BRAND.goldDark,
                    marginTop: '2px',
                  }}
                >
                  📍 {room}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 2. BANNER LỊCH HẸN CHÍNH THỨC + BẢNG THỜI GIAN CHI TIẾT */}
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
            background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 100%)`,
            padding: '14px 20px',
            color: BRAND.white,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '1.2px',
              color: BRAND.gold,
              textTransform: 'uppercase',
            }}
          >
            {isAssessment ? '📅 THỜI GIAN HẸN ĐÁNH GIÁ NĂNG LỰC' : '📅 NGÀY BẮT ĐẦU THAM GIA HỌC THỬ'}
          </div>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '21px',
              fontWeight: '900',
              color: BRAND.white,
              marginTop: '3px',
              letterSpacing: '0.2px',
            }}
          >
            {primaryDateBanner}
          </div>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '12px',
              fontStyle: 'italic',
              fontWeight: '500',
              color: '#E0F2FE',
              marginTop: '3px',
            }}
          >
            {profile.arrivalNote}
          </div>
        </div>

        {/* 3 cột Lịch / Giờ / Thời lượng */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr 1fr',
            gap: '14px',
            padding: '15px 22px',
            backgroundColor: BRAND.goldBg,
            textAlign: 'center',
            alignItems: 'start',
          }}
        >
          <div style={{ borderRight: `1px solid ${BRAND.goldBorder}`, paddingRight: '10px' }}>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '11.5px',
                fontWeight: '800',
                color: BRAND.goldDark,
                textTransform: 'uppercase',
              }}
            >
              {isAssessment ? '🗓️ Ngày Hẹn' : '🗓️ Lịch Học Tuần'}
            </div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '14.5px',
                fontWeight: '800',
                color: BRAND.ink,
                marginTop: '5px',
                lineHeight: 1.4,
              }}
            >
              {studyDays || startDate || 'Theo lịch hẹn'}
            </div>
          </div>

          <div style={{ borderRight: `1px solid ${BRAND.goldBorder}`, paddingRight: '10px' }}>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '11.5px',
                fontWeight: '800',
                color: BRAND.goldDark,
                textTransform: 'uppercase',
              }}
            >
              {isAssessment ? '⏰ Giờ Đánh Giá' : '⏰ Giờ Học Chi Tiết'}
            </div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '14px',
                fontWeight: '800',
                color: BRAND.blueDark,
                marginTop: '5px',
                lineHeight: 1.45,
              }}
            >
              {hourLines.length > 1 ? (
                hourLines.map((line, idx) => (
                  <div key={idx} style={{ marginBottom: idx < hourLines.length - 1 ? '3px' : 0 }}>
                    {line}
                  </div>
                ))
              ) : (
                <span>{hourLines[0] || studyHours || 'Theo khung giờ hẹn'}</span>
              )}
            </div>
          </div>

          <div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '11.5px',
                fontWeight: '800',
                color: BRAND.goldDark,
                textTransform: 'uppercase',
              }}
            >
              {isAssessment ? '⏱️ Thời Gian Làm Bài' : '🎯 Kết Thúc / Số Buổi'}
            </div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '14.5px',
                fontWeight: '800',
                color: BRAND.ink,
                marginTop: '5px',
                lineHeight: 1.4,
              }}
            >
              {endDate || (isAssessment ? '30 - 45 phút' : 'Trải nghiệm thực tế')}
            </div>
          </div>
        </div>
      </div>

      {/* 3. KHUNG CHUẨN BỊ + CON DẤU MỘC ĐỎ CHÍNH THỨC */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.border}`,
          padding: '18px 22px',
          display: 'grid',
          gridTemplateColumns: '1fr 136px',
          gap: '16px',
          alignItems: 'center',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '13.5px',
              fontWeight: '800',
              color: BRAND.blueDark,
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
              marginBottom: '12px',
            }}
          >
            📌 THÔNG TIN CHUẨN BỊ CHO BUỔI {isAssessment ? 'ĐÁNH GIÁ' : 'HỌC THỬ'}:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  backgroundColor: BRAND.blue,
                  color: BRAND.white,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                1
              </div>
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '13.5px',
                  fontWeight: '500',
                  color: BRAND.slate,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}
              >
                <strong style={{ fontWeight: '800', color: BRAND.ink }}>Trung tâm chuẩn bị:</strong>{' '}
                {centerPrep ||
                  (isAssessment
                    ? 'Đề kiểm tra chuẩn Cambridge, giáo viên chuyên môn phỏng vấn 1-1 và phòng đánh giá tiêu chuẩn.'
                    : 'Bộ tài liệu học thử độc quyền, vở viết và không gian lớp học tương tác.')}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  backgroundColor: BRAND.greenBadge,
                  color: BRAND.white,
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                2
              </div>
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '13.5px',
                  fontWeight: '500',
                  color: BRAND.slate,
                  lineHeight: 1.55,
                  whiteSpace: 'pre-line',
                }}
              >
                <strong style={{ fontWeight: '800', color: BRAND.ink }}>{profile.prep2Title}:</strong>{' '}
                {parentPrep ||
                  (isAssessment ? profile.assessmentPrep2Default : profile.trialPrep2Default)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <OfficialRedSeal
            title="XÁC NHẬN LỊCH"
            subtitle="BAN TUYỂN SINH"
            size={122}
            date={issuedDate || getTodayVnShortDate()}
          />
        </div>
      </div>
    </BrandLetterShell>
  );
});

TrialInviteTemplate.displayName = 'TrialInviteTemplate';
export default TrialInviteTemplate;
