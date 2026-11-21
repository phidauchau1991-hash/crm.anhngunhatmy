'use client';

import React, { useState, useEffect } from 'react';
import { generateVietQRDataURL } from '@/lib/vietqr';
import { computeExpectedEndDateVn, formatClassCode } from '@/lib/classHelper';
import BrandLetterShell from '@/components/BrandLetterShell';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import {
  BRAND,
  FONT_UNIFIED,
  exportElementToCanvas,
  formatVnShortDate,
  getTodayVnShortDate,
} from '@/lib/brandTheme';

const downloadImage = (dataUrl, filename) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
};

export const formatClassCodeForParent = (code) => {
  if (!code) return '';
  const parts = code.split('_');
  if (parts.length >= 4) {
    const level = parts[1];
    let teacher = parts[2];

    if (teacher.length > 12 && !teacher.includes(' ')) {
      teacher = '';
    } else {
      teacher = teacher.replace(/([A-Z])/g, ' $1').trim();
    }

    let schedule = parts[3];
    if (schedule.toLowerCase() === '7cn' || schedule.toLowerCase() === 't7cn') schedule = 'T7CN';
    if (schedule.toLowerCase() === '24' || schedule.toLowerCase() === 't24') schedule = '24';
    if (schedule.toLowerCase() === '35' || schedule.toLowerCase() === 't35') schedule = '35';

    if (teacher) {
      return `${level} - ${schedule} - ${teacher}`;
    }
    return `${level} - ${schedule}`;
  }

  let formatted = code.replace(/^CN\d+_/i, '');
  formatted = formatted.replace(/(_Ca\d+|_\d+)$/i, '');
  return formatted;
};

export const extractTeacherNickname = (code) => {
  if (!code) return '';
  const parts = code.split('_');
  if (parts.length >= 3) {
    const namePart = parts[2];
    if (namePart.match(/^(Ms|Mr|Mrs)/i)) {
      return namePart.replace(/^(Ms|Mr|Mrs)(.*)/i, '$1 $2');
    }
    return namePart;
  }
  return '';
};

const SectionHeading = ({ title }) => (
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
      fontFamily: FONT_UNIFIED,
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
    {title}
  </div>
);

const SealSignatureCard = ({ label, signer, subnote, sealTitle, sealSubtitle, date }) => (
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
      <div
        style={{
          fontSize: '11px',
          fontWeight: '800',
          color: BRAND.subtle,
          textTransform: 'uppercase',
          letterSpacing: '0.4px',
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: '800', color: BRAND.ink, marginTop: '2px' }}>
        {signer}
      </div>
      {subnote && (
        <div
          style={{
            fontSize: '11.5px',
            fontStyle: 'italic',
            color: BRAND.muted,
            marginTop: '1px',
          }}
        >
          {subnote}
        </div>
      )}
    </div>
    <OfficialRedSeal
      title={sealTitle}
      subtitle={sealSubtitle}
      size={82}
      date={date || getTodayVnShortDate()}
    />
  </div>
);

const AccentSkillCard = ({ title, accent, bg, titleColor, children }) => (
  <div
    style={{
      backgroundColor: bg,
      borderRadius: '10px',
      border: `1px solid ${BRAND.border}`,
      overflow: 'hidden',
      display: 'flex',
      fontFamily: FONT_UNIFIED,
    }}
  >
    <div style={{ width: '4.5px', backgroundColor: accent, flexShrink: 0 }} />
    <div style={{ flex: 1, padding: '10px 14px' }}>
      <div style={{ fontSize: '13.5px', fontWeight: '800', color: titleColor, marginBottom: '5px' }}>
        {title}
      </div>
      {children}
    </div>
  </div>
);

// Helper hiển thị nhận xét bullet linh hoạt: chấp nhận cả văn bản tự do, có hoặc không có gạch đầu dòng
const renderBulletComments = (text) => {
  const normalized = typeof text === 'string' ? text : '';
  const lines = normalized
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .map((line) => line.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return (
      <li style={{ textAlign: 'left', listStyleType: 'disc' }}>
        Không có dữ liệu
      </li>
    );
  }

  return lines.map((line, idx) => (
    <li
      key={idx}
      style={{
        marginBottom: '6px',
        lineHeight: 1.6,
        textAlign: 'left',
        listStyleType: 'disc',
        listStylePosition: 'outside',
      }}
    >
      {line}
    </li>
  ));
};

const getRecommendationText = (result) => result?.recommendation ?? result?.advice ?? '';

