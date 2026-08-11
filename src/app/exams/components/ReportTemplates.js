'use client';
import React, { useRef } from 'react';
import * as htmlToImage from 'html-to-image';

// Thư viện hỗ trợ lưu file ảnh
const downloadImage = (dataUrl, filename) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
};

const styles = {
  container: {
    width: '794px', // A4 width at 96 DPI
    backgroundColor: '#ffffff',
    fontFamily: '"Outfit", sans-serif',
    color: '#333333',
    padding: '40px',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    textAlign: 'left'
  },
  headerBlue: {
    backgroundColor: '#0D88C4',
    color: 'white',
    padding: '10px 15px',
    fontWeight: 'bold',
    fontSize: '18px',
    textTransform: 'uppercase'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px'
  },
  td: {
    border: '1px solid #cbd5e1',
    padding: '10px',
    fontSize: '16px'
  },
  th: {
    border: '1px solid #cbd5e1',
    padding: '10px',
    fontSize: '16px',
    backgroundColor: '#f8fafc',
    fontWeight: 'bold'
  },
  commentBox: {
    border: '2px solid #0D88C4',
    borderRadius: '12px',
    padding: '22px 20px 18px 20px',
    marginBottom: '28px',
    position: 'relative',
    marginTop: '20px',
    textAlign: 'left'
  },
  commentTitle: {
    position: 'absolute',
    top: '-18px',
    left: '20px',
    backgroundColor: '#0D88C4',
    color: 'white',
    padding: '5px 15px',
    borderRadius: '8px',
    fontWeight: 'bold',
    fontSize: '18px'
  },
  logoPlaceholder: {
    width: '120px',
    height: '120px',
    margin: '0 auto 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoImage: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain'
  }
};

