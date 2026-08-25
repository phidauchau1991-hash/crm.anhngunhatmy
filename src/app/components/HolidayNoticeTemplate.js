import React, { forwardRef } from 'react';

const HolidayNoticeTemplate = forwardRef(({ data }, ref) => {
  const { holidayName, startDate, endDate, returnDate, message } = data;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
        width: '800px',
        height: '800px',
        backgroundColor: '#f8f9fa',
        color: '#333',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        boxSizing: 'border-box',
        border: '10px solid #0d88c4',
        borderRadius: '20px',
        backgroundImage: 'linear-gradient(to bottom, #ffffff, #e0f2fe)',
        textAlign: 'center'
      }}
    >
      <img
        src="/logo.png"
        alt="Logo"
        crossOrigin="anonymous"
        style={{ width: '200px', marginBottom: '20px' }}
      />
      <h1 style={{ color: '#dc2626', fontSize: '48px', margin: '10px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>
        THÔNG BÁO NGHỈ LỄ
      </h1>
      <h2 style={{ color: '#0d88c4', fontSize: '36px', margin: '10px 0 30px', fontWeight: 'bold' }}>
        {holidayName || 'TÊN NGÀY LỄ'}
      </h2>
      
      <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '15px', width: '100%', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        <p style={{ fontSize: '24px', margin: '10px 0' }}>
          <strong>Thời gian nghỉ:</strong> Từ ngày <span style={{ color: '#dc2626' }}>{startDate}</span> đến hết ngày <span style={{ color: '#dc2626' }}>{endDate}</span>
        </p>
        <p style={{ fontSize: '24px', margin: '10px 0' }}>
          <strong>Thời gian học lại:</strong> <span style={{ color: '#0d88c4' }}>{returnDate || '...'}</span>
        </p>
      </div>

      <p style={{ fontSize: '22px', margin: '40px 0 0', fontStyle: 'italic', color: '#555', lineHeight: '1.5' }}>
        {message || 'Kính chúc Quý phụ huynh và các em học sinh có một kỳ nghỉ lễ thật vui vẻ và hạnh phúc!'}
      </p>
    </div>
  );
});

HolidayNoticeTemplate.displayName = 'HolidayNoticeTemplate';

export default HolidayNoticeTemplate;