// ==========================================
// ẢNH 2: BẢNG ĐIỂM KẾT QUẢ CUỐI KHÓA / GIỮA KHÓA
// ==========================================
export const ScoreReportTemplate = ({ student, config, result }) => {
  if (!student || !config || !result) return null;

  const attendanceScore = parseFloat(result.attendanceScore) || 0;
  const hwScore = parseFloat(result.hwScore) || 0;
  const activityScore = parseFloat(result.activityScore) || 0;
  const pronunciationScore = parseFloat(result.pronunciationScore) || 0;
  const communicationScore = parseFloat(result.communicationScore) || 0;

  const processTotal =
    (attendanceScore + hwScore + activityScore + pronunciationScore + communicationScore) / 5;

  const speakingScore = parseFloat(result.speakingScore) || 0;
  const listeningScore = parseFloat(result.listeningScore) || 0;
  const rwScore = parseFloat(result.rwScore) || 0;

  const speakingMax = config.speakingMax > 0 ? config.speakingMax : 40;
  const listeningMax = config.listeningMax > 0 ? config.listeningMax : 26;
  const rwMax = config.rwMax > 0 ? config.rwMax : 36;

  const processContribution = (processTotal / 10) * (config.processWeight ?? 10);
  const speakingPercent = (speakingScore / speakingMax) * (config.speakingWeight ?? 30);
  const listeningPercent = (listeningScore / listeningMax) * (config.listeningWeight ?? 20);
  const rwPercent = (rwScore / rwMax) * (config.rwWeight ?? 40);

  const examContribution = speakingPercent + listeningPercent + rwPercent;
  const totalScore = processContribution + examContribution;

  let grade = 'D';
  let gradeDesc = 'Không đạt';
  if (totalScore >= 98) { grade = 'A+'; gradeDesc = 'Xuất sắc'; }
  else if (totalScore >= 95) { grade = 'A'; gradeDesc = 'Rất giỏi'; }
  else if (totalScore >= 90) { grade = 'B+'; gradeDesc = 'Giỏi'; }
  else if (totalScore >= 80) { grade = 'B'; gradeDesc = 'Khá'; }
  else if (totalScore >= 75) { grade = 'C+'; gradeDesc = 'Trung bình khá'; }
  else if (totalScore >= 65) { grade = 'C'; gradeDesc = 'Cần cố gắng hơn'; }

  const displayClassCode = formatClassCodeForParent(result.classCode || student.classCode || 'Chưa có');
  const displayDate = result.examDate
    ? formatVnShortDate(result.examDate) || getTodayVnShortDate()
    : getTodayVnShortDate();

  const teacherNickname = extractTeacherNickname(result.classCode) || 'Giáo viên phụ trách';
  const teacherFullName = result.class?.teacherName || teacherNickname;

  const thStyle = {
    padding: '9px 12px',
    fontSize: '12.5px',
    fontWeight: '800',
    color: BRAND.white,
    fontFamily: FONT_UNIFIED,
    borderRight: '1px solid rgba(255,255,255,0.18)',
  };

  const tdStyle = {
    padding: '8px 12px',
    borderTop: `1px solid ${BRAND.border}`,
    borderRight: `1px solid ${BRAND.border}`,
    fontSize: '13px',
    color: BRAND.slate,
    fontFamily: FONT_UNIFIED,
  };

  return (
    <BrandLetterShell
      id={`score-report-${student.id}`}
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub="Official Academic Transcript"
      eyebrow={`ĐÁNH GIÁ ${String(config.examType || 'CUỐI KHÓA').toUpperCase()}`}
      title="BÁO CÁO KẾT QUẢ HỌC TẬP"
      subtitleEn="Course Assessment &amp; Academic Performance Report"
    >
      {/* Khối thông tin học viên + Điểm tổng kết */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '15px 20px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            HỌ VÀ TÊN HỌC VIÊN
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: BRAND.blueDark, textTransform: 'uppercase', marginTop: '2px', lineHeight: 1.2 }}>
            {student.name}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginTop: '6px', fontSize: '12.5px', color: BRAND.muted, fontWeight: '600' }}>
            <span>🏫 Lớp: <strong style={{ color: BRAND.ink }}>{displayClassCode}</strong></span>
            <span>👩‍🏫 GV: <strong style={{ color: BRAND.ink }}>{teacherNickname}</strong></span>
            <span>📅 Ngày thi: <strong style={{ color: BRAND.ink }}>{displayDate}</strong></span>
          </div>
        </div>

        <div
          style={{
            backgroundColor: BRAND.goldBg,
            border: `2px solid ${BRAND.gold}`,
            borderRadius: '12px',
            padding: '10px 18px',
            textAlign: 'center',
            flexShrink: 0,
            minWidth: '142px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase' }}>
            TỔNG ĐIỂM ({gradeDesc})
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#DC2626', lineHeight: 1.15, marginTop: '2px' }}>
            {totalScore.toFixed(2)}
          </div>
          <div
            style={{
              display: 'inline-block',
              marginTop: '4px',
              padding: '2px 12px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '900',
              backgroundColor: BRAND.blue,
              color: BRAND.white,
            }}
          >
            Xếp loại: {grade}
          </div>
        </div>
      </div>

      {/* 1. QUÁ TRÌNH HỌC */}
      <div style={{ marginBottom: '16px' }}>
        <SectionHeading title={`1. Đánh giá quá trình học (${config.processWeight}%)`} />
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${BRAND.blueBorder}`, backgroundColor: BRAND.white }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {[
                { label: 'Điểm danh (Attendance)', score: result.attendanceScore },
                { label: 'Bài tập về nhà (Homework)', score: result.hwScore },
                { label: 'Hoạt động lớp (Class Activity)', score: result.activityScore },
                { label: 'Phát âm (Pronunciation)', score: result.pronunciationScore },
                { label: 'Giao tiếp (Communication)', score: result.communicationScore },
              ].map((item, idx) => (
                <tr key={item.label} style={{ backgroundColor: idx % 2 === 1 ? '#F8FBFE' : BRAND.white }}>
                  {idx === 0 && (
                    <td
                      rowSpan={5}
                      style={{
                        ...tdStyle,
                        borderTop: 'none',
                        width: '28%',
                        textAlign: 'center',
                        fontWeight: '800',
                        color: BRAND.blueDark,
                        backgroundColor: BRAND.blueSoft,
                      }}
                    >
                      Chuyên cần
                      <div style={{ fontSize: '11.5px', fontWeight: '500', color: BRAND.muted, marginTop: '2px' }}>
                        (Class Participation)
                      </div>
                    </td>
                  )}
                  <td style={{ ...tdStyle, borderTop: idx === 0 ? 'none' : tdStyle.borderTop, width: '34%', fontWeight: '600' }}>
                    {item.label}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      borderTop: idx === 0 ? 'none' : tdStyle.borderTop,
                      width: '18%',
                      textAlign: 'center',
                      fontWeight: '800',
                      color: BRAND.blue,
                    }}
                  >
                    {item.score}/10
                  </td>
                  {idx === 0 && (
                    <td
                      rowSpan={5}
                      style={{
                        ...tdStyle,
                        borderTop: 'none',
                        borderRight: 'none',
                        width: '20%',
                        textAlign: 'center',
                        backgroundColor: BRAND.goldBg,
                        verticalAlign: 'middle',
                      }}
                    >
                      <div style={{ fontSize: '11.5px', fontWeight: '700', color: BRAND.goldDark, textTransform: 'uppercase' }}>
                        TB Chuyên Cần
                      </div>
                      <div style={{ color: '#DC2626', fontSize: '22px', fontWeight: '900', marginTop: '6px' }}>
                        {processTotal.toFixed(1)}%
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. KẾT QUẢ BÀI THI */}
      <div style={{ marginBottom: '16px' }}>
        <SectionHeading title={`2. Kết quả bài thi (${config.examWeight}%)`} />
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${BRAND.blueBorder}`, backgroundColor: BRAND.white }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 100%)` }}>
                <th style={{ ...thStyle, textAlign: 'left', width: '48%' }}>Kỹ năng (Skill)</th>
                <th style={{ ...thStyle, textAlign: 'center', width: '26%' }}>Điểm thi (Test Score)</th>
                <th style={{ ...thStyle, textAlign: 'center', width: '26%', borderRight: 'none' }}>Điểm quy đổi (%)</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: `Nói (Speaking): ${config.speakingWeight}%`, val: `${result.speakingScore}/${config.speakingMax}`, pct: speakingPercent },
                { label: `Nghe (Listening): ${config.listeningWeight}%`, val: `${result.listeningScore}/${config.listeningMax}`, pct: listeningPercent },
                { label: `Đọc & Viết (Reading & Writing): ${config.rwWeight}%`, val: `${result.rwScore}/${config.rwMax}`, pct: rwPercent },
              ].map((row, idx) => (
                <tr key={row.label} style={{ backgroundColor: idx % 2 === 1 ? '#F8FBFE' : BRAND.white }}>
                  <td style={{ ...tdStyle, fontWeight: '700', color: BRAND.ink }}>{row.label}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: '700', color: BRAND.blue }}>{row.val}</td>
                  <td style={{ ...tdStyle, borderRight: 'none', textAlign: 'center', fontWeight: '800', color: '#DC2626' }}>
                    {row.pct.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. KẾT QUẢ CUỐI KHÓA & QUY ĐỔI XẾP LOẠI */}
      <div
        style={{
          backgroundColor: BRAND.goldBg,
          border: `1.5px solid ${BRAND.goldBorder}`,
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '6px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase', marginBottom: '6px' }}>
          📌 Thang quy đổi xếp loại &amp; Nhận xét đính kèm
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: BRAND.slate, fontWeight: '500', lineHeight: 1.55 }}>
          <div>
            • <strong>A+:</strong> 98 - 100 (Xuất sắc) • <strong>A:</strong> 95 - 97 (Rất giỏi)<br />
            • <strong>B+:</strong> 90 - 94 (Giỏi) • <strong>B:</strong> 80 - 89 (Khá)
          </div>
          <div>
            • <strong>C+:</strong> 75 - 79 (TB Khá) • <strong>C:</strong> 65 - 74 (Cần cố gắng)<br />
            • <strong>D:</strong> &lt; 65 (Chưa đạt) • <em>Xem chi tiết ở Phiếu Nhận Xét đính kèm</em>
          </div>
        </div>
      </div>

      <SealSignatureCard
        label="Xác nhận kết quả khóa học"
        signer={`GVCN: ${teacherFullName}`}
        subnote="Phiếu điểm chính thức từ Hệ thống Quản lý Đào tạo Anh ngữ Nhật Mỹ."
        sealTitle="ĐÃ CHỨNG NHẬN"
        sealSubtitle="BAN HỌC VỤ"
        date={displayDate}
      />
    </BrandLetterShell>
  );
};

// ==========================================
// ẢNH 1: NHẬN XÉT AI (PERIODIC EXAM / END OF COURSE)
// ==========================================
export const CommentsReportTemplate = ({ student, result }) => {
  const displayClass = formatClassCodeForParent(result?.classCode || student?.classCode || '');

  const skillCards = [
    {
      title: 'Speaking (Kỹ năng Nói)',
      content: result?.commentSpeaking,
      accent: BRAND.blue,
      bg: '#F8FBFF',
      titleColor: BRAND.blueDark,
    },
    {
      title: 'Listening (Kỹ năng Nghe)',
      content: result?.commentListening,
      accent: '#0284C7',
      bg: '#F0F9FF',
      titleColor: '#0369A1',
    },
    {
      title: 'Reading & Writing (Đọc & Viết)',
      content: result?.commentRW,
      accent: BRAND.goldDark,
      bg: BRAND.goldBg,
      titleColor: '#92400E',
    },
    {
      title: 'Định hướng phát triển (Development Plan)',
      content: result?.commentDev,
      accent: BRAND.greenBadge,
      bg: '#F3FCF7',
      titleColor: '#065F46',
    },
  ];

  return (
    <BrandLetterShell
      id={`comment-report-${student.id}`}
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub="Teacher's Academic Feedback"
      eyebrow="ĐÁNH GIÁ NĂNG LỰC CHI TIẾT"
      title="NHẬN XÉT CỦA GIÁO VIÊN"
      subtitleEn="Detailed Skill Evaluation &amp; Study Roadmap"
    >
      {/* Thông tin học viên */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '12px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '11px 18px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            HỌ VÀ TÊN HỌC VIÊN
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: BRAND.blueDark, textTransform: 'uppercase', marginTop: '1px' }}>
            {student.name}
          </div>
        </div>
        {displayClass && (
          <div
            style={{
              backgroundColor: BRAND.blueSoft,
              border: `1.5px solid ${BRAND.blueBorder}`,
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: '800',
              color: BRAND.blueDark,
            }}
          >
            🏫 Lớp: {displayClass}
          </div>
        )}
      </div>

      {/* 4 khối kỹ năng */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {skillCards.map((card) => (
          <AccentSkillCard
            key={card.title}
            title={card.title}
            accent={card.accent}
            bg={card.bg}
            titleColor={card.titleColor}
          >
            <ul style={{ margin: 0, paddingLeft: '18px', color: BRAND.slate, fontSize: '13px', fontWeight: '500' }}>
              {renderBulletComments(card.content)}
            </ul>
          </AccentSkillCard>
        ))}
      </div>

      <SealSignatureCard
        label="Xác nhận chuyên môn"
        signer="Giáo viên Chủ nhiệm — Hệ thống Anh ngữ Nhật Mỹ"
        sealTitle="ĐÃ ĐÁNH GIÁ"
        sealSubtitle="GIÁO VIÊN CHỦ NHIỆM"
      />
    </BrandLetterShell>
  );
};

// Component Wrapper để chứa các hàm xuất ảnh dùng engine thống nhất Retina 2x
export const ExportImageWrapper = ({ children, targetId, filename }) => {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    const element = document.getElementById(targetId);
    if (!element) return;

    const parent = element.parentElement;
    const ot = parent ? parent.style.transform : '';
    const oh = parent ? parent.style.height : '';
    if (parent) {
      parent.style.transform = 'none';
      parent.style.height = 'auto';
    }
    setIsExporting(true);
    try {
      const canvas = await exportElementToCanvas(element);
      const dataUrl = canvas.toDataURL('image/png');
      downloadImage(dataUrl, filename);
    } catch (error) {
      console.error('Lỗi xuất ảnh:', error);
      alert('Không thể xuất ảnh, vui lòng thử lại');
    } finally {
      if (parent) {
        parent.style.transform = ot;
        parent.style.height = oh;
      }
      setIsExporting(false);
    }
  };

  return (
    <div>
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        {children}
      </div>
      <button
        onClick={handleExport}
        disabled={isExporting}
        style={{
          background: '#f59e0b',
          color: 'white',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          cursor: isExporting ? 'wait' : 'pointer',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {isExporting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-image"></i>}
        Tải Ảnh {filename.includes('Diem') ? 'Điểm' : 'Nhận Xét'}
      </button>
    </div>
  );
};

// ==========================================
// ẢNH 3: THƯ THÔNG BÁO LỊCH THI
// ==========================================
export const ExamNoticeTemplate = ({ className, examStage = 'final', examDates, notes }) => {
  const displayClassCode = formatClassCodeForParent(className || '');
  const isMidterm = examStage === 'midterm';

  return (
    <BrandLetterShell
      id="exam-notice-report"
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub={isMidterm ? 'Midterm Assessment Notice' : 'Final Exam Schedule Notice'}
      eyebrow="THÔNG BÁO HỌC VỤ CHÍNH THỨC"
      title={isMidterm ? 'LỊCH KIỂM TRA GIỮA KHÓA' : 'LỊCH KIỂM TRA CUỐI KHÓA'}
      subtitleEn={isMidterm ? 'Midterm Progress Assessment Schedule' : 'Final Course Examination Schedule'}
      footerNote="Kính chúc các em học viên bình tĩnh, tự tin và đạt kết quả cao nhất trong kỳ kiểm tra!"
    >
      {/* Thẻ lớp & Lời mở đầu */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '18px 22px',
          marginBottom: '18px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div
          style={{
            display: 'inline-block',
            backgroundColor: BRAND.blueSoft,
            border: `1px solid ${BRAND.blueBorder}`,
            color: BRAND.blueDark,
            padding: '5px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: '800',
            marginBottom: '10px',
          }}
        >
          🏫 LỚP HỌC: {displayClassCode || className}
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '14.5px', fontWeight: '700', color: BRAND.ink }}>
          Kính gửi Quý Phụ huynh,
        </p>
        <p style={{ margin: 0, fontSize: '14px', lineHeight: 1.65, color: BRAND.slate }}>
          Trung tâm Anh ngữ Nhật Mỹ xin chân thành cảm ơn sự đồng hành của Quý Phụ huynh và sự nỗ lực của các em trong suốt thời gian qua.{' '}
          {isMidterm ? (
            <>Khóa học của lớp <strong>{displayClassCode}</strong> đã đi được nửa chặng đường, Trung tâm trân trọng thông báo lịch kiểm tra giữa khóa để đánh giá tiến độ học tập như sau:</>
          ) : (
            <>Khóa học của lớp <strong>{displayClassCode}</strong> sắp hoàn thành, Trung tâm trân trọng thông báo lịch kiểm tra cuối khóa để tổng kết năng lực của học viên như sau:</>
          )}
        </p>
      </div>

      {/* Bảng lịch kiểm tra */}
      <div style={{ marginBottom: '18px' }}>
        <SectionHeading title="Chi tiết thời gian kiểm tra các kỹ năng" />
        <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${BRAND.blueBorder}`, backgroundColor: BRAND.white }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_UNIFIED }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDark} 100%)` }}>
                <th style={{ padding: '11px 14px', color: BRAND.white, fontSize: '13px', fontWeight: '800', width: '36%', textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                  KỸ NĂNG (SKILL)
                </th>
                <th style={{ padding: '11px 14px', color: BRAND.white, fontSize: '13px', fontWeight: '800', textAlign: 'center' }}>
                  THỜI GIAN KIỂM TRA
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '14px', borderTop: `1px solid ${BRAND.border}`, borderRight: `1px solid ${BRAND.border}`, fontWeight: '800', textAlign: 'center', color: BRAND.ink, fontSize: '14px' }}>
                  Speaking (Kỹ năng Nói)
                </td>
                <td style={{ padding: '14px', borderTop: `1px solid ${BRAND.border}`, textAlign: 'center', color: BRAND.blueDark, fontWeight: '800', fontSize: '16px' }}>
                  {examDates?.speaking || 'Theo lịch thông báo'}
                </td>
              </tr>
              <tr style={{ backgroundColor: '#F8FBFE' }}>
                <td style={{ padding: '14px', borderTop: `1px solid ${BRAND.border}`, borderRight: `1px solid ${BRAND.border}`, fontWeight: '800', textAlign: 'center', color: BRAND.ink, fontSize: '14px' }}>
                  Reading &amp; Writing (Đọc &amp; Viết)
                </td>
                <td style={{ padding: '14px', borderTop: `1px solid ${BRAND.border}`, textAlign: 'center', color: BRAND.blueDark, fontWeight: '800', fontSize: '16px' }}>
                  {examDates?.rw || 'Theo lịch thông báo'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Dặn dò giáo viên */}
      <div
        style={{
          backgroundColor: BRAND.goldBg,
          padding: '15px 18px',
          borderRadius: '12px',
          border: `1px solid ${BRAND.goldBorder}`,
          borderLeft: `5px solid ${BRAND.gold}`,
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: '800', color: BRAND.goldDark, marginBottom: '6px' }}>
          🔔 Dặn dò từ Giáo viên chủ nhiệm:
        </div>
        <div style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.65, color: BRAND.slate, whiteSpace: 'pre-wrap', fontWeight: '500' }}>
          {notes || 'Học viên ôn tập lại từ vựng và mẫu câu đã học, đi học đầy đủ và có mặt đúng giờ thi.'}
        </div>
      </div>

      <SealSignatureCard
        label="Thông báo chính thức"
        signer="Phòng Học Vụ — Hệ thống Anh ngữ Nhật Mỹ"
        sealTitle="THÔNG BÁO THI"
        sealSubtitle="BAN HỌC VỤ"
      />
    </BrandLetterShell>
  );
};

// ==========================================
// ẢNH 4: THƯ THÔNG BÁO KHÓA MỚI & QR THANH TOÁN
// ==========================================
export const PromotionNoticeTemplate = ({
  className,
  newCourse,
  startDate,
  endDate,
  schedule,
  holidays,
  discount,
  isGiftBook,
  hasBook,
  studentName,
  isPersonalized,
  qrDataUrl,
}) => {
  const displayClassCode = formatClassCodeForParent(className || '');
  const targetName = studentName ? studentName.toUpperCase() : `LỚP ${displayClassCode}`;
  const bankMemoName = studentName
    ? studentName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase()
    : '[Ten be]';

  const computedEndDate =
    endDate ||
    computeExpectedEndDateVn({
      startDate,
      totalSessions: newCourse?.totalSessions || 32,
      classCode: className || '',
      schedule: schedule || '',
      holidays: holidays || [],
    });

  const basePrice = newCourse?.price || 0;
  const bookPrice = isPersonalized && (isGiftBook || hasBook) ? 0 : newCourse?.bookPrice || 0;
  const discountVal = isPersonalized && discount > 0 ? parseInt(discount, 10) : 0;
  const finalPrice = Math.max(0, basePrice + bookPrice - discountVal);
  const transferAddInfo = `${bankMemoName} dong hoc phi lop ${newCourse?.level || ''}`.trim();

  const [localQrDataUrl, setLocalQrDataUrl] = useState('');

  useEffect(() => {
    let active = true;
    if (qrDataUrl || finalPrice <= 0) {
      setLocalQrDataUrl('');
      return () => {
        active = false;
      };
    }
    generateVietQRDataURL({ amount: finalPrice, addInfo: transferAddInfo, width: 400 })
      .then((url) => {
        if (active) setLocalQrDataUrl(url);
      })
      .catch((err) => console.error('Local VietQR preview error:', err));
    return () => {
      active = false;
    };
  }, [qrDataUrl, finalPrice, transferAddInfo]);

  const resolvedQrSrc = qrDataUrl || localQrDataUrl;

  const thCell = {
    padding: '10px 12px',
    borderTop: `1px solid ${BRAND.border}`,
    borderRight: `1px solid ${BRAND.border}`,
    backgroundColor: '#F8FBFE',
    fontWeight: '700',
    fontSize: '13px',
    color: BRAND.slate,
    fontFamily: FONT_UNIFIED,
  };

  const valCell = {
    padding: '10px 12px',
    borderTop: `1px solid ${BRAND.border}`,
    borderRight: `1px solid ${BRAND.border}`,
    fontSize: '13.5px',
    color: BRAND.ink,
    fontFamily: FONT_UNIFIED,
  };

  return (
    <BrandLetterShell
      id="promotion-notice-report"
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub="Course Continuation &amp; Tuition Notice"
      eyebrow="CHÚC MỪNG HOÀN THÀNH KHÓA HỌC"
      title="THÔNG TIN KHÓA HỌC MỚI"
      subtitleEn="Next Level Enrollment &amp; Tuition Guide"
      footerNote="Cảm ơn Quý Phụ huynh đã luôn tin tưởng và đồng hành cùng Anh ngữ Nhật Mỹ!"
    >
      {/* Đối tượng áp dụng + lời chúc */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '16px 20px',
          marginBottom: '16px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase' }}>
              {studentName ? 'DÀNH CHO HỌC VIÊN' : 'DÀNH CHO TẬP THỂ LỚP'}
            </div>
            <div style={{ fontSize: '21px', fontWeight: '900', color: BRAND.blueDark, marginTop: '2px' }}>
              {targetName}
            </div>
          </div>
          <div
            style={{
              backgroundColor: BRAND.greenBadgeBg,
              color: BRAND.greenBadge,
              border: `1.5px solid ${BRAND.greenBorder}`,
              padding: '5px 12px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '800',
              whiteSpace: 'nowrap',
            }}
          >
            🎓 Lộ trình tiếp theo
          </div>
        </div>
        <p style={{ margin: 0, fontSize: '13.5px', lineHeight: 1.6, color: BRAND.slate }}>
          Chúc mừng {studentName ? `học viên ${studentName}` : 'các em'} đã hoàn thành xuất sắc khóa học của lớp{' '}
          <strong>{displayClassCode}</strong>! Trung tâm trân trọng gửi đến Quý Phụ huynh thông tin khóa học tiếp theo:
        </p>
      </div>

      {/* Bảng thông tin khóa mới & học phí */}
      <div style={{ borderRadius: '12px', overflow: 'hidden', border: `1.5px solid ${BRAND.blueBorder}`, backgroundColor: BRAND.white, marginBottom: '18px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ ...thCell, borderTop: 'none', width: '22%' }}>Cấp độ mới</td>
              <td colSpan={3} style={{ ...valCell, borderTop: 'none', borderRight: 'none', color: BRAND.blueDark, fontWeight: '900', fontSize: '16px' }}>
                {newCourse?.level} - {newCourse?.capDo}
              </td>
            </tr>
            <tr>
              <td style={{ ...thCell, width: '22%' }}>Ngày khai giảng</td>
              <td style={{ ...valCell, width: '22%', fontWeight: '800', color: BRAND.blue }}>{startDate}</td>
              <td style={{ ...thCell, width: '28%', whiteSpace: 'nowrap' }}>Dự kiến kết thúc</td>
              <td style={{ ...valCell, borderRight: 'none', width: '28%', fontWeight: '800', color: BRAND.blueDark }}>{computedEndDate}</td>
            </tr>
            <tr>
              <td style={thCell}>Thời lượng</td>
              <td colSpan={3} style={{ ...valCell, borderRight: 'none', fontWeight: '700' }}>
                {newCourse?.totalSessions} buổi học chuẩn giáo trình quốc tế
              </td>
            </tr>
            <tr>
              <td style={thCell}>Giáo trình</td>
              <td style={{ ...valCell, fontWeight: '600' }}>{newCourse?.bookName || 'Theo chuẩn quốc tế'}</td>
              <td style={thCell}>Giá giáo trình</td>
              <td style={{ ...valCell, borderRight: 'none', fontWeight: '800' }}>
                {isPersonalized && hasBook ? (
                  <span style={{ color: BRAND.blue }}>Đã có giáo trình</span>
                ) : isPersonalized && isGiftBook ? (
                  <div>
                    <span style={{ textDecoration: 'line-through', color: '#94A3B8', fontWeight: '500', fontSize: '12.5px', marginRight: '8px' }}>
                      {(newCourse?.bookPrice || 0).toLocaleString('vi-VN')}đ
                    </span>
                    <span style={{ color: BRAND.greenBadge, fontWeight: '800' }}>Tặng giáo trình</span>
                  </div>
                ) : (
                  <span>{(newCourse?.bookPrice || 0).toLocaleString('vi-VN')}đ</span>
                )}
              </td>
            </tr>
            {isPersonalized && discountVal > 0 ? (
              <tr>
                <td style={thCell}>Học phí gốc</td>
                <td style={{ ...valCell, textDecoration: 'line-through', color: '#94A3B8' }}>
                  {basePrice.toLocaleString('vi-VN')}đ
                </td>
                <td style={{ ...thCell, backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                  Ưu đãi ({studentName ? studentName.trim().split(/\s+/).slice(-2).join(' ') : 'Học viên'})
                </td>
                <td style={{ ...valCell, borderRight: 'none', backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: '900', fontSize: '15px' }}>
                  - {discountVal.toLocaleString('vi-VN')}đ
                </td>
              </tr>
            ) : (
              <tr>
                <td style={thCell}>Học phí gốc</td>
                <td colSpan={3} style={{ ...valCell, borderRight: 'none', fontWeight: '800' }}>
                  {basePrice.toLocaleString('vi-VN')}đ
                </td>
              </tr>
            )}
            <tr style={{ backgroundColor: '#FEF3C7' }}>
              <td style={{ ...thCell, backgroundColor: '#FEF3C7', borderTop: `2px solid ${BRAND.gold}`, color: '#92400E', fontWeight: '900', fontSize: '14.5px' }}>
                TỔNG CỘNG
              </td>
              <td colSpan={3} style={{ ...valCell, borderRight: 'none', borderTop: `2px solid ${BRAND.gold}`, color: '#B45309', fontWeight: '900', fontSize: '20px' }}>
                {finalPrice.toLocaleString('vi-VN')}đ
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Thanh toán & Mã VietQR + Mộc Đỏ */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.border}`,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '20px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: BRAND.blueDark, marginBottom: '8px', textTransform: 'uppercase' }}>
            🏦 Thông tin chuyển khoản học phí:
          </div>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: 1.9, fontSize: '13.5px', color: BRAND.slate }}>
            <li>
              Ngân hàng: <strong>NH Quân Đội - MB Bank</strong>
            </li>
            <li>
              Số tài khoản: <strong style={{ fontSize: '16px', color: BRAND.blueDark }}>61 1991 6886</strong>
            </li>
            <li>
              Chủ tài khoản: <strong>CÔNG TY TNHH NGOAI NGU TRI THUC VIET</strong>
            </li>
            <li>
              Nội dung CK:{' '}
              <strong style={{ backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '5px', color: '#92400E' }}>
                {transferAddInfo}
              </strong>
            </li>
          </ul>
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              backgroundColor: BRAND.greenBadgeBg,
              borderLeft: `4px solid ${BRAND.greenBadge}`,
              borderRadius: '6px',
              fontSize: '12px',
              fontStyle: 'italic',
              color: '#065F46',
            }}
          >
            ✓ Mã VietQR bên cạnh đã điền sẵn số tiền &amp; nội dung chuyển khoản vào tài khoản công ty Anh ngữ Nhật Mỹ.
          </div>
          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <OfficialRedSeal
              title="THÔNG BÁO HỌC PHÍ"
              subtitle="PHÒNG TÀI CHÍNH"
              size={98}
            />
            <span style={{ fontSize: '12px', color: BRAND.muted, fontWeight: '600' }}>
              Xác nhận mức học phí &amp; ưu đãi chính thức của khóa mới.
            </span>
          </div>
        </div>

        <div style={{ width: '200px', textAlign: 'center', flexShrink: 0 }}>
          <div
            style={{
              border: `2px solid ${BRAND.blue}`,
              borderRadius: '12px',
              padding: '12px',
              backgroundColor: BRAND.white,
              boxShadow: '0 4px 10px rgba(13, 136, 196, 0.14)',
            }}
          >
            <div style={{ fontWeight: '800', color: BRAND.blueDark, marginBottom: '8px', fontSize: '12.5px' }}>
              QUÉT MÃ VIETQR
            </div>
            {finalPrice <= 0 ? (
              <div style={{ padding: '24px 8px', backgroundColor: BRAND.greenBadgeBg, borderRadius: '8px', color: BRAND.greenBadge, fontWeight: '800', fontSize: '13.5px' }}>
                0đ — Đã hoàn tất ưu đãi
              </div>
            ) : resolvedQrSrc ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={resolvedQrSrc}
                alt="QR Code"
                style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '6px' }}
                crossOrigin="anonymous"
              />
            ) : (
              <div style={{ padding: '36px 10px', color: BRAND.subtle, fontSize: '12.5px' }}>
                Đang tạo mã QR...
              </div>
            )}
            <div style={{ marginTop: '6px', fontSize: '11.5px', fontWeight: '800', color: BRAND.blue }}>
              NAPAS 24/7
            </div>
          </div>
        </div>
      </div>
    </BrandLetterShell>
  );
};

