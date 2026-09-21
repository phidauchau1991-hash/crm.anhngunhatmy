'use client';
import React, { forwardRef } from 'react';

const TrialInviteTemplate = forwardRef(({ data }, ref) => {
  const {
    inviteType,
    studentName,
    className,
    startDate,
    centerPrep,
    parentPrep
  } = data;

  const isAssessment = inviteType === 'ASSESSMENT';
  const headerSubtitle = isAssessment ? 'Thư Mời Tham Gia Đánh Giá Năng Lực' : 'Thư Mời Tham Gia Lớp Học Thử';
  const labelClass = isAssessment ? 'BÀI ĐÁNH GIÁ' : 'LỚP TRẢI NGHIỆM';
  const labelDate = isAssessment ? 'Ngày Đánh Giá' : 'Ngày Học';
  const labelTime = isAssessment ? 'Giờ Đánh Giá' : 'Giờ Học';
  const labelDuration = isAssessment ? 'Thời Gian Làm Bài' : 'Ngày Bắt Đầu - Kết Thúc';
  
  // Date rendering logic
  let durationText = '';
  if (isAssessment) {
    durationText = data.endDate || 'Đang cập nhật'; // User enters "45 phút" into endDate field
  } else {
    durationText = `${startDate} ${data.endDate ? `- ${data.endDate}` : ''}`;
  }

  // Colors: Subtle variation for Assessment (Navy blue instead of light blue)
  const accentColor = isAssessment ? '#1e40af' : '#0d88c4'; // #1e40af is a deeper blue
  const headerBgColor = '#FFCA29'; // Keep yellow for logo visibility
  const footerText = isAssessment ? 'Chúc con tự tin và đạt kết quả tốt nhất trong buổi đánh giá!' : 'Chào mừng con đến với Trung tâm Anh ngữ Nhật Mỹ!';

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        backgroundColor: 'white',
        color: '#1e293b',
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.6',
        fontSize: '15px',
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        textAlign: 'left',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        borderRadius: '16px',
        overflow: 'hidden'
      }}
    >
      {/* Header Band */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', backgroundColor: headerBgColor, color: accentColor }}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          style={{ width: '120px', height: 'auto', display: 'block' }} 
          crossOrigin="anonymous"
        />
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0, fontSize: '28px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>TICKET TO ENGLISH</h1>
          <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{headerSubtitle}</p>
        </div>
      </div>

      <div style={{ padding: '40px', position: 'relative', zIndex: 1, backgroundColor: '#f8fafc' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h2 style={{ color: accentColor, marginTop: 0, marginBottom: '20px', fontSize: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
            THÔNG TIN HỌC VIÊN
          </h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: '1 1 45%' }}>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Tên Học Viên</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>{studentName}</p>
            </div>
            
            <div style={{ flex: '1 1 45%' }}>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>{labelClass}</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>{className || 'Chưa xác định'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${accentColor}` }}>
            <div style={{ flex: '1 1 30%' }}>
              <p style={{ color: accentColor, fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>{labelDate}</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{data.studyDays || 'Đang cập nhật'}</p>
            </div>
            
            <div style={{ flex: '1 1 30%' }}>
              <p style={{ color: accentColor, fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>{labelTime}</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{data.studyHours || 'Đang cập nhật'}</p>
            </div>

            <div style={{ flex: '1 1 30%' }}>
              <p style={{ color: accentColor, fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>{labelDuration}</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{durationText}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: accentColor, color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Trung tâm chuẩn bị</h3>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{centerPrep}</p>
          </div>

          <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#10b981', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Ba mẹ & bé chuẩn bị</h3>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{parentPrep}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 40px', backgroundColor: 'white', textAlign: 'center', borderTop: '1px dashed #cbd5e1', color: '#64748b' }}>
        <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{footerText}</p>
        <p style={{ margin: 0, fontWeight: 'bold', color: accentColor }}>Hotline: 0911 767 069</p>
      </div>
    </div>
  );
});

export default TrialInviteTemplate;
