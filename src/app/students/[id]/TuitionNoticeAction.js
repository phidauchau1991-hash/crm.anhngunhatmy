'use client';

import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import TuitionNoticeTemplate from '../../components/TuitionNoticeTemplate';
import ClassSelect from '../../components/ClassSelect';
import { formatClassCode, getClassScheduleDetails } from '@/lib/classHelper';

export default function TuitionNoticeAction({ student }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const templateRef = useRef(null);

  // Form State
  const [noticeType, setNoticeType] = useState('NEW_ENROLLMENT'); // NEW_ENROLLMENT, NEXT_INSTALLMENT, CLASS_TRANSFER
  const [targetClassCode, setTargetClassCode] = useState('');
  const [displayClassName, setDisplayClassName] = useState('');
  const [displayTeacherName, setDisplayTeacherName] = useState('');
  
  // Lớp cũ (cho Chuyển lớp)
  const [oldClassCode, setOldClassCode] = useState('');
  const [oldClassName, setOldClassName] = useState('');
  const [transferCredit, setTransferCredit] = useState(0);

  // Lịch học & ca học
  const [studyDays, setStudyDays] = useState('');
  const [studyHours, setStudyHours] = useState('');

  // Học phí & thời lượng
  const [totalWeeks, setTotalWeeks] = useState(18);
  const [missedWeeks, setMissedWeeks] = useState(0);
  const [customTotalFee, setCustomTotalFee] = useState('');

  // Giáo trình
  const [includeBook, setIncludeBook] = useState(true);
  const [bookFee, setBookFee] = useState(250000);
  const [bookName, setBookName] = useState('Giáo trình');

  // Hỗ trợ / Ưu đãi
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountReason, setDiscountReason] = useState('');

  // Đợt tiếp theo
  const [installmentAmount, setInstallmentAmount] = useState(0);

  // Quà tặng & Chuyển khoản
  const [giftsText, setGiftsText] = useState('Áo thun, Balo');
  const [giftValue, setGiftValue] = useState(150000);
  const [dueDate, setDueDate] = useState('');
  const [transferContent, setTransferContent] = useState('');

  // TRỌNG TÂM 3: Mã VietQR Base64 (PNG) chống lỗi CORS và hiển thị 100%
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isQrLoading, setIsQrLoading] = useState(false);

  // 1. Fetch dữ liệu lớp học và cấu hình khi mở Modal
  useEffect(() => {
    if (isModalOpen && classes.length === 0) {
      fetch('/api/classes').then(r => r.json()).then(res => setClasses(res.data || []));
      fetch('/api/course-configs').then(r => r.json()).then(res => setConfigs(res.data || []));
    }
  }, [isModalOpen, classes.length]);

  // 2. Tự động nhận diện lớp học viên khi mở modal hoặc khi classes/configs sẵn sàng
  useEffect(() => {
    if (!isModalOpen) return;

    const enrollments = student.enrollments || [];
    const orders = (student.orders || []).filter(o => !o.id.startsWith('ORD_BK'));

    // Tìm lớp active (Đang học)
    const activeEnr = enrollments.find(e => e.status === 'Đang học') || enrollments[enrollments.length - 1];
    
    // Nếu chưa chọn targetClassCode, khởi tạo bằng lớp active
    if (!targetClassCode && activeEnr?.classCode) {
      setTargetClassCode(activeEnr.classCode);
    }

    // Tìm lớp cũ từ lịch sử
    const transferredOrder = orders.find(o => o.promoType && o.promoType.includes('Chuyển lớp từ'));
    let detectedOldCode = '';

    if (transferredOrder) {
      const match = transferredOrder.promoType.match(/Chuyển lớp từ\s+([^\s(]+)/);
      if (match && match[1]) {
        detectedOldCode = match[1];
      }
    }

    if (!detectedOldCode) {
      const oldEnr = enrollments.find(e => e.status === 'Đã chuyển lớp' || e.status === 'Đã chuyển' || e.status === 'Bảo lưu');
      if (oldEnr) {
        detectedOldCode = oldEnr.classCode;
      } else if (enrollments.length > 1) {
        const otherEnr = enrollments.find(e => e.classCode !== activeEnr?.classCode);
        if (otherEnr) detectedOldCode = otherEnr.classCode;
      }
    }

    if (detectedOldCode && !oldClassCode) {
      setOldClassCode(detectedOldCode);
      setOldClassName(formatClassCode(detectedOldCode));
      // Tự động chuyển mode sang CLASS_TRANSFER nếu học viên có dấu hiệu vừa chuyển lớp
      if (transferredOrder) {
        setNoticeType('CLASS_TRANSFER');
      }
    }
  }, [isModalOpen, student, targetClassCode, oldClassCode]);

  // 3. Tự động cập nhật thông tin lớp mới khi targetClassCode thay đổi
  useEffect(() => {
    if (!targetClassCode || classes.length === 0) return;

    const targetClass = classes.find(c => c.code === targetClassCode);
    if (!targetClass) return;

    // A. Tên hiển thị
    setDisplayClassName(formatClassCode(targetClass.code));

    // B. Giáo viên
    if (targetClass.isSubstitute && targetClass.substituteTeacherId) {
      setDisplayTeacherName(targetClass.substituteTeacherId);
    } else {
      setDisplayTeacherName(targetClass.teacherName || '');
    }

    // C. Cấu hình khóa học
    const config = configs.find(c => c.level === targetClass.level);
    if (config) {
      const weeks = config.durationWeeks || (config.totalSessions ? Math.round(config.totalSessions / 2) : 16);
      setTotalWeeks(weeks);
      if (config.bookPrice !== undefined && config.bookPrice !== null) {
        setBookFee(config.bookPrice);
      }
      if (config.bookName) {
        setBookName(config.bookName);
      }
    }

    // D. TRỌNG TÂM 1: Tự động điền ngày học & khung giờ học theo ca (SHIFT_HOURS_CONFIG)
    const scheduleDetails = getClassScheduleDetails(targetClass.code, targetClass.scheduleRaw || targetClass.schedule);
    if (scheduleDetails.daysDisplay) {
      setStudyDays(scheduleDetails.daysDisplay);
    }
    if (scheduleDetails.hours) {
      setStudyHours(scheduleDetails.hours);
    }

    // E. TRỌNG TÂM 3: Tự động sinh nội dung chuyển khoản chuẩn {TEN_HV} HP KHOA {MA_LOP}
    const nameNoAccent = (student.name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    const firstName = nameNoAccent.trim().split(/\s+/).pop().toUpperCase();
    const parts = targetClass.code.split('_');
    const shortClass = parts[1] || parts[0];
    setTransferContent(`${firstName} HP KHOA ${shortClass.toUpperCase()}`);

    // F. Dành cho NEXT_INSTALLMENT (Thu tiếp theo)
    const tuitionOrders = (student.orders || []).filter(o => !o.id.startsWith('ORD_BK'));
    const order = tuitionOrders.find(o => o.classCode === targetClassCode);
    if (order) {
      const debt = Math.max(0, order.feeToPay - order.amountPaid);
      setInstallmentAmount(debt);
      if (order.paymentDeadline) {
        setDueDate(new Date(order.paymentDeadline).toLocaleDateString('vi-VN'));
      }
    } else {
      setInstallmentAmount(0);
    }

    // G. TRỌNG TÂM 1: Tự động tính số tiền cấn trừ từ lớp cũ (transferCredit)
    if (order && (order.id.startsWith('ORD_TR') || (order.promoType && order.promoType.includes('Chuyển lớp')))) {
      if (order.promoDiscount > 0) {
        setTransferCredit(order.promoDiscount);
      } else if (config && config.price > order.feeToPay) {
        setTransferCredit(config.price - order.feeToPay);
      }
    } else {
      // Nếu không có trong order lớp mới, thử tìm từ số dư lớp cũ
      const oldOrder = tuitionOrders.find(o => o.classCode === oldClassCode);
      if (oldOrder && oldOrder.amountPaid > 0) {
        // Tạm thời nếu lớp cũ có số dư khả dụng
        const diff = Math.max(0, oldOrder.amountPaid - oldOrder.feeToPay);
        if (diff > 0) setTransferCredit(diff);
      }
    }
  }, [targetClassCode, classes, configs, oldClassCode, student.orders, student.name]);

  // Cập nhật khi chọn lớp cũ
  const handleOldClassChange = (selectedCode) => {
    setOldClassCode(selectedCode);
    setOldClassName(formatClassCode(selectedCode));

    // Tìm lại cấn trừ từ đơn hàng lớp cũ nếu có
    const tuitionOrders = (student.orders || []).filter(o => !o.id.startsWith('ORD_BK'));
    const oldOrder = tuitionOrders.find(o => o.classCode === selectedCode);
    if (oldOrder && oldOrder.amountPaid > 0) {
      const diff = Math.max(0, oldOrder.amountPaid - oldOrder.feeToPay);
      if (diff > 0) setTransferCredit(diff);
    }
  };

  // Tính toán số liệu tài chính thời gian thực
  const targetClass = classes.find(c => c.code === targetClassCode) || null;
  const config = configs.find(c => c.level === targetClass?.level) || null;
  const tuitionOrders = (student.orders || []).filter(o => !o.id.startsWith('ORD_BK'));
  const targetOrder = tuitionOrders.find(o => o.classCode === targetClassCode) || null;

  const totalFee = customTotalFee !== '' ? Number(customTotalFee) : (config?.price || 0);
  const feePerWeek = totalWeeks > 0 ? totalFee / totalWeeks : 0;
  
  // Thuật toán làm tròn tiền nghỉ học (nearest 10,000)
  const exactMissedFee = feePerWeek * missedWeeks;
  const roundedMissedFee = Math.ceil(exactMissedFee / 10000) * 10000;
  const remainingWeeks = Math.max(0, totalWeeks - missedWeeks);
  const exactRemainingFee = Math.max(0, totalFee - roundedMissedFee);
  
  // Mức hỗ trợ / Ưu đãi thêm
  let calculatedDiscount = 0;
  if (discountPercent > 0) {
    calculatedDiscount = exactRemainingFee * (discountPercent / 100);
  } else if (discountAmount > 0) {
    calculatedDiscount = Number(discountAmount);
  }
  
  let finalRemainingFee = Math.max(0, exactRemainingFee - calculatedDiscount);
  // Làm tròn xuống 5,000đ có lợi cho khách
  finalRemainingFee = Math.floor(finalRemainingFee / 5000) * 5000;
  
  // Tiền giáo trình thực tế (0 nếu bỏ tick includeBook)
  const effectiveBookFee = includeBook ? Number(bookFee || 0) : 0;

  // TÍNH TỔNG CẦN NỘP (finalAmount)
  let finalAmount = 0;
  if (noticeType === 'CLASS_TRANSFER') {
    // Chuyển lớp: Học phí lớp mới + Sách - Tiền dư cấn trừ từ lớp cũ
    finalAmount = Math.max(0, finalRemainingFee + effectiveBookFee - Number(transferCredit || 0));
  } else if (noticeType === 'NEW_ENROLLMENT') {
    // Ghi danh mới: Học phí còn lại + Sách
    finalAmount = Math.max(0, finalRemainingFee + effectiveBookFee);
  } else if (noticeType === 'NEXT_INSTALLMENT') {
    // Đợt tiếp theo: Số nợ đợt này + Sách phát sinh (nếu có)
    finalAmount = Math.max(0, Number(installmentAmount) + effectiveBookFee);
  }

  // Parse danh sách quà tặng
  const giftsArray = giftsText.split(',').map(s => s.trim()).filter(Boolean);

  // TRỌNG TÂM 3: Tự động tải mã VietQR Base64 (PNG) từ server để đảm bảo hiển thị 100% không bị chặn CORS
  useEffect(() => {
    if (finalAmount <= 0 || !transferContent) {
      setQrDataUrl('');
      return;
    }

    let isMounted = true;
    setIsQrLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vietqr?amount=${finalAmount}&addInfo=${encodeURIComponent(transferContent)}`);
        const data = await res.json();
        if (isMounted && data.success && data.qrDataURL) {
          setQrDataUrl(data.qrDataURL);
        }
      } catch (err) {
        console.error('Lỗi nạp mã VietQR:', err);
      } finally {
        if (isMounted) setIsQrLoading(false);
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [finalAmount, transferContent]);

  // Đảm bảo mã QR đã tải xong trước khi chụp ảnh thư báo
  const ensureQrReady = async () => {
    if (finalAmount <= 0) return true;
    if (qrDataUrl) return true;

    try {
      const res = await fetch(`/api/vietqr?amount=${finalAmount}&addInfo=${encodeURIComponent(transferContent)}`);
      const data = await res.json();
      if (data.success && data.qrDataURL) {
        setQrDataUrl(data.qrDataURL);
        await new Promise(r => setTimeout(r, 200));
        return true;
      }
    } catch (e) {
      console.error('Lỗi nạp nhanh QR:', e);
    }
    return false;
  };

  const getQrUrl = () => {
    if (!targetClassCode || finalAmount <= 0) return '';
    return qrDataUrl || `https://img.vietqr.io/image/970422-6119916886-cTQpC6D.jpg?amount=${finalAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=CONG%20TY%20TNHH%20NGOAI%20NGU%20TRI%20THUC%20VIET`;
  };

  const templateData = {
    noticeType,
    studentName: student.name,
    shortName: (student.name || '').trim().split(/\s+/).pop(),
    className: displayClassName || targetClassCode,
    classCode: targetClassCode,
    oldClassName: oldClassName || oldClassCode,
    studyDays,
    studyHours,
    teacherName: displayTeacherName,
    totalWeeks,
    totalFee,
    missedWeeks,
    missedFee: roundedMissedFee,
    remainingWeeks,
    originalRemainingFee: exactRemainingFee,
    discountReason: discountReason || 'Mức hỗ trợ từ Trung tâm',
    discountPercent,
    discountValue: calculatedDiscount,
    remainingFee: finalRemainingFee,
    bookFee: effectiveBookFee,
    includeBook,
    transferCredit: Number(transferCredit || 0),
    gifts: giftsArray,
    giftValue: Number(giftValue || 0),
    dueDate,
    finalAmount,
    transferContent,
    qrUrl: getQrUrl(),
    qrDataUrl,
    // Data for NEXT_INSTALLMENT
    orderTotalFee: targetOrder?.feeToPay || 0,
    orderPaidAmount: targetOrder?.amountPaid || 0,
    installmentAmount: Number(installmentAmount || 0)
  };

  // Copy ảnh vào Clipboard
  const handleCopyImage = async () => {
    if (!targetClassCode) {
      alert('Vui lòng chọn lớp học');
      return;
    }
    
    if (!templateRef.current) return;
    
    setIsGenerating(true);
    try {
      await ensureQrReady();
      // Chờ React vẽ ảnh Base64 lên DOM của templateRef
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(templateRef.current, { scale: 2, useCORS: true, logging: false });
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('✅ Đã copy thư báo vào Clipboard! Bạn có thể dán (Ctrl+V) vào Zalo ngay.');
        } catch (err) {
          console.error(err);
          alert('Trình duyệt không hỗ trợ copy ảnh trực tiếp. Sẽ tải ảnh xuống thay thế.');
          handleDownloadImage(canvas);
        }
      });
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo ảnh thư báo.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Tải ảnh xuống
  const handleDownloadImage = async (preGeneratedCanvas) => {
    if (preGeneratedCanvas && preGeneratedCanvas.toDataURL) {
      downloadCanvas(preGeneratedCanvas);
      return;
    }
    
    if (!targetClassCode) {
      alert('Vui lòng chọn lớp học');
      return;
    }

    if (!templateRef.current) return;
    
    setIsGenerating(true);
    try {
      await ensureQrReady();
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(templateRef.current, { scale: 2, useCORS: true, logging: false });
      downloadCanvas(canvas);
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tải ảnh thư báo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCanvas = (canvas) => {
    const link = document.createElement('a');
    link.download = `ThuBao_${student.name.replace(/\s+/g, '_')}_${targetClassCode}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Danh sách các lớp học viên đã từng học để chọn nhanh
  const studentEnrollments = student.enrollments || [];

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        className="btn-secondary" 
        style={{ width: '100%', marginTop: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', padding: '0.6rem', borderRadius: '8px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', transition: 'background 0.2s', boxShadow: '0 2px 4px rgba(34, 197, 94, 0.2)' }}
        onMouseOver={e => e.currentTarget.style.background = '#16a34a'}
        onMouseOut={e => e.currentTarget.style.background = '#22c55e'}
      >
        <i className="fa-solid fa-envelope-open-text"></i> Tạo Thư Báo Học Phí & QR
      </button>

      {/* Render component thư báo (ẩn) để chụp ảnh */}
      <TuitionNoticeTemplate ref={templateRef} data={templateData} />

      {isModalOpen && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="modal-content" style={{ maxWidth: '680px', width: '92%', backgroundColor: '#fff', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#0d88c4', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-envelope-open-text"></i> Cấu hình Thư Báo Học Phí & QR
              </h2>
              <button 
                className="close-btn" 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#64748b' }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="modal-body" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
              
              {/* 1. Loại thư báo */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>Loại thư báo</label>
                <select 
                  value={noticeType} 
                  onChange={(e) => setNoticeType(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1.5px solid #0d88c4', fontWeight: 'bold', color: '#0d88c4', fontSize: '14px', backgroundColor: '#f0f9ff' }}
                >
                  <option value="NEW_ENROLLMENT">1. Ghi danh mới / Học thử / Bảo lưu</option>
                  <option value="NEXT_INSTALLMENT">2. Thông báo đóng học phí đợt tiếp theo (Nợ)</option>
                  <option value="CLASS_TRANSFER">3. Thông báo chuyển lớp & cấn trừ học phí cũ</option>
                </select>
              </div>

              {/* 2. CHUYỂN LỚP: Chọn Lớp cũ & Cấn trừ */}
              {noticeType === 'CLASS_TRANSFER' && (
                <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontWeight: 'bold', color: '#166534', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-repeat"></i> Thông tin Lớp cũ & Số dư cấn trừ:
                  </div>

                  {studentEnrollments.length > 0 && (
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '0.25rem', color: '#374151' }}>
                        Chọn nhanh lớp cũ từ lịch sử học viên:
                      </label>
                      <select
                        value={oldClassCode}
                        onChange={(e) => handleOldClassChange(e.target.value)}
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      >
                        <option value="">-- Chọn lớp cũ --</option>
                        {studentEnrollments.map(enr => (
                          <option key={enr.id} value={enr.classCode}>
                            {enr.classCode} ({enr.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '0.25rem' }}>
                        Tên lớp cũ hiển thị trên thư:
                      </label>
                      <input 
                        type="text" 
                        value={oldClassName} 
                        onChange={(e) => setOldClassName(e.target.value)}
                        placeholder="VD: M3 - 24 - Ca 1"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', color: '#16a34a' }}>
                        Tiền dư cấn trừ từ lớp cũ (đ):
                      </label>
                      <input 
                        type="number" 
                        value={transferCredit} 
                        onChange={(e) => setTransferCredit(Number(e.target.value))}
                        placeholder="0"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1.5px solid #16a34a', fontWeight: 'bold', color: '#16a34a', fontSize: '14px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Lớp chuyển đến / Lớp dự kiến */}
              <div>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.4rem' }}>
                  {noticeType === 'CLASS_TRANSFER' ? 'Lớp chuyển đến (Lớp mới)' : 'Lớp học'}
                </label>
                <ClassSelect 
                  classes={classes}
                  value={targetClassCode} 
                  onChange={(e) => setTargetClassCode(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
                />
              </div>

              {/* Tên lớp & Giáo viên hiển thị */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Tên lớp hiển thị</label>
                  <input 
                    type="text" 
                    value={displayClassName} 
                    onChange={e => setDisplayClassName(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>GVCN hiển thị</label>
                  <input 
                    type="text" 
                    value={displayTeacherName} 
                    onChange={e => setDisplayTeacherName(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Lịch học & Giờ học (Tự động điền theo SHIFT_HOURS_CONFIG) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px dashed #cbd5e1' }}>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '0.25rem', color: '#0369a1' }}>
                    <i className="fa-solid fa-calendar-days" style={{ marginRight: '4px' }}></i> Ngày học:
                  </label>
                  <input 
                    type="text" 
                    value={studyDays} 
                    onChange={(e) => setStudyDays(e.target.value)}
                    placeholder="VD: Thứ 2 & Thứ 4"
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '0.25rem', color: '#0369a1' }}>
                    <i className="fa-solid fa-clock" style={{ marginRight: '4px' }}></i> Giờ học (Khung ca):
                  </label>
                  <input 
                    type="text" 
                    value={studyHours} 
                    onChange={(e) => setStudyHours(e.target.value)}
                    placeholder="VD: 17:30 - 19:00"
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Thông số khóa học (Cho NEW_ENROLLMENT và CLASS_TRANSFER) */}
              {(noticeType === 'NEW_ENROLLMENT' || noticeType === 'CLASS_TRANSFER') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Tổng số tuần toàn khóa</label>
                      <input 
                        type="number" 
                        value={totalWeeks} 
                        onChange={e => setTotalWeeks(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Số tuần vào trễ (trừ ra)</label>
                      <input 
                        type="number" 
                        value={missedWeeks} 
                        onChange={e => setMissedWeeks(Number(e.target.value))}
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* Ưu đãi / Giảm giá */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Lý do hỗ trợ / giảm giá</label>
                      <input 
                        type="text" 
                        value={discountReason} 
                        onChange={e => setDiscountReason(e.target.value)}
                        placeholder="VD: Hỗ trợ học viên chuyển lớp"
                        style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Giảm (%)</label>
                        <input 
                          type="number" 
                          value={discountPercent} 
                          onChange={e => setDiscountPercent(Number(e.target.value))}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                        />
                      </div>
                      <div style={{ flex: 1.2 }}>
                        <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Giảm (đ)</label>
                        <input 
                          type="number" 
                          value={discountAmount} 
                          onChange={e => setDiscountAmount(Number(e.target.value))}
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Thông số cho NEXT_INSTALLMENT */}
              {noticeType === 'NEXT_INSTALLMENT' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', backgroundColor: '#fff7ed', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fdba74' }}>
                  <div>
                    <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Tổng học phí toàn khóa (đ)</label>
                    <input 
                      type="text" 
                      value={targetOrder ? targetOrder.feeToPay.toLocaleString('vi-VN') : '0'} 
                      disabled
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f1f5f9', fontSize: '13px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Đã thanh toán trước (đ)</label>
                    <input 
                      type="text" 
                      value={targetOrder ? targetOrder.amountPaid.toLocaleString('vi-VN') : '0'} 
                      disabled
                      style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#f1f5f9', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.25rem', color: '#ea580c' }}>Số tiền thu đợt này (đ)</label>
                    <input 
                      type="number" 
                      value={installmentAmount} 
                      onChange={e => setInstallmentAmount(Number(e.target.value))}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '2px solid #ea580c', fontWeight: 'bold', fontSize: '15px' }}
                    />
                  </div>
                </div>
              )}

              {/* Giáo trình */}
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={includeBook} 
                    onChange={e => setIncludeBook(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Bao gồm giáo trình khóa mới:</span>
                </label>
                <div style={{ width: '180px' }}>
                  <input 
                    type="number" 
                    value={bookFee} 
                    disabled={!includeBook}
                    onChange={e => setBookFee(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'right', fontWeight: 'bold', backgroundColor: includeBook ? '#fff' : '#f1f5f9' }}
                  />
                </div>
              </div>

              {/* Quà tặng kèm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1rem', backgroundColor: '#f0fdf4', padding: '0.75rem', borderRadius: '8px' }}>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Quà tặng kèm</label>
                  <input 
                    type="text" 
                    value={giftsText} 
                    onChange={e => setGiftsText(e.target.value)}
                    placeholder="Áo thun, Balo..."
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Giá trị quà (đ)</label>
                  <input 
                    type="number" 
                    value={giftValue} 
                    onChange={e => setGiftValue(Number(e.target.value))}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Thông tin chuyển khoản & Hạn thanh toán */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontWeight: 'bold', fontSize: '13px', display: 'block', marginBottom: '0.25rem', color: '#0d88c4' }}>
                    <i className="fa-solid fa-qrcode" style={{ marginRight: '4px' }}></i> Nội dung CK (VietQR):
                  </label>
                  <input 
                    type="text" 
                    value={transferContent} 
                    onChange={e => setTransferContent(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1.5px solid #0d88c4', fontWeight: 'bold', fontSize: '13px', backgroundColor: '#fefce8' }}
                  />
                </div>
                <div>
                  <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '0.25rem' }}>Hạn chót thanh toán</label>
                  <input 
                    type="text" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)}
                    placeholder="VD: 20-08-2026"
                    style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* ======================================================== */}
              {/* TỔNG KẾT PHÂN TÍCH TÀI CHÍNH TRÊN MODAL */}
              {/* ======================================================== */}
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1.5px dashed #0d88c4', marginTop: '0.25rem' }}>
                <div style={{ fontWeight: 'bold', color: '#0d88c4', marginBottom: '0.5rem', fontSize: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.4rem' }}>
                  <i className="fa-solid fa-file-invoice-dollar"></i> Bản xem trước phân tích học phí:
                </div>

                {noticeType === 'CLASS_TRANSFER' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px' }}>
                      <span>1. Học phí khóa mới ({totalWeeks} tuần):</span>
                      <strong>{totalFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                    {missedWeeks > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px', color: '#64748b' }}>
                        <span>Trừ {missedWeeks} tuần vào trễ:</span>
                        <strong>-{roundedMissedFee.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px' }}>
                      <span>2. Giáo trình & Tài liệu:</span>
                      <strong>{effectiveBookFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px', color: '#16a34a' }}>
                      <span>3. Cấn trừ tiền dư từ khóa trước ({oldClassName || 'cũ'}):</span>
                      <strong>-{Number(transferCredit || 0).toLocaleString('vi-VN')} đ</strong>
                    </div>
                    {calculatedDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px', color: '#ca8a04' }}>
                        <span>Mức hỗ trợ từ Trung tâm:</span>
                        <strong>-{calculatedDiscount.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    )}
                  </>
                )}

                {noticeType === 'NEW_ENROLLMENT' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px' }}>
                      <span>Học phí toàn khóa ({totalWeeks} tuần):</span>
                      <strong>{totalFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                    {missedWeeks > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px', color: '#64748b' }}>
                        <span>Trừ tiền {missedWeeks} tuần vào trễ:</span>
                        <strong>-{roundedMissedFee.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    )}
                    {calculatedDiscount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px', color: '#16a34a' }}>
                        <span>Mức hỗ trợ ({discountPercent > 0 ? `${discountPercent}%` : 'Trực tiếp'}):</span>
                        <strong>-{calculatedDiscount.toLocaleString('vi-VN')} đ</strong>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px' }}>
                      <span>Tiền giáo trình:</span>
                      <strong>{effectiveBookFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                  </>
                )}

                {noticeType === 'NEXT_INSTALLMENT' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px', color: '#ea580c' }}>
                      <span>Số tiền thu đợt này:</span>
                      <strong>{Number(installmentAmount).toLocaleString('vi-VN')} đ</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '13px' }}>
                      <span>Tiền giáo trình phát sinh:</span>
                      <strong>{effectiveBookFee.toLocaleString('vi-VN')} đ</strong>
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #cbd5e1', paddingTop: '0.5rem', marginTop: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '15px' }}>TỔNG CẦN HOÀN THÀNH:</span>
                  <strong style={{ color: finalAmount > 0 ? '#dc2626' : '#16a34a', fontSize: '1.35rem' }}>
                    {finalAmount.toLocaleString('vi-VN')} đ
                  </strong>
                </div>
              </div>

              {/* Hộp xem trước trực quan Mã VietQR */}
              <div style={{ background: finalAmount > 0 ? '#f0fdf4' : '#f8fafc', padding: '0.85rem 1rem', borderRadius: '8px', border: finalAmount > 0 ? '1.5px solid #86efac' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {finalAmount > 0 ? (
                  <>
                    <div style={{ width: '64px', height: '64px', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid #0d88c4', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="QR Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      ) : (
                        <div style={{ fontSize: '11px', textAlign: 'center', color: '#64748b', padding: '4px' }}>
                          {isQrLoading ? <i className="fa-solid fa-spinner fa-spin" style={{ color: '#0d88c4' }}></i> : 'Chờ QR'}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '13px', color: qrDataUrl ? '#166534' : '#0369a1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="fa-solid fa-qrcode"></i>
                        {qrDataUrl ? 'Mã VietQR MB Bank: Sẵn sàng xuất thư ảnh ✅' : (isQrLoading ? 'Đang tạo mã VietQR tự động...' : 'Đang chuẩn bị mã VietQR...')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '3px' }}>
                        Số tiền: <strong style={{ color: '#dc2626' }}>{finalAmount.toLocaleString('vi-VN')} đ</strong> | Cú pháp: <strong style={{ color: '#0d88c4' }}>{transferContent}</strong>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '13px', color: '#166534', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-circle-check"></i>
                    Học phí đã được cấn trừ đủ (0 đ) - Thư báo sẽ tự động hiển thị thông báo hoàn tất không cần thu thêm.
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{ padding: '1rem 1.25rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '0.75rem', background: '#f8fafc' }}>
              <button 
                onClick={handleCopyImage} 
                className="btn-primary" 
                style={{ flex: 1.2, padding: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#0d88c4', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                disabled={isGenerating}
              >
                {isGenerating ? 'Đang xuất ảnh...' : <><i className="fa-solid fa-copy"></i> Copy Ảnh Thư Báo (Dán Zalo)</>}
              </button>
              <button 
                onClick={() => handleDownloadImage()} 
                className="btn-secondary" 
                style={{ flex: 1, padding: '0.7rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                disabled={isGenerating}
              >
                <i className="fa-solid fa-download"></i> Tải Ảnh Xuống
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