// ==========================================
// ẢNH 5: NHẬN XÉT ĐỊNH KỲ (PERIODIC REPORT)
// ==========================================
export const PeriodicReportTemplate = ({ student, result }) => {
  const displayClass = student?.classCode ? formatClassCode(student.classCode) : '';
  const blocks = [
    {
      title: '1. Speaking (Kỹ năng Nói)',
      vi: result?.speaking,
      en: result?.speaking_en,
      accent: BRAND.blue,
      bg: '#F8FBFF',
      titleColor: BRAND.blueDark,
    },
    {
      title: '2. Listening (Kỹ năng Nghe)',
      vi: result?.listening,
      en: result?.listening_en,
      accent: '#0284C7',
      bg: '#F0F9FF',
      titleColor: '#0369A1',
    },
    {
      title: '3. Reading & Writing (Đọc & Viết)',
      vi: result?.rw,
      en: result?.rw_en,
      accent: BRAND.goldDark,
      bg: BRAND.goldBg,
      titleColor: '#92400E',
    },
    {
      title: '4. Thái Độ & Định Hướng Phát Triển',
      vi: result?.dev,
      en: result?.dev_en,
      accent: BRAND.greenBadge,
      bg: '#F3FCF7',
      titleColor: '#065F46',
    },
  ];

  return (
    <BrandLetterShell
      id="review-preview-card"
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub="Periodic Progress Report"
      eyebrow="THEO DÕI TIẾN ĐỘ HỌC TẬP"
      title="NHẬN XÉT ĐỊNH KỲ"
      subtitleEn="Periodic Academic Progress &amp; Skill Feedback"
    >
      {/* Thẻ học viên */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '12px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '11px 18px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            HỌ VÀ TÊN HỌC VIÊN
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: BRAND.blueDark, textTransform: 'uppercase', marginTop: '1px' }}>
            {student?.name || 'HỌC VIÊN'}
          </div>
        </div>
        {student?.classCode && (
          <div
            style={{
              backgroundColor: BRAND.blueSoft,
              border: `1.5px solid ${BRAND.blueBorder}`,
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '12.5px',
              fontWeight: '800',
              color: BRAND.blueDark,
            }}
          >
            📚 Lớp: {displayClass || student.classCode}
          </div>
        )}
      </div>

      {/* 4 Khối kỹ năng */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {blocks.map((blk) => (
          <AccentSkillCard
            key={blk.title}
            title={blk.title}
            accent={blk.accent}
            bg={blk.bg}
            titleColor={blk.titleColor}
          >
            <ul style={{ margin: 0, paddingLeft: '18px', color: BRAND.slate, fontSize: '13px', fontWeight: '500' }}>
              {renderBulletComments(blk.vi)}
            </ul>
            {blk.en && (
              <ul
                style={{
                  margin: '6px 0 0 0',
                  paddingTop: '6px',
                  paddingLeft: '18px',
                  borderTop: `1px dashed ${BRAND.border}`,
                  color: BRAND.muted,
                  fontSize: '12.5px',
                  fontStyle: 'italic',
                }}
              >
                {renderBulletComments(blk.en)}
              </ul>
            )}
          </AccentSkillCard>
        ))}
      </div>

      <SealSignatureCard
        label="Xác nhận đánh giá định kỳ"
        signer="Giáo viên Chủ nhiệm — Hệ thống Anh ngữ Nhật Mỹ"
        sealTitle="ĐÃ ĐÁNH GIÁ"
        sealSubtitle="GIÁO VIÊN CHỦ NHIỆM"
      />
    </BrandLetterShell>
  );
};