export const formatClassCodeForParent = (code) => {
  if (!code) return '';
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

// ==========================================
// ẢNH 2: BẢNG ĐIỂM KẾT QUẢ CUỐI KHÓA
// ==========================================
export const ScoreReportTemplate = ({ student, config, result }) => {
  if (!student || !config || !result) return null;

  const attendanceScore = parseFloat(result.attendanceScore) || 0;
  const hwScore = parseFloat(result.hwScore) || 0;
  const activityScore = parseFloat(result.activityScore) || 0;
  const pronunciationScore = parseFloat(result.pronunciationScore) || 0;
  const communicationScore = parseFloat(result.communicationScore) || 0;
  
  const processTotal = (attendanceScore + hwScore + activityScore + pronunciationScore + communicationScore) / 5;
  const processContribution = processTotal * ((config.processWeight || 10) / 100);

  const speakingScore = parseFloat(result.speakingScore) || 0;
  const listeningScore = parseFloat(result.listeningScore) || 0;
  const rwScore = parseFloat(result.rwScore) || 0;

  const speakingMax = config.speakingMax > 0 ? config.speakingMax : 40;
  const listeningMax = config.listeningMax > 0 ? config.listeningMax : 26;
  const rwMax = config.rwMax > 0 ? config.rwMax : 36;

  const speakingPercent = (speakingScore / speakingMax) * (config.speakingWeight || 30);
  const listeningPercent = (listeningScore / listeningMax) * (config.listeningWeight || 20);
  const rwPercent = (rwScore / rwMax) * (config.rwWeight || 40);

  const examContribution = speakingPercent + listeningPercent + rwPercent;
  const totalScore = processContribution + examContribution;

  let grade = 'D';
  if (totalScore >= 98) grade = 'A+';
  else if (totalScore >= 95) grade = 'A';
  else if (totalScore >= 90) grade = 'B+';
  else if (totalScore >= 80) grade = 'B';
  else if (totalScore >= 75) grade = 'C+';
  else if (totalScore >= 65) grade = 'C';

  const displayClassCode = formatClassCodeForParent(result.classCode || student.classCode || "Chưa có");
  const displayDate = result.examDate ? new Date(result.examDate).toLocaleDateString('vi-VN') : new Date().toLocaleDateString('vi-VN');
  
  const teacherNickname = extractTeacherNickname(result.classCode) || 'Giáo viên phụ trách';
  const teacherFullName = result.class?.teacherName || '';

  return (
    <div style={styles.container} id={`score-report-${student.id}`}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={styles.logoPlaceholder}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={styles.logoImage} />
        </div>
        <h1 style={{ color: '#0D88C4', fontSize: '28px', margin: '0 0 5px 0' }}>BÁO CÁO KẾT QUẢ HỌC TẬP {config.examType.toUpperCase()}</h1>
        <p style={{ color: '#64748b', fontSize: '18px', margin: 0 }}>(COURSE REPORT)</p>
      </div>

      {/* Info Table */}
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={{ ...styles.td, width: '60%' }}><b>Tên Học viên:</b> <span style={{ color: '#0D88C4', fontWeight: 'bold', textTransform: 'uppercase' }}>{student.name}</span></td>
            <td style={{ ...styles.td, width: '40%' }}><b>Lớp:</b> <span style={{ color: '#0D88C4', fontWeight: 'bold' }}>{displayClassCode}</span></td>
          </tr>
          <tr>
            <td style={{ ...styles.td }}><b>Giáo viên:</b> <span style={{ color: '#0D88C4', fontWeight: 'bold' }}>{teacherNickname}</span></td>
            <td style={{ ...styles.td }}><b>Ngày thi:</b> <span style={{ color: '#0D88C4', fontWeight: 'bold' }}>{displayDate}</span></td>
          </tr>
        </tbody>
      </table>

      {/* Process Score */}
      <div style={styles.headerBlue}>1. ĐÁNH GIÁ CỦA GIÁO VIÊN TRONG QUÁ TRÌNH HỌC ({config.processWeight}%)</div>
      <table style={styles.table}>
        <tbody>
          <tr>
            <td rowSpan="5" style={{ ...styles.td, width: '30%', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f8fafc' }}>
              Chuyên cần<br/>
              <span style={{ fontSize: '14px', fontWeight: 'normal' }}>(Class participation)</span>
            </td>
            <td style={{ ...styles.td, width: '30%' }}>Điểm danh</td>
            <td style={{ ...styles.td, width: '20%', textAlign: 'center', color: '#0D88C4' }}>{result.attendanceScore}/10</td>
            <td rowSpan="5" style={{ ...styles.td, width: '20%', textAlign: 'center', fontWeight: 'bold', verticalAlign: 'middle' }}>
              Điểm TB chuyên cần<br/><br/>
              <span style={{ color: '#ef4444', fontSize: '24px' }}>{processTotal.toFixed(1)}%</span>
            </td>
          </tr>
          <tr>
            <td style={styles.td}>Bài tập về nhà</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4' }}>{result.hwScore}/10</td>
          </tr>
          <tr>
            <td style={styles.td}>Hoạt động</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4' }}>{result.activityScore}/10</td>
          </tr>
          <tr>
            <td style={styles.td}>Phát âm</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4' }}>{result.pronunciationScore}/10</td>
          </tr>
          <tr>
            <td style={styles.td}>Giao tiếp</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4' }}>{result.communicationScore}/10</td>
          </tr>
        </tbody>
      </table>

      {/* Exam Score */}
      <div style={styles.headerBlue}>2. KẾT QUẢ BÀI THI ({config.examWeight}%)</div>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, width: '50%' }}>Kỹ năng</th>
            <th style={{ ...styles.th, width: '25%', textAlign: 'center' }}>Điểm thi<br/><span style={{ fontSize: '12px', fontWeight: 'normal' }}>(Test score)</span></th>
            <th style={{ ...styles.th, width: '25%', textAlign: 'center' }}>Kết quả<br/><span style={{ fontSize: '12px', fontWeight: 'normal' }}>(Result in Percentage)</span></th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>Nói (Speaking): {config.speakingWeight}%</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4' }}>{result.speakingScore}/{config.speakingMax}</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{speakingPercent.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style={styles.td}>Nghe (Listening): {config.listeningWeight}%</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4' }}>{result.listeningScore}/{config.listeningMax}</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{listeningPercent.toFixed(2)}%</td>
          </tr>
          <tr>
            <td style={styles.td}>Đọc & Viết (Reading & Writing): {config.rwWeight}%</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4' }}>{result.rwScore}/{config.rwMax}</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>{rwPercent.toFixed(2)}%</td>
          </tr>
        </tbody>
      </table>

      {/* Final Score */}
      <div style={styles.headerBlue}>3. KẾT QUẢ CUỐI KHÓA</div>
      <table style={{ ...styles.table, marginBottom: 0 }}>
        <tbody>
          <tr>
            <td colSpan="2" style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>Tổng cộng: 100%</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#ef4444', fontWeight: 'bold', fontSize: '24px' }}>{totalScore.toFixed(2)}</td>
          </tr>
          <tr>
            <td colSpan="2" style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>Xếp loại:</td>
            <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', fontSize: '24px' }}>{grade}</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, backgroundColor: '#FFCA29', fontSize: '14px', width: '33%' }}>
              <u>Ghi chú:</u><br/>
              A+: 98 - 100 (Xuất sắc)<br/>
              A: 95 - 97 (Rất giỏi)<br/>
              B+: 90 - 94 (Giỏi)
            </td>
            <td colSpan="2" style={{ ...styles.td, backgroundColor: '#FFCA29', fontSize: '14px' }}>
              <br/>
              B: 80 - 89 (Khá)<br/>
              C+: 75 - 79 (Trung bình khá)<br/>
              C: 65 - 74 (Cần cố gắng hơn)<br/>
              D: &lt; 65 (Không đạt)
            </td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 'bold' }}>Nhận xét chung</td>
            <td colSpan="2" style={{ ...styles.td, fontStyle: 'italic', color: '#64748b' }}>
              (Quý Phụ huynh vui lòng xem ảnh nhận xét được đính kèm)
            </td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 'bold' }}>Chữ ký GVCN</td>
            <td colSpan="2" style={{ ...styles.td, textAlign: 'center' }}>
              <b>{teacherFullName}</b>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// ==========================================
