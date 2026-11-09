'use client';

import React, { forwardRef } from 'react';
import OfficialRedSeal from '@/components/OfficialRedSeal';

const CourseWelcomeTemplate = forwardRef(({ data }, ref) => {
  const {
    studentName = 'NGÔ LINH MẪN',
    studentCode = 'HV2611_001',
    programLevel = 'Tiếng Anh Thiếu Nhi Cambridge (Movers 1)',
    className = 'Lớp Movers 1 (M1) - Ca 1',
    rawClassCode = 'CN1_M1_MsMy_7CN_Ca1',
    teacherName = 'Ms Trúc My',
    room = 'Phòng 01 (Lầu 1)',
    branchName = 'Cơ sở 1 - Nhật Mỹ Bình Dương',
    startDateText = 'Thứ Bảy, ngày 14/11/2026',
    scheduleDays = 'Thứ 7 & Chủ Nhật',
    studyHours = '07:45 - 09:15 (Ca 1)',
    endDateText = '28/02/2027 (Dự kiến)',
    notesUniform = 'Bé mặc trang phục gọn gàng/đồng phục, mang theo tập vở và bút. Giáo trình chính khóa và Thẻ học liệu số sẽ được thầy cô trao tận tay bé trong buổi học đầu tiên.',
    notesArrival = 'Ba mẹ vui lòng đưa bé đến trước giờ học 10 - 15 phút trong ngày khai giảng để thầy cô đón bé, ổn định chỗ ngồi và làm quen không khí lớp học.',
    notesPickup = 'Giờ tan học đúng giờ theo ca, thầy cô bàn giao bé tận tay tại sảnh đón. Hotline hỗ trợ phụ huynh: 0911 767 069.',
    issuedDate = '',
  } = data || {};

  // Palette màu sắc thương hiệu Nhật - Mỹ
  const BRAND = {
    blue: '#0D88C4', // Xanh Nhật Mỹ chủ đạo
    blueDark: '#08557B', // Xanh đậm tạo chiều sâu
    blueLight: '#E8F5FD', // Nền xanh nhạt thanh tao
    gold: '#FFCA29', // Vàng Nhật Mỹ điểm nhấn
    goldDark: '#D97706', // Vàng hổ phách tương phản cao
    ink: '#0F172A', // Chữ đen than sắc nét
    muted: '#64748B', // Chữ ghi phụ đề
    border: '#CBD5E1',
    white: '#FFFFFF',
    greenBadge: '#059669',
    greenBadgeBg: '#ECFDF5',
  };

  const FONT_SERIF = `"Playfair Display", "Merriweather", "Times New Roman", Georgia, serif`;
  const FONT_SANS = `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        minHeight: '1060px',
        backgroundColor: BRAND.white,
        color: BRAND.ink,
        fontFamily: FONT_SANS,
        lineHeight: 1.5,
        boxSizing: 'border-box',
        position: 'relative',
        margin: '0 auto',
        overflow: 'hidden',
        border: `3px solid ${BRAND.gold}`,
        borderRadius: '16px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 1. HEADER NỀN TRẮNG TINH TẾ - LOGO NGUYÊN BẢN - CHỮ VÀNG/XANH */}
      <div
        style={{
          backgroundColor: BRAND.white,
          padding: '24px 36px 18px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `3px solid ${BRAND.gold}`,
        }}
      >
        {/* Khối Logo & Tên trung tâm */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="/logo.png"
            alt="Logo Nhật Mỹ"
            style={{
              width: '88px',
              height: 'auto',
              maxHeight: '76px',
              objectFit: 'contain',
              display: 'block',
            }}
            crossOrigin="anonymous"
          />
          <div>
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontSize: '28px',
                fontWeight: '900',
                color: BRAND.blue,
                letterSpacing: '1px',
                lineHeight: '1.2',
                textTransform: 'uppercase',
              }}
            >
              ANH NGỮ NHẬT MỸ
            </div>
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontSize: '13.5px',
                fontStyle: 'italic',
                fontWeight: '600',
                color: BRAND.goldDark,
                letterSpacing: '0.8px',
                marginTop: '3px',
              }}
            >
              Dedicated to Excellence
            </div>
          </div>
        </div>

        {/* Khối Huy hiệu Cambridge English phía bên phải */}
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: '13px',
              fontWeight: '800',
              color: BRAND.goldDark,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
            }}
          >
            CAMBRIDGE ENGLISH
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: '600',
              color: BRAND.muted,
              letterSpacing: '0.5px',
              marginTop: '2px',
            }}
          >
            Official Course Welcome Pass
          </div>
        </div>
      </div>

      {/* 2. BODY VÙNG NỘI DUNG CHÍNH */}
      <div style={{ padding: '28px 36px 20px 36px', backgroundColor: '#FAFDFE' }}>
        
        {/* TIÊU ĐỀ THƯ */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: '700',
              color: BRAND.blue,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            THƯ THÔNG BÁO CHÍNH THỨC
          </div>
          <h1
            style={{
              fontFamily: FONT_SERIF,
              fontSize: '27px',
              fontWeight: '900',
              color: BRAND.blueDark,
              margin: '0 0 4px 0',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            CHÀO MỪNG & THÔNG BÁO KHAI GIẢNG
          </h1>
          <div
            style={{
              fontFamily: FONT_SERIF,
              fontSize: '13px',
              fontStyle: 'italic',
              color: BRAND.muted,
            }}
          >
            Course Commencement & Welcome Notice
          </div>
          {/* Đường line trang trí */}
          <div
            style={{
              width: '80px',
              height: '3px',
              backgroundColor: BRAND.gold,
              margin: '10px auto 0 auto',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* KHUNG THÔNG TIN HỌC VIÊN */}
        <div
          style={{
            backgroundColor: BRAND.white,
            borderRadius: '14px',
            border: `1.5px solid #E2E8F0`,
            borderLeft: `6px solid ${BRAND.blue}`,
            padding: '16px 22px',
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(13, 136, 196, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '11.5px',
                fontWeight: '700',
                color: BRAND.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                marginBottom: '2px',
              }}
            >
              Họ và tên học viên
            </div>
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontSize: '23px',
                fontWeight: '900',
                color: BRAND.blueDark,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {studentName}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#475569',
                marginTop: '4px',
                display: 'flex',
                gap: '14px',
                flexWrap: 'wrap',
              }}
            >
              <span><strong>Mã định danh:</strong> <span style={{ color: BRAND.blue, fontWeight: '700' }}>{studentCode}</span></span>
              <span>•</span>
              <span><strong>Chương trình:</strong> {programLevel}</span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: BRAND.greenBadgeBg,
              color: BRAND.greenBadge,
              border: `1.5px solid #A7F3D0`,
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: '800',
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            <span>●</span> ĐÃ GHI DANH CHÍNH THỨC
          </div>
        </div>

        {/* KHUNG THÔNG TIN LỚP HỌC & NGÀY KHAI GIẢNG (TRUNG TÂM NỔI BẬT NHẤT) */}
        <div
          style={{
            backgroundColor: BRAND.white,
            borderRadius: '16px',
            border: `2px solid ${BRAND.blue}`,
            padding: '22px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(13, 136, 196, 0.08)',
          }}
        >
          {/* Lưới 2 cột thông tin lớp */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginBottom: '18px',
            }}
          >
            <div style={{ backgroundColor: BRAND.blueLight, padding: '12px 16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase' }}>
                Lớp Học Tiếp Nhận
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: BRAND.blueDark, marginTop: '2px' }}>
                {className}
              </div>
              {rawClassCode && (
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  Mã lớp: {rawClassCode}
                </div>
              )}
            </div>

            <div style={{ backgroundColor: BRAND.blueLight, padding: '12px 16px', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase' }}>
                Giáo Viên & Phòng Học
              </div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: BRAND.blueDark, marginTop: '2px' }}>
                {teacherName}
              </div>
              <div style={{ fontSize: '12px', color: BRAND.goldDark, fontWeight: '700', marginTop: '2px' }}>
                📍 {room}
              </div>
            </div>
          </div>

          {/* BLOCK NGÀY KHAI GIẢNG TO RÕ NHẤT (HIGHLIGHT TÂM ĐIỂM) */}
          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 100%)`,
              borderRadius: '12px',
              padding: '16px 20px',
              color: BRAND.white,
              textAlign: 'center',
              marginBottom: '16px',
              boxShadow: '0 4px 10px rgba(13, 136, 196, 0.25)',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: BRAND.gold,
                marginBottom: '4px',
              }}
            >
              🗓️ NGÀY KHAI GIẢNG CHÍNH THỨC
            </div>
            <div
              style={{
                fontFamily: FONT_SERIF,
                fontSize: '25px',
                fontWeight: '900',
                letterSpacing: '0.5px',
              }}
            >
              {startDateText}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
              (Học viên có mặt tại sảnh trung tâm trước giờ học để thầy cô đón vào lớp)
            </div>
          </div>

          {/* LỊCH HỌC TRONG TUẦN & KHUNG GIỜ HỌC */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1.2fr 1fr',
              gap: '12px',
              backgroundColor: '#FFFBEB',
              border: `1.5px dashed ${BRAND.gold}`,
              borderRadius: '10px',
              padding: '12px 16px',
              textAlign: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: BRAND.goldDark, textTransform: 'uppercase' }}>
                📅 Lịch Học Tuần
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: '800', color: BRAND.ink, marginTop: '3px' }}>
                {scheduleDays}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #FDE68A', borderRight: '1px solid #FDE68A', padding: '0 10px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: BRAND.goldDark, textTransform: 'uppercase' }}>
                ⏰ Giờ Học Chi Tiết
              </div>
              <div style={{ fontSize: '14.5px', fontWeight: '800', color: BRAND.blueDark, marginTop: '3px' }}>
                {studyHours}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: BRAND.goldDark, textTransform: 'uppercase' }}>
                🎯 Dự Kiến Kết Thúc
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: '700', color: BRAND.ink, marginTop: '3px' }}>
                {endDateText}
              </div>
            </div>
          </div>
        </div>

        {/* KHUNG DẶN DÒ CHUẨN BỊ CHO PHỤ HUYNH & BÉ (3 BƯỚC ĐỒNG HÀNH) */}
        <div
          style={{
            backgroundColor: BRAND.white,
            borderRadius: '14px',
            border: `1.5px solid #E2E8F0`,
            padding: '18px 22px',
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: '13.5px',
              fontWeight: '800',
              color: BRAND.blueDark,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>📌</span> 3 LƯU Ý QUAN TRỌNG ĐỒNG HÀNH CÙNG BÉ:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '130px' }}>
            {/* Bước 1 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  backgroundColor: BRAND.blue,
                  color: BRAND.white,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '800',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                1
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
                <strong>Trang phục & Đồ dùng:</strong> {notesUniform}
              </div>
            </div>

            {/* Bước 2 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  backgroundColor: BRAND.blue,
                  color: BRAND.white,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '800',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                2
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
                <strong>Thời gian có mặt:</strong> {notesArrival}
              </div>
            </div>

            {/* Bước 3 */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div
                style={{
                  backgroundColor: BRAND.goldDark,
                  color: BRAND.white,
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '800',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                3
              </div>
              <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.45 }}>
                <strong>Giờ đón bé & Liên hệ:</strong> {notesPickup}
              </div>
            </div>
          </div>

          {/* CON DẤU MỘC ĐỎ NHẬT MỸ TRANG TRỌNG ĐẶT GÓC PHẢI DƯỚI */}
          <div
            style={{
              position: 'absolute',
              right: '18px',
              bottom: '12px',
              zIndex: 10,
            }}
          >
            <OfficialRedSeal
              title="ĐÃ GHI DANH"
              subtitle="BAN GIÁM ĐỐC"
              size={130}
              date={issuedDate || (typeof window !== 'undefined' ? new Date().toLocaleDateString('vi-VN') : '')}
            />
          </div>
        </div>

      </div>

      {/* 3. FOOTER THƯƠNG HIỆU NHẬT MỸ - CHUẨN MỰC */}
      <div
        style={{
          backgroundColor: BRAND.blue,
          padding: '16px 36px',
          color: BRAND.white,
          textAlign: 'center',
          borderTop: `3px solid ${BRAND.gold}`,
        }}
      >
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: '14.5px',
            fontWeight: '900',
            letterSpacing: '1px',
            color: BRAND.gold,
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          ANH NGỮ NHẬT MỸ — DEDICATED TO EXCELLENCE
        </div>
        <div style={{ fontSize: '12px', opacity: 0.95 }}>
          Hotline hỗ trợ phụ huynh: <strong>0911 767 069</strong> • Website: <strong>anhngunhatmy.edu.vn</strong>
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
          Địa chỉ: Đường D33, KDC Việt Sing, P. An Phú, TP. Thuận An, Tỉnh Bình Dương
        </div>
      </div>
    </div>
  );
});

CourseWelcomeTemplate.displayName = 'CourseWelcomeTemplate';

export default CourseWelcomeTemplate;
