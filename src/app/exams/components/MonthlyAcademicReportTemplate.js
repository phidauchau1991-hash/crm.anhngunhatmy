'use client';

import React, { forwardRef } from 'react';
import BrandLetterShell from '@/components/BrandLetterShell';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import { BRAND, FONT_UNIFIED, getTodayVnShortDate } from '@/lib/brandTheme';

const MonthlyAcademicReportTemplate = forwardRef(({ data }, ref) => {
  if (!data) return null;

  const { studentName, monthYear, className, stats, aiComment, diaries } = data;
  const { present = 0, absent = 0, missingWb = 0, missingVideo = 0 } = stats || {};

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  };

  const StatBox = ({ label, value, color, bg }) => (
    <div
      style={{
        flex: 1,
        padding: '14px 10px',
        background: bg,
        borderRadius: '12px',
        border: `1.5px solid ${color}33`,
        textAlign: 'center',
        fontFamily: FONT_UNIFIED,
      }}
    >
      <div style={{ fontSize: '11.5px', color, fontWeight: '800', marginBottom: '6px', letterSpacing: '0.3px' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: '900', color: BRAND.ink }}>{value}</div>
    </div>
  );

  return (
    <BrandLetterShell
      ref={ref}
      id="monthly-academic-report-template"
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub={`Monthly Report • ${monthYear || ''}`}
      eyebrow={`BÁO CÁO TỔNG HỢP THÁNG ${monthYear || ''}`}
      title="PHIẾU BÁO CÁO HỌC TẬP THÁNG"
      subtitleEn="Monthly Attendance &amp; Academic Progress Report"
      style={{ fontVariantLigatures: 'none', letterSpacing: 'normal' }}
    >
      {/* STUDENT INFO CARD */}
      <div
        style={{
          marginBottom: '20px',
          padding: '16px 22px',
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div style={{ fontSize: '11.5px', color: BRAND.subtle, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            HỌC VIÊN
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: BRAND.blueDark, textTransform: 'uppercase', marginTop: '3px' }}>
            {studentName}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11.5px', color: BRAND.subtle, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            LỚP HỌC
          </div>
          <div style={{ fontSize: '17px', fontWeight: '800', color: BRAND.ink, marginTop: '3px' }}>
            {className}
          </div>
        </div>
      </div>

      {/* SECTION 1: STATS */}
      <div style={{ marginBottom: '20px', fontFamily: FONT_UNIFIED }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: BRAND.blueDark, display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', backgroundColor: BRAND.blue, color: BRAND.white, borderRadius: '7px', fontSize: '13.5px', fontWeight: '900' }}>
            1
          </span>
          Thống kê Chuyên cần &amp; Bài tập
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <StatBox label="ĐI HỌC" value={`${present} buổi`} color="#059669" bg="#ECFDF5" />
          <StatBox label="VẮNG" value={`${absent} buổi`} color="#DC2626" bg="#FEF2F2" />
          <StatBox label="THIẾU WORKBOOK" value={`${missingWb} lần`} color="#D97706" bg="#FFFBEB" />
          <StatBox label="THIẾU VIDEO" value={`${missingVideo} lần`} color="#7C3AED" bg="#F5F3FF" />
        </div>
      </div>

      {/* SECTION 2: AI COMMENT */}
      <div style={{ marginBottom: '20px', fontFamily: FONT_UNIFIED }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: BRAND.blueDark, display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', backgroundColor: BRAND.blue, color: BRAND.white, borderRadius: '7px', fontSize: '13.5px', fontWeight: '900' }}>
            2
          </span>
          Nhận xét của Giáo viên
        </div>
        <div
          style={{
            padding: '15px 18px',
            backgroundColor: BRAND.blueSoft,
            border: `1px solid ${BRAND.blueBorder}`,
            borderLeft: `4px solid ${BRAND.blue}`,
            borderRadius: '10px',
            fontSize: '13.5px',
            lineHeight: 1.65,
            color: BRAND.slate,
            whiteSpace: 'pre-wrap',
            fontWeight: '500',
          }}
        >
          {aiComment || 'Chưa có nhận xét cho tháng này.'}
        </div>
      </div>

      {/* SECTION 3: DIARIES */}
      <div style={{ marginBottom: '16px', fontFamily: FONT_UNIFIED }}>
        <div style={{ fontSize: '15px', fontWeight: '800', color: BRAND.blueDark, display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '12px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', backgroundColor: BRAND.blue, color: BRAND.white, borderRadius: '7px', fontSize: '13.5px', fontWeight: '900' }}>
            3
          </span>
          Nhật ký giảng dạy của lớp
        </div>
        {!diaries || diaries.length === 0 ? (
          <div style={{ padding: '16px', backgroundColor: BRAND.white, border: `1px dashed ${BRAND.border}`, borderRadius: '10px', fontSize: '13.5px', color: BRAND.subtle, fontStyle: 'italic', textAlign: 'center' }}>
            Không có ghi chép nhật ký giảng dạy trong tháng này.
          </div>
        ) : (
          <div style={{ border: `1.5px solid ${BRAND.border}`, borderRadius: '12px', overflow: 'hidden', backgroundColor: BRAND.white }}>
            {diaries.map((d, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '12px 16px',
                  backgroundColor: idx % 2 === 0 ? BRAND.white : '#F8FBFE',
                  borderTop: idx === 0 ? 'none' : `1px solid ${BRAND.border}`,
                }}
              >
                <div style={{ flexShrink: 0, width: '78px', fontSize: '13px', fontWeight: '800', color: BRAND.blue, paddingTop: '2px' }}>
                  {formatDate(d.date)}
                </div>
                <div style={{ flex: 1, fontSize: '13.5px', lineHeight: 1.6, color: BRAND.slate, whiteSpace: 'pre-wrap', fontWeight: '500' }}>
                  {d.classNotes}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* XÁC NHẬN & MỘC ĐỎ (GỌN) */}
      <div
        style={{
          borderTop: `1.5px dashed ${BRAND.border}`,
          padding: '8px 6px 2px 6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          marginTop: '10px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase' }}>
            Xác nhận báo cáo tháng {monthYear}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: BRAND.ink, marginTop: '2px' }}>
            Giáo viên Chủ nhiệm — Hệ thống Anh ngữ Nhật Mỹ
          </div>
          <div style={{ fontSize: '11.5px', fontStyle: 'italic', color: BRAND.muted, marginTop: '1px' }}>
            Mọi thắc mắc phụ huynh vui lòng liên hệ trực tiếp Giáo viên chủ nhiệm hoặc Hotline trung tâm.
          </div>
        </div>
        <OfficialRedSeal
          title="XÁC NHẬN THÁNG"
          subtitle="GIÁO VIÊN CHỦ NHIỆM"
          size={82}
          date={getTodayVnShortDate()}
        />
      </div>
    </BrandLetterShell>
  );
});

MonthlyAcademicReportTemplate.displayName = 'MonthlyAcademicReportTemplate';
export default MonthlyAcademicReportTemplate;