// ẢNH 1: NHẬN XÉT AI
// ==========================================
export const CommentsReportTemplate = ({ student, result }) => {
  
  const parseComment = (text) => {
    if (!text) return <li style={{ textAlign: 'left', listStyleType: 'disc' }}>Không có dữ liệu</li>;
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*') || line.startsWith('•'))
      .map((line, idx) => {
        const cleanText = line.replace(/^[-*•]\s*/, '').trim();
        return (
          <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.6', textAlign: 'left', listStyleType: 'disc', listStylePosition: 'outside' }}>
            {cleanText}
          </li>
        );
      });
  };

  return (
    <div style={styles.container} id={`comment-report-${student.id}`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ ...styles.logoPlaceholder, width: '80px', height: '80px', margin: '0 20px 0 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={styles.logoImage} />
        </div>
        <div>
          <h1 style={{ color: '#0D88C4', fontSize: '32px', margin: '0 0 5px 0', textTransform: 'uppercase' }}>{student.name}</h1>
          <h2 style={{ color: '#0D88C4', fontSize: '20px', margin: 0, fontWeight: 'normal' }}>NHẬN XÉT CỦA GIÁO VIÊN</h2>
        </div>
      </div>
      <hr style={{ borderTop: '2px solid #0D88C4', marginBottom: '40px' }} />

      {/* Speaking */}
      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Speaking (Nói)</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.commentSpeaking)}
        </ul>
      </div>

      {/* Listening */}
      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Listening (Nghe)</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.commentListening)}
        </ul>
      </div>

      {/* R&W */}
      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Reading & Writing (Đọc & Viết)</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.commentRW)}
        </ul>
      </div>

      {/* Dev */}
      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Định hướng phát triển</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.commentDev)}
        </ul>
      </div>
    </div>
  );
};

