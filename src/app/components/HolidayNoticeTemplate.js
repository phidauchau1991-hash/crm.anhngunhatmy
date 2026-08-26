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
        fontFamily: '"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        backgroundImage: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 40%, #ffffff 60%, #ffedd5 100%)',
        border: '14px double #f59e0b',
        textAlign: 'center',
        position: 'relative' // Critical for absolute corner elements!
      }}
    >
      <div style={{ position: 'absolute', top: '25px', left: '25px', fontSize: '36px', opacity: 0.8 }}>✨</div>
      <div style={{ position: 'absolute', top: '25px', right: '25px', fontSize: '36px', opacity: 0.8 }}>✨</div>
      <div style={{ position: 'absolute', bottom: '25px', left: '25px', fontSize: '36px', opacity: 0.8 }}>🎆</div>
      <div style={{ position: 'absolute', bottom: '25px', right: '25px', fontSize: '36px', opacity: 0.8 }}>🎆</div>

      <img
        src="/logo.png"
        alt="Logo"
        crossOrigin="anonymous"
        style={{ width: '180px', marginBottom: '15px' }}
      />
      
      <h1 style={{ 
        color: '#dc2626', 
        fontSize: '52px', 
        margin: '10px 0 5px 0', 
        textTransform: 'uppercase', 
        fontWeight: '900',
        textShadow: '2px 2px 0px #fca5a5'
      }}>
        THÔNG BÁO NGHỈ LỄ
      </h1>
      
      <h2 style={{ 
        color: '#1e3a8a', 
        fontSize: '38px', 
        margin: '5px 0 30px', 
        fontWeight: 'bold'
      }}>
        🎉 {holidayName || 'TÊN NGÀY LỄ'} 🎊
      </h2>
      
      <div style={{ 
        backgroundColor: '#ffffff', 
        padding: '35px', 
        borderRadius: '20px', 
        width: '100%', 
        boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)',
        border: '1px solid #fef3c7',
        boxSizing: 'border-box'
      }}>
        <p style={{ fontSize: '26px', margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span>📅</span>
          <span>
            <strong>Thời gian nghỉ:</strong> Từ <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{startDate}</span> đến hết <span style={{ color: '#dc2626', fontWeight: 'bold' }}>{endDate}</span>
          </span>
        </p>
        
        <div style={{ width: '60%', height: '2px', backgroundColor: '#f3f4f6', margin: '20px auto' }}></div>

        <p style={{ fontSize: '26px', margin: '15px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span>🚀</span>
          <span>
            <strong>Thời gian học lại:</strong> <span style={{ color: '#0d88c4', fontWeight: 'bold', fontSize: '28px' }}>{returnDate || '...'}</span>
          </span>
        </p>
      </div>

      <div style={{ width: '100px', height: '4px', backgroundColor: '#fcd34d', margin: '35px auto 25px', borderRadius: '2px' }}></div>

      <p style={{ 
        fontSize: '24px', 
        margin: '0', 
        fontStyle: 'italic', 
        color: '#475569', 
        lineHeight: '1.6',
        fontWeight: '500',
        padding: '0 20px'
      }}>
        {message || 'Kính chúc Quý phụ huynh và các em học sinh có một kỳ nghỉ lễ thật vui vẻ và hạnh phúc!'}
      </p>
    </div>
  );
});

HolidayNoticeTemplate.displayName = 'HolidayNoticeTemplate';

export default HolidayNoticeTemplate;
