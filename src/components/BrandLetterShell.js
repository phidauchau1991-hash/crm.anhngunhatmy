'use client';

import React, { forwardRef } from 'react';
import { BRAND, CENTER_INFO, FONT_UNIFIED } from '@/lib/brandTheme';

/**
 * Khung nhận diện thương hiệu chuẩn thống nhất cho mọi Thư Mời, Phiếu Đánh Giá,
 * Thông Báo Học Phí và Kết Quả Học Tập của Hệ thống Anh ngữ Nhật Mỹ.
 * Hỗ trợ chế độ `compact` cho các phiếu nhận xét / bảng điểm nhiều nội dung.
 */
const BrandLetterShell = forwardRef(({
  id,
  width = '800px',
  badgeTop = 'CAMBRIDGE ENGLISH',
  badgeSub = 'Official Notice',
  eyebrow = '',
  title = '',
  subtitleEn = '',
  showTitleBlock = true,
  compact = false,
  children,
  style = {},
}, ref) => {
  const logoSize = compact ? 64 : 78;

  return (
    <div
      ref={ref}
      id={id}
      style={{
        width,
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
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
        WebkitFontSmoothing: 'antialiased',
        textAlign: 'left',
        ...style,
      }}
    >
      {/* 1. HEADER NỀN TRẮNG - LOGO 1:1 - TÊN THƯƠNG HIỆU TRÊN / SLOGAN DƯỚI */}
      <div
        style={{
          backgroundColor: BRAND.white,
          padding: compact ? '14px 30px 12px 30px' : '20px 34px 16px 34px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `3px solid ${BRAND.gold}`,
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '13px' : '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={CENTER_INFO.name}
            width={logoSize}
            height={logoSize}
            style={{
              width: `${logoSize}px`,
              height: `${logoSize}px`,
              objectFit: 'contain',
              display: 'block',
              flexShrink: 0,
            }}
            crossOrigin="anonymous"
          />
          <div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: compact ? '23px' : '27px',
                fontWeight: '900',
                color: BRAND.blue,
                letterSpacing: '0.6px',
                lineHeight: 1.15,
                textTransform: 'uppercase',
              }}
            >
              {CENTER_INFO.name}
            </div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: compact ? '12.5px' : '14px',
                fontStyle: 'italic',
                fontWeight: '600',
                color: BRAND.goldDark,
                letterSpacing: '0.4px',
                marginTop: '2px',
              }}
            >
              {CENTER_INFO.slogan}
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontFamily: FONT_UNIFIED }}>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: compact ? '12.5px' : '13.5px',
              fontWeight: '800',
              color: BRAND.goldDark,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {badgeTop}
          </div>
          {badgeSub && (
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: compact ? '11.5px' : '12.5px',
                fontStyle: 'italic',
                fontWeight: '600',
                color: BRAND.muted,
                letterSpacing: '0.3px',
                marginTop: '2px',
              }}
            >
              {badgeSub}
            </div>
          )}
        </div>
      </div>

      {/* 2. BODY VÙNG NỘI DUNG CHÍNH */}
      <div
        style={{
          padding: compact ? '16px 30px 14px 30px' : '24px 34px 20px 34px',
          backgroundColor: BRAND.surface,
          fontFamily: FONT_UNIFIED,
        }}
      >
        {showTitleBlock && (title || eyebrow) && (
          <div style={{ textAlign: 'center', marginBottom: compact ? '13px' : '18px' }}>
            {eyebrow && (
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: compact ? '11.5px' : '12.5px',
                  fontWeight: '800',
                  color: BRAND.blue,
                  letterSpacing: '1.8px',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <h1
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: compact ? '22.5px' : '26px',
                  fontWeight: '900',
                  color: BRAND.blueDark,
                  margin: '0 0 3px 0',
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h1>
            )}
            {subtitleEn && (
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: compact ? '12px' : '13.5px',
                  fontStyle: 'italic',
                  fontWeight: '500',
                  color: BRAND.muted,
                }}
              >
                {subtitleEn}
              </div>
            )}
            <div
              style={{
                width: compact ? '68px' : '80px',
                height: '3px',
                backgroundColor: BRAND.gold,
                margin: compact ? '7px auto 0 auto' : '9px auto 0 auto',
                borderRadius: '2px',
              }}
            />
          </div>
        )}

        {children}
      </div>

      {/* 3. FOOTER GỌN ĐỐI XỨNG VỚI HEADER: TRÁI (TÊN THƯƠNG HIỆU 2 DÒNG) - PHẢI (LIÊN HỆ & ĐỊA CHỈ) */}
      <div
        style={{
          backgroundColor: BRAND.blue,
          padding: '12px 30px',
          color: BRAND.white,
          borderTop: `3px solid ${BRAND.gold}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '15px',
              fontWeight: '900',
              letterSpacing: '0.8px',
              color: BRAND.white,
              textTransform: 'uppercase',
              lineHeight: 1.15,
            }}
          >
            {CENTER_INFO.name}
          </div>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '12px',
              fontStyle: 'italic',
              fontWeight: '600',
              color: BRAND.white,
              opacity: 0.95,
              letterSpacing: '0.3px',
              marginTop: '2px',
            }}
          >
            {CENTER_INFO.slogan}
          </div>
        </div>

        <div style={{ textAlign: 'right', lineHeight: 1.45 }}>
          <div style={{ fontFamily: FONT_UNIFIED, fontSize: '12px', fontWeight: '500', opacity: 0.98 }}>
            Hotline: <strong style={{ fontWeight: '800' }}>{CENTER_INFO.hotline}</strong> • Website:{' '}
            <strong style={{ fontWeight: '800' }}>{CENTER_INFO.website}</strong>
          </div>
          <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.2px', fontWeight: '500', opacity: 0.92, marginTop: '2px' }}>
            {CENTER_INFO.address}
          </div>
        </div>
      </div>
    </div>
  );
});

BrandLetterShell.displayName = 'BrandLetterShell';
export default BrandLetterShell;