// Component Wrapper để chứa các hàm xuất ảnh
export const ExportImageWrapper = ({ children, targetId, filename }) => {
  const [isExporting, setIsExporting] = React.useState(false);

  const handleExport = async () => {
    const element = document.getElementById(targetId);
    if (!element) return;
    
    setIsExporting(true);
    try {
      // Ẩn nội dung để render ngầm nét hơn nếu cần, nhưng dùng dom-to-image thì cứ render thẳng
      const dataUrl = await htmlToImage.toPng(element, { 
        quality: 1, 
        pixelRatio: 2, // Tạo ảnh nét gấp đôi để gửi Zalo không mờ
        backgroundColor: '#ffffff' 
      });
      downloadImage(dataUrl, filename);
    } catch (error) {
      console.error('Lỗi xuất ảnh:', error);
      alert('Không thể xuất ảnh, vui lòng thử lại');
    } finally {
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
          gap: '8px'
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
export const ExamNoticeTemplate = ({ className, examDates, notes }) => {
  const displayClassCode = formatClassCodeForParent(className || "");
  return (
    <div style={styles.container} id="exam-notice-report">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ ...styles.logoPlaceholder, width: '100px', height: '100px', margin: '0 20px 0 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={styles.logoImage} />
        </div>
        <div>
          <h1 style={{ color: '#0D88C4', fontSize: '32px', margin: '0 0 5px 0', textTransform: 'uppercase' }}>THƯ THÔNG BÁO</h1>
          <h2 style={{ color: '#64748b', fontSize: '20px', margin: 0, fontWeight: 'normal' }}>V/v: Đánh giá cuối khóa học lớp {displayClassCode}</h2>
        </div>
      </div>
      <hr style={{ borderTop: '2px solid #0D88C4', marginBottom: '30px' }} />

      <p style={{ fontSize: '18px', lineHeight: '1.6' }}>Kính gửi Quý Phụ huynh,</p>
      <p style={{ fontSize: '18px', lineHeight: '1.6' }}>
        Trung tâm Anh ngữ Nhật Mỹ xin chân thành cảm ơn sự đồng hành của Quý Phụ huynh và sự cố gắng của các con trong suốt khóa học vừa qua.
        Khóa học của lớp <b>{displayClassCode}</b> sắp kết thúc, Trung tâm xin thông báo lịch kiểm tra cuối khóa để đánh giá năng lực của các con như sau:
      </p>

      <table style={{ ...styles.table, marginTop: '20px', marginBottom: '30px' }}>
        <thead>
          <tr>
            <th style={{ ...styles.th, backgroundColor: '#0D88C4', color: 'white', width: '30%', textAlign: 'center' }}>KỸ NĂNG</th>
            <th style={{ ...styles.th, backgroundColor: '#0D88C4', color: 'white', textAlign: 'center' }}>THỜI GIAN KIỂM TRA</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...styles.td, fontWeight: 'bold', textAlign: 'center' }}>Speaking (Nói)</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4', fontWeight: 'bold', fontSize: '18px' }}>{examDates?.speaking}</td>
          </tr>
          <tr>
            <td style={{ ...styles.td, fontWeight: 'bold', textAlign: 'center' }}>Reading & Writing<br/>(Đọc & Viết)</td>
            <td style={{ ...styles.td, textAlign: 'center', color: '#0D88C4', fontWeight: 'bold', fontSize: '18px' }}>{examDates?.rw}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ backgroundColor: '#fef3c7', padding: '20px', borderRadius: '12px', borderLeft: '5px solid #FFCA29' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#d97706' }}><i className="fa-solid fa-bell"></i> Dặn dò từ Giáo viên:</h3>
        <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{notes}</p>
      </div>

      <p style={{ fontSize: '18px', lineHeight: '1.6', marginTop: '30px', textAlign: 'center' }}>
        Trân trọng,<br/>
        <b>Trung tâm Anh ngữ Nhật Mỹ</b>
      </p>
    </div>
  );
};

// ==========================================
// ẢNH 4: THƯ THÔNG BÁO KHÓA MỚI & QR THANH TOÁN
// ==========================================
export const PromotionNoticeTemplate = ({ className, newCourse, startDate, endDate, discount, isGiftBook, studentName, isPersonalized }) => {
  const displayClassCode = formatClassCodeForParent(className || "");
  const targetName = studentName ? studentName.toUpperCase() : `LỚP ${displayClassCode}`;
  const bankMemoName = studentName 
    ? studentName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toUpperCase() 
    : "[Ten be]";

  // Compute end date if not provided
  const computedEndDate = endDate || (() => {
    if (!startDate) return "";
    const parts = startDate.split('/');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      const weeks = Math.ceil((newCourse?.totalSessions || 24) / 2);
      d.setDate(d.getDate() + (weeks * 7));
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }
    return "";
  })();

  const basePrice = newCourse?.price || 0;
  const bookPrice = (isPersonalized && isGiftBook) ? 0 : (newCourse?.bookPrice || 0);
  const discountVal = (isPersonalized && discount > 0) ? parseInt(discount) : 0;
  const finalPrice = Math.max(0, basePrice + bookPrice - discountVal);

  return (
    <div style={styles.container} id="promotion-notice-report">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ ...styles.logoPlaceholder, width: '100px', height: '100px', margin: '0 20px 0 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={styles.logoImage} />
        </div>
        <div>
          <h1 style={{ color: '#0D88C4', fontSize: '32px', margin: '0 0 5px 0', textTransform: 'uppercase' }}>THÔNG TIN KHÓA HỌC MỚI</h1>
          <h2 style={{ color: '#64748b', fontSize: '20px', margin: 0, fontWeight: 'normal' }}>Dành cho học viên: <b>{targetName}</b></h2>
        </div>
      </div>
      <hr style={{ borderTop: '2px solid #0D88C4', marginBottom: '30px' }} />

      <p style={{ fontSize: '18px', lineHeight: '1.6', marginBottom: '20px' }}>
        Chúc mừng {studentName ? `học viên ${studentName}` : 'các con'} đã hoàn thành xuất sắc khóa học của lớp <b>{displayClassCode}</b>! Để tiếp tục lộ trình học tập hiệu quả, Trung tâm xin gửi đến Quý Phụ huynh thông tin khóa học tiếp theo:
      </p>

      <table style={{ ...styles.table, marginBottom: '30px' }}>
        <tbody>
          {/* Row 1: Cấp độ mới */}
          <tr>
            <td style={{ ...styles.td, width: '22%', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>Cấp độ mới</td>
            <td colSpan={3} style={{ ...styles.td, color: '#0D88C4', fontWeight: 'bold', fontSize: '20px' }}>{newCourse?.level} - {newCourse?.capDo}</td>
          </tr>
          {/* Row 2: Ngày khai giảng & Dự kiến kết thúc */}
          <tr>
            <td style={{ ...styles.td, width: '22%', backgroundColor: '#f8fafc', fontWeight: 'bold' }}>Ngày khai giảng</td>
            <td style={{ ...styles.td, width: '18%', fontWeight: 'bold', fontSize: '18px', color: '#0D88C4' }}>{startDate}</td>
            <td style={{ ...styles.td, width: '35%', backgroundColor: '#f8fafc', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Dự kiến kết thúc</td>
            <td style={{ ...styles.td, width: '25%', fontWeight: 'bold', fontSize: '18px', color: '#0369a1' }}>{computedEndDate}</td>
          </tr>
          {/* Row 3: Thời lượng khóa học */}
          <tr>
            <td style={{ ...styles.td, backgroundColor: '#f8fafc', fontWeight: 'bold' }}>Thời lượng</td>
            <td colSpan={3} style={{ ...styles.td, fontWeight: 'bold' }}>{newCourse?.totalSessions} buổi</td>
          </tr>
          {/* Row 4: Giáo trình & Giá giáo trình */}
          <tr>
            <td style={{ ...styles.td, backgroundColor: '#f8fafc', fontWeight: 'bold' }}>Giáo trình</td>
            <td style={{ ...styles.td, fontWeight: '500' }}>{newCourse?.bookName || 'Theo chuẩn quốc tế'}</td>
            <td style={{ ...styles.td, backgroundColor: '#f8fafc', fontWeight: 'bold' }}>Giá giáo trình</td>
            <td style={{ ...styles.td, fontWeight: 'bold' }}>
              {isPersonalized && isGiftBook ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ textDecoration: 'line-through', color: '#94a3b8', fontWeight: 'normal', fontSize: '15px' }}>
                    {(newCourse?.bookPrice || 0).toLocaleString('vi-VN')}đ
                  </div>
                  <div style={{ color: '#10b981', fontWeight: 'bold', fontSize: '17px', marginTop: '2px' }}>
                    Tặng giáo trình
                  </div>
                </div>
              ) : (
                <span>{(newCourse?.bookPrice || 0).toLocaleString('vi-VN')}đ</span>
              )}
            </td>
          </tr>
          {/* Row 5: Học phí gốc & Ưu đãi học phí */}
          {isPersonalized && discountVal > 0 ? (
            <tr>
              <td style={{ ...styles.td, backgroundColor: '#f8fafc', fontWeight: 'bold' }}>Học phí gốc</td>
              <td style={{ ...styles.td, textDecoration: 'line-through', color: '#94a3b8' }}>{basePrice.toLocaleString('vi-VN')}đ</td>
              <td style={{ ...styles.td, backgroundColor: '#fef2f2', fontWeight: 'bold', color: '#ef4444' }}>
                <div>Ưu đãi dành cho</div>
                <div style={{ color: '#0D88C4', fontSize: '17px', marginTop: '2px', fontWeight: 'bold' }}>
                  {studentName ? studentName.trim().split(/\s+/).slice(-2).join(' ') : 'Học viên'}
                </div>
              </td>
              <td style={{ ...styles.td, backgroundColor: '#fef2f2', color: '#ef4444', fontWeight: 'bold', fontSize: '18px' }}>- {discountVal.toLocaleString('vi-VN')}đ</td>
            </tr>
          ) : (
            <tr>
              <td style={{ ...styles.td, backgroundColor: '#f8fafc', fontWeight: 'bold' }}>Học phí gốc</td>
              <td colSpan={3} style={{ ...styles.td, fontWeight: 'bold' }}>{basePrice.toLocaleString('vi-VN')}đ</td>
            </tr>
          )}
          {/* Row 6: TỔNG CỘNG */}
          <tr>
            <td style={{ ...styles.td, backgroundColor: '#FFCA29', fontWeight: 'bold', fontSize: '18px', color: '#92400e' }}>TỔNG CỘNG</td>
            <td colSpan={3} style={{ ...styles.td, backgroundColor: '#FFCA29', color: '#b45309', fontWeight: 'bold', fontSize: '24px' }}>{finalPrice.toLocaleString('vi-VN')}đ</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'center', backgroundColor: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>Hướng dẫn thanh toán</h3>
          <p style={{ margin: '0 0 10px 0', fontSize: '16px', lineHeight: '1.6' }}>
            Phụ huynh vui lòng quét mã QR bên cạnh hoặc chuyển khoản theo thông tin:
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '16px', lineHeight: '1.6' }}>
            <li><b>Ngân hàng:</b> MB Bank (Ngân hàng Quân Đội)</li>
            <li><b>Số tài khoản:</b> 6119916886</li>
            <li><b>Chủ tài khoản:</b> CTY TNHH NGOAI NGU TRI THUC VIET</li>
            <li><b>Nội dung:</b> {bankMemoName} dong hoc phi lop {newCourse?.level}</li>
          </ul>
        </div>
        <div style={{ width: '130px', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/qr.png" alt="QR Code" style={{ width: '120px', height: '120px', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <div style={{ fontSize: '12px', color: '#0369a1', marginTop: '5px', fontWeight: 'bold' }}>Quét mã thanh toán</div>
        </div>
      </div>

      <p style={{ fontSize: '18px', lineHeight: '1.6', marginTop: '30px', textAlign: 'center' }}>
        Trân trọng,<br/>
        <b>Trung tâm Anh ngữ Nhật Mỹ</b>
      </p>
    </div>
  );
};

// ==========================================
// ẢNH 5: NHẬN XÉT ĐỊNH KỲ (PERIODIC REPORT)
// ==========================================
export const PeriodicReportTemplate = ({ student, result }) => {
  const parseComment = (text) => {
    if (!text) return <li style={{ textAlign: 'left', listStyleType: 'disc' }}>Không có dữ liệu</li>;
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*') || line.startsWith('•'))
      .map((line, idx) => {
        const cleanText = line.replace(/^[-*•]\s*/, '').trim();
        return (
          <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.6', textAlign: 'left', listStyleType: 'disc', listStylePosition: 'outside' }}>
            {cleanText}
          </li>
        );
      });
  };

  return (
    <div style={styles.container} id="review-preview-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ ...styles.logoPlaceholder, width: '80px', height: '80px', margin: '0 20px 0 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={styles.logoImage} />
        </div>
        <div>
          <h1 style={{ color: '#0D88C4', fontSize: '32px', margin: '0 0 5px 0', textTransform: 'uppercase' }}>{student.name}</h1>
          <h2 style={{ color: '#0D88C4', fontSize: '20px', margin: 0, fontWeight: 'normal' }}>NHẬN XÉT ĐỊNH KỲ</h2>
        </div>
      </div>
      <hr style={{ borderTop: '2px solid #0D88C4', marginBottom: '40px' }} />

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Speaking (Nói)</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.speaking)}
          {result.speaking_en && parseComment(result.speaking_en)}
        </ul>
      </div>

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Listening (Nghe)</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.listening)}
          {result.listening_en && parseComment(result.listening_en)}
        </ul>
      </div>

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Reading & Writing (Đọc & Viết)</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.rw)}
          {result.rw_en && parseComment(result.rw_en)}
        </ul>
      </div>

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Thái độ & Định hướng</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.dev)}
          {result.dev_en && parseComment(result.dev_en)}
        </ul>
      </div>
    </div>
  );
};

