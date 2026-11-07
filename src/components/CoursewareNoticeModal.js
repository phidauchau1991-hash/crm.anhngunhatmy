'use client';

import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  AVAILABLE_COURSEWARE_BOOKS,
  getBookCodesFromClass,
  parseCustomBookCodes,
  getEffectiveBooksForStudent,
} from '@/lib/coursewareBooks';
import { renderStudentCardCanvas, canvasToPngBlob } from '@/lib/studentCardCanvas';

export default function CoursewareNoticeModal({
  isOpen,
  onClose,
  students = [],
  classInfo = null,
  onStudentUpdated = null,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [copying, setCopying] = useState(false);
  const [savingBooks, setSavingBooks] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [toastMessage, setToastMessage] = useState(null);

  // Danh sách customBookCodes được chọn tạm thời cho học viên hiện tại
  const [customBooksMap, setCustomBooksMap] = useState({});
  const [retainAccessMap, setRetainAccessMap] = useState({});

  const studentList = Array.isArray(students) ? students : [students].filter(Boolean);
  const activeStudent = studentList[currentIndex] || null;

  // Khởi tạo state sách tùy chỉnh khi danh sách học viên thay đổi
  useEffect(() => {
    if (studentList.length > 0) {
      const initialMap = {};
      const initialRetain = {};
      studentList.forEach(std => {
        const parsed = parseCustomBookCodes(std.customBookCodes);
        if (parsed.length > 0) {
          initialMap[std.id] = parsed;
        } else {
          const cls = classInfo || {
            code: std.classCode || '',
            level: std.level || std.classCode || '',
          };
          initialMap[std.id] = getBookCodesFromClass(cls);
        }
        initialRetain[std.id] = Boolean(std.retainCoursewareAccess);
      });
      setCustomBooksMap(initialMap);
      setRetainAccessMap(initialRetain);
      setCurrentIndex(0);
    }
  }, [students]);

  // Toast tự tắt sau 3 giây
  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Tính toán danh sách giáo trình thực tế cho học viên hiện tại
  const currentCustomCodes = activeStudent ? (customBooksMap[activeStudent.id] || []) : [];
  const currentRetainAccess = activeStudent ? Boolean(retainAccessMap[activeStudent.id]) : false;

  const currentEffectiveBooks = React.useMemo(() => {
    if (!activeStudent) return [];
    const cls = classInfo || {
      code: activeStudent.classCode || '',
      level: activeStudent.level || activeStudent.classCode || '',
    };
    const classBooks = getBookCodesFromClass(cls);
    const bookCodes = (currentCustomCodes && currentCustomCodes.length > 0)
      ? currentCustomCodes
      : classBooks;
    return bookCodes.map(code => {
      const found = AVAILABLE_COURSEWARE_BOOKS.find(b => b.code.toLowerCase() === code.toLowerCase());
      return found || { code, title: code.toUpperCase(), color: '#0D88C4' };
    });
  }, [activeStudent, classInfo, currentCustomCodes]);

  // Vẽ thẻ lên Canvas và cập nhật URL xem trước
  useEffect(() => {
    if (!isOpen || !activeStudent) return;

    let isCancelled = false;
    const generatePreview = async () => {
      setLoadingPreview(true);
      try {
        const cls = classInfo || {
          code: activeStudent.classCode || '',
          level: activeStudent.level || activeStudent.classCode || '',
        };
        const canvas = await renderStudentCardCanvas({
          student: activeStudent,
          classInfo: cls,
          customBooks: currentEffectiveBooks,
          portalToken: activeStudent.portalToken || activeStudent.parentPortalToken || '',
          issuedDate: new Date(),
        });

        if (!isCancelled) {
          const dataUrl = canvas.toDataURL('image/png');
          setCurrentPreviewUrl(dataUrl);
        }
      } catch (err) {
        console.error('Lỗi tạo ảnh thẻ học viên:', err);
      } finally {
        if (!isCancelled) setLoadingPreview(false);
      }
    };

    generatePreview();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeStudent, currentEffectiveBooks, classInfo]);

  // Bật/tắt một mã sách giáo trình cho học viên hiện tại
  const toggleBookCode = (bookCode) => {
    if (!activeStudent) return;
    const stdId = activeStudent.id;
    const currentList = customBooksMap[stdId] || [];
    let updatedList;
    if (currentList.includes(bookCode)) {
      updatedList = currentList.filter(c => c !== bookCode);
    } else {
      updatedList = [...currentList, bookCode];
    }
    setCustomBooksMap(prev => ({
      ...prev,
      [stdId]: updatedList,
    }));
  };

  // Lưu cấu hình giáo trình vào CSDL CRM cho học viên hiện tại
  const handleSaveStudentBooks = async () => {
    if (!activeStudent) return;
    setSavingBooks(true);
    try {
      const stdId = activeStudent.id;
      const codes = customBooksMap[stdId] || [];
      const retain = Boolean(retainAccessMap[stdId]);

      const res = await fetch(`/api/students/${stdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'courseware',
          customBookCodes: codes,
          retainCoursewareAccess: retain,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast('✅ Đã lưu phân quyền giáo trình vào CRM thành công!');
        if (onStudentUpdated) {
          onStudentUpdated(stdId, codes, retain);
        }
      } else {
        showToast('❌ Lỗi khi lưu: ' + (data.error || 'Thất bại'), 'error');
      }
    } catch (err) {
      console.error('Lỗi khi lưu sách học viên:', err);
      showToast('❌ Lỗi kết nối server', 'error');
    } finally {
      setSavingBooks(false);
    }
  };

  // Copy ảnh thư báo hiện tại vào Clipboard để dán thẳng vào Zalo
  const handleCopyCurrentImage = async () => {
    if (!activeStudent) return;
    setCopying(true);
    try {
      const cls = classInfo || {
        code: activeStudent.classCode || '',
        level: activeStudent.level || activeStudent.classCode || '',
      };
      const canvas = await renderStudentCardCanvas({
        student: activeStudent,
        classInfo: cls,
        customBooks: currentEffectiveBooks,
        portalToken: activeStudent.portalToken || activeStudent.parentPortalToken || '',
      });

      const blob = await canvasToPngBlob(canvas);

      if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('✅ Đã copy Thư vào bộ nhớ tạm! Mở Zalo và dán (Ctrl+V) ngay cho Ba Mẹ bé.');
      } else {
        // Fallback tự động tải file nếu trình duyệt chặn write
        saveAs(blob, `Thu_Hoc_Lieu_${activeStudent.id}_${activeStudent.name.replace(/\s+/g, '_')}.png`);
        showToast('Trình duyệt không hỗ trợ dán trực tiếp. Đã tự động tải file ảnh về máy.');
      }
    } catch (err) {
      console.error('Lỗi khi copy ảnh:', err);
      showToast('Không thể copy ảnh. Vui lòng sử dụng nút Tải Ảnh PNG.', 'error');
    } finally {
      setCopying(false);
    }
  };

  // Tải ảnh PNG cho học viên hiện tại
  const handleDownloadCurrentImage = async () => {
    if (!activeStudent) return;
    try {
      const cls = classInfo || {
        code: activeStudent.classCode || '',
        level: activeStudent.level || activeStudent.classCode || '',
      };
      const canvas = await renderStudentCardCanvas({
        student: activeStudent,
        classInfo: cls,
        customBooks: currentEffectiveBooks,
        portalToken: activeStudent.portalToken || activeStudent.parentPortalToken || '',
      });

      const blob = await canvasToPngBlob(canvas);
      const studentCleanName = (activeStudent.name || 'HV').replace(/\s+/g, '_');
      saveAs(blob, `Thu_Hoc_Lieu_${activeStudent.id}_${studentCleanName}.png`);
      showToast(`✅ Đã tải thư của bé ${activeStudent.name}!`);
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
      showToast('Không thể tải ảnh: ' + err.message, 'error');
    }
  };

  // Xuất toàn bộ file ảnh thành tệp nén ZIP cho cả lớp / danh sách đã chọn
  const handleExportAllZip = async () => {
    if (studentList.length === 0) return;
    setIsZipping(true);
    setZipProgress({ current: 0, total: studentList.length });

    try {
      const zip = new JSZip();
      const folderName = classInfo?.code ? `Thu_Hoc_Lieu_Lop_${classInfo.code}` : 'Thu_Hoc_Lieu_Nhat_My';
      const imgFolder = zip.folder(folderName);

      for (let i = 0; i < studentList.length; i++) {
        const std = studentList[i];
        setZipProgress({ current: i + 1, total: studentList.length });

        const cls = classInfo || {
          code: std.classCode || '',
          level: std.level || std.classCode || '',
        };

        const stdBooks = getEffectiveBooksForStudent(
          { ...std, customBookCodes: customBooksMap[std.id] || std.customBookCodes },
          cls
        );

        const canvas = await renderStudentCardCanvas({
          student: std,
          classInfo: cls,
          customBooks: stdBooks,
          portalToken: std.portalToken || std.parentPortalToken || '',
        });

        const blob = await canvasToPngBlob(canvas);
        const fileName = `${String(i + 1).padStart(2, '0')}_${std.id}_${(std.name || 'HV').replace(/\s+/g, '_')}.png`;
        imgFolder.file(fileName, blob);
      }

      showToast('📦 Đang đóng gói tệp ZIP...');
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `${folderName}.zip`);
      showToast(`🎉 Đã xuất thành công toàn bộ ${studentList.length} thư học liệu vào file ZIP!`);
    } catch (err) {
      console.error('Lỗi khi xuất tệp ZIP:', err);
      showToast('Lỗi khi đóng gói ZIP: ' + err.message, 'error');
    } finally {
      setIsZipping(false);
    }
  };

  if (!isOpen || studentList.length === 0) return null;

  return (
    <div className="courseware-modal-backdrop" style={styles.backdrop}>
      <div className="courseware-modal-container" style={styles.container}>
        
        {/* HEADER MODAL */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={styles.headerIcon}>
              <i className="fa-solid fa-id-card"></i>
            </div>
            <div>
              <h2 style={styles.headerTitle}>
                THƯ THÔNG BÁO CẤP PHÁT TÀI KHOẢN HỌC LIỆU SỐ
              </h2>
              <p style={styles.headerSubtitle}>
                {studentList.length > 1
                  ? `Xuất thư hàng loạt cho ${studentList.length} học viên ${classInfo ? `• Lớp ${classInfo.code}` : ''}`
                  : `Học viên: ${activeStudent?.name || activeStudent?.fullName || "Học viên"} (${activeStudent?.id}) • Lớp: ${activeStudent?.classCode || 'Chưa xếp lớp'}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Đóng">
            <i className="fa-solid fa-times"></i>
          </button>
        </div>

        {/* TOAST THÔNG BÁO NHANH */}
        {toastMessage && (
          <div
            style={{
              ...styles.toast,
              background: toastMessage.type === 'error' ? '#EF4444' : '#059669',
            }}
          >
            {toastMessage.text}
          </div>
        )}

        {/* TIẾN TRÌNH XUẤT ZIP NẾU ĐANG CHẠY */}
        {isZipping && (
          <div style={styles.progressBanner}>
            <i className="fa-solid fa-spinner fa-spin"></i>
            <span>
              Đang tạo ảnh hàng loạt và đóng gói ZIP ({zipProgress.current}/{zipProgress.total} học viên)... Vui lòng không đóng trang!
            </span>
          </div>
        )}

        {/* NỘI DUNG CHÍNH (CHIA 2 CỘT: XEM TRƯỚC VÀ CẤU HÌNH) */}
        <div style={styles.bodyGrid}>
          
          {/* CỘT TRÁI: XEM TRƯỚC THẺ HỌC VIÊN DẠNG ẢNH SẮC NÉT */}
          <div style={styles.previewColumn}>
            {/* Thanh điều hướng Carousel nếu có nhiều hơn 1 học viên */}
            {studentList.length > 1 && (
              <div style={styles.carouselBar}>
                <button
                  disabled={currentIndex === 0 || isZipping}
                  onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                  style={{ ...styles.navBtn, opacity: currentIndex === 0 ? 0.4 : 1 }}
                >
                  <i className="fa-solid fa-chevron-left"></i> Trước
                </button>
                <div style={styles.carouselIndicator}>
                  <strong>Học viên {currentIndex + 1} / {studentList.length}</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748B', display: 'block' }}>
                    {activeStudent?.name || activeStudent?.fullName || "Học viên"} ({activeStudent?.id})
                  </span>
                </div>
                <button
                  disabled={currentIndex === studentList.length - 1 || isZipping}
                  onClick={() => setCurrentIndex(prev => Math.min(studentList.length - 1, prev + 1))}
                  style={{ ...styles.navBtn, opacity: currentIndex === studentList.length - 1 ? 0.4 : 1 }}
                >
                  Sau <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            )}

            {/* Vùng hiển thị ảnh xem trước */}
            <div style={styles.previewBox}>
              {loadingPreview ? (
                <div style={styles.loadingBox}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#0D88C4' }}></i>
                  <p style={{ marginTop: '0.75rem', fontWeight: '600', color: '#475569' }}>
                    Đang dựng Thẻ học viên & Mã QR cá nhân...
                  </p>
                </div>
              ) : currentPreviewUrl ? (
                <img
                  src={currentPreviewUrl}
                  alt={`Thẻ học viên ${activeStudent?.name || activeStudent?.fullName || "Học viên"}`}
                  style={styles.previewImage}
                />
              ) : (
                <p>Không có dữ liệu xem trước</p>
              )}
            </div>

            {/* Thao tác nhanh cho học viên hiện tại */}
            <div style={styles.actionRow}>
              <button
                type="button"
                onClick={handleCopyCurrentImage}
                disabled={copying || loadingPreview}
                style={styles.copyBtn}
              >
                <i className={`fa-solid ${copying ? 'fa-spinner fa-spin' : 'fa-copy'}`}></i>
                {copying ? 'Đang sao chép...' : '📋 Copy Thư (Dán Zalo)'}
              </button>

              <button
                type="button"
                onClick={handleDownloadCurrentImage}
                disabled={loadingPreview}
                style={styles.downloadBtn}
              >
                <i className="fa-solid fa-download"></i> Tải Ảnh PNG
              </button>
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN & TÙY CHỈNH GIÁO TRÌNH */}
          <div style={styles.settingsColumn}>
            
            {/* THÔNG TIN HỌC VIÊN HIỆN TẠI */}
            <div style={styles.sectionCard}>
              <h3 style={styles.sectionTitle}>
                <i className="fa-solid fa-user-graduate" style={{ color: '#0D88C4' }}></i> Thông Tin Học Viên
              </h3>
              <div style={styles.infoGrid}>
                <div>
                  <span style={styles.infoLabel}>Họ và tên:</span>
                  <strong style={styles.infoValue}>{activeStudent?.name || activeStudent?.fullName || "Học viên"}</strong>
                </div>
                <div>
                  <span style={styles.infoLabel}>Mã học viên:</span>
                  <span style={{ ...styles.infoValue, color: '#0D88C4', fontFamily: 'monospace' }}>
                    {activeStudent?.id}
                  </span>
                </div>
                <div>
                  <span style={styles.infoLabel}>Lớp học:</span>
                  <strong style={styles.infoValue}>{activeStudent?.classCode || 'Chưa xếp lớp'}</strong>
                </div>
                <div>
                  <span style={styles.infoLabel}>Số điện thoại:</span>
                  <span style={styles.infoValue}>{activeStudent?.phone || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* TÙY CHỌN 1, 2, 3 HOẶC NHIỀU GIÁO TRÌNH */}
            <div style={styles.sectionCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h3 style={styles.sectionTitle}>
                  <i className="fa-solid fa-book-bookmark" style={{ color: '#FFCA29' }}></i> Phân Quyền Giáo Trình (1..N Bộ Sách)
                </h3>
                <button
                  type="button"
                  onClick={handleSaveStudentBooks}
                  disabled={savingBooks}
                  style={styles.saveBtn}
                >
                  <i className={`fa-solid ${savingBooks ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                  {savingBooks ? 'Đang lưu...' : 'Lưu vào CRM'}
                </button>
              </div>

              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0 0 0.85rem 0' }}>
                Tick chọn các bộ giáo trình tương tác được cấp phát cho học viên này. Thẻ và mã QR sẽ tự động cập nhật ngay lập tức:
              </p>

              <div style={styles.bookGrid}>
                {AVAILABLE_COURSEWARE_BOOKS.map(book => {
                  const isChecked = currentEffectiveBooks.some(b => b.code.toLowerCase() === book.code.toLowerCase());
                  return (
                    <label
                      key={book.code}
                      style={{
                        ...styles.bookCheckboxLabel,
                        borderColor: isChecked ? '#0B2A4A' : '#E2E8F0',
                        background: isChecked ? 'rgba(11, 42, 74, 0.04)' : '#FFFFFF',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBookCode(book.code)}
                        style={{ accentColor: '#0B2A4A', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: isChecked ? '700' : '500', color: '#0F172A', fontSize: '0.9rem' }}>
                          {book.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {book.level}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* TÙY CHỌN GIỮ QUYỀN HỌC LIỆU KHI TẠM NGHỈ / NGHỈ LUÔN */}
              <div style={styles.retainOptionBox}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={currentRetainAccess}
                    onChange={(e) => {
                      if (!activeStudent) return;
                      setRetainAccessMap(prev => ({
                        ...prev,
                        [activeStudent.id]: e.target.checked,
                      }));
                    }}
                    style={{ accentColor: '#059669', width: '17px', height: '17px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.88rem', color: '#059669' }}>
                      Giữ quyền học liệu số khi Tạm nghỉ / Nghỉ luôn
                    </strong>
                    <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                      Hỗ trợ các em có hoàn cảnh khó khăn hoặc cần ôn tập tiếp tục sử dụng web app tại nhà.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* KHỐI XUẤT HÀNG LOẠT CHO TOÀN BỘ DANH SÁCH / LỚP HỌC */}
            {studentList.length > 1 && (
              <div style={styles.batchSectionCard}>
                <h3 style={{ ...styles.sectionTitle, color: '#0D88C4' }}>
                  <i className="fa-solid fa-file-zipper" style={{ color: '#059669' }}></i> Xuất File Hàng Loạt
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#475569', margin: '0.25rem 0 0.85rem 0' }}>
                  Đóng gói toàn bộ <strong>{studentList.length} thư học viên</strong> thành một tệp ZIP ảnh PNG sắc nét (Retina 2x) để lưu trữ hoặc gửi phụ huynh qua Zalo.
                </p>
                <button
                  type="button"
                  onClick={handleExportAllZip}
                  disabled={isZipping}
                  style={styles.zipBtn}
                >
                  <i className={`fa-solid ${isZipping ? 'fa-spinner fa-spin' : 'fa-file-zipper'}`}></i>
                  {isZipping ? `Đang nén ${zipProgress.current}/${zipProgress.total}...` : `📦 Tải Toàn Bộ ${studentList.length} Thư (File ZIP)`}
                </button>
              </div>
            )}

            {/* HƯỚNG DẪN DÀNH CHO THẦY CÔ / NHÂN SỰ CRM */}
            <div style={styles.guideCard}>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.85rem', color: '#0D88C4', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="fa-solid fa-lightbulb" style={{ color: '#FFCA29' }}></i> Mẹo gửi Zalo cho Phụ huynh:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                <li>Nhấn nút <strong>📋 Copy Thư (Dán Zalo)</strong> để chép trực tiếp ảnh độ phân giải cao vào Clipboard.</li>
                <li>Mở cửa sổ chat Zalo với Ba Mẹ, nhấn phím <strong>Ctrl + V</strong> và bấm <strong>Gửi</strong> ngay.</li>
                <li>Phụ huynh dùng camera quét mã QR là vào học ngay lập tức, không lo quên mật khẩu!</li>
              </ul>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '1rem',
  },
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '1100px',
    maxHeight: '94vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
    overflow: 'hidden',
    border: '1px solid #CBD5E1',
  },
  header: {
    padding: '1.1rem 1.5rem',
    backgroundColor: '#0D88C4',
    color: '#FFFFFF',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '3px solid #FFCA29',
  },
  headerIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 202, 41, 0.25)',
    color: '#FFCA29',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.15rem',
    fontWeight: '800',
    letterSpacing: '0.5px',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    margin: '0.2rem 0 0 0',
    fontSize: '0.85rem',
    color: '#E2E8F0',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#E2E8F0',
    fontSize: '1.4rem',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '8px',
  },
  toast: {
    padding: '0.65rem 1.25rem',
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: '700',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
  },
  progressBanner: {
    padding: '0.65rem 1rem',
    backgroundColor: '#EFF6FF',
    borderBottom: '1px solid #BFDBFE',
    color: '#1E40AF',
    fontSize: '0.85rem',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  bodyGrid: {
    display: 'grid',
    gridTemplateColumns: '1.15fr 1fr',
    gap: '1.25rem',
    padding: '1.25rem',
    overflowY: 'auto',
    flex: 1,
  },
  previewColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  carouselBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#FFFFFF',
    borderRadius: '10px',
    border: '1px solid #E2E8F0',
    marginBottom: '0.75rem',
  },
  navBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: '#0B2A4A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  carouselIndicator: {
    textAlign: 'center',
    fontSize: '0.9rem',
    color: '#0F172A',
  },
  previewBox: {
    width: '100%',
    maxHeight: '520px',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflowY: 'auto',
    padding: '0.75rem',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.04)',
  },
  previewImage: {
    maxWidth: '100%',
    height: 'auto',
    maxHeight: '500px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    display: 'block',
  },
  loadingBox: {
    padding: '3rem',
    textAlign: 'center',
  },
  actionRow: {
    display: 'flex',
    gap: '0.75rem',
    width: '100%',
    marginTop: '0.85rem',
  },
  copyBtn: {
    flex: 1.3,
    padding: '0.75rem 1rem',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
  },
  downloadBtn: {
    flex: 1,
    padding: '0.75rem 1rem',
    backgroundColor: '#0B2A4A',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  settingsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    padding: '1rem',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.6rem',
    marginTop: '0.65rem',
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.75rem',
    color: '#64748B',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: '0.88rem',
    color: '#0F172A',
    fontWeight: '700',
  },
  saveBtn: {
    padding: '0.4rem 0.85rem',
    backgroundColor: '#FFCA29',
    color: '#095B83',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.82rem',
    fontWeight: '800',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    boxShadow: '0 2px 4px rgba(255, 202, 41, 0.3)',
  },
  bookGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.5rem',
  },
  bookCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.65rem',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  retainOptionBox: {
    marginTop: '0.75rem',
    padding: '0.65rem 0.85rem',
    backgroundColor: 'rgba(5, 150, 105, 0.06)',
    borderRadius: '8px',
    border: '1px solid rgba(5, 150, 105, 0.25)',
  },
  batchSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #CBD5E1',
    padding: '1rem',
    background: 'linear-gradient(to right, #FFFFFF, #F8FAFC)',
  },
  zipBtn: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#0D88C4',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontSize: '0.92rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 2px 5px rgba(13, 136, 196, 0.25)',
  },
  guideCard: {
    backgroundColor: 'rgba(13, 136, 196, 0.08)',
    border: '1px solid rgba(13, 136, 196, 0.25)',
    borderRadius: '10px',
    padding: '0.85rem',
  },
};