// ==========================================
// ẢNH 6: NHẬN XÉT HỌC THỬ (TRIAL REPORT) - CHUẨN NHẬN DIỆN MỚI
// ==========================================
export const TrialReportTemplate = ({ student, result, sessions }) => {
  const displayClass = student?.classCode ? formatClassCode(student.classCode) : '';
  const sections = [
    {
      title: '1. Thái Độ & Khả Năng Hòa Nhập',
      content: result?.attitude,
      accent: BRAND.blue,
      bg: '#F8FBFF',
      titleColor: BRAND.blueDark,
    },
    {
      title: '2. Kỹ Năng Ngôn Ngữ (Nghe - Nói - Phản Xạ)',
      content: result?.skills,
      accent: BRAND.goldDark,
      bg: BRAND.goldBg,
      titleColor: '#92400E',
    },
    {
      title: '3. Tiềm Năng & Định Hướng Lộ Trình',
      content: result?.potential,
      accent: '#7C3AED',
      bg: '#FAF5FF',
      titleColor: '#5B21B6',
    },
    {
      title: '4. Lời Khuyên Dành Cho Quý Phụ Huynh',
      content: getRecommendationText(result),
      accent: BRAND.greenBadge,
      bg: '#F3FCF7',
      titleColor: '#065F46',
    },
  ];

  return (
    <BrandLetterShell
      id="trial-report-capture"
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub="Trial Class Evaluation"
      eyebrow={`BÁO CÁO SAU ${sessions || 2} BUỔI TRẢI NGHIỆM`}
      title="NHẬN XÉT HỌC THỬ"
      subtitleEn="Trial Class Progress &amp; Roadmap Evaluation"
    >
      {/* Thẻ thông tin học viên */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '12px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          padding: '11px 18px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div style={{ fontSize: '10.5px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            HỌ VÀ TÊN HỌC VIÊN
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: BRAND.blueDark, textTransform: 'uppercase', marginTop: '1px', lineHeight: 1.2 }}>
            {student?.name || 'HỌC VIÊN HỌC THỬ'}
          </div>
          {student?.classCode && (
            <div style={{ fontSize: '12.5px', fontWeight: '600', color: BRAND.muted, marginTop: '3px' }}>
              📚 Lớp trải nghiệm: <strong style={{ color: BRAND.ink }}>{displayClass || student.classCode}</strong>
            </div>
          )}
        </div>
        <div
          style={{
            backgroundColor: BRAND.goldBg,
            border: `2px solid ${BRAND.gold}`,
            borderRadius: '10px',
            padding: '7px 14px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase' }}>
            GIAI ĐOẠN
          </div>
          <div style={{ fontSize: '14.5px', fontWeight: '900', color: BRAND.blueDark, marginTop: '1px' }}>
            {sessions || 2} BUỔI HỌC THỬ
          </div>
        </div>
      </div>

      {/* 4 Khối nhận xét */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sections.map((sec) => (
          <AccentSkillCard
            key={sec.title}
            title={sec.title}
            accent={sec.accent}
            bg={sec.bg}
            titleColor={sec.titleColor}
          >
            <ul style={{ margin: 0, paddingLeft: '18px', color: BRAND.slate, fontSize: '13px', fontWeight: '500', lineHeight: 1.55 }}>
              {renderBulletComments(sec.content)}
            </ul>
          </AccentSkillCard>
        ))}
      </div>

      <SealSignatureCard
        label="Xác nhận nhận xét học thử"
        signer="Giáo viên Phụ trách — Hệ thống Anh ngữ Nhật Mỹ"
        sealTitle="ĐÃ ĐÁNH GIÁ"
        sealSubtitle="BAN CHUYÊN MÔN"
      />
    </BrandLetterShell>
  );
};
