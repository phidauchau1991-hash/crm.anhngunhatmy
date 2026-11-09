'use client';

import React, { forwardRef } from 'react';
import OfficialRedSeal from '@/components/OfficialRedSeal';

// Cố định 2 lưu ý chuẩn mực của Trung tâm Anh ngữ Nhật Mỹ
export const FIXED_NOTE_1 =
  'Bé mặc trang phục gọn gàng/đồng phục, mang theo tập vở trắng, bút chì & màu tô. Giáo trình chính khóa và Thẻ học liệu số sẽ được thầy cô trao tận tay bé tại lớp.';
export const FIXED_NOTE_2 =
  'Ba mẹ vui lòng đưa bé đến trước giờ học 05 - 10 phút để thầy cô đón bé, ổn định chỗ ngồi và làm quen không khí lớp học giúp bé học tập hiệu quả hơn.';

const CourseWelcomeTemplate = forwardRef(({ data }, ref) => {
  const {
    studentName = 'NGÔ LINH MẪN',
    studentCode = '',
    programLevel = 'Tiếng Anh Thiếu Nhi Movers (M1)',
    className = 'Lớp M1 - T7CN - Ca 1',
    rawClassCode = 'CN1_M1_MsMy_7CN_Ca1',
    teacherName = 'Ms My',
    room = 'Phòng 202 (Lầu 1)',
    startDateText = 'Thứ Bảy, ngày 14/11/2026',
    scheduleDays = 'Thứ 7, Chủ Nhật',
    studyHours = '07:45 - 09:15 (Ca 1)',
    endDateText = '28/02/2027',
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
    muted: '#475569', // Chữ phụ rõ nét trên điện thoại
    white: '#FFFFFF',
    greenBadge: '#059669',
    greenBadgeBg: '#ECFDF5',
  };

  // Thống nhất DUY NHẤT 1 font chữ của dòng ANH NGỮ NHẬT MỸ cho toàn bộ thư
  const FONT_UNIFIED = `"Playfair Display", "Merriweather", "Times New Roman", Georgia, serif`;

  const cleanStudentCode = String(studentCode || '').trim();

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
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
      }}
    >
      {/* 1. HEADER NỀN TRẮNG TINH TẾ - LOGO NGUYÊN BẢN - ĐỒNG BỘ MỘT FONT DUY NHẤT */}
      <div
        style={{
          backgroundColor: BRAND.white,
          padding: '24px 36px 18px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `3px solid ${BRAND.gold}`,
          fontFamily: FONT_UNIFIED,
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
                fontFamily: FONT_UNIFIED,
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
                fontFamily: FONT_UNIFIED,
                fontSize: '14px',
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
        <div style={{ textAlign: 'right', fontFamily: FONT_UNIFIED }}>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '13.5px',
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
              fontFamily: FONT_UNIFIED,
              fontSize: '12.5px',
              fontStyle: 'italic',
              fontWeight: '600',
              color: BRAND.muted,
              letterSpacing: '0.4px',
              marginTop: '3px',
            }}
          >
            Official Welcome Pass
          </div>
        </div>
      </div>

      {/* 2. BODY VÙNG NỘI DUNG CHÍNH */}
      <div style={{ padding: '26px 36px 22px 36px', backgroundColor: '#FAFDFE', fontFamily: FONT_UNIFIED }}>
        
        {/* TIÊU ĐỀ THƯ: NGẮN GỌN, KHÔNG LẶP CHỮ "THÔNG BÁO", DÙNG ĐƯỢC CHO MỌI LỚP */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '13px',
              fontWeight: '700',
              color: BRAND.blue,
              letterSpacing: '2.2px',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            CHÀO MỪNG HỌC VIÊN MỚI
          </div>
          <h1
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '28px',
              fontWeight: '900',
              color: BRAND.blueDark,
              margin: '0 0 4px 0',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            THÔNG BÁO LỊCH HỌC CHÍNH THỨC
          </h1>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '13.5px',
              fontStyle: 'italic',
              color: BRAND.muted,
            }}
          >
            Official Welcome &amp; Class Schedule Notice
          </div>
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
            marginBottom: '18px',
            boxShadow: '0 2px 6px rgba(13, 136, 196, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: FONT_UNIFIED,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '12px',
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
                fontFamily: FONT_UNIFIED,
                fontSize: '24px',
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
                fontFamily: FONT_UNIFIED,
                fontSize: '14px',
                color: '#334155',
                marginTop: '4px',
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              {cleanStudentCode && (
                <>
                  <span>
                    <strong>Mã học viên:</strong>{' '}
                    <span style={{ color: BRAND.blue, fontWeight: '800' }}>{cleanStudentCode}</span>
                  </span>
                  <span>•</span>
                </>
              )}
              <span>
                <strong>Chương trình:</strong> {programLevel}
              </span>
            </div>
          </div>

          <div
            style={{
              fontFamily: FONT_UNIFIED,
              backgroundColor: BRAND.greenBadgeBg,
              color: BRAND.greenBadge,
              border: `1.5px solid #A7F3D0`,
              borderRadius: '20px',
              padding: '6px 14px',
              fontSize: '12.5px',
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

        {/* KHUNG THÔNG TIN LỚP HỌC & NGÀY BẮT ĐẦU HỌC (TRUNG TÂM NỔI BẬT NHẤT) */}
        <div
          style={{
            backgroundColor: BRAND.white,
            borderRadius: '16px',
            border: `2px solid ${BRAND.blue}`,
            padding: '20px 22px',
            marginBottom: '18px',
            boxShadow: '0 4px 12px rgba(13, 136, 196, 0.08)',
            fontFamily: FONT_UNIFIED,
          }}
        >
          {/* Lưới 2 cột thông tin lớp */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ backgroundColor: BRAND.blueLight, padding: '12px 16px', borderRadius: '10px' }}>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.5px', fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase' }}>
                Lớp Học Tiếp Nhận
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '17px', fontWeight: '800', color: BRAND.blueDark, marginTop: '3px' }}>
                {className}
              </div>
              {rawClassCode && (
                <div style={{ fontFamily: FONT_UNIFIED, fontSize: '12px', color: BRAND.muted, marginTop: '2px' }}>
                  Mã lớp: {rawClassCode}
                </div>
              )}
            </div>

            <div style={{ backgroundColor: BRAND.blueLight, padding: '12px 16px', borderRadius: '10px' }}>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.5px', fontWeight: '700', color: BRAND.muted, textTransform: 'uppercase' }}>
                Giáo Viên &amp; Phòng Học
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '17px', fontWeight: '800', color: BRAND.blueDark, marginTop: '3px' }}>
                {teacherName}
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '13px', color: BRAND.goldDark, fontWeight: '800', marginTop: '2px' }}>
                📍 {room}
              </div>
            </div>
          </div>

          {/* BLOCK NGÀY BẮT ĐẦU HỌC TO RÕ NHẤT (PHÙ HỢP CẢ LỚP MỚI LẪN BÉ VÀO LỚP ĐANG HỌC) */}
          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 100%)`,
              borderRadius: '12px',
              padding: '15px 20px',
              color: BRAND.white,
              textAlign: 'center',
              marginBottom: '15px',
              boxShadow: '0 4px 10px rgba(13, 136, 196, 0.25)',
              fontFamily: FONT_UNIFIED,
            }}
          >
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '12.5px',
                fontWeight: '800',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: BRAND.gold,
                marginBottom: '4px',
              }}
            >
              🗓️ NGÀY BẮT ĐẦU HỌC CHÍNH THỨC
            </div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '25px',
                fontWeight: '900',
                letterSpacing: '0.5px',
              }}
            >
              {startDateText}
            </div>
            <div style={{ fontFamily: FONT_UNIFIED, fontSize: '12.5px', opacity: 0.92, marginTop: '3px', fontStyle: 'italic' }}>
              (Học viên có mặt tại sảnh trung tâm trước giờ học để thầy cô đón vào lớp)
            </div>
          </div>

          {/* LỊCH HỌC TRONG TUẦN, KHUNG GIỜ HỌC & DỰ KIẾN KẾT THÚC */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.15fr 1.25fr 1fr',
              gap: '12px',
              backgroundColor: '#FFFBEB',
              border: `1.5px dashed ${BRAND.gold}`,
              borderRadius: '10px',
              padding: '12px 16px',
              textAlign: 'center',
              fontFamily: FONT_UNIFIED,
            }}
          >
            <div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.5px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase' }}>
                📅 Lịch Học Tuần
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '15.5px', fontWeight: '800', color: BRAND.ink, marginTop: '4px' }}>
                {scheduleDays}
              </div>
            </div>

            <div style={{ borderLeft: '1px solid #FDE68A', borderRight: '1px solid #FDE68A', padding: '0 10px' }}>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.5px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase' }}>
                ⏰ Giờ Học Chi Tiết
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '15.5px', fontWeight: '800', color: BRAND.blueDark, marginTop: '4px' }}>
                {studyHours}
              </div>
            </div>

            <div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.5px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase' }}>
                🎯 Dự Kiến Kết Thúc
              </div>
              <div style={{ fontFamily: FONT_UNIFIED, fontSize: '15.5px', fontWeight: '800', color: BRAND.ink, marginTop: '4px' }}>
                {endDateText}
              </div>
            </div>
          </div>
        </div>

        {/* KHUNG 2 LƯU Ý CỐ ĐỊNH ĐỒNG HÀNH CÙNG BÉ & CON DẤU ĐỎ BÊN PHẢI */}
        <div
          style={{
            backgroundColor: BRAND.white,
            borderRadius: '14px',
            border: `1.5px solid #E2E8F0`,
            padding: '18px 22px',
            display: 'grid',
            gridTemplateColumns: '1fr 140px',
            gap: '16px',
            alignItems: 'center',
            fontFamily: FONT_UNIFIED,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '14px',
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
              <span>📌</span> LƯU Ý ĐỒNG HÀNH CÙNG BÉ:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Lưu ý 1 cố định */}
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
                    fontSize: '13px',
                    fontWeight: '800',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  1
                </div>
                <div style={{ fontFamily: FONT_UNIFIED, fontSize: '14px', color: '#1E293B', lineHeight: 1.55 }}>
                  <strong>Trang phục &amp; Đồ dùng:</strong> {FIXED_NOTE_1}
                </div>
              </div>

              {/* Lưu ý 2 cố định */}
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
                    fontSize: '13px',
                    fontWeight: '800',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  2
                </div>
                <div style={{ fontFamily: FONT_UNIFIED, fontSize: '14px', color: '#1E293B', lineHeight: 1.55 }}>
                  <strong>Thời gian có mặt:</strong> {FIXED_NOTE_2}
                </div>
              </div>
            </div>
          </div>

          {/* CON DẤU MỘC ĐỎ NHẬT MỸ CÂN ĐỐI BÊN PHẢI */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <OfficialRedSeal
              title="ĐÃ GHI DANH"
              subtitle="BAN GIÁM ĐỐC"
              size={128}
              date={issuedDate || (typeof window !== 'undefined' ? new Date().toLocaleDateString('vi-VN') : '')}
            />
          </div>
        </div>

      </div>

      {/* 3. FOOTER THƯƠNG HIỆU NHẬT MỸ - CHUẨN MỰC ĐỒNG BỘ MỘT FONT */}
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
        <div
          style={{
            fontFamily: FONT_UNIFIED,
            fontSize: '15px',
            fontWeight: '900',
            letterSpacing: '1px',
            color: BRAND.gold,
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          ANH NGỮ NHẬT MỸ — DEDICATED TO EXCELLENCE
        </div>
        <div style={{ fontFamily: FONT_UNIFIED, fontSize: '13px', opacity: 0.96 }}>
          Hotline hỗ trợ phụ huynh: <strong>0911 767 069</strong> • Website: <strong>anhngunhatmy.edu.vn</strong>
        </div>
        <div style={{ fontFamily: FONT_UNIFIED, fontSize: '12px', opacity: 0.88, marginTop: '2px' }}>
          Địa chỉ: Đường D33, KDC Việt Sing, P. An Phú, TP. Thuận An, Tỉnh Bình Dương
        </div>
      </div>
    </div>
  );
});

CourseWelcomeTemplate.displayName = 'CourseWelcomeTemplate';

export default CourseWelcomeTemplate;
