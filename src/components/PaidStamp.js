'use client';

import React, { useMemo } from 'react';

/**
 * Component Con Dấu Mộc Đỏ Điện Tử "ĐÃ THU TIỀN / PAID"
 * Thiết kế chuẩn mộc tài chính - kế toán của Trung tâm Anh ngữ Nhật Mỹ.
 * Render dưới dạng <img> Data URI SVG để tương thích 100% với html2canvas,
 * đảm bảo text uốn cong theo viền tròn hiển thị sắc nét, không bị lỗi font hay lệch vị trí khi xuất ảnh.
 */
export default function PaidStamp({
  date = '',
  time = '',
  receiptCode = '',
  size = 148,
  style = {},
}) {
  const displayDate = date || (typeof window !== 'undefined' ? new Date().toLocaleDateString('vi-VN') : '');
  const displayTime = time || (typeof window !== 'undefined' ? new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '');
  
  const bottomText = receiptCode 
    ? `${receiptCode} · ${displayDate}`
    : (displayDate ? `${displayDate} - ${displayTime}` : 'CHỨNG TỪ ĐIỆN TỬ');

  const svgDataUri = useMemo(() => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
      <defs>
        <!-- Cung viền cong trên: Tên Trung tâm -->
        <path id="stampTopArc" d="M 22,100 A 78,78 0 0,1 178,100" fill="none" />
        <!-- Cung viền cong dưới: Mã biên lai & Thời gian thu (chạy từ phải sang trái để chữ đọc xuôi) -->
        <path id="stampBottomArc" d="M 178,100 A 78,78 0 0,1 22,100" fill="none" />
      </defs>

      <!-- Viền kép ngoài chuẩn mộc đỏ son -->
      <circle cx="100" cy="100" r="95" fill="none" stroke="#C41E3A" stroke-width="3.2" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#C41E3A" stroke-width="1.3" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#C41E3A" stroke-width="0.75" stroke-dasharray="3,2" />

      <!-- Chữ cong viền trên: TRUNG TÂM ANH NGỮ NHẬT MỸ -->
      <text fill="#C41E3A" font-size="10.2" font-weight="900" font-family="'Segoe UI', Arial, sans-serif" letter-spacing="1.2">
        <textPath href="#stampTopArc" startOffset="50%" text-anchor="middle">
          TRUNG TÂM ANH NGỮ NHẬT MỸ
        </textPath>
      </text>

      <!-- Hai đường chỉ kẻ ngang ngăn cách trung tâm -->
      <line x1="36" y1="74" x2="164" y2="74" stroke="#C41E3A" stroke-width="1.6" />
      <line x1="36" y1="126" x2="164" y2="126" stroke="#C41E3A" stroke-width="1.6" />

      <!-- Tâm mộc: ĐÃ THU TIỀN -->
      <text x="100" y="96" fill="#C41E3A" font-size="13" font-weight="900" font-family="'Segoe UI', Arial, sans-serif" text-anchor="middle" letter-spacing="1">
        ★ ĐÃ THU TIỀN ★
      </text>
      <text x="100" y="116" fill="#C41E3A" font-size="11" font-weight="800" font-family="'Segoe UI', Arial, sans-serif" text-anchor="middle" letter-spacing="2">
        PAID
      </text>

      <!-- Chữ cong viền dưới: Ngày giờ / Mã phiếu -->
      <text fill="#C41E3A" font-size="8.5" font-weight="700" font-family="'Segoe UI', Arial, sans-serif" letter-spacing="0.8">
        <textPath href="#stampBottomArc" startOffset="50%" text-anchor="middle">
          ${bottomText}
        </textPath>
      </text>
    </svg>`;

    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rawSvg)}`;
  }, [size, bottomText]);

  return (
    <div
      style={{
        position: 'absolute',
        transform: 'rotate(-13deg)',
        opacity: 0.88,
        pointerEvents: 'none',
        zIndex: 10,
        ...style,
      }}
    >
      <img
        src={svgDataUri}
        alt="Dấu mộc Đã Thu Tiền"
        width={size}
        height={size}
        style={{ display: 'block' }}
      />
    </div>
  );
}
