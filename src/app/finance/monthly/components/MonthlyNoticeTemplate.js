'use client';

import React, { forwardRef } from 'react';
import BrandLetterShell from '@/components/BrandLetterShell';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import { BRAND, FONT_UNIFIED, getTodayVnShortDate } from '@/lib/brandTheme';

const MonthlyNoticeTemplate = forwardRef(({ noticeData }, ref) => {
  const {
    studentName = '',
    classCode = '',
    teacherName = '',
    monthYear = '',
    billingType = '',
    committedSessions = 0,
    actualSessions = 0,
    currentFee = 0,
    excessMissing = 0,
    previousDebt = 0,
    totalToPay = 0,
    qrUrl = '',
    datesPresent = [],
    datesAbsent = [],
    debtMonth = '',
  } = noticeData || {};

  const formatCurrency = (amount) =>
    `${new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0))} đ`;

  const getAdjacentMonths = (my) => {
    if (!my || !my.includes('/')) return { current: my || '', prev: '', next: '' };
    const [mm, yyyy] = my.split('/');
    const m = parseInt(mm, 10);
    const y = parseInt(yyyy, 10);
    if (isNaN(m) || isNaN(y)) return { current: my, prev: '', next: '' };

    let pm = m - 1;
    let py = y;
    if (pm === 0) {
      pm = 12;
      py -= 1;
    }

    let nm = m + 1;
    let ny = y;
    if (nm === 13) {
      nm = 1;
      ny += 1;
    }

    return {
      current: my,
      prev: `${pm.toString().padStart(2, '0')}/${py}`,
      next: `${nm.toString().padStart(2, '0')}/${ny}`,
    };
  };

  const { current: reviewedMonth, prev: defaultDebtMonth, next: nextMonth } = getAdjacentMonths(monthYear);
  const targetNoticeMonth = billingType === 'MONTHLY_PREPAID' ? nextMonth : reviewedMonth;
  const actualDebtMonth = debtMonth || defaultDebtMonth;

  const nameNoAccent = studentName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  const firstName = (nameNoAccent.trim().split(' ').pop() || 'HV').toUpperCase();
  const transferContent = `${firstName} HP THANG ${targetNoticeMonth.replace('/', '')}`;

  return (
    <BrandLetterShell
      ref={ref}
      id="monthly-tuition-notice-capture"
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub={`Monthly Tuition • ${targetNoticeMonth}`}
      eyebrow={`V/V ĐÓNG HỌC PHÍ THÁNG ${targetNoticeMonth}`}
      title="THƯ THÔNG BÁO HỌC PHÍ THÁNG"
      subtitleEn={`Monthly Tuition Fee & Attendance Statement • ${targetNoticeMonth}`}
    >
      {/* 1. THÔNG TIN HỌC VIÊN & TỔNG CẦN ĐÓNG */}
      <div
        style={{
          marginBottom: '14px',
          padding: '13px 18px',
          backgroundColor: BRAND.white,
          borderRadius: '12px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            KÍNH GỬI PHỤ HUYNH EM
          </div>
          <div style={{ fontSize: '21px', fontWeight: '900', color: BRAND.blueDark, textTransform: 'uppercase', marginTop: '2px' }}>
            {studentName.toUpperCase()}
          </div>
          <div style={{ fontSize: '13px', color: BRAND.slate, marginTop: '4px' }}>
            <span>🏫 Lớp: <strong style={{ color: BRAND.blueDark }}>{classCode}</strong></span>
            {teacherName && <span style={{ marginLeft: '12px' }}>• 👩‍🏫 GVCN: <strong>{teacherName}</strong></span>}
          </div>
        </div>

        <div
          style={{
            backgroundColor: BRAND.goldBg,
            border: `2px solid ${BRAND.gold}`,
            borderRadius: '10px',
            padding: '8px 14px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase' }}>
            TỔNG CẦN ĐÓNG
          </div>
          <div style={{ fontSize: '19px', fontWeight: '900', color: totalToPay > 0 ? '#DC2626' : BRAND.greenBadge, marginTop: '2px' }}>
            {formatCurrency(totalToPay)}
          </div>
        </div>
      </div>

      {/* 2. LỜI CHÀO */}
      <div style={{ textAlign: 'justify', marginBottom: '14px', lineHeight: 1.6, color: BRAND.slate, fontSize: '13.5px', fontFamily: FONT_UNIFIED }}>
        Anh ngữ Nhật Mỹ xin gửi lời cảm ơn chân thành đến Quý Phụ huynh đã luôn đồng hành cùng Trung tâm. Trung tâm kính gửi thông tin điểm danh và học phí tháng{' '}
        <strong>{targetNoticeMonth}</strong> của lớp <strong>{classCode}</strong> như sau:
      </div>

      {/* 3. CHI TIẾT HỌC PHÍ */}
      <div style={{ backgroundColor: BRAND.white, padding: '13px 18px', borderRadius: '12px', border: `1.5px solid ${BRAND.border}`, marginBottom: '12px', fontSize: '13.5px', fontFamily: FONT_UNIFIED }}>
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, lineHeight: 1.8 }}>
          <li>
            Số buổi đã học trong tháng {reviewedMonth}: <strong>{actualSessions} buổi</strong>
          </li>
          {previousDebt > 0 && (
            <li style={{ color: '#EA580C' }}>
              Học phí chưa hoàn thành của tháng {actualDebtMonth}: <strong>{formatCurrency(previousDebt)}</strong>
            </li>
          )}
          {billingType === 'MONTHLY_PREPAID' ? (
            <>
              {Number(excessMissing) !== 0 && (
                <li>
                  Học phí dư/thiếu sau tháng {reviewedMonth}:{' '}
                  <strong style={{ color: excessMissing > 0 ? '#EA580C' : BRAND.greenBadge }}>
                    {formatCurrency(Math.abs(excessMissing))} {excessMissing > 0 ? '(Thiếu)' : '(Dư)'}
                  </strong>
                </li>
              )}
              <li>
                Học phí {committedSessions} buổi của tháng {targetNoticeMonth}: <strong>{formatCurrency(currentFee)}</strong>
              </li>
            </>
          ) : (
            <li>
              Học phí của số buổi học trong tháng {reviewedMonth}: <strong>{formatCurrency(currentFee)}</strong>
            </li>
          )}
        </ul>
      </div>

      {/* 4. CHI TIẾT ĐIỂM DANH */}
      {(datesPresent.length > 0 || datesAbsent.length > 0) && (
        <div style={{ marginBottom: '14px', padding: '12px 16px', backgroundColor: BRAND.greenBadgeBg, borderRadius: '10px', border: `1px solid ${BRAND.greenBorder}`, fontSize: '13px', fontFamily: FONT_UNIFIED }}>
          <div style={{ marginBottom: '5px', fontWeight: '800', color: '#065F46' }}>
            📋 Chi tiết điểm danh tháng {reviewedMonth}:
          </div>
          {datesPresent.length > 0 && (
            <div style={{ marginBottom: datesAbsent.length > 0 ? '4px' : 0 }}>
              <span style={{ color: BRAND.greenBadge, fontWeight: '800' }}>Ngày có mặt:</span> {datesPresent.join(', ')}
            </div>
          )}
          {datesAbsent.length > 0 && (
            <div>
              <span style={{ color: '#DC2626', fontWeight: '800' }}>Ngày vắng:</span> {datesAbsent.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* 5. CHUYỂN KHOẢN, VIETQR & MỘC ĐỎ */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.border}`,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '18px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13.5px', fontWeight: '800', color: BRAND.blueDark, marginBottom: '6px', textTransform: 'uppercase' }}>
            🏦 Thông tin chuyển khoản:
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: 1.85, fontSize: '13px', color: BRAND.slate }}>
            <li>Ngân hàng: <strong>NH Quân Đội - MB Bank</strong></li>
            <li>Số TK: <strong style={{ fontSize: '16px', color: BRAND.blueDark }}>61 1991 6886</strong></li>
            <li>Người nhận: <strong>CÔNG TY TNHH NGOAI NGU TRI THUC VIET</strong></li>
            <li>
              Nội dung CK:{' '}
              <strong style={{ backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '5px', color: '#92400E' }}>
                {transferContent}
              </strong>
            </li>
          </ul>
          <div style={{ marginTop: '8px', padding: '7px 11px', backgroundColor: BRAND.greenBadgeBg, borderLeft: `4px solid ${BRAND.greenBadge}`, borderRadius: '5px', fontSize: '12px', fontStyle: 'italic', color: '#065F46' }}>
            ✓ Mã VietQR bên cạnh là mã thanh toán tự động, dẫn trực tiếp đến tài khoản công ty của Trung tâm Anh ngữ Nhật Mỹ.
          </div>

          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <OfficialRedSeal title="THÔNG BÁO HỌC PHÍ" subtitle="PHÒNG TÀI CHÍNH" size={82} date={getTodayVnShortDate()} />
            <span style={{ fontSize: '11.5px', color: BRAND.muted, fontStyle: 'italic' }}>
              Xác nhận học phí tháng {targetNoticeMonth} từ Phòng Tài chính.
            </span>
          </div>
        </div>

        <div style={{ width: '196px', textAlign: 'center', flexShrink: 0 }}>
          <div style={{ border: `2px solid ${BRAND.blue}`, borderRadius: '12px', padding: '11px', backgroundColor: BRAND.white, boxShadow: '0 4px 10px rgba(13, 136, 196, 0.14)' }}>
            <div style={{ fontWeight: '800', color: BRAND.blueDark, marginBottom: '6px', fontSize: '12px' }}>
              QUÉT ĐỂ THANH TOÁN
            </div>
            {qrUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrUrl}
                alt="QR Code"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
                loading="eager"
                decoding="sync"
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: '12px', color: BRAND.subtle, padding: '10px', boxSizing: 'border-box' }}>
                {totalToPay > 0 ? 'Đang tạo mã QR...' : 'Không phát sinh khoản cần thanh toán'}
              </div>
            )}
            <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: '800', color: BRAND.blue }}>NAPAS 24/7</div>
          </div>
        </div>
      </div>
    </BrandLetterShell>
  );
});

MonthlyNoticeTemplate.displayName = 'MonthlyNoticeTemplate';
export default MonthlyNoticeTemplate;
