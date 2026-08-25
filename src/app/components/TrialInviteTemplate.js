'use client';
import React, { forwardRef } from 'react';

const TrialInviteTemplate = forwardRef(({ data }, ref) => {
  const {
    studentName,
    className,
    timeString,
    startDate,
    centerPrep,
    parentPrep
  } = data;

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', backgroundColor: '#0d88c4', color: 'white' }}>
        <img 
          src="/logo.png" 
          alt="Logo" 
          style={{ width: '120px', height: 'auto', background: 'white', padding: '5px', borderRadius: '8px' }} 
          crossOrigin="anonymous"
        />
        <div style={{ textAlign: 'right' }}>
          <h1 style={{ margin: 0, fontSize: '28px', textTransform: 'uppercase', letterSpacing: '1px' }}>TICKET TO ENGLISH</h1>
          <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>Thư Mời Tham Gia Lớp Học Thử</p>
        </div>
      </div>

      <div style={{ padding: '40px', position: 'relative', zIndex: 1, backgroundColor: '#f8fafc' }}>
        <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h2 style={{ color: '#0d88c4', marginTop: 0, marginBottom: '20px', fontSize: '24px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' }}>
            THÔNG TIN HỌC VIÊN
          </h2>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: '1 1 45%' }}>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Tên Học Viên</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>{studentName}</p>
            </div>
            
            <div style={{ flex: '1 1 45%' }}>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Lớp Trải Nghiệm</p>
              <p style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, color: '#0f172a' }}>{className || 'Chưa xác định'}</p>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', backgroundColor: '#f0f9ff', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #0d88c4' }}>
            <div style={{ flex: '1 1 45%' }}>
              <p style={{ color: '#0d88c4', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>Thời Gian Học</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{timeString || 'Đang cập nhật'}</p>
            </div>
            
            <div style={{ flex: '1 1 45%' }}>
              <p style={{ color: '#0d88c4', fontSize: '14px', marginBottom: '4px', fontWeight: 'bold' }}>Ngày Bắt Đầu</p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>{startDate}</p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#0d88c4', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>1</div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Trung tâm chuẩn bị</h3>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>{centerPrep}</p>
          </div>

          <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{ backgroundColor: '#10b981', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>2</div>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#0f172a' }}>Ba mẹ & bé chuẩn bị</h3>
            </div>
            <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>{parentPrep}</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 40px', backgroundColor: 'white', textAlign: 'center', borderTop: '1px dashed #cbd5e1', color: '#64748b' }}>
        <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Chào mừng con đến với Trung tâm Anh ngữ Nhật Mỹ!</p>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#0d88c4' }}>Hotline: 0911 767 069</p>
      </div>
    </div>
  );
});

export default TrialInviteTemplate;
