'use client';

import React, { forwardRef } from 'react';
import PaidStamp from '@/components/PaidStamp';
import { BRAND, CENTER_INFO, FONT_UNIFIED } from '@/lib/brandTheme';

const fmtVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

/**
 * Component Phiếu Thu Điện Tử dùng chung duy nhất cho toàn hệ thống CRM
 * (Học phí theo khóa `/finance`, Học viên `/students`, và Học phí tháng `/finance/monthly`).
 */
const EReceiptTemplate = forwardRef(({ data, mode = 'course' }, ref) => {
  if (!data) return null;

  const isMonthly = mode === 'monthly';
  const resolvedReceiptCode =
    data.receiptCode ||
    (isMonthly
      ? `PT-T${(data.monthYear || '').replace(/[^0-9]/g, '')}-${(data.studentName || 'HV').slice(0, 3).toUpperCase()}`
      : '');

  const totalCollected = isMonthly ? data.amountThisTime : data.totalPaid;
  const remainingDebt = Number(data.remainingDebt || 0);

  return (
    <div
      ref={ref}
      style={{
        background: BRAND.white,
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
        border: `2px solid ${BRAND.gold}`,
        position: 'relative',
        fontFamily: FONT_UNIFIED,
        color: BRAND.slate,
        textAlign: 'left',
      }}
    >
      {/* Dải line nhận diện thương hiệu Xanh & Vàng */}
      <div
        style={{
          height: '6px',
          background: `linear-gradient(90deg, ${BRAND.blue} 0%, ${BRAND.blue} 60%, ${BRAND.gold} 60%, ${BRAND.gold} 100%)`,
        }}
      />

      <div style={{ padding: '1.35rem 1.6rem 1.85rem 1.6rem', position: 'relative' }}>
        {/* Header: Logo trái, Thương hiệu & Tiêu đề giữa */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem', gap: '0.9rem' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={CENTER_INFO.name}
            style={{ height: '54px', width: '54px', objectFit: 'contain', flexShrink: 0 }}
            crossOrigin="anonymous"
          />
          <div style={{ flex: 1, textAlign: 'center', paddingRight: '10px' }}>
            <h2
              style={{
                margin: '0 0 0.1rem 0',
                color: BRAND.blueDark,
                fontSize: '1.2rem',
                fontWeight: '900',
                letterSpacing: '0.5px',
              }}
            >
              {CENTER_INFO.name}
            </h2>
            <div style={{ fontSize: '0.7rem', fontStyle: 'italic', color: BRAND.goldDark, fontWeight: '600', marginBottom: '0.3rem' }}>
              {CENTER_INFO.slogan}
            </div>
            <div
              style={{
                display: 'inline-block',
                background: BRAND.gold,
                color: BRAND.blueDark,
                padding: '0.2rem 0.85rem',
                borderRadius: '20px',
                fontSize: '0.78rem',
                fontWeight: '900',
                letterSpacing: '0.5px',
              }}
            >
              PHIẾU THU ĐIỆN TỬ
            </div>
            {resolvedReceiptCode && (
              <div style={{ fontSize: '0.72rem', color: BRAND.subtle, fontWeight: '700', marginTop: '0.25rem' }}>
                Số: {resolvedReceiptCode}
              </div>
            )}
          </div>
        </div>

        {/* Thông tin chung */}
        <div
          style={{
            margin: '0.85rem 0',
            borderTop: `2px dashed ${BRAND.border}`,
            borderBottom: `2px dashed ${BRAND.border}`,
            padding: '0.75rem 0',
            fontSize: '0.92rem',
            lineHeight: 1.7,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: BRAND.subtle }}>Học viên:</span>
            <strong style={{ color: BRAND.blueDark }}>{(data.studentName || '').toUpperCase()}</strong>
          </div>
          {isMonthly ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <span style={{ color: BRAND.subtle }}>Tháng thu:</span>
              <strong style={{ color: BRAND.blueDark }}>Tháng {data.monthYear}</strong>
            </div>
          ) : (
            data.classCode && (
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: BRAND.subtle }}>Lớp học:</span>
                <strong>{data.classCode}</strong>
              </div>
            )
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: BRAND.subtle }}>Ngày lập:</span>
            <span>
              {data.date} {data.time}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ color: BRAND.subtle }}>Hình thức:</span>
            <span style={{ fontWeight: '700', color: BRAND.ink }}>{data.paymentMethod}</span>
          </div>
        </div>

        {/* Chi tiết các khoản */}
        {isMonthly ? (
          <div style={{ margin: '0.7rem 0', fontSize: '0.92rem', lineHeight: 1.85 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: BRAND.muted }}>1. Học phí tháng {data.monthYear}:</span>
              <span style={{ fontWeight: '600' }}>{fmtVnd(data.currentFee)}</span>
            </div>

            {Number(data.previousDebt || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#B45309' }}>
                <span>2. Nợ cũ chuyển sang:</span>
                <span style={{ fontWeight: '600' }}>+ {fmtVnd(data.previousDebt)}</span>
              </div>
            )}

            {Number(data.excessMissing || 0) !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: BRAND.muted }}>3. Bù trừ dư/thiếu:</span>
                <span style={{ fontWeight: '600' }}>
                  {Number(data.excessMissing || 0) > 0 ? '+' : ''}
                  {fmtVnd(data.excessMissing)}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', marginTop: '4px' }}>
              <span style={{ color: BRAND.blueDark, fontWeight: '800' }}>TỔNG CẦN THANH TOÁN:</span>
              <strong style={{ color: BRAND.blueDark, fontWeight: '900', fontSize: '1rem' }}>
                {fmtVnd(data.totalToPay)}
              </strong>
            </div>

            {Number(data.amountPaidBefore || 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: BRAND.subtle }}>Đã nộp trước đó:</span>
                <span>{fmtVnd(data.amountPaidBefore)}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: '4px', marginTop: '4px' }}>
              <span style={{ color: BRAND.muted, fontWeight: '600' }}>Học phí còn lại:</span>
              <span style={{ fontWeight: 'bold', color: remainingDebt > 0 ? '#E11D48' : BRAND.greenBadge }}>
                {fmtVnd(remainingDebt)} {remainingDebt === 0 ? '(Đã hoàn tất)' : '(Lưu nợ kỳ sau)'}
              </span>
            </div>
          </div>
        ) : (
          <div style={{ margin: '0.7rem 0', fontSize: '0.92rem', lineHeight: 1.8 }}>
            {Number(data.discountAmount || 0) > 0 && Number(data.originalFee || 0) > 0 && (
              <div style={{ marginBottom: '0.4rem', paddingBottom: '0.4rem', borderBottom: `1px dashed ${BRAND.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: BRAND.subtle }}>Học phí gốc khóa học:</span>
                  <span style={{ color: BRAND.subtle }}>{fmtVnd(data.originalFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: BRAND.greenBadge, fontWeight: '600' }}>{data.discountLabel || 'Ưu đãi / Giảm trừ'}:</span>
                  <span style={{ fontWeight: '700', color: '#E11D48' }}>- {fmtVnd(data.discountAmount)}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: BRAND.muted }}>Học phí chưa hoàn thành:</span>
              <span>{fmtVnd(data.oldDebt)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: BRAND.muted }}>Học phí đóng đợt này:</span>
              <span style={{ fontWeight: 'bold', color: BRAND.blue }}>+ {fmtVnd(data.tuitionPaid)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: BRAND.muted }}>Học phí còn lại:</span>
              <span style={{ fontWeight: 'bold', color: remainingDebt > 0 ? '#E11D48' : BRAND.greenBadge }}>
                {fmtVnd(remainingDebt)} {remainingDebt === 0 ? '(Đã hoàn tất)' : ''}
              </span>
            </div>

            {((data.items && data.items.length > 0) || data.bookName) && (
              <div style={{ margin: '0.8rem 0 0.45rem 0', borderTop: '1px dashed #CBD5E1', paddingTop: '0.7rem', fontSize: '0.9rem' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: '800', color: BRAND.blueDark, textTransform: 'uppercase', marginBottom: '0.4rem', letterSpacing: '0.5px' }}>
                  Giáo trình &amp; Tặng phẩm đi kèm
                </div>
                {data.items && data.items.length > 0 ? (
                  data.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.32rem 0',
                        borderBottom: idx < data.items.length - 1 ? `1px dotted ${BRAND.border}` : 'none',
                      }}
                    >
                      <div style={{ paddingRight: '0.5rem' }}>
                        <div style={{ fontWeight: '600', color: BRAND.slate, fontSize: '0.88rem' }}>{item.name}</div>
                        <span
                          style={{
                            display: 'inline-block',
                            fontSize: '0.68rem',
                            fontWeight: '800',
                            padding: '0.12rem 0.48rem',
                            borderRadius: '4px',
                            background: item.badgeColor ? `${item.badgeColor}15` : BRAND.greenBadgeBg,
                            color: item.badgeColor || BRAND.greenBadge,
                            border: `1px solid ${item.badgeColor || BRAND.greenBadge}40`,
                            marginTop: '0.18rem',
                          }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {item.originalPrice != null && Number(item.originalPrice) > 0 && (
                          <div style={{ fontSize: '0.76rem', color: '#94A3B8', textDecoration: 'line-through' }}>
                            {fmtVnd(item.originalPrice)}
                          </div>
                        )}
                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: item.price === 0 ? BRAND.greenBadge : BRAND.blue }}>
                          {item.price === 0 ? '0đ (Miễn phí)' : `+ ${fmtVnd(item.price)}`}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.32rem 0' }}>
                    <div style={{ paddingRight: '0.5rem' }}>
                      <div style={{ fontWeight: '600', color: BRAND.slate, fontSize: '0.88rem' }}>{data.bookName}</div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          padding: '0.12rem 0.48rem',
                          borderRadius: '4px',
                          background: Number(data.bookCost || 0) > 0 ? '#EFF6FF' : BRAND.greenBadgeBg,
                          color: Number(data.bookCost || 0) > 0 ? BRAND.blue : BRAND.greenBadge,
                          border: `1px solid ${Number(data.bookCost || 0) > 0 ? BRAND.blue : BRAND.greenBadge}40`,
                          marginTop: '0.18rem',
                        }}
                      >
                        {Number(data.bookCost || 0) > 0 ? 'GIÁO TRÌNH BÁN' : 'TẶNG KÈM THEO KHÓA HỌC'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: '800', fontSize: '0.9rem', color: Number(data.bookCost || 0) === 0 ? BRAND.greenBadge : BRAND.blue }}>
                        {Number(data.bookCost || 0) === 0 ? '0đ (Miễn phí)' : `+ ${fmtVnd(data.bookCost)}`}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tổng thu nổi bật */}
        <div
          style={{
            marginTop: '0.9rem',
            background: BRAND.goldBg,
            border: `2px solid ${BRAND.gold}`,
            borderRadius: '10px',
            padding: '0.8rem 1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: '800', fontSize: '0.95rem', color: BRAND.blueDark }}>
            {isMonthly ? 'THỰC THU ĐỢT NÀY:' : 'TỔNG THU ĐỢT NÀY:'}
          </span>
          <span style={{ fontWeight: '900', fontSize: '1.35rem', color: BRAND.blue }}>
            {fmtVnd(totalCollected)}
          </span>
        </div>

        {/* Lời cảm ơn */}
        <div style={{ textAlign: 'center', marginTop: '1.1rem', fontSize: '0.78rem', color: BRAND.subtle, fontStyle: 'italic' }}>
          <p style={{ margin: 0 }}>Cảm ơn Quý Phụ huynh &amp; Học viên đã tin tưởng đồng hành cùng Anh ngữ Nhật Mỹ!</p>
        </div>

        {/* CON DẤU MỘC ĐỎ ĐIỆN TỬ "ĐÃ THU TIỀN / PAID" */}
        <PaidStamp
          date={data.date}
          time={data.time}
          receiptCode={resolvedReceiptCode}
          size={134}
          style={{ right: '10px', bottom: '18px' }}
        />
      </div>

      {/* Chân trang xanh chữ trắng đồng nhất */}
      <div
        style={{
          backgroundColor: BRAND.blue,
          borderTop: `2.5px solid ${BRAND.gold}`,
          padding: '9px 18px',
          color: BRAND.white,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.72rem',
        }}
      >
        <div>
          <div style={{ fontWeight: '900', fontSize: '0.76rem', letterSpacing: '0.5px', color: BRAND.white }}>
            {CENTER_INFO.name}
          </div>
          <div style={{ fontStyle: 'italic', color: BRAND.white, opacity: 0.92, fontSize: '0.68rem' }}>
            {CENTER_INFO.slogan}
          </div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: 1.35 }}>
          <div>Hotline: <strong>{CENTER_INFO.hotline}</strong></div>
          <div style={{ opacity: 0.92 }}>{CENTER_INFO.website}</div>
        </div>
      </div>
    </div>
  );
});

EReceiptTemplate.displayName = 'EReceiptTemplate';
export default EReceiptTemplate;
