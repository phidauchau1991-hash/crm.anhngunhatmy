'use client';

import React, { forwardRef } from 'react';
import BrandLetterShell from '@/components/BrandLetterShell';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import { BRAND, FONT_UNIFIED, getTodayVnShortDate } from '@/lib/brandTheme';

const PlacementReportTemplate = forwardRef(({ studentName, testDate, scores, aiResult }, ref) => {
  // Weighted score calculation
  const lsWeight = Number(scores?.listening?.weight || 30);
  const spWeight = Number(scores?.speaking?.weight  || 30);
  const rwWeight = Number(scores?.rw?.weight        || 40);

  const getContrib = (score, max, weight) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * weight * 100) / 100;
  };

  const getSkillPct = (score, max) => {
    if (!max || max <= 0) return 0;
    return Math.round((Number(score) / Number(max)) * 100);
  };

  const lsPct     = getSkillPct(scores?.listening?.score, scores?.listening?.max);
  const spPct     = getSkillPct(scores?.speaking?.score,  scores?.speaking?.max);
  const rwPct     = getSkillPct(scores?.rw?.score,        scores?.rw?.max);
  const lsContrib = getContrib(scores?.listening?.score, scores?.listening?.max, lsWeight);
  const spContrib = getContrib(scores?.speaking?.score,  scores?.speaking?.max,  spWeight);
  const rwContrib = getContrib(scores?.rw?.score,        scores?.rw?.max,        rwWeight);
  const totalContrib = Math.round((lsContrib + spContrib + rwContrib) * 100) / 100;
  const totalWeight  = lsWeight + spWeight + rwWeight;

  const getEvalBadge = (pct) => {
    if (pct >= 85) return { label: 'Xuất sắc', bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
    if (pct >= 70) return { label: 'Khá - Tốt', bg: '#E8F5FD', color: '#08557B', border: '#BAE6FD' };
    if (pct >= 50) return { label: 'Trung bình', bg: '#FEF3C7', color: '#B45309', border: '#FDE68A' };
    return { label: 'Cần củng cố nền tảng', bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' };
  };

  const overallBadge = getEvalBadge(totalContrib);

  const skillRows = [
    {
      label: 'Nghe (Listening)',
      score: `${scores?.listening?.score || 0} / ${scores?.listening?.max || 0}`,
      pct: lsPct,
      weight: lsWeight,
      contrib: lsContrib,
    },
    {
      label: 'Nói (Speaking)',
      score: `${scores?.speaking?.score || 0} / ${scores?.speaking?.max || 0}`,
      pct: spPct,
      weight: spWeight,
      contrib: spContrib,
    },
    {
      label: 'Đọc & Viết (Reading & Writing)',
      score: `${scores?.rw?.score || 0} / ${scores?.rw?.max || 0}`,
      pct: rwPct,
      weight: rwWeight,
      contrib: rwContrib,
    },
  ];

  const remarkCards = [
    {
      title: 'Nghe & Nói (Listening & Speaking)',
      content: aiResult?.ls_comments || '- Giáo viên đang cập nhật nhận xét...',
      accent: BRAND.blue,
      bg: '#F8FBFF',
      titleColor: BRAND.blueDark,
    },
    {
      title: 'Đọc & Viết (Reading & Writing)',
      content: aiResult?.rw_comments || '- Giáo viên đang cập nhật nhận xét...',
      accent: BRAND.goldDark,
      bg: BRAND.goldBg,
      titleColor: '#92400E',
    },
    {
      title: 'Đánh Giá Chung & Lộ Trình Đề Xuất (Conclusion & Roadmap)',
      content:
        aiResult?.conclusion ||
        'Trung tâm Anh ngữ Nhật Mỹ sẽ trao đổi trực tiếp cùng Quý Phụ huynh để tư vấn lộ trình học phù hợp nhất.',
      accent: BRAND.greenBadge,
      bg: '#F3FCF7',
      titleColor: '#065F46',
    },
  ];

  return (
    <BrandLetterShell
      ref={ref}
      id="placement-report-capture"
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub="Placement Assessment Report"
      eyebrow="HỒ SƠ ĐÁNH GIÁ ĐẦU VÀO"
      title="KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC"
      subtitleEn="English Placement Assessment &amp; Study Roadmap"
    >
      {/* 1. THÔNG TIN HỌC VIÊN & TỔNG ĐIỂM */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '12px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '12px 18px',
          marginBottom: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 2px 8px rgba(13, 136, 196, 0.05)',
          fontFamily: FONT_UNIFIED,
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
              lineHeight: 1.2,
            }}
          >
            {studentName || 'HỌ VÀ TÊN HỌC VIÊN'}
          </div>
          {testDate && (
            <div
              style={{
                fontFamily: FONT_UNIFIED,
                fontSize: '12.5px',
                fontWeight: '600',
                color: BRAND.muted,
                marginTop: '4px',
              }}
            >
              📅 Ngày đánh giá: <strong>{testDate}</strong>
            </div>
          )}
        </div>

        <div
          style={{
            backgroundColor: BRAND.goldBg,
            border: `2px solid ${BRAND.gold}`,
            borderRadius: '12px',
            padding: '10px 18px',
            textAlign: 'center',
            flexShrink: 0,
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
            ĐIỂM TỔNG KẾT
          </div>
          <div
            style={{
              fontFamily: FONT_UNIFIED,
              fontSize: '24px',
              fontWeight: '900',
              color: BRAND.blueDark,
              lineHeight: 1.15,
              marginTop: '2px',
            }}
          >
            {totalContrib} <span style={{ fontSize: '14px', fontWeight: '700', color: BRAND.muted }}>/ 100</span>
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '11.5px',
              fontWeight: '800',
              backgroundColor: overallBadge.bg,
              color: overallBadge.color,
              border: `1px solid ${overallBadge.border}`,
              fontFamily: FONT_UNIFIED,
            }}
          >
            {overallBadge.label}
          </div>
        </div>
      </div>

      {/* 2. BẢNG ĐIỂM CHI TIẾT THEO KỸ NĂNG */}
      <div style={{ marginBottom: '18px', fontFamily: FONT_UNIFIED }}>
        <div
          style={{
            color: BRAND.blueDark,
            fontSize: '13.5px',
            textTransform: 'uppercase',
            fontWeight: '800',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            letterSpacing: '0.3px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '5px',
              height: '15px',
              backgroundColor: BRAND.gold,
              borderRadius: '3px',
              flexShrink: 0,
            }}
          />
          Bảng Điểm Đánh Giá (Score Breakdown)
        </div>

        <div
          style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: `1.5px solid ${BRAND.blueBorder}`,
            backgroundColor: BRAND.white,
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_UNIFIED }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 100%)` }}>
                {['Kỹ năng (Skill)', 'Điểm đạt / Tối đa', 'Tỷ lệ %', 'Trọng số', 'Điểm đóng góp'].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '10px 12px',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      color: BRAND.white,
                      textAlign: i === 0 ? 'left' : 'center',
                      borderRight: i < 4 ? '1px solid rgba(255,255,255,0.18)' : 'none',
                      fontFamily: FONT_UNIFIED,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {skillRows.map((row, idx) => (
                <tr key={row.label} style={{ backgroundColor: idx % 2 === 1 ? '#F8FBFE' : BRAND.white }}>
                  <td
                    style={{
                      padding: '10px 12px',
                      borderTop: `1px solid ${BRAND.border}`,
                      borderRight: `1px solid ${BRAND.border}`,
                      fontSize: '13px',
                      fontWeight: '700',
                      color: BRAND.ink,
                      fontFamily: FONT_UNIFIED,
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      borderTop: `1px solid ${BRAND.border}`,
                      borderRight: `1px solid ${BRAND.border}`,
                      fontSize: '13px',
                      textAlign: 'center',
                      fontWeight: '600',
                      color: BRAND.slate,
                      fontFamily: FONT_UNIFIED,
                    }}
                  >
                    {row.score}
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      borderTop: `1px solid ${BRAND.border}`,
                      borderRight: `1px solid ${BRAND.border}`,
                      fontSize: '13px',
                      textAlign: 'center',
                      fontWeight: '800',
                      color: BRAND.blue,
                      fontFamily: FONT_UNIFIED,
                    }}
                  >
                    {row.pct}%
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      borderTop: `1px solid ${BRAND.border}`,
                      borderRight: `1px solid ${BRAND.border}`,
                      fontSize: '13px',
                      textAlign: 'center',
                      color: BRAND.muted,
                      fontWeight: '600',
                      fontFamily: FONT_UNIFIED,
                    }}
                  >
                    {row.weight}%
                  </td>
                  <td
                    style={{
                      padding: '10px 12px',
                      borderTop: `1px solid ${BRAND.border}`,
                      fontSize: '13.5px',
                      textAlign: 'center',
                      fontWeight: '800',
                      color: BRAND.blueDark,
                      fontFamily: FONT_UNIFIED,
                    }}
                  >
                    {row.contrib}
                  </td>
                </tr>
              ))}

              <tr style={{ backgroundColor: BRAND.blueLight }}>
                <td
                  style={{
                    padding: '11px 12px',
                    borderTop: `2px solid ${BRAND.blue}`,
                    borderRight: `1px solid ${BRAND.blueBorder}`,
                    fontSize: '13.5px',
                    fontWeight: '900',
                    color: BRAND.blueDark,
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  TỔNG KẾT (OVERALL)
                </td>
                <td
                  style={{
                    padding: '11px 12px',
                    borderTop: `2px solid ${BRAND.blue}`,
                    borderRight: `1px solid ${BRAND.blueBorder}`,
                    fontSize: '13px',
                    textAlign: 'center',
                    color: BRAND.muted,
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  —
                </td>
                <td
                  style={{
                    padding: '11px 12px',
                    borderTop: `2px solid ${BRAND.blue}`,
                    borderRight: `1px solid ${BRAND.blueBorder}`,
                    fontSize: '13px',
                    textAlign: 'center',
                    color: BRAND.muted,
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  —
                </td>
                <td
                  style={{
                    padding: '11px 12px',
                    borderTop: `2px solid ${BRAND.blue}`,
                    borderRight: `1px solid ${BRAND.blueBorder}`,
                    fontSize: '13.5px',
                    textAlign: 'center',
                    fontWeight: '800',
                    color: BRAND.blueDark,
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  {totalWeight}%
                </td>
                <td
                  style={{
                    padding: '11px 12px',
                    borderTop: `2px solid ${BRAND.blue}`,
                    fontSize: '15.5px',
                    textAlign: 'center',
                    fontWeight: '900',
                    color: BRAND.blueDark,
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  {totalContrib} / 100
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            fontSize: '11.5px',
            color: BRAND.subtle,
            marginTop: '6px',
            fontStyle: 'italic',
            fontFamily: FONT_UNIFIED,
          }}
        >
          * Điểm đóng góp = Tỷ lệ kỹ năng × Trọng số (Tổng trọng số {totalWeight}% quy đổi về thang 100 điểm)
        </div>
      </div>

      {/* 3. NHẬN XÉT CHUYÊN MÔN & LỘ TRÌNH */}
      <div style={{ marginBottom: '16px', fontFamily: FONT_UNIFIED }}>
        <div
          style={{
            color: BRAND.blueDark,
            fontSize: '13.5px',
            textTransform: 'uppercase',
            fontWeight: '800',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            letterSpacing: '0.3px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '5px',
              height: '15px',
              backgroundColor: BRAND.gold,
              borderRadius: '3px',
              flexShrink: 0,
            }}
          />
          Nhận Xét Chuyên Môn &amp; Định Hướng (Teacher&apos;s Remarks)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {remarkCards.map((card) => (
            <div
              key={card.title}
              style={{
                backgroundColor: card.bg,
                borderRadius: '10px',
                border: `1px solid ${BRAND.border}`,
                overflow: 'hidden',
                display: 'flex',
                fontFamily: FONT_UNIFIED,
              }}
            >
              <div style={{ width: '4.5px', backgroundColor: card.accent, flexShrink: 0 }} />
              <div style={{ flex: 1, padding: '10px 14px' }}>
                <div
                  style={{
                    marginBottom: '4px',
                    color: card.titleColor,
                    fontSize: '13px',
                    fontWeight: '800',
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  {card.title}
                </div>
                <div
                  style={{
                    color: BRAND.slate,
                    fontSize: '13px',
                    fontWeight: '500',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line',
                    fontFamily: FONT_UNIFIED,
                  }}
                >
                  {card.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. XÁC NHẬN CHUYÊN MÔN & MỘC ĐỎ (GỌN) */}
      <div
        style={{
          borderTop: `1.5px dashed ${BRAND.border}`,
          padding: '8px 6px 2px 6px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          marginTop: '10px',
        }}
      >
        <div>
          <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase' }}>
            Xác nhận kết quả khảo sát
          </div>
          <div style={{ fontFamily: FONT_UNIFIED, fontSize: '14px', fontWeight: '800', color: BRAND.ink, marginTop: '2px' }}>
            Hội đồng Chuyên môn — Hệ thống Anh ngữ Nhật Mỹ
          </div>
          <div style={{ fontFamily: FONT_UNIFIED, fontSize: '11.5px', fontStyle: 'italic', color: BRAND.muted, marginTop: '1px' }}>
            Báo cáo được lập dựa trên bài kiểm tra đầu vào thực tế của học viên.
          </div>
        </div>
        <OfficialRedSeal
          title="ĐÃ ĐÁNH GIÁ"
          subtitle="BAN CHUYÊN MÔN"
          size={82}
          date={testDate || getTodayVnShortDate()}
        />
      </div>
    </BrandLetterShell>
  );
});

PlacementReportTemplate.displayName = 'PlacementReportTemplate';
export default PlacementReportTemplate;
