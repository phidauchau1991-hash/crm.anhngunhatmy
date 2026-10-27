'use client';
import React, { forwardRef } from 'react';

const TuitionNoticeTemplate = forwardRef(({ data }, ref) => {
  const {
    noticeType,
    studentName,
    shortName,
    className,
    classCode,
    oldClassName,
    studyDays,
    studyHours,
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
    includeBook,
    transferCredit,
    gifts,
    giftValue,
    dueDate,
    finalAmount,
    transferContent,
    qrUrl,
    qrDataUrl,
    orderTotalFee,
    orderPaidAmount,
    installmentAmount
  } = data;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0)) + ' đ';
  };

  return (
    <div
      ref={ref}
      style={{
        width: '800px',
        backgroundColor: '#ffffff',
        color: '#1e293b',
        fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
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

      <div style={{ padding: '35px 45px', position: 'relative', zIndex: 1 }}>
        {/* Header Content */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
          <div style={{ flex: '0 0 140px' }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ width: '115px', height: 'auto' }} 
              crossOrigin="anonymous"
            />
          </div>
          <div style={{ flex: 1, textAlign: 'center', paddingRight: '140px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: '800', textTransform: 'uppercase', color: '#0d88c4', letterSpacing: '1px' }}>THƯ BÁO</h1>
            <p style={{ margin: 0, fontStyle: 'italic', fontSize: '16px', color: '#475569', marginTop: '4px', fontWeight: '500' }}>
              {noticeType === 'NEXT_INSTALLMENT' ? 'V/v thanh toán học phí đợt tiếp theo' : 
               noticeType === 'CLASS_TRANSFER' ? 'V/v chuyển lớp & hoàn tất học phí' : 'V/v đóng học phí'}
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div style={{ marginBottom: '22px', padding: '12px 18px', background: '#f8fafc', borderLeft: '4px solid #0d88c4', borderRadius: '0 8px 8px 0' }}>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, textAlign: 'left', lineHeight: '1.8' }}>
            <li>
              <strong>Kính gửi:</strong> Phụ huynh em <strong style={{ color: '#0d88c4', fontSize: '16px' }}>{studentName?.toUpperCase()}</strong>
            </li>
            {noticeType === 'CLASS_TRANSFER' ? (
              <>
                <li>
                  <strong>Lớp hiện tại (cũ):</strong> <span style={{ color: '#64748b', fontWeight: '600' }}>{oldClassName || 'Lớp trước'}</span>
                  <i className="fa-solid fa-arrow-right" style={{ margin: '0 8px', color: '#0d88c4', fontSize: '12px' }}></i>
                  <strong>Lớp chuyển sang (mới):</strong> <strong style={{ color: '#0d88c4' }}>{className}</strong>
                </li>
                <li><strong>GVCN lớp mới:</strong> {teacherName || 'Trung tâm bố trí'}</li>
              </>
            ) : (
              <>
                <li><strong>Lớp:</strong> <strong style={{ color: '#0d88c4' }}>{className}</strong></li>
                <li><strong>GVCN:</strong> {teacherName || 'Trung tâm bố trí'}</li>
              </>
            )}
          </ul>
        </div>

        {/* Intro */}
        <div style={{ textAlign: 'justify', marginBottom: '20px', lineHeight: '1.6', color: '#334155' }}>
          {noticeType === 'NEXT_INSTALLMENT' ? (
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Anh ngữ Nhật Mỹ xin gửi lời chào, lời biết ơn đến ba mẹ/đại diện Học viên đã tin tưởng đồng hành cùng Trung tâm trong thời gian qua.
              <br/>
              Theo lộ trình đóng phí của khóa học <strong>{classCode || className}</strong>, Trung tâm xin gửi đến ba mẹ thông tin thanh toán học phí đợt tiếp theo như sau:
            </p>
          ) : noticeType === 'CLASS_TRANSFER' ? (
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Anh ngữ Nhật Mỹ xin gửi lời chào trân trọng và lời biết ơn sâu sắc đến Quý phụ huynh đã luôn tin tưởng, đồng hành cùng Trung tâm trên hành trình học tập của con.
              <br/>
              Nhằm đảm bảo lộ trình học tập phù hợp và tối ưu hiệu quả nhất cho em, Trung tâm xin thông báo về việc chuyển lớp của học viên từ lớp <strong>{oldClassName || 'cũ'}</strong> sang lớp <strong>{className}</strong>. Dưới đây là thông tin chi tiết về lịch học và bảng phân tích học phí cấn trừ của lớp mới:
            </p>
          ) : (
            <p style={{ margin: '0 0 0.5rem 0' }}>
              Anh ngữ Nhật Mỹ xin gửi lời chào, lời biết ơn đến ba mẹ/đại diện Học viên đã tin tưởng và đồng hành cùng Trung tâm trong thời gian vừa qua để giúp các con yêu thích & học tốt tiếng Anh hơn mỗi ngày!
              <br/>
              Sau thời gian học thử cùng những nhận xét chi tiết của Giáo viên, nay Trung tâm xin gửi đến ba mẹ thông tin học phí khóa <strong>{className}</strong> như sau:
            </p>
          )}
        </div>

        {/* ============================================================ */}
        {/* TRỌNG TÂM 2: BẢNG PHÂN TÍCH TÀI CHÍNH 4 DÒNG KHI CHUYỂN LỚP */}
        {/* ============================================================ */}
        {noticeType === 'CLASS_TRANSFER' && (
          <>
            {/* Lịch học & thời lượng lớp mới */}
            <div style={{ background: '#f0f9ff', padding: '12px 18px', borderRadius: '8px', border: '1px solid #bae6fd', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                {studyDays && (
                  <div>
                    <span style={{ color: '#0369a1', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-calendar-days" style={{ marginRight: '6px' }}></i>
                      Lịch học lớp mới: {studyDays} {studyHours ? `(${studyHours})` : ''}
                    </span>
                  </div>
                )}
                {totalWeeks > 0 && (
                  <div style={{ color: '#0369a1', fontSize: '14px' }}>
                    <i className="fa-solid fa-clock" style={{ marginRight: '5px' }}></i>
                    Thời lượng toàn khóa: <strong>{totalWeeks} tuần</strong>
                  </div>
                )}
              </div>
            </div>

            {/* Bảng phân tích cấn trừ 4 dòng */}
            <div style={{ border: '2px solid #0d88c4', borderRadius: '10px', overflow: 'hidden', marginBottom: '20px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ background: '#0d88c4', color: '#ffffff', padding: '10px 18px', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fa-solid fa-calculator"></i> BẢNG PHÂN TÍCH CẤN TRỪ HỌC PHÍ CHUYỂN LỚP
              </div>
              
              <div style={{ padding: '14px 18px', background: '#ffffff' }}>
                {/* Dòng 1: Học phí lớp mới */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>1. Học phí khóa mới ({className}):</span>
                    {missedWeeks > 0 && (
                      <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                        (Toàn khóa {totalWeeks} tuần {formatCurrency(totalFee)}, trừ {missedWeeks} tuần vào trễ: -{formatCurrency(missedFee)})
                      </div>
                    )}
                  </div>
                  <strong style={{ fontSize: '15px', color: '#1e293b' }}>
                    {formatCurrency(remainingWeeks < totalWeeks && missedWeeks > 0 ? (totalFee - missedFee) : totalFee)}
                  </strong>
                </div>

                {/* Dòng 2: Tiền giáo trình */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' }}>
                  <span style={{ fontWeight: '600' }}>2. Giáo trình & Tài liệu khóa mới:</span>
                  <strong style={{ fontSize: '15px', color: Number(bookFee) > 0 ? '#1e293b' : '#16a34a' }}>
                    {Number(bookFee) > 0 ? formatCurrency(bookFee) : '0 đ (Đã có / Miễn phí)'}
                  </strong>
                </div>

                {/* Dòng 3: Cấn trừ tiền dư từ lớp cũ */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 18px', margin: '0 -18px', background: '#f0fdf4', borderBottom: '1px dashed #bbf7d0' }}>
                  <div>
                    <span style={{ color: '#166534', fontWeight: 'bold' }}>
                      <i className="fa-solid fa-arrow-turn-down" style={{ marginRight: '6px', transform: 'rotate(-45deg)' }}></i>
                      3. Cấn trừ tiền dư từ khóa trước ({oldClassName || 'Khóa cũ'}):
                    </span>
                  </div>
                  <strong style={{ fontSize: '16px', color: '#16a34a' }}>
                    - {formatCurrency(transferCredit || 0)}
                  </strong>
                </div>

                {/* Dòng bổ sung: Ưu đãi / Hỗ trợ thêm nếu có */}
                {discountValue > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 18px', margin: '0 -18px', background: '#fefce8', borderBottom: '1px dashed #fef08a' }}>
                    <span style={{ color: '#854d0e', fontWeight: '600' }}>
                      🎁 {discountReason || 'Mức hỗ trợ từ Trung tâm'} {discountPercent > 0 ? `(${discountPercent}%)` : ''}:
                    </span>
                    <strong style={{ fontSize: '15px', color: '#ca8a04' }}>
                      - {formatCurrency(discountValue)}
                    </strong>
                  </div>
                )}

                {/* Dòng 4: TỔNG HỌC PHÍ CẦN NỘP */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '2px solid #0d88c4' }}>
                  <div>
                    <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>4. TỔNG CẦN HOÀN THÀNH:</span>
                    {finalAmount <= 0 ? (
                      <div style={{ fontSize: '13px', color: '#16a34a', fontWeight: 'bold', marginTop: '2px' }}>
                        ✅ Số dư khóa trước đã cấn trừ đủ - Không phát sinh thêm học phí
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                        (Học phí mới {formatCurrency(remainingFee)} + Sách {formatCurrency(bookFee)} - Cấn trừ {formatCurrency(transferCredit)} = Tổng)
                      </div>
                    )}
                  </div>
                  <strong style={{ fontSize: '24px', color: finalAmount > 0 ? '#dc2626' : '#16a34a', fontWeight: '900' }}>
                    {formatCurrency(finalAmount)}
                  </strong>
                </div>
              </div>
            </div>
          </>
        )}

        {/* THÔNG BÁO CHO GHI DANH MỚI (NEW_ENROLLMENT) */}
        {(!noticeType || noticeType === 'NEW_ENROLLMENT') && (
          <>
            <div style={{ background: '#f8fafc', padding: '15px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, textAlign: 'left' }}>
                {studyDays && (
                  <li style={{ marginBottom: '8px', color: '#0d88c4' }}>
                    <strong>Lịch học dự kiến: {studyDays} {studyHours ? `(${studyHours})` : ''}</strong>
                  </li>
                )}
                <li style={{ marginBottom: '8px' }}>Số tuần học toàn Khóa {className}: <strong>{totalWeeks} tuần</strong> ~ HP: <strong>{formatCurrency(totalFee)}</strong></li>
                {missedWeeks > 0 && (
                  <li style={{ marginBottom: '8px' }}>Số tuần <strong>{shortName}</strong> không tham gia: <strong>{missedWeeks} tuần</strong> ~ Trừ: <strong>{formatCurrency(missedFee)}</strong></li>
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
                
                <li>Giáo trình khóa {className}: <strong style={{ color: '#dc2626' }}>{formatCurrency(bookFee)}</strong></li>
              </ul>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', paddingLeft: '10px' }}>
              <i className="fa-solid fa-arrow-right" style={{ color: '#0d88c4', marginRight: '10px' }}></i>
              <span style={{ fontWeight: 'bold', fontSize: '16px' }}>
                Học phí {discountValue > 0 ? 'sau hỗ trợ' : 'cần đóng'} <span style={{ color: '#dc2626' }}>({formatCurrency(remainingFee)})</span> + Giáo trình <span style={{ color: '#dc2626' }}>({formatCurrency(bookFee)})</span> = <span style={{ color: '#dc2626' }}>{formatCurrency(finalAmount)}</span>
              </span>
            </div>
          </>
        )}

        {/* THÔNG BÁO CHO ĐỢT ĐÓNG TIẾP THEO (NEXT_INSTALLMENT) */}
        {noticeType === 'NEXT_INSTALLMENT' && (
          <>
            <div style={{ background: '#fff7ed', padding: '15px 20px', borderRadius: '8px', border: '1px solid #fdba74', marginBottom: '15px' }}>
              <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, textAlign: 'left' }}>
                <li style={{ marginBottom: '8px' }}>Tổng học phí toàn Khóa {className}: <strong>{formatCurrency(orderTotalFee)}</strong></li>
                <li style={{ marginBottom: '8px' }}>Đợt trước đã thanh toán: <strong style={{ color: '#16a34a' }}>{formatCurrency(orderPaidAmount)}</strong> ✅</li>
                <li style={{ marginBottom: '8px' }}><strong>Số tiền thu đợt này:</strong> <strong style={{ color: '#ea580c', fontSize: '18px' }}>{formatCurrency(installmentAmount)}</strong> ⏳</li>
                {Number(bookFee) > 0 && (
                  <li>Giáo trình / Tài liệu phát sinh: <strong style={{ color: '#dc2626' }}>{formatCurrency(bookFee)}</strong></li>
                )}
              </ul>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', paddingLeft: '10px' }}>
              <i className="fa-solid fa-arrow-right" style={{ color: '#ea580c', marginRight: '10px' }}></i>
              <span style={{ fontWeight: 'bold', fontSize: '15px', fontStyle: 'italic', color: '#64748b' }}>
                Nhờ Ba Mẹ thu xếp hoàn tất học phí để trung tâm tiếp tục duy trì giáo trình và lịch học xuyên suốt cho bé nhé ạ!
              </span>
            </div>
          </>
        )}

        {/* Quà tặng kèm */}
        {gifts && gifts.length > 0 && (
          <div style={{ marginBottom: '22px', background: '#f8fafc', padding: '12px 18px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 6px 0', fontWeight: '600', color: '#1e293b' }}>
              🎁 Cùng với số tiền hoàn tất ở trên, <strong>{shortName}</strong> sẽ được nhận các phần quà sau:
            </p>
            <ul style={{ listStyleType: 'disc', paddingLeft: '30px', margin: 0, textAlign: 'left', fontWeight: 'bold', color: '#0d88c4' }}>
              {gifts.map((gift, idx) => (
                <li key={idx} style={{ marginBottom: '2px' }}>{gift}</li>
              ))}
            </ul>
            {Number(giftValue) > 0 && (
              <p style={{ margin: '6px 0 0 15px', fontStyle: 'italic', color: '#64748b', fontSize: '13px' }}>
                Tổng giá trị quà tặng: {formatCurrency(giftValue)}
              </p>
            )}
          </div>
        )}

        {/* Tổng tiền & Hạn đóng (cho New và Installment) */}
        {noticeType !== 'CLASS_TRANSFER' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid #e2e8f0', paddingBottom: '14px', marginBottom: '22px' }}>
            <div>
              <div style={{ fontSize: '18px' }}>
                <strong>Tổng cộng cần đóng:</strong> 
                <strong style={{ color: '#dc2626', fontSize: '24px', marginLeft: '8px' }}>{formatCurrency(finalAmount)}</strong>
              </div>
              {dueDate && (
                <div style={{ marginTop: '6px', color: '#dc2626', fontWeight: 'bold', fontSize: '14px' }}>
                  <i className="fa-regular fa-calendar-check" style={{ marginRight: '6px' }}></i>
                  Hoàn thành học phí trước ngày: {dueDate}
                </div>
              )}
            </div>
          </div>
        )}

        {noticeType === 'CLASS_TRANSFER' && dueDate && (
          <div style={{ marginBottom: '18px', color: '#dc2626', fontWeight: 'bold', fontSize: '14px' }}>
            <i className="fa-regular fa-calendar-check" style={{ marginRight: '6px' }}></i>
            Hoàn tất học phí trước ngày: {dueDate}
          </div>
        )}

        {/* ============================================================ */}
        {/* TRỌNG TÂM 3: THÔNG TIN THANH TOÁN & MÃ VIETQR CHUẨN XÁC */}
        {/* ============================================================ */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderTop: noticeType === 'CLASS_TRANSFER' ? '1px solid #e2e8f0' : 'none', paddingTop: noticeType === 'CLASS_TRANSFER' ? '16px' : '0' }}>
          <div style={{ flex: 1, paddingRight: '25px' }}>
            {finalAmount > 0 ? (
              <>
                <p style={{ marginBottom: '10px', fontWeight: 'bold', color: '#0d88c4', fontSize: '16px' }}>
                  <i className="fa-solid fa-building-columns" style={{ marginRight: '6px' }}></i> Thông tin chuyển khoản:
                </p>
                <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
                  <li>Ngân hàng: <strong>NH Quân Đội - MB Bank</strong></li>
                  <li>Số TK: <strong style={{ fontSize: '18px', color: '#0d88c4', letterSpacing: '0.5px' }}>61 1991 6886</strong></li>
                  <li>Người nhận: <strong>CÔNG TY TNHH NGOAI NGU TRI THUC VIET</strong></li>
                  <li>Nội dung chuyển khoản: <strong style={{ backgroundColor: '#fef3c7', padding: '3px 8px', borderRadius: '4px', border: '1px solid #fde68a', color: '#92400e' }}>{transferContent}</strong></li>
                </ul>
                <div style={{ marginTop: '16px', padding: '10px 14px', background: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '4px', fontSize: '13px', fontStyle: 'italic', color: '#166534' }}>
                  <i className="fa-solid fa-shield-check" style={{ marginRight: '5px' }}></i> 
                  Mã QR bên cạnh đã được tích hợp số tiền và nội dung chuyển khoản tự động. Phụ huynh chỉ cần quét mã bằng App ngân hàng là hoàn tất.
                </div>
              </>
            ) : (
              <div style={{ padding: '20px', background: '#f0fdf4', border: '2px solid #22c55e', borderRadius: '8px', color: '#166534' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fa-solid fa-circle-check"></i> HỌC PHÍ ĐÃ HOÀN TẤT
                </h3>
                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6' }}>
                  Số dư từ khóa trước đã cấn trừ toàn bộ học phí và tài liệu của khóa mới. Quý phụ huynh <strong>không cần phải thanh toán thêm bất kỳ khoản phí nào</strong>.
                </p>
              </div>
            )}
          </div>
          
          {finalAmount > 0 && (
            <div style={{ width: '220px', textAlign: 'center', flexShrink: 0 }}>
              <div style={{ border: '2px solid #0d88c4', borderRadius: '12px', padding: '14px', background: '#ffffff', boxShadow: '0 4px 6px -1px rgba(13, 136, 196, 0.15)' }}>
                <div style={{ fontWeight: 'bold', color: '#0d88c4', marginBottom: '8px', fontSize: '13px', letterSpacing: '0.5px' }}>
                  QUÉT ĐỂ THANH TOÁN
                </div>
                {(qrDataUrl || qrUrl) ? (
                  <img 
                    src={qrDataUrl || qrUrl} 
                    alt="VietQR" 
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }} 
                  />
                ) : (
                  <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Đang tạo mã QR...
                  </div>
                )}
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}>
                  <img src="https://img.vietqr.io/image/napas-logo.png" alt="NAPAS" style={{ height: '14px' }} crossOrigin="anonymous" onError={(e) => e.target.style.display='none'} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Band */}
      <div style={{ backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', padding: '16px 45px', textAlign: 'center', borderBottom: '8px solid #0d88c4' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>
          Mọi thắc mắc vui lòng liên hệ hotline Trung tâm <strong style={{ color: '#0d88c4', fontSize: '15px' }}>0911 767 069</strong>.
        </p>
        <p style={{ margin: 0, fontWeight: 'bold', color: '#334155' }}>Trân trọng thông báo!</p>
      </div>
    </div>
  );
});

TuitionNoticeTemplate.displayName = 'TuitionNoticeTemplate';

export default TuitionNoticeTemplate;
