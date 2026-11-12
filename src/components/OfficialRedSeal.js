'use client';

import React, { useMemo } from 'react';

/**
 * Con Dấu Mộc Đỏ Điện Tử "ĐÃ GHI DANH - BAN GIÁM ĐỐC"
 * Chuẩn nhận diện văn bản hành chính & quyết định của Trung tâm Anh ngữ Nhật Mỹ.
 * Render dưới dạng <img> Data URI SVG để tương thích 100% với html2canvas,
 * thống nhất font Geometric Sans-Serif nét dày chắc chắn trên toàn bộ thư.
 */
export default function OfficialRedSeal({
  date = '',
  title = 'ĐÃ GHI DANH',
  subtitle = 'BAN GIÁM ĐỐC',
  size = 132,
  style = {},
}) {
  const displayDate = date || (typeof window !== 'undefined' ? new Date().toLocaleDateString('vi-VN') : '');
  const FONT_SANS_SVG = `'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif`;

  const svgDataUri = useMemo(() => {
    const rawSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">
      <defs>
        <path id="sealTopArc" d="M 22,100 A 78,78 0 0,1 178,100" fill="none" />
        <path id="sealBottomArc" d="M 178,100 A 78,78 0 0,1 22,100" fill="none" />
      </defs>

      <circle cx="100" cy="100" r="95" fill="none" stroke="#D71920" stroke-width="3.2" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#D71920" stroke-width="1.3" />
      <circle cx="100" cy="100" r="84" fill="none" stroke="#D71920" stroke-width="0.75" stroke-dasharray="3,2" />

      <text fill="#D71920" font-size="10.5" font-weight="900" font-family="${FONT_SANS_SVG}" letter-spacing="1.2">
        <textPath href="#sealTopArc" startOffset="50%" text-anchor="middle">
          ANH NGỮ NHẬT MỸ
        </textPath>
      </text>

      <line x1="34" y1="74" x2="166" y2="74" stroke="#D71920" stroke-width="1.6" />
      <line x1="34" y1="126" x2="166" y2="126" stroke="#D71920" stroke-width="1.6" />

      <text x="100" y="96" fill="#D71920" font-size="12.5" font-weight="900" font-family="${FONT_SANS_SVG}" text-anchor="middle" letter-spacing="0.8">
        ★ ${title} ★
      </text>
      <text x="100" y="116" fill="#D71920" font-size="11" font-weight="800" font-family="${FONT_SANS_SVG}" text-anchor="middle" letter-spacing="1.2">
        ${subtitle}
      </text>

      <text fill="#D71920" font-size="8.8" font-weight="700" font-family="${FONT_SANS_SVG}" letter-spacing="0.6">
        <textPath href="#sealBottomArc" startOffset="50%" text-anchor="middle">
          CHÍNH THỨC · ${displayDate}
        </textPath>
      </text>
    </svg>`;

    return `data:image/svg+xml;utf8,${encodeURIComponent(rawSvg)}`;
  }, [displayDate, title, subtitle, size, FONT_SANS_SVG]);

  return (
    <div
      style={{
        display: 'inline-block',
        transform: 'rotate(-8deg)',
        transformOrigin: 'center center',
        pointerEvents: 'none',
        userSelect: 'none',
        filter: 'drop-shadow(0 2px 4px rgba(215, 25, 32, 0.15))',
        ...style,
      }}
    >
      <img
        src={svgDataUri}
        alt="Con dấu Nhật Mỹ"
        width={size}
        height={size}
        style={{ display: 'block' }}
      />
    </div>
  );
}
