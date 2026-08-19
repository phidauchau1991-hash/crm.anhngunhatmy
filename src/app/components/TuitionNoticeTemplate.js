'use client';
import React, { forwardRef } from 'react';

const TuitionNoticeTemplate = forwardRef(({ data }, ref) => {
  const {
    studentName,
    shortName,
    className,
    classCode,
    teacherName,
    totalWeeks,
    totalFee,
    missedWeeks,
    missedFee,
    remainingWeeks,
    remainingFee,
    bookFee,
    adjustmentAmount,
    adjustmentReason,
    gifts,
    dueDate,
    finalAmount,
    transferContent,
    qrUrl
  } = data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        padding: '40px',
        backgroundColor: 'white',
        color: 'black',
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.6',
        fontSize: '15px',
        position: 'absolute',
        top: '-9999px', // Ẩn khỏi màn hình
        left: '-9999px'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px' }}>
        <div style={{ flex: '0 0 150px' }}>
          <img 
            src="/logo.png" 
            alt="Logo" 
            style={{ width: '100px', height: 'auto' }} 
            crossOrigin="anonymous"
          />
        </div>
        <div style={{ flex: 1, textAlign: 'center', paddingRight: '150px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase', color: '#1a365d' }}>THƯ BÁO</h1>
          <p style={{ margin: 0, fontStyle: 'italic', fontSize: '18px' }}>V/v đóng học phí</p>
        </div>
      </div>

      {/* Info */}
      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '20px' }}>
        <li><strong>Kính gửi:</strong> Phụ huynh em <strong>{studentName?.toUpperCase()}</strong></li>
        <li><strong>Lớp:</strong> {className}</li>
        <li><strong>GVCN:</strong> {teacherName}</li>
      </ul>

      {/* Intro */}
      <p style={{ textAlign: 'justify', marginBottom: '20px' }}>
        Anh ngữ Nhật Mỹ xin gửi lời chào, lời biết ơn đến ba mẹ/đại diện Học viên đã tin tưởng và đồng hành cùng Trung tâm trong thời gian vừa qua để giúp các con yêu thích & học tốt tiếng Anh hơn mỗi ngày!
        Sau thời gian học thử cùng những nhận xét rất chi tiết của Giáo viên, nay Trung tâm xin gửi đến ba mẹ thông tin học phí khóa <strong>{classCode}</strong> như sau:
      </p>

      {/* Fee details */}
      <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '10px' }}>
        <li>Số tuần học toàn Khóa {classCode}: <strong>{totalWeeks} tuần</strong> ~ HP: <strong>{formatCurrency(totalFee)}</strong></li>
        <li>Số tuần <strong>{shortName}</strong> không tham gia: <strong>{missedWeeks} tuần</strong> ~ HP: <strong>{formatCurrency(missedFee)}</strong></li>
        <li>Số tuần còn lại mà <strong>{shortName}</strong> tham gia: <strong>{remainingWeeks} tuần</strong> ~ HP: <strong style={{ color: 'red' }}>{formatCurrency(remainingFee)}</strong></li>
        <li>Giáo trình khóa {classCode}: <strong style={{ color: 'red' }}>{formatCurrency(bookFee)}</strong></li>
      </ul>

      <p style={{ fontWeight: 'bold', marginBottom: '15px' }}>
        {'=>'} Học phí & giáo trình cần đóng cho {remainingWeeks} tuần khóa {classCode}: <span style={{ color: 'red' }}>{formatCurrency(remainingFee)} + {formatCurrency(bookFee)} = {formatCurrency(remainingFee + bookFee)}</span>
      </p>

      {/* Adjustment */}
      {adjustmentAmount && adjustmentAmount !== 0 ? (
        <p style={{ marginBottom: '15px' }}>
          <strong>Khoản điều chỉnh / làm tròn:</strong> <strong style={{ color: 'red' }}>{formatCurrency(adjustmentAmount)}</strong> (Lý do: {adjustmentReason})
        </p>
      ) : null}

      {/* Gifts */}
      {gifts && gifts.length > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <p style={{ margin: 0 }}>Cùng với số tiền cần đóng ở trên thì <strong>{shortName}</strong> sẽ nhận một số phần quà sau:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px' }}>
            {gifts.map((gift, idx) => (
              <li key={idx}><strong>{gift}</strong></li>
            ))}
          </ul>
        </div>
      )}

      {/* Total */}
      <p style={{ marginBottom: '5px' }}>
        <strong>Tổng cộng cần đóng:</strong> <strong style={{ color: 'red', fontSize: '18px' }}>{formatCurrency(finalAmount)}</strong>
      </p>
      {dueDate && (
        <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginBottom: '20px' }}>
          <li>Hoàn thành học phí trước ngày <strong style={{ color: 'red' }}>{dueDate}</strong></li>
        </ul>
      )}

      {/* Payment details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '20px' }}>
        <div style={{ flex: 1, paddingRight: '20px' }}>
          <p style={{ marginBottom: '10px' }}>Phụ huynh/Học viên có thể đóng học phí trực tiếp tại Trung tâm hoặc chuyển khoản vào tài khoản của Trung tâm với thông tin như sau:</p>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>Người nhận tiền: <strong>CÔNG TY TNHH NGOAI NGU TRI THUC VIET</strong></li>
            <li>Số TK: <strong>61 1991 6886</strong></li>
            <li>Ngân hàng: <strong>NH quân Đội - MB Bank Bắc Bình Dương</strong></li>
            <li>Nội dung: <strong>{transferContent}</strong></li>
          </ul>
        </div>
        <div style={{ width: '180px', border: '2px solid black', padding: '5px' }}>
          {qrUrl ? (
            <img src={qrUrl} alt="QR Code" style={{ width: '100%', height: 'auto', display: 'block' }} crossOrigin="anonymous" />
          ) : (
            <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              QR Code
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '30px' }}>
        <p style={{ margin: '5px 0' }}>Mọi thắc mắc vui lòng liên hệ hotline Trung tâm <strong>0911 767 069</strong>.</p>
        <p style={{ margin: '5px 0' }}>Trân trọng thông báo!</p>
      </div>
    </div>
  );
});

export default TuitionNoticeTemplate;
