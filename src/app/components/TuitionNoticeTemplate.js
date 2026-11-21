'use client';

import React, { forwardRef } from 'react';
import BrandLetterShell from '@/components/BrandLetterShell';
import OfficialRedSeal from '@/components/OfficialRedSeal';
import { BRAND, FONT_UNIFIED, getTodayVnShortDate } from '@/lib/brandTheme';

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
    installmentAmount,
  } = data || {};

  const formatCurrency = (amount) =>
    `${new Intl.NumberFormat('vi-VN').format(Math.round(amount || 0))} đ`;

  const subtitleLabel =
    noticeType === 'NEXT_INSTALLMENT'
      ? 'V/v thanh toán học phí đợt tiếp theo'
      : noticeType === 'CLASS_TRANSFER'
      ? 'V/v chuyển lớp & hoàn tất học phí'
      : 'V/v thông báo hoàn tất học phí khóa học';

  const badgeSub =
    noticeType === 'NEXT_INSTALLMENT'
      ? 'Installment Tuition Notice'
      : noticeType === 'CLASS_TRANSFER'
      ? 'Class Transfer & Fee Notice'
      : 'Course Tuition Notice';

  return (
    <BrandLetterShell
      ref={ref}
      id="tuition-notice-capture"
      compact={true}
      badgeTop="CAMBRIDGE ENGLISH"
      badgeSub={badgeSub}
      eyebrow={subtitleLabel.toUpperCase()}
      title="THƯ BÁO HỌC PHÍ"
      subtitleEn={badgeSub}
      style={{
        position: 'absolute',
        top: '-9999px',
        left: '-9999px',
      }}
    >
      {/* 1. THÔNG TIN HỌC VIÊN & LỚP */}
      <div
        style={{
          marginBottom: '16px',
          padding: '13px 18px',
          backgroundColor: BRAND.white,
          borderRadius: '12px',
          border: `1.5px solid ${BRAND.blueBorder}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '14px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div>
          <div style={{ fontSize: '11px', fontWeight: '800', color: BRAND.subtle, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            KÍNH GỬI PHỤ HUYNH EM
          </div>
          <div style={{ fontSize: '21px', fontWeight: '900', color: BRAND.blueDark, textTransform: 'uppercase', marginTop: '2px' }}>
            {studentName?.toUpperCase()}
          </div>
          <div style={{ fontSize: '13px', color: BRAND.slate, marginTop: '4px', lineHeight: 1.55 }}>
            {noticeType === 'CLASS_TRANSFER' ? (
              <>
                <span>Lớp cũ: <strong style={{ color: BRAND.muted }}>{oldClassName || 'Lớp trước'}</strong> → Lớp mới: <strong style={{ color: BRAND.blueDark }}>{className}</strong></span>
                <span style={{ marginLeft: '12px' }}>• GVCN: <strong>{teacherName || 'Trung tâm bố trí'}</strong></span>
              </>
            ) : (
              <>
                <span>🏫 Lớp: <strong style={{ color: BRAND.blueDark }}>{className}</strong></span>
                <span style={{ marginLeft: '12px' }}>• 👩‍🏫 GVCN: <strong>{teacherName || 'Trung tâm bố trí'}</strong></span>
              </>
            )}
          </div>
        </div>
        <div
          style={{
            backgroundColor: BRAND.goldBg,
            border: `2px solid ${BRAND.gold}`,
            borderRadius: '10px',
            padding: '8px 14px',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ fontSize: '10.5px', fontWeight: '800', color: BRAND.goldDark, textTransform: 'uppercase' }}>
            TỔNG CẦN ĐÓNG
          </div>
          <div style={{ fontSize: '19px', fontWeight: '900', color: finalAmount > 0 ? '#DC2626' : BRAND.greenBadge, marginTop: '2px' }}>
            {formatCurrency(finalAmount)}
          </div>
        </div>
      </div>

      {/* 2. LỜI CHÀO */}
      <div style={{ textAlign: 'justify', marginBottom: '14px', lineHeight: 1.6, color: BRAND.slate, fontSize: '13.5px', fontFamily: FONT_UNIFIED }}>
        {noticeType === 'NEXT_INSTALLMENT' ? (
          <p style={{ margin: 0 }}>
            Anh ngữ Nhật Mỹ xin trân trọng cảm ơn Quý Phụ huynh đã luôn tin tưởng đồng hành cùng Trung tâm. Theo lộ trình đóng phí của khóa học{' '}
            <strong>{classCode || className}</strong>, Trung tâm xin gửi thông tin thanh toán học phí đợt tiếp theo như sau:
          </p>
        ) : noticeType === 'CLASS_TRANSFER' ? (
          <p style={{ margin: 0 }}>
            Anh ngữ Nhật Mỹ trân trọng thông báo về việc chuyển lộ trình của học viên từ lớp <strong>{oldClassName || 'cũ'}</strong> sang lớp{' '}
            <strong>{className}</strong> để phù hợp nhất với năng lực hiện tại. Chi tiết lịch học và cấn trừ học phí như sau:
          </p>
        ) : (
          <p style={{ margin: 0 }}>
            Anh ngữ Nhật Mỹ trân trọng cảm ơn Quý Phụ huynh đã đồng hành cùng Trung tâm. Trung tâm xin gửi đến ba mẹ thông tin chi tiết học phí khóa{' '}
            <strong>{className}</strong> như sau:
          </p>
        )}
      </div>

      {/* 3. CHI TIẾT HỌC PHÍ THEO TỪNG CHẾ ĐỘ */}
      {noticeType === 'CLASS_TRANSFER' && (
        <>
          <div style={{ backgroundColor: BRAND.blueSoft, padding: '10px 16px', borderRadius: '10px', border: `1px solid ${BRAND.blueBorder}`, marginBottom: '12px', fontSize: '13px', fontFamily: FONT_UNIFIED }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              {studyDays && (
                <span style={{ color: BRAND.blueDark, fontWeight: '700' }}>
                  📅 Lịch học lớp mới: {studyDays} {studyHours ? `(${studyHours})` : ''}
                </span>
              )}
              {totalWeeks > 0 && (
                <span style={{ color: BRAND.blueDark }}>
                  ⏱️ Thời lượng toàn khóa: <strong>{totalWeeks} tuần</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ border: `1.5px solid ${BRAND.blue}`, borderRadius: '12px', overflow: 'hidden', marginBottom: '14px', fontFamily: FONT_UNIFIED }}>
            <div style={{ backgroundColor: BRAND.blue, color: BRAND.white, padding: '9px 16px', fontWeight: '800', fontSize: '13.5px', letterSpacing: '0.3px' }}>
              🧮 BẢNG PHÂN TÍCH CẤN TRỪ HỌC PHÍ CHUYỂN LỚP
            </div>
            <div style={{ padding: '12px 16px', backgroundColor: BRAND.white, fontSize: '13.5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px dashed ${BRAND.border}` }}>
                <div>
                  <span style={{ fontWeight: '700' }}>1. Học phí khóa mới ({className}):</span>
                  {missedWeeks > 0 && (
                    <div style={{ fontSize: '12px', color: BRAND.subtle, fontStyle: 'italic' }}>
                      (Toàn khóa {totalWeeks} tuần {formatCurrency(totalFee)}, trừ {missedWeeks} tuần vào trễ: -{formatCurrency(missedFee)})
                    </div>
                  )}
                </div>
                <strong>{formatCurrency(remainingWeeks < totalWeeks && missedWeeks > 0 ? totalFee - missedFee : totalFee)}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px dashed ${BRAND.border}` }}>
                <span style={{ fontWeight: '700' }}>2. Giáo trình &amp; Tài liệu khóa mới:</span>
                <strong style={{ color: Number(bookFee) > 0 ? BRAND.ink : BRAND.greenBadge }}>
                  {Number(bookFee) > 0 ? formatCurrency(bookFee) : '0 đ (Đã có / Miễn phí)'}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', margin: '0 -16px', backgroundColor: BRAND.greenBadgeBg, borderBottom: `1px dashed ${BRAND.greenBorder}` }}>
                <span style={{ color: '#065F46', fontWeight: '800' }}>
                  3. Cấn trừ tiền dư từ khóa trước ({oldClassName || 'Khóa cũ'}):
                </span>
                <strong style={{ color: BRAND.greenBadge }}>- {formatCurrency(transferCredit || 0)}</strong>
              </div>

              {discountValue > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 16px', margin: '0 -16px', backgroundColor: BRAND.goldBg, borderBottom: `1px dashed ${BRAND.goldBorder}` }}>
                  <span style={{ color: '#92400E', fontWeight: '700' }}>
                    🎁 {discountReason || 'Mức hỗ trợ từ Trung tâm'} {discountPercent > 0 ? `(${discountPercent}%)` : ''}:
                  </span>
                  <strong style={{ color: BRAND.goldDark }}>- {formatCurrency(discountValue)}</strong>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: `2px solid ${BRAND.blue}` }}>
                <div>
                  <span style={{ fontSize: '14.5px', fontWeight: '900', color: BRAND.ink }}>4. TỔNG CẦN HOÀN THÀNH:</span>
                  {finalAmount <= 0 ? (
                    <div style={{ fontSize: '12.5px', color: BRAND.greenBadge, fontWeight: '700' }}>
                      ✓ Số dư khóa trước đã cấn trừ đủ — Không phát sinh thêm học phí
                    </div>
                  ) : (
                    <div style={{ fontSize: '11.5px', color: BRAND.subtle, fontStyle: 'italic' }}>
                      (Học phí mới {formatCurrency(remainingFee)} + Sách {formatCurrency(bookFee)} - Cấn trừ {formatCurrency(transferCredit)})
                    </div>
                  )}
                </div>
                <strong style={{ fontSize: '21px', color: finalAmount > 0 ? '#DC2626' : BRAND.greenBadge, fontWeight: '900' }}>
                  {formatCurrency(finalAmount)}
                </strong>
              </div>
            </div>
          </div>
        </>
      )}

      {(!noticeType || noticeType === 'NEW_ENROLLMENT') && (
        <div style={{ backgroundColor: BRAND.white, padding: '14px 18px', borderRadius: '12px', border: `1.5px solid ${BRAND.border}`, marginBottom: '14px', fontSize: '13.5px', fontFamily: FONT_UNIFIED }}>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, lineHeight: 1.75 }}>
            {studyDays && (
              <li style={{ color: BRAND.blueDark }}>
                <strong>Lịch học dự kiến: {studyDays} {studyHours ? `(${studyHours})` : ''}</strong>
              </li>
            )}
            <li>
              Số tuần học toàn Khóa {className}: <strong>{totalWeeks} tuần</strong> ~ Học phí: <strong>{formatCurrency(totalFee)}</strong>
            </li>
            {missedWeeks > 0 && (
              <li>
                Số tuần <strong>{shortName}</strong> không tham gia: <strong>{missedWeeks} tuần</strong> ~ Trừ: <strong>{formatCurrency(missedFee)}</strong>
              </li>
            )}
            {discountValue > 0 ? (
              <>
                <li>
                  Học phí tiêu chuẩn cho <strong>{remainingWeeks} tuần</strong>: <strong>{formatCurrency(originalRemainingFee)}</strong>
                </li>
                <li style={{ color: BRAND.greenBadge }}>
                  🎁 <strong>{discountReason} {discountPercent > 0 ? `(${discountPercent}%)` : ''}:</strong>{' '}
                  <strong>- {formatCurrency(discountValue)}</strong>
                </li>
                <li>
                  Học phí sau hỗ trợ cho <strong>{remainingWeeks} tuần</strong>: <strong style={{ color: '#DC2626' }}>{formatCurrency(remainingFee)}</strong>
                </li>
              </>
            ) : (
              <li>
                Học phí <strong>{remainingWeeks} tuần</strong> mà <strong>{shortName}</strong> tham gia: <strong style={{ color: '#DC2626' }}>{formatCurrency(remainingFee)}</strong>
              </li>
            )}
            <li>
              Giáo trình khóa {className}: <strong style={{ color: '#DC2626' }}>{formatCurrency(bookFee)}</strong>
            </li>
          </ul>
          <div style={{ marginTop: '10px', paddingTop: '9px', borderTop: `1px dashed ${BRAND.border}`, fontWeight: '800', fontSize: '14px', color: BRAND.ink }}>
            ➜ Tổng cộng: Học phí (<span style={{ color: '#DC2626' }}>{formatCurrency(remainingFee)}</span>) + Giáo trình (<span style={{ color: '#DC2626' }}>{formatCurrency(bookFee)}</span>) ={' '}
            <span style={{ color: '#DC2626', fontSize: '16px' }}>{formatCurrency(finalAmount)}</span>
          </div>
        </div>
      )}

      {noticeType === 'NEXT_INSTALLMENT' && (
        <div style={{ backgroundColor: BRAND.goldBg, padding: '14px 18px', borderRadius: '12px', border: `1.5px solid ${BRAND.goldBorder}`, marginBottom: '14px', fontSize: '13.5px', fontFamily: FONT_UNIFIED }}>
          <ul style={{ listStyleType: 'disc', paddingLeft: '20px', margin: 0, lineHeight: 1.75 }}>
            <li>Tổng học phí toàn Khóa {className}: <strong>{formatCurrency(orderTotalFee)}</strong></li>
            <li>Đợt trước đã thanh toán: <strong style={{ color: BRAND.greenBadge }}>{formatCurrency(orderPaidAmount)}</strong> ✓</li>
            <li>
              <strong>Số tiền thu đợt này:</strong> <strong style={{ color: '#EA580C', fontSize: '16px' }}>{formatCurrency(installmentAmount)}</strong>
            </li>
            {Number(bookFee) > 0 && (
              <li>Giáo trình / Tài liệu phát sinh: <strong style={{ color: '#DC2626' }}>{formatCurrency(bookFee)}</strong></li>
            )}
          </ul>
          <div style={{ marginTop: '8px', fontSize: '12.5px', fontStyle: 'italic', color: BRAND.muted }}>
            Nhờ Ba Mẹ thu xếp hoàn tất học phí để trung tâm tiếp tục duy trì giáo trình và lịch học xuyên suốt cho bé ạ!
          </div>
        </div>
      )}

      {/* Quà tặng kèm */}
      {gifts && gifts.length > 0 && (
        <div style={{ marginBottom: '14px', backgroundColor: BRAND.white, padding: '11px 16px', borderRadius: '10px', border: `1px solid ${BRAND.border}`, fontSize: '13px', fontFamily: FONT_UNIFIED }}>
          <div style={{ fontWeight: '700', color: BRAND.ink, marginBottom: '4px' }}>
            🎁 Quà tặng kèm dành cho <strong>{shortName}</strong>:
          </div>
          <ul style={{ listStyleType: 'disc', paddingLeft: '24px', margin: 0, fontWeight: '700', color: BRAND.blueDark }}>
            {gifts.map((gift, idx) => (
              <li key={idx}>{gift}</li>
            ))}
          </ul>
          {Number(giftValue) > 0 && (
            <div style={{ marginTop: '4px', fontStyle: 'italic', color: BRAND.subtle, fontSize: '12px' }}>
              Tổng giá trị quà tặng: {formatCurrency(giftValue)}
            </div>
          )}
        </div>
      )}

      {dueDate && (
        <div style={{ marginBottom: '14px', color: '#DC2626', fontWeight: '800', fontSize: '13.5px', fontFamily: FONT_UNIFIED }}>
          📅 Hạn hoàn thành học phí trước ngày: <strong>{dueDate}</strong>
        </div>
      )}

      {/* 4. THÔNG TIN CHUYỂN KHOẢN, VIETQR & MỘC ĐỎ */}
      <div
        style={{
          backgroundColor: BRAND.white,
          borderRadius: '14px',
          border: `1.5px solid ${BRAND.border}`,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '18px',
          fontFamily: FONT_UNIFIED,
        }}
      >
        <div style={{ flex: 1 }}>
          {finalAmount > 0 ? (
            <>
              <div style={{ fontSize: '13.5px', fontWeight: '800', color: BRAND.blueDark, marginBottom: '6px', textTransform: 'uppercase' }}>
                🏦 Thông tin chuyển khoản:
              </div>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, lineHeight: 1.85, fontSize: '13px', color: BRAND.slate }}>
                <li>Ngân hàng: <strong>NH Quân Đội - MB Bank</strong></li>
                <li>Số TK: <strong style={{ fontSize: '16px', color: BRAND.blueDark }}>61 1991 6886</strong></li>
                <li>Người nhận: <strong>CÔNG TY TNHH NGOAI NGU TRI THUC VIET</strong></li>
                <li>
                  Nội dung CK:{' '}
                  <strong style={{ backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '5px', color: '#92400E' }}>
                    {transferContent}
                  </strong>
                </li>
              </ul>
              <div style={{ marginTop: '8px', padding: '7px 11px', backgroundColor: BRAND.greenBadgeBg, borderLeft: `4px solid ${BRAND.greenBadge}`, borderRadius: '5px', fontSize: '12px', fontStyle: 'italic', color: '#065F46' }}>
                ✓ Mã VietQR bên cạnh đã điền sẵn số tiền &amp; nội dung chuyển khoản vào tài khoản công ty Anh ngữ Nhật Mỹ.
              </div>
            </>
          ) : (
            <div style={{ padding: '14px', backgroundColor: BRAND.greenBadgeBg, border: `1.5px solid ${BRAND.greenBadge}`, borderRadius: '10px', color: '#065F46' }}>
              <div style={{ fontWeight: '800', fontSize: '15px', marginBottom: '4px' }}>✓ HỌC PHÍ ĐÃ HOÀN TẤT</div>
              <div style={{ fontSize: '13px', lineHeight: 1.55 }}>
                Số dư từ khóa trước đã cấn trừ toàn bộ học phí và tài liệu của khóa mới. Quý Phụ huynh không cần thanh toán thêm.
              </div>
            </div>
          )}

          <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <OfficialRedSeal title="THÔNG BÁO HỌC PHÍ" subtitle="PHÒNG TÀI CHÍNH" size={82} date={getTodayVnShortDate()} />
            <span style={{ fontSize: '11.5px', color: BRAND.muted, fontStyle: 'italic' }}>
              Xác nhận công nợ &amp; học phí chính thức từ Phòng Tài chính Nhật Mỹ.
            </span>
          </div>
        </div>

        {finalAmount > 0 && (
          <div style={{ width: '196px', textAlign: 'center', flexShrink: 0 }}>
            <div style={{ border: `2px solid ${BRAND.blue}`, borderRadius: '12px', padding: '11px', backgroundColor: BRAND.white, boxShadow: '0 4px 10px rgba(13, 136, 196, 0.14)' }}>
              <div style={{ fontWeight: '800', color: BRAND.blueDark, marginBottom: '6px', fontSize: '12px', letterSpacing: '0.4px' }}>
                QUÉT ĐỂ THANH TOÁN
              </div>
              {qrDataUrl || qrUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={qrDataUrl || qrUrl}
                  alt="VietQR"
                  style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '4px' }}
                  loading="eager"
                  decoding="sync"
                  crossOrigin="anonymous"
                />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1/1', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND.subtle, fontSize: '12px' }}>
                  Đang tạo mã QR...
                </div>
              )}
              <div style={{ marginTop: '5px', fontSize: '11px', fontWeight: '800', color: BRAND.blue }}>NAPAS 24/7</div>
            </div>
          </div>
        )}
      </div>
    </BrandLetterShell>
  );
});

TuitionNoticeTemplate.displayName = 'TuitionNoticeTemplate';
export default TuitionNoticeTemplate;