// ==========================================
// ẢNH 6: NHẬN XÉT HỌC THỬ (TRIAL REPORT)
// ==========================================
export const TrialReportTemplate = ({ student, result, sessions }) => {
  const parseComment = (text) => {
    if (!text) return <li style={{ textAlign: 'left', listStyleType: 'disc' }}>Không có dữ liệu</li>;
    return text.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('-') || line.startsWith('*') || line.startsWith('•'))
      .map((line, idx) => {
        const cleanText = line.replace(/^[-*•]\s*/, '').trim();
        return (
          <li key={idx} style={{ marginBottom: '8px', lineHeight: '1.6', textAlign: 'left', listStyleType: 'disc', listStylePosition: 'outside' }}>
            {cleanText}
          </li>
        );
      });
  };

  return (
    <div style={styles.container} id="review-preview-card">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ ...styles.logoPlaceholder, width: '80px', height: '80px', margin: '0 20px 0 0' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Logo" style={styles.logoImage} />
        </div>
        <div>
          <h1 style={{ color: '#0D88C4', fontSize: '32px', margin: '0 0 5px 0', textTransform: 'uppercase' }}>{student.name}</h1>
          <h2 style={{ color: '#0D88C4', fontSize: '20px', margin: 0, fontWeight: 'normal' }}>NHẬN XÉT HỌC THỬ ({sessions} BUỔI)</h2>
        </div>
      </div>
      <hr style={{ borderTop: '2px solid #0D88C4', marginBottom: '40px' }} />

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Thái độ & Hòa nhập</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.attitude)}
        </ul>
      </div>

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Kỹ năng Ngôn ngữ</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.skills)}
        </ul>
      </div>

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Tiềm năng & Định hướng</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.potential)}
        </ul>
      </div>

      <div style={styles.commentBox}>
        <div style={styles.commentTitle}>Lời khuyên cho Phụ huynh</div>
        <ul style={{ margin: 0, paddingLeft: '24px', textAlign: 'left', listStylePosition: 'outside' }}>
          {parseComment(result.recommendation)}
        </ul>
      </div>
    </div>
  );
};
