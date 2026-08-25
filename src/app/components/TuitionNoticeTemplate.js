'use client';
import React, { forwardRef } from 'react';

const TuitionNoticeTemplate = forwardRef(({ data }, ref) => {
  const {
    noticeType,
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
    originalRemainingFee,
    discountReason,
    discountPercent,
    discountValue,
    remainingFee,
    bookFee,
    gifts,
    giftValue,
    dueDate,
    finalAmount,
    transferContent,
    qrUrl,
    orderTotalFee,
    orderPaidAmount,
    installmentAmount
  } = data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
  };

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
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
      }}
    >
      {/* Header Band */}
      <div style={{ height: '8px', width: '100%', backgroundColor: '#0d88c4' }}></div>

      <div style={{ padding: '40px 50px', position: 'relative', zIndex: 1 }}>
        {/* Header Content */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '35px' }}>
          <div style={{ flex: '0 0 150px' }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ width: '110px', height: 'auto' }} 
              crossOrigin="anonymous"
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center', paddingRight: '150px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', textTransform: 'uppercase', color: '#0d88c4', letterSpacing: '1px' }}>THƯ BÁO</h1>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '18px', color: '#475569', marginTop: '4px' }}>
              {data.noticeType === 'NEXT_INSTALLMENT' ? 'V/v thanh toán học phí đợt tiếp theo' : 
               data.noticeType === 'CLASS_TRANSFER' ? 'V/v chuyển lớp & học phí' : 'V/v đóng học phí'}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div style={{ marginBottom: '25px', paddingLeft: '20px', borderLeft: '4px solid #0d88c4' }}>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, textAlign: 'left' }}>
            <li style={{ marginBottom: '4px' }}><strong>Kính gửi:</strong> Phụ huynh em <strong style={{ color: '#0d88c4', fontSize: '16px' }}>{studentName?.toUpperCase()}</strong></li>
            <li style={{ marginBottom: '4px' }}><strong>Lớp:</strong> {data.noticeType === 'CLASS_TRANSFER' ? (data.oldClassName || 'cũ') : className}</li>
            <li><strong>GVCN:</strong> {teacherName}</li>
          </ul>
        </div>

        {/* Intro */}
        <div style={{ textAlign: 'justify', marginBottom: '25px', lineHeight: '1.6', color: '#334155' }}>
          {data.noticeType === 'NEXT_INSTALLMENT' ? (
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Anh ngữ Nhật Mỹ xin gửi lời chào, lời biết ơn đến ba mẹ/đại diện Học viên đã tin tưởng đồng hành cùng Trung tâm trong thời gian qua.
              <br/>
              Theo lộ trình đóng phí của khóa học <strong>{classCode}</strong>, Trung tâm xin gửi đến ba mẹ thông tin thanh toán học phí đợt tiếp theo như sau:
            </p>
          ) : data.noticeType === 'CLASS_TRANSFER' ? (
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Anh ngữ Nhật Mỹ xin gửi lời chào và lời biết ơn đến ba mẹ/đại diện Học viên đã tin tưởng đồng hành cùng Trung tâm. 
              <br/>
              Nhằm đảm bảo lộ trình và hiệu quả học tập tốt nhất cho con, Trung tâm xin thông báo về việc chuyển lớp của Học viên từ lớp <strong>{data.oldClassName || 'cũ'}</strong> sang lớp <strong>{classCode}</strong>. Dưới đây là thông tin chi tiết về học phí của lớp mới:
            </p>
          ) : (
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Anh ngữ Nhật Mỹ xin gửi lời chào, lời biết ơn đến ba mẹ/đại diện Học viên đã tin tưởng và đồng hành cùng Trung tâm trong thời gian vừa qua để giúp các con yêu thích & học tốt tiếng Anh hơn mỗi ngày!
              <br/>
              Sau thời gian học thử cùng những nhận xét chi tiết của Giáo viên, nay Trung tâm xin gửi đến ba mẹ thông tin học phí khóa <strong>{classCode}</strong> như sau:
            </p>
          )}
        </div>

        {/* Fee details */}
        {(!noticeType || noticeType === 'NEW_ENROLLMENT' || noticeType === 'CLASS_TRANSFER') && (
          <>
            <div style={{ background: '#f8fafc', padding: '15px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, textAlign: 'left' }}>
                {(data.noticeType === 'CLASS_TRANSFER' || data.noticeType === 'NEW_ENROLLMENT') && data.studyDays && (
                  <li style={{ marginBottom: '8px', color: '#0d88c4' }}><strong>Lịch học dự kiến: {data.studyDays} {data.studyHours ? `(${data.studyHours})` : ''}</strong></li>
                )}
                <li style={{ marginBottom: '8px' }}>Số tuần học toàn Khóa {classCode}: <strong>{totalWeeks} tuần</strong> ~ HP: <strong>{formatCurrency(totalFee)}</strong></li>
                {missedWeeks > 0 && (
                  <li style={{ marginBottom: '8px' }}>Số tuần <strong>{shortName}</strong> không tham gia: <strong>{missedWeeks} tuần</strong> ~ HP: <strong>{formatCurrency(missedFee)}</strong></li>
                )}
                
                {discountValue > 0 ? (
                  <>
                    <li style={{ marginBottom: '8px' }}>Học phí tiêu chuẩn cho <strong>{remainingWeeks} tuần</strong>: <strong>{formatCurrency(originalRemainingFee)}</strong></li>
                    <li style={{ marginBottom: '8px', color: '#16a34a' }}>
                      🎁 <strong>{discountReason} {discountPercent > 0 ? `(${discountPercent}%)` : ''}:</strong> <strong style={{ fontSize: '16px' }}>- {formatCurrency(discountValue)}</strong>
                    </li>
                    <li style={{ marginBottom: '8px' }}>Học phí sau hỗ trợ cho <strong>{remainingWeeks} tuần</strong>: <strong style={{ color: '#dc2626' }}>{formatCurrency(remainingFee)}</strong></li>
                  </>
                ) : (
                  <li style={{ marginBottom: '8px' }}>Học phí <strong>{remainingWeeks} tuần</strong> mà <strong>{shortName}</strong> tham gia: <strong style={{ color: '#dc2626' }}>{formatCurrency(remainingFee)}</strong></li>
                )}
                
                <li>Giáo trình khóa {classCode}: <strong style={{ color: '#dc2626' }}>{formatCurrency(bookFee)}</strong></li>
              </ul>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', paddingLeft: '10px' }}>
              <i className="fa-solid fa-arrow-right" style={{ color: '#0d88c4', marginRight: '10px' }}></i>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                {discountValue > 0 ? (
                  <>
                    Học phí sau hỗ trợ <span style={{ color: '#dc2626' }}>({formatCurrency(remainingFee)})</span> + Giáo trình <span style={{ color: '#dc2626' }}>({formatCurrency(bookFee)})</span> = <span style={{ color: '#dc2626' }}>{formatCurrency(remainingFee + bookFee)}</span>
                  </>
                ) : (
                  <>
                    Học phí & giáo trình cần đóng cho {remainingWeeks} tuần: <span style={{ color: '#dc2626' }}>{formatCurrency(remainingFee)} + {formatCurrency(bookFee)} = {formatCurrency(remainingFee + bookFee)}</span>
                  </>
                )}
              </span>
            </div>
          </>
        )}

        {noticeType === 'NEXT_INSTALLMENT' && (
          <>
            <div style={{ background: '#fff7ed', padding: '15px 20px', borderRadius: '8px', border: '1px solid #fdba74', marginBottom: '15px' }}>
              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, textAlign: 'left' }}>
                <li style={{ marginBottom: '8px' }}>Tổng học phí toàn Khóa {classCode}: <strong>{formatCurrency(orderTotalFee)}</strong></li>
                <li style={{ marginBottom: '8px' }}>Đợt trước đã thanh toán: <strong style={{ color: '#16a34a' }}>{formatCurrency(orderPaidAmount)}</strong> ✅</li>
                <li style={{ marginBottom: '8px' }}><strong>Số tiền thu đợt này:</strong> <strong style={{ color: '#ea580c', fontSize: '18px' }}>{formatCurrency(installmentAmount)}</strong> ⏳</li>
                <li>Giáo trình / Tài liệu phát sinh: <strong style={{ color: '#dc2626' }}>{formatCurrency(bookFee)}</strong></li>
              </ul>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', paddingLeft: '10px' }}>
              <i className="fa-solid fa-arrow-right" style={{ color: '#ea580c', marginRight: '10px' }}></i>
              <span style={{ fontWeight: 'bold', fontSize: '16px', fontStyle: 'italic', color: '#64748b' }}>
                Nhờ Ba Mẹ thu xếp hoàn tất học phí để trung tâm tiếp tục duy trì giáo trình và lịch học xuyên suốt cho bé nhé ạ!
              </span>
            </div>
          </>
        )}

        {/* Gifts */}
        {gifts && gifts.length > 0 && (
          <div style={{ marginBottom: '25px' }}>
            <p style={{ margin: '0 0 8px 0' }}>Cùng với số tiền cần đóng ở trên, <strong>{shortName}</strong> sẽ nhận một số phần quà sau:</p>
            <ul style={{ listStyleType: 'disc', paddingLeft: '40px', margin: 0, textAlign: 'left', fontWeight: 'bold' }}>
              {gifts.map((gift, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>{gift}</li>
              ))}
            </ul>
            {giftValue > 0 && (
              <p style={{ margin: '8px 0 0 20px', fontStyle: 'italic', color: '#64748b' }}>Tổng giá trị quà tặng: {formatCurrency(giftValue)}</p>
            )}
          </div>
        )}

        {/* Total & Due Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px', marginBottom: '25px' }}>
          <div>
            <div style={{ fontSize: '18px' }}><strong>Tổng cộng cần đóng:</strong> <strong style={{ color: '#dc2626', fontSize: '22px', marginLeft: '5px' }}>{formatCurrency(finalAmount)}</strong></div>
            {dueDate && (
              <div style={{ marginTop: '8px', color: '#dc2626', fontWeight: 'bold' }}>
                <i className="fa-regular fa-calendar-check" style={{ marginRight: '8px' }}></i>
                Hoàn thành học phí trước ngày: {dueDate}
              </div>
            )}
          </div>
        </div>

        {/* Payment details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1, paddingRight: '30px' }}>
            <p style={{ marginBottom: '15px', fontWeight: 'bold', color: '#0d88c4' }}>Thông tin chuyển khoản:</p>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
              <li>Ngân hàng: <strong>NH quân Đội - MB Bank</strong></li>
              <li>Số TK: <strong style={{ fontSize: '18px', color: '#0d88c4' }}>61 1991 6886</strong></li>
              <li>Người nhận: <strong>CÔNG TY TNHH NGOAI NGU TRI THUC VIET</strong></li>
              <li>Nội dung: <strong style={{ backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>{transferContent}</strong></li>
            </ul>
            <div style={{ marginTop: '20px', padding: '12px', background: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '4px', fontSize: '13px', fontStyle: 'italic', color: '#166534' }}>
              <i className="fa-solid fa-shield-check" style={{ marginRight: '5px' }}></i> 
              Mã quét bên cạnh là mã thanh toán tự động, sẽ dẫn đến chính xác tài khoản công ty của Trung tâm Anh ngữ Nhật Mỹ, phụ huynh có thể hoàn toàn an tâm quét mã này.
            </div>
          </div>
          
          <div style={{ width: '220px', textAlign: 'center' }}>
            <div style={{ border: '2px solid #0d88c4', borderRadius: '12px', padding: '15px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(13, 136, 196, 0.2)' }}>
              <div style={{ fontWeight: 'bold', color: '#0d88c4', marginBottom: '10px', fontSize: '13px' }}>
                QUÉT ĐỂ THANH TOÁN
              </div>
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" style={{ width: '100%', height: 'auto', display: 'block' }} crossOrigin="anonymous" />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  QR Code
                </div>
              )}
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                <img src="https://img.vietqr.io/image/napas-logo.png" alt="NAPAS" style={{ height: '16px' }} crossOrigin="anonymous" onError={(e) => e.target.style.display='none'} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Band */}
      <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '20px 50px', textAlign: 'center', borderBottom: '8px solid #0d88c4' }}>
        <p style={{ margin: '0 0 5px 0', fontSize: '14px' }}>Mọi thắc mắc vui lòng liên hệ hotline Trung tâm <strong style={{ color: '#0d88c4', fontSize: '16px' }}>0911 767 069</strong>.</p>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#475569' }}>Trân trọng thông báo!</p>
      </div>
    </div>
  );
});

export default TuitionNoticeTemplate;
