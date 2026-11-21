'use client';

import React, { forwardRef } from 'react';
import { BRAND, CENTER_INFO, FONT_UNIFIED } from '@/lib/brandTheme';

/**
 * Khung nhận diện thương hiệu chuẩn thống nhất cho mọi Thư Mời, Phiếu Đánh Giá,
 * Thông Báo Học Phí và Kết Quả Học Tập của Hệ thống Anh ngữ Nhật Mỹ.
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
  children,
  footerNote = '',
  style = {},
}, ref) => {
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
      {/* 1. HEADER NỀN TRẮNG - LOGO 1:1 CHUẨN - VIỀN GOLD NHẬT MỸ */}
      <div
        style={{
          backgroundColor: BRAND.white,
          padding: '22px 36px 18px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `3px solid ${BRAND.gold}`,
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt={CENTER_INFO.name}
            width={80}
            height={80}
            style={{
              width: '80px',
              height: '80px',
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
                fontSize: '27px',
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
                fontSize: '14px',
                fontStyle: 'italic',
                fontWeight: '600',
                color: BRAND.goldDark,
                letterSpacing: '0.4px',
                marginTop: '3px',
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
              fontSize: '13.5px',
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
                fontSize: '12.5px',
                fontStyle: 'italic',
                fontWeight: '600',
                color: BRAND.muted,
                letterSpacing: '0.3px',
                marginTop: '3px',
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
          padding: '26px 36px 24px 36px',
          backgroundColor: BRAND.surface,
          fontFamily: FONT_UNIFIED,
        }}
      >
        {showTitleBlock && (title || eyebrow) && (
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {eyebrow && (
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '12.5px',
                  fontWeight: '800',
                  color: BRAND.blue,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <h1
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '26px',
                  fontWeight: '900',
                  color: BRAND.blueDark,
                  margin: '0 0 4px 0',
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  lineHeight: 1.25,
                }}
              >
                {title}
              </h1>
            )}
            {subtitleEn && (
              <div
                style={{
                  fontFamily: FONT_UNIFIED,
                  fontSize: '13.5px',
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
                width: '80px',
                height: '3.5px',
                backgroundColor: BRAND.gold,
                margin: '10px auto 0 auto',
                borderRadius: '2px',
              }}
            />
          </div>
        )}

        {children}
      </div>

      {/* 3. FOOTER THƯƠNG HIỆU NHẬT MỸ ĐẦY ĐỦ */}
      <div
        style={{
          backgroundColor: BRAND.blue,
          padding: '16px 36px',
          color: BRAND.white,
          textAlign: 'center',
          borderTop: `3px solid ${BRAND.gold}`,
          fontFamily: FONT_UNIFIED,
        }}
      >
        {footerNote && (
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '13px',
              fontStyle: 'italic',
              fontWeight: '500',
              color: '#FFFFFF',
              marginBottom: '8px',
              opacity: 0.96,
            }}
          >
            {footerNote}
          </div>
        )}
        <div
          style={{
            fontFamily: FONT_UNIFIED,
            fontSize: '16px',
            fontWeight: '900',
            letterSpacing: '1px',
            color: BRAND.gold,
            textTransform: 'uppercase',
            lineHeight: 1.2,
          }}
        >
          {CENTER_INFO.name}
        </div>
        <div
          style={{
            fontFamily: FONT_UNIFIED,
            fontSize: '12.5px',
            fontStyle: 'italic',
            fontWeight: '500',
            color: '#FEF08A',
            letterSpacing: '0.4px',
            marginTop: '2px',
            marginBottom: '8px',
          }}
        >
          {CENTER_INFO.slogan}
        </div>
        <div style={{ fontFamily: FONT_UNIFIED, fontSize: '13px', fontWeight: '500', opacity: 0.96 }}>
          Hotline hỗ trợ phụ huynh: <strong style={{ fontWeight: '800' }}>{CENTER_INFO.hotline}</strong> • Website:{' '}
          <strong style={{ fontWeight: '800' }}>{CENTER_INFO.website}</strong>
        </div>
        <div style={{ fontFamily: FONT_UNIFIED, fontSize: '12px', fontWeight: '500', opacity: 0.92, marginTop: '3px' }}>
          Địa chỉ: {CENTER_INFO.address}
        </div>
      </div>
    </div>
  );
});

BrandLetterShell.displayName = 'BrandLetterShell';
export default BrandLetterShell;
