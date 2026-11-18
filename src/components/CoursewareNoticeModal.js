'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  AVAILABLE_COURSEWARE_BOOKS,
  getBookCodesFromClass,
  parseCustomBookCodes,
  getEffectiveBooksForStudent,
} from '@/lib/coursewareBooks';
import { renderStudentCardCanvas, canvasToPngBlob } from '@/lib/studentCardCanvas';
import { toVnDateInputValue, formatCoursewareExpiryVi } from '@/lib/coursewareAccess';

function addDaysVnInput(days) {
  const target = new Date(Date.now() + days * 86400000);
  return toVnDateInputValue(target);
}

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
  const [savingAllBooks, setSavingAllBooks] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const [toastMessage, setToastMessage] = useState(null);

  // Bộ chọn & Lọc học viên hàng loạt
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'unexported' | 'exported'

  // Bản đồ cấu hình sách & quyền lưu tạm
  const [customBooksMap, setCustomBooksMap] = useState({});
  const [retainAccessMap, setRetainAccessMap] = useState({});
  const [blockedMap, setBlockedMap] = useState({});
  const [blockedReasonMap, setBlockedReasonMap] = useState({});
  const [expiresAtMap, setExpiresAtMap] = useState({});
  const [togglingBlock, setTogglingBlock] = useState(false);
  const [exportedMap, setExportedMap] = useState({});

  // Ghi nhớ ID học viên đang xem để KHÔNG bị nhảy về học viên đầu tiên khi re-render
  const activeStudentIdRef = useRef(null);

  const studentList = useMemo(() => {
    return Array.isArray(students) ? students : [students].filter(Boolean);
  }, [students]);

  const isBatchMode = studentList.length > 1;

  // Học viên đang được xem trước & chỉnh sửa
  const activeStudent = studentList[currentIndex] || null;

  // Cập nhật ref mỗi khi activeStudent thay đổi
  useEffect(() => {
    if (activeStudent?.id) {
      activeStudentIdRef.current = activeStudent.id;
    }
  }, [activeStudent]);

  // Reset map tạm khi đóng modal để lần mở sau luôn đồng bộ mới nhất từ CRM
  useEffect(() => {
    if (!isOpen) {
      setCustomBooksMap({});
      setRetainAccessMap({});
      setBlockedMap({});
      setBlockedReasonMap({});
      setExpiresAtMap({});
      setExportedMap({});
    }
  }, [isOpen]);

  // Khởi tạo và đồng bộ state sách khi danh sách học viên hoặc lớp học thay đổi
  useEffect(() => {
    if (isOpen && studentList.length > 0) {
      setCustomBooksMap(prev => {
        const next = { ...prev };
        studentList.forEach(std => {
          // Chỉ khởi tạo nếu học viên này chưa có trong map (tránh đè mất các bộ sách người dùng đã tick)
          if (!next[std.id]) {
            const parsed = parseCustomBookCodes(std.customBookCodes);
            if (parsed.length > 0) {
              next[std.id] = parsed;
            } else {
              const cls = classInfo || {
                code: std.classCode || '',
                level: std.level || std.classCode || '',
              };
              next[std.id] = getBookCodesFromClass(cls);
            }
          }
        });
        return next;
      });

      setRetainAccessMap(prev => {
        const next = { ...prev };
        studentList.forEach(std => {
          if (next[std.id] === undefined) {
            next[std.id] = Boolean(std.retainCoursewareAccess);
          }
        });
        return next;
      });

      setBlockedMap(prev => {
        const next = { ...prev };
        studentList.forEach(std => {
          if (next[std.id] === undefined) {
            next[std.id] = Boolean(std.coursewareBlocked);
          }
        });
        return next;
      });

      setBlockedReasonMap(prev => {
        const next = { ...prev };
        studentList.forEach(std => {
          if (next[std.id] === undefined) {
            next[std.id] = std.coursewareBlockedReason || '';
          }
        });
        return next;
      });

      setExpiresAtMap(prev => {
        const next = { ...prev };
        studentList.forEach(std => {
          if (next[std.id] === undefined) {
            next[std.id] = toVnDateInputValue(std.coursewareExpiresAt);
          }
        });
        return next;
      });

      setExportedMap(prev => {
        const next = { ...prev };
        studentList.forEach(std => {
          if (next[std.id] === undefined || std.coursewareLetterExportedAt) {
            next[std.id] = std.coursewareLetterExportedAt || null;
          }
        });
        return next;
      });

      setSelectedStudentIds(prev => {
        if (prev.length === 0) return studentList.map(s => s.id);
        const validIds = prev.filter(id => studentList.some(s => s.id === id));
        return validIds.length > 0 ? validIds : studentList.map(s => s.id);
      });

      // GIỮ NGUYÊN VỊ TRÍ HỌC VIÊN ĐANG CHỌN, TUYỆT ĐỐI KHÔNG RESET VỀ 0!
      if (activeStudentIdRef.current) {
        const foundIdx = studentList.findIndex(s => s.id === activeStudentIdRef.current);
        if (foundIdx !== -1) {
          setCurrentIndex(foundIdx);
        } else {
          setCurrentIndex(0);
        }
      }
    }
  }, [isOpen, studentList, classInfo]);

  // Thông báo Toast tự tắt
  const showToast = (msg, type = 'success') => {
    setToastMessage({ text: msg, type });
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Danh sách học viên được lọc theo tìm kiếm và trạng thái
  const filteredStudents = useMemo(() => {
    return studentList.filter(std => {
      const isExp = Boolean(exportedMap[std.id]);
      if (filterMode === 'unexported' && isExp) return false;
      if (filterMode === 'exported' && !isExp) return false;

      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase().trim();
        const nameMatch = (std.name || std.fullName || '').toLowerCase().includes(q);
        const idMatch = (std.id || '').toLowerCase().includes(q);
        return nameMatch || idMatch;
      }
      return true;
    });
  }, [studentList, exportedMap, filterMode, searchKeyword]);

  // Thống kê số lượng xuất thư
  const stats = useMemo(() => {
    const total = studentList.length;
    let exported = 0;
    studentList.forEach(s => {
      if (exportedMap[s.id]) exported++;
    });
    return {
      total,
      exported,
      unexported: total - exported,
      selected: selectedStudentIds.length,
    };
  }, [studentList, exportedMap, selectedStudentIds]);

  // Bật/tắt chọn 1 học viên
  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Chọn tất cả
  const handleSelectAll = () => {
    setSelectedStudentIds(studentList.map(s => s.id));
  };

  // Bỏ chọn tất cả
  const handleDeselectAll = () => {
    setSelectedStudentIds([]);
  };

  // Chỉ chọn những bạn chưa xuất thư
  const handleSelectUnexportedOnly = () => {
    const unexportedIds = studentList.filter(s => !exportedMap[s.id]).map(s => s.id);
    setSelectedStudentIds(unexportedIds);
    if (unexportedIds.length === 0) {
      showToast('Tất cả học viên trong lớp đều đã được xuất thư!');
    } else {
      showToast(`Đã chọn nhanh ${unexportedIds.length} học viên chưa xuất thư.`);
    }
  };

  // Đánh dấu học viên đã xuất thư vào hệ thống & CSDL
  const markStudentExported = async (stdId) => {
    const nowIso = new Date().toISOString();
    setExportedMap(prev => ({ ...prev, [stdId]: nowIso }));
    try {
      await fetch(`/api/students/${stdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markCoursewareExported' }),
      });
      if (onStudentUpdated) {
        onStudentUpdated(stdId, { coursewareLetterExportedAt: nowIso });
      }
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái xuất thư:', err);
    }
  };

  // Đánh dấu hàng loạt học viên đã xuất thư
  const markBatchExported = async (stdIds) => {
    const nowIso = new Date().toISOString();
    setExportedMap(prev => {
      const updated = { ...prev };
      stdIds.forEach(id => { updated[id] = nowIso; });
      return updated;
    });
    try {
      await fetch('/api/students/courseware-batch-exported', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: stdIds }),
      });
      if (onStudentUpdated) {
        onStudentUpdated(stdIds, { coursewareLetterExportedAt: nowIso });
      }
    } catch (err) {
      console.error('Lỗi cập nhật xuất thư hàng loạt:', err);
    }
  };

  // Tính toán danh sách giáo trình & trạng thái kiểm soát cho học viên hiện tại
  const currentCustomCodes = activeStudent ? (customBooksMap[activeStudent.id] || []) : [];
  const currentRetainAccess = activeStudent ? Boolean(retainAccessMap[activeStudent.id]) : false;
  const currentBlocked = activeStudent ? Boolean(blockedMap[activeStudent.id]) : false;
  const currentBlockedReason = activeStudent ? (blockedReasonMap[activeStudent.id] || '') : '';
  const currentExpiresAt = activeStudent ? (expiresAtMap[activeStudent.id] || '') : '';
  const todayVnStr = toVnDateInputValue(new Date());
  const isCurrentExpired = Boolean(currentExpiresAt && todayVnStr && currentExpiresAt < todayVnStr);

  const currentEffectiveBooks = useMemo(() => {
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

  // Lưu cấu hình học liệu (sách, giữ quyền, khóa tài khoản, hạn dùng) cho 1 học viên
  const persistSingleStudentCourseware = async (std, overrides = {}) => {
    const stdId = std.id;
    const codes = overrides.customBookCodes ?? (customBooksMap[stdId] || []);
    const retain = overrides.retainCoursewareAccess ?? Boolean(retainAccessMap[stdId]);
    const blocked = overrides.coursewareBlocked ?? Boolean(blockedMap[stdId]);
    const blockedReason = overrides.coursewareBlockedReason ?? (blockedReasonMap[stdId] || '');
    const expiresAt = overrides.coursewareExpiresAt ?? (expiresAtMap[stdId] || '');

    const idStr = String(stdId).trim();
    const isLead = idStr.startsWith('LEAD_') || /^\d+$/.test(idStr);

    let res;
    if (isLead) {
      res = await fetch('/api/students/courseware-batch-exported', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: [stdId],
          customBooksMap: { [stdId]: codes },
          retainAccessMap: { [stdId]: retain },
          blockedMap: { [stdId]: blocked },
          blockedReasonMap: { [stdId]: blockedReason },
          expiresAtMap: { [stdId]: expiresAt || null },
          markExported: false,
        }),
      });
    } else {
      res = await fetch(`/api/students/${stdId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'courseware',
          customBookCodes: codes,
          retainCoursewareAccess: retain,
          coursewareBlocked: blocked,
          coursewareBlockedReason: blockedReason,
          coursewareExpiresAt: expiresAt || null,
        }),
      });
    }

    const data = await res.json();
    if (data.success && onStudentUpdated) {
      onStudentUpdated(stdId, codes, retain, {
        coursewareBlocked: blocked,
        coursewareBlockedReason: blockedReason,
        coursewareExpiresAt: expiresAt || null,
      });
    }
    return data;
  };

  // Lưu cấu hình giáo trình vào CSDL CRM cho học viên hiện tại (Hỗ trợ cả Student & Lead)
  const handleSaveStudentBooks = async () => {
    if (!activeStudent) return;
    setSavingBooks(true);
    try {
      const data = await persistSingleStudentCourseware(activeStudent);
      if (data.success) {
        showToast(`✅ Đã lưu cấu hình & quyền học liệu cho bé ${activeStudent.name}!`);
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

  // Khóa / Mở khóa ngay lập tức cho học viên đang xem
  const handleQuickToggleBlock = async (nextBlocked) => {
    if (!activeStudent || togglingBlock) return;
    setTogglingBlock(true);
    setBlockedMap(prev => ({ ...prev, [activeStudent.id]: nextBlocked }));
    try {
      const data = await persistSingleStudentCourseware(activeStudent, {
        coursewareBlocked: nextBlocked,
      });
      if (data.success) {
        showToast(
          nextBlocked
            ? `🔒 Đã KHÓA quyền quét QR học liệu của bé ${activeStudent.name} ngay lập tức!`
            : `🔓 Đã MỞ KHÓA quyền học liệu cho bé ${activeStudent.name}!`
        );
      } else {
        setBlockedMap(prev => ({ ...prev, [activeStudent.id]: !nextBlocked }));
        showToast('❌ Không thể cập nhật trạng thái khóa: ' + (data.error || 'Thất bại'), 'error');
      }
    } catch (err) {
      setBlockedMap(prev => ({ ...prev, [activeStudent.id]: !nextBlocked }));
      showToast('❌ Lỗi kết nối server', 'error');
    } finally {
      setTogglingBlock(false);
    }
  };

  // Lưu cấu hình giáo trình cho TẤT CẢ học viên vào CSDL CRM
  const handleSaveAllStudentsBooks = async () => {
    if (studentList.length === 0) return;
    setSavingAllBooks(true);
    try {
      const allIds = studentList.map(s => s.id);
      const res = await fetch('/api/students/courseware-batch-exported', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: allIds,
          customBooksMap,
          retainAccessMap,
          blockedMap,
          blockedReasonMap,
          expiresAtMap,
          markExported: false, // Chỉ lưu cấu hình, không đổi trạng thái xuất thư
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(`✅ Đã lưu cấu hình phân quyền & khóa/hạn dùng cho toàn bộ ${studentList.length} học viên!`);
        if (onStudentUpdated) {
          onStudentUpdated(allIds, customBooksMap, retainAccessMap);
        }
      } else {
        showToast('❌ Lỗi khi lưu: ' + (data.error || 'Thất bại'), 'error');
      }
    } catch (err) {
      console.error('Lỗi khi lưu toàn bộ sách học viên:', err);
      showToast('❌ Lỗi kết nối server', 'error');
    } finally {
      setSavingAllBooks(false);
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
        showToast(`✅ Đã copy Thư của bé ${activeStudent.name}! Dán (Ctrl+V) ngay vào Zalo.`);
      } else {
        saveAs(blob, `Thu_Hoc_Lieu_${activeStudent.id}_${activeStudent.name.replace(/\s+/g, '_')}.png`);
        showToast('Đã tự động tải file ảnh về máy.');
      }

      // Đánh dấu đã xuất thư
      await markStudentExported(activeStudent.id);
    } catch (err) {
      console.error('Lỗi khi copy ảnh:', err);
      showToast('Không thể copy ảnh. Vui lòng bấm nút Tải Ảnh PNG.', 'error');
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

      // Đánh dấu đã xuất thư
      await markStudentExported(activeStudent.id);
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
      showToast('Không thể tải ảnh: ' + err.message, 'error');
    }
  };

  // Xuất các học viên ĐƯỢC TÍCH CHỌN thành tệp nén ZIP (TỰ ĐỘNG LƯU TOÀN BỘ SÁCH VÀO CRM)
  const handleExportSelectedZip = async () => {
    const studentsToExport = studentList.filter(s => selectedStudentIds.includes(s.id));
    if (studentsToExport.length === 0) {
      showToast('Vui lòng tích chọn ít nhất 1 học viên để xuất thư!', 'error');
      return;
    }

    setIsZipping(true);
    setZipProgress({ current: 0, total: studentsToExport.length });

    try {
      const exportIds = studentsToExport.map(s => s.id);

      // BƯỚC 1: TỰ ĐỘNG LƯU TOÀN BỘ CẤU HÌNH SÁCH ĐÃ TÙY CHỈNH VÀO CSDL CRM
      showToast('💾 Đang tự động lưu cấu hình sách vào CRM...');
      const exportCustomBooks = {};
      const exportRetain = {};
      const exportBlocked = {};
      const exportBlockedReason = {};
      const exportExpiresAt = {};
      exportIds.forEach(id => {
        if (customBooksMap[id]) exportCustomBooks[id] = customBooksMap[id];
        if (retainAccessMap[id] !== undefined) exportRetain[id] = retainAccessMap[id];
        if (blockedMap[id] !== undefined) exportBlocked[id] = blockedMap[id];
        if (blockedReasonMap[id] !== undefined) exportBlockedReason[id] = blockedReasonMap[id];
        if (expiresAtMap[id] !== undefined) exportExpiresAt[id] = expiresAtMap[id] || null;
      });

      const saveRes = await fetch('/api/students/courseware-batch-exported', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: exportIds,
          customBooksMap: exportCustomBooks,
          retainAccessMap: exportRetain,
          blockedMap: exportBlocked,
          blockedReasonMap: exportBlockedReason,
          expiresAtMap: exportExpiresAt,
          markExported: true, // Lưu sách đồng thời đánh dấu thời điểm xuất thư vào DB
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson.success) {
        throw new Error(saveJson.error || 'Không thể lưu cấu hình sách vào CRM');
      }

      // Cập nhật trạng thái xuất thư ở state local
      const nowIso = new Date().toISOString();
      setExportedMap(prev => {
        const updated = { ...prev };
        exportIds.forEach(id => { updated[id] = nowIso; });
        return updated;
      });

      // BƯỚC 2: KẾT XUẤT ẢNH CANVAS VÀ ĐÓNG GÓI TỆP ZIP
      const zip = new JSZip();
      const folderName = classInfo?.code ? `Thu_Hoc_Lieu_Lop_${classInfo.code}` : 'Thu_Hoc_Lieu_Nhat_My';
      const imgFolder = zip.folder(folderName);

      for (let i = 0; i < studentsToExport.length; i++) {
        const std = studentsToExport[i];
        setZipProgress({ current: i + 1, total: studentsToExport.length });

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

      showToast('📦 Đang nén tệp ZIP...');
      const zipContent = await zip.generateAsync({ type: 'blob' });
      saveAs(zipContent, `${folderName}_${studentsToExport.length}HV.zip`);

      if (onStudentUpdated) {
        onStudentUpdated(exportIds, exportCustomBooks, exportRetain);
      }

      showToast(`🎉 Đã lưu CRM & tải thành công ${studentsToExport.length} thư học liệu!`);
    } catch (err) {
      console.error('Lỗi khi xuất tệp ZIP:', err);
      showToast('Lỗi khi đóng gói ZIP: ' + err.message, 'error');
    } finally {
      setIsZipping(false);
    }
  };

  // Chọn xem trước một học viên theo index trong mảng gốc
  const handleSelectStudentByIndex = (idx) => {
    if (idx >= 0 && idx < studentList.length) {
      setCurrentIndex(idx);
    }
  };

  // Chọn xem trước một học viên theo ID
  const handleSelectStudentById = (id) => {
    const idx = studentList.findIndex(s => s.id === id);
    if (idx !== -1) {
      setCurrentIndex(idx);
    }
  };

  if (!isOpen || studentList.length === 0) return null;

  return (
    <div className="courseware-modal-backdrop" style={styles.backdrop}>
      <div
        className="courseware-modal-container"
        style={{
          ...styles.container,
          maxWidth: isBatchMode ? '1480px' : '980px',
        }}
      >
        {/* HEADER MODAL */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={styles.headerIcon}>
              <i className="fa-solid fa-id-card"></i>
            </div>
            <div>
              <h2 style={styles.headerTitle}>
                THƯ THÔNG BÁO CẤP PHÁT TÀI KHOẢN HỌC LIỆU SỐ
              </h2>
              <p style={styles.headerSubtitle}>
                {isBatchMode
                  ? `Xuất thư tùy chọn cho Lớp ${classInfo?.code || ''} • Tổng số: ${studentList.length} học viên (Đã xuất: ${stats.exported} • Chưa xuất: ${stats.unexported})`
                  : `Học viên: ${activeStudent?.name || activeStudent?.fullName || 'Học viên'} (${activeStudent?.id}) • Lớp: ${activeStudent?.classCode || 'Chưa xếp lớp'}`}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Đóng cửa sổ">
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
              Đang kết xuất ảnh & đóng gói ZIP ({zipProgress.current}/{zipProgress.total} học viên)... Vui lòng giữ cửa sổ!
            </span>
          </div>
        )}

        {/* THÂN MODAL (CHIA 3 CỘT NẾU CÓ NHIỀU HỌC VIÊN) */}
        <div
          style={{
            ...styles.bodyGrid,
            gridTemplateColumns: isBatchMode ? '390px 410px 1fr' : '420px 1fr',
          }}
        >
          {/* ======================================================== */}
          {/* CỘT 1: SIDEBAR DANH SÁCH HỌC VIÊN & BỘ CHỌN HÀNG LOẠT   */}
          {/* ======================================================== */}
          {isBatchMode && (
            <div style={styles.sidebarColumn}>
              {/* Header của Sidebar */}
              <div style={styles.sidebarHeader}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="fa-solid fa-users" style={{ color: '#0D88C4' }}></i> Danh sách lớp ({studentList.length})
                  </strong>
                  <span style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700', background: '#ECFDF5', padding: '2px 8px', borderRadius: '12px' }}>
                    Đã chọn: {stats.selected}/{stats.total}
                  </span>
                </div>

                {/* Ô tìm kiếm nhanh */}
                <div style={styles.searchBox}>
                  <i className="fa-solid fa-magnifying-glass" style={{ color: '#94A3B8', fontSize: '0.85rem' }}></i>
                  <input
                    type="text"
                    placeholder="Tìm theo tên, mã HV..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    style={styles.searchInput}
                  />
                  {searchKeyword && (
                    <button onClick={() => setSearchKeyword('')} style={styles.clearSearchBtn}>✕</button>
                  )}
                </div>

                {/* Các tab lọc nhanh */}
                <div style={styles.filterTabsRow}>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    style={{ ...styles.filterTabBtn, ...(filterMode === 'all' ? styles.filterTabBtnActive : {}) }}
                  >
                    Tất cả ({stats.total})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('unexported')}
                    style={{ ...styles.filterTabBtn, ...(filterMode === 'unexported' ? styles.filterTabBtnActiveWarn : {}) }}
                  >
                    Chưa xuất ({stats.unexported})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('exported')}
                    style={{ ...styles.filterTabBtn, ...(filterMode === 'exported' ? styles.filterTabBtnActiveSuccess : {}) }}
                  >
                    Đã xuất ({stats.exported})
                  </button>
                </div>

                {/* Thanh thao tác chọn nhanh */}
                <div style={styles.selectionQuickActions}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', color: '#0D88C4' }}>
                    <input
                      type="checkbox"
                      checked={stats.selected === stats.total && stats.total > 0}
                      onChange={(e) => {
                        if (e.target.checked) handleSelectAll();
                        else handleDeselectAll();
                      }}
                      style={{ width: '18px', height: '18px', accentColor: '#0D88C4', cursor: 'pointer' }}
                    />
                    <span>Chọn tất cả</span>
                  </label>

                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.76rem' }}>
                    <button
                      type="button"
                      onClick={handleSelectUnexportedOnly}
                      style={styles.textActionBtn}
                      title="Chỉ tick chọn các bạn chưa xuất thư"
                    >
                      <i className="fa-solid fa-filter" style={{ color: '#D97706' }}></i> Chưa xuất
                    </button>
                    <span style={{ color: '#CBD5E1' }}>|</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      style={styles.textActionBtn}
                    >
                      Bỏ chọn
                    </button>
                  </div>
                </div>
              </div>

              {/* Danh sách học viên có thể cuộn */}
              <div style={styles.studentListScroll}>
                {filteredStudents.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94A3B8', fontSize: '0.85rem' }}>
                    <i className="fa-solid fa-inbox" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'block' }}></i>
                    Không có học viên nào phù hợp bộ lọc
                  </div>
                ) : (
                  filteredStudents.map((std, idx) => {
                    const isSelected = selectedStudentIds.includes(std.id);
                    const isActive = activeStudent?.id === std.id;
                    const isExported = Boolean(exportedMap[std.id]);
                    const bookCount = (customBooksMap[std.id] || []).length || 1;

                    return (
                      <div
                        key={std.id}
                        onClick={() => handleSelectStudentById(std.id)}
                        style={{
                          ...styles.studentListItem,
                          ...(isActive ? styles.studentListItemActive : {}),
                        }}
                      >
                        {/* Checkbox chọn xuất thư */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectStudent(std.id);
                          }}
                          style={{
                            padding: '6px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            userSelect: 'none',
                          }}
                          title={isSelected ? "Bỏ chọn học viên này" : "Chọn xuất thư học viên này"}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            style={{
                              width: '18px',
                              height: '18px',
                              accentColor: '#0D88C4',
                              cursor: 'pointer',
                              pointerEvents: 'none',
                            }}
                          />
                        </div>

                        {/* Thông tin học viên */}
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                            <span style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: '700', marginTop: '1px' }}>
                              #{idx + 1}
                            </span>
                            <span
                              title={std.name || std.fullName}
                              style={{
                                fontSize: '0.88rem',
                                fontWeight: isActive ? '800' : '700',
                                color: isActive ? '#0D88C4' : '#0F172A',
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                                lineHeight: 1.35,
                              }}
                            >
                              {std.name || std.fullName}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'monospace' }}>
                              {std.isTrial ? `HT-${std.id}` : std.id}
                            </span>
                            {std.isTrial && (
                              <span style={{ fontSize: '0.68rem', color: '#9333EA', background: '#F3E8FF', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                Học thử
                              </span>
                            )}
                            <span style={{ fontSize: '0.72rem', color: '#0369A1', background: '#E0F2FE', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                              {bookCount} giáo trình
                            </span>
                            {Boolean(blockedMap[std.id]) && (
                              <span style={{ fontSize: '0.68rem', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', padding: '1px 6px', borderRadius: '4px', fontWeight: '800' }}>
                                🔒 Đang khóa
                              </span>
                            )}
                            {!Boolean(blockedMap[std.id]) && Boolean(expiresAtMap[std.id]) && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  color: todayVnStr && expiresAtMap[std.id] < todayVnStr ? '#B91C1C' : '#B45309',
                                  background: todayVnStr && expiresAtMap[std.id] < todayVnStr ? '#FEE2E2' : '#FFFBEB',
                                  border: `1px solid ${todayVnStr && expiresAtMap[std.id] < todayVnStr ? '#FCA5A5' : '#FDE68A'}`,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: '700',
                                }}
                              >
                                {todayVnStr && expiresAtMap[std.id] < todayVnStr
                                  ? '⏳ Đã hết hạn'
                                  : `⏳ Hạn ${formatCoursewareExpiryVi(expiresAtMap[std.id])}`}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Dấu hiệu ĐÃ XUẤT / CHƯA XUẤT */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          {isExported ? (
                            <span
                              title={`Đã xuất thư: ${new Date(exportedMap[std.id]).toLocaleDateString('vi-VN')}`}
                              style={styles.exportedBadge}
                            >
                              <i className="fa-solid fa-check"></i> Đã xuất
                            </span>
                          ) : (
                            <span style={styles.unexportedBadge}>
                              ⏳ Chưa xuất
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer thanh sidebar */}
              <div style={styles.sidebarFooter}>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  Click vào học viên để xem trước & tùy chỉnh sách
                </span>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CỘT 2: KHUNG XEM TRƯỚC THẺ HỌC VIÊN DẠNG CANVAS          */}
          {/* ======================================================== */}
          <div style={styles.previewColumn}>
            {/* Thanh điều hướng học viên */}
            <div style={styles.carouselBar}>
              <button
                disabled={currentIndex === 0 || isZipping}
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                style={{ ...styles.navBtn, opacity: currentIndex === 0 ? 0.4 : 1 }}
                title="Học viên trước"
              >
                <i className="fa-solid fa-chevron-left"></i> Trước
              </button>
              <div style={styles.carouselIndicator}>
                <strong>
                  {activeStudent?.name || activeStudent?.fullName || 'Học viên'}
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>
                  Mã: {activeStudent?.id} • ({currentIndex + 1} / {studentList.length})
                </span>
              </div>
              <button
                disabled={currentIndex === studentList.length - 1 || isZipping}
                onClick={() => setCurrentIndex(prev => Math.min(studentList.length - 1, prev + 1))}
                style={{ ...styles.navBtn, opacity: currentIndex === studentList.length - 1 ? 0.4 : 1 }}
                title="Học viên tiếp theo"
              >
                Sau <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            {/* Cảnh báo trạng thái Khóa / Hết hạn khi xem trước */}
            {(currentBlocked || isCurrentExpired) && (
              <div
                style={{
                  marginBottom: '0.65rem',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: currentBlocked ? '#FEF2F2' : '#FFFBEB',
                  border: `1.5px solid ${currentBlocked ? '#FCA5A5' : '#FCD34D'}`,
                  color: currentBlocked ? '#991B1B' : '#92400E',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <i className={`fa-solid ${currentBlocked ? 'fa-lock' : 'fa-hourglass-end'}`}></i>
                <span>
                  {currentBlocked
                    ? `Tài khoản ĐANG BỊ KHÓA quyền quét QR${currentBlockedReason ? ` (${currentBlockedReason})` : ''}.`
                    : `Mã QR đã HẾT HẠN sử dụng (hạn cuối: ${formatCoursewareExpiryVi(currentExpiresAt)}).`}
                </span>
              </div>
            )}

            {/* Vùng hiển thị ảnh xem trước */}
            <div style={styles.previewBox}>
              {loadingPreview ? (
                <div style={styles.loadingBox}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem', color: '#0D88C4' }}></i>
                  <p style={{ marginTop: '0.75rem', fontWeight: '600', color: '#475569', fontSize: '0.88rem' }}>
                    Đang dựng Thư thông báo & Mã QR cá nhân...
                  </p>
                </div>
              ) : currentPreviewUrl ? (
                <img
                  src={currentPreviewUrl}
                  alt={`Thẻ học viên ${activeStudent?.name || activeStudent?.fullName || 'Học viên'}`}
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
                title="Sao chép trực tiếp vào bộ nhớ tạm để dán vào Zalo"
              >
                <i className={`fa-solid ${copying ? 'fa-spinner fa-spin' : 'fa-copy'}`}></i>
                {copying ? 'Đang sao chép...' : '📋 Copy Thư (Dán Zalo)'}
              </button>

              <button
                type="button"
                onClick={handleDownloadCurrentImage}
                disabled={loadingPreview}
                style={styles.downloadBtn}
                title="Tải ảnh PNG độ phân giải cao Retina 2x"
              >
                <i className="fa-solid fa-download"></i> Tải Ảnh PNG
              </button>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CỘT 3: BẢNG ĐIỀU KHIỂN, TÙY CHỈNH GIÁO TRÌNH & XUẤT ZIP   */}
          {/* ======================================================== */}
          <div style={styles.settingsColumn}>
            {/* THÔNG TIN HỌC VIÊN HIỆN TẠI & DẤU HIỆU XUẤT THƯ */}
            <div style={styles.sectionCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={styles.sectionTitle}>
                  <i className="fa-solid fa-user-graduate" style={{ color: '#0D88C4' }}></i> Thông Tin Học Viên
                </h3>
                {exportedMap[activeStudent?.id] ? (
                  <span style={styles.statusExportedTag}>
                    <i className="fa-solid fa-circle-check"></i> Đã xuất thư ({new Date(exportedMap[activeStudent?.id]).toLocaleDateString('vi-VN')})
                  </span>
                ) : (
                  <span style={styles.statusUnexportedTag}>
                    <i className="fa-regular fa-clock"></i> Chưa xuất thư
                  </span>
                )}
              </div>

              <div style={styles.infoGrid}>
                <div>
                  <span style={styles.infoLabel}>Họ và tên:</span>
                  <strong style={styles.infoValue}>{activeStudent?.name || activeStudent?.fullName || 'Học viên'}</strong>
                </div>
                <div>
                  <span style={styles.infoLabel}>Mã học viên:</span>
                  <span style={{ ...styles.infoValue, color: '#0D88C4', fontFamily: 'monospace' }}>
                    {activeStudent?.id}
                  </span>
                </div>
                <div>
                  <span style={styles.infoLabel}>Lớp học:</span>
                  <strong style={styles.infoValue}>{activeStudent?.classCode || classInfo?.code || 'Chưa xếp lớp'}</strong>
                </div>
                <div>
                  <span style={styles.infoLabel}>Số điện thoại:</span>
                  <span style={styles.infoValue}>{activeStudent?.phone || 'Chưa cập nhật'}</span>
                </div>
              </div>
            </div>

            {/* TÙY CHỌN 1..N GIÁO TRÌNH CHO HỌC VIÊN ĐANG CHỌN */}
            <div style={styles.sectionCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '6px' }}>
                <h3 style={{ ...styles.sectionTitle, margin: 0 }}>
                  <i className="fa-solid fa-book-bookmark" style={{ color: '#FFCA29' }}></i> Phân Quyền Giáo Trình (1..N Bộ Sách)
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSaveStudentBooks}
                    disabled={savingBooks || savingAllBooks}
                    style={styles.saveBtn}
                    title="Lưu các bộ giáo trình đã tick vào CSDL CRM cho học viên đang xem"
                  >
                    <i className={`fa-solid ${savingBooks ? 'fa-spinner fa-spin' : 'fa-save'}`}></i>
                    {savingBooks ? 'Đang lưu...' : 'Lưu vào CRM'}
                  </button>

                  {isBatchMode && (
                    <button
                      type="button"
                      onClick={handleSaveAllStudentsBooks}
                      disabled={savingBooks || savingAllBooks}
                      style={{
                        ...styles.saveBtn,
                        backgroundColor: '#059669',
                      }}
                      title="Lưu cấu hình phân quyền giáo trình của tất cả học viên trong lớp vào CRM"
                    >
                      <i className={`fa-solid ${savingAllBooks ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`}></i>
                      {savingAllBooks ? 'Đang lưu tất cả...' : '💾 Lưu tất cả vào CRM'}
                    </button>
                  )}
                </div>
              </div>

              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 0.75rem 0' }}>
                Tick chọn các bộ sách tương tác cấp cho bé <strong>{activeStudent?.name}</strong>. Thư và mã QR sẽ tự động cập nhật:
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
                        background: isChecked ? 'rgba(11, 42, 74, 0.05)' : '#FFFFFF',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleBookCode(book.code)}
                        style={{ accentColor: '#0B2A4A', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: isChecked ? '700' : '500', color: '#0F172A', fontSize: '0.88rem' }}>
                          {book.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
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
                    style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: '#059669' }}>
                      Giữ quyền học liệu số khi Tạm nghỉ / Nghỉ luôn
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Học viên bảo lưu hoặc có hoàn cảnh đặc biệt vẫn có thể tự ôn tập tại nhà.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* KHỐI KIỂM SOÁT KHÓA QUYỀN & HẠN SỬ DỤNG TỰ ĐỘNG */}
            <div
              style={{
                ...styles.sectionCard,
                border: currentBlocked ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
                background: currentBlocked ? '#FFFDFD' : '#FFFFFF',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                <h3 style={{ ...styles.sectionTitle, margin: 0, color: currentBlocked ? '#DC2626' : '#0B2A4A' }}>
                  <i className={`fa-solid ${currentBlocked ? 'fa-lock' : 'fa-shield-halved'}`} style={{ color: currentBlocked ? '#DC2626' : '#0D88C4' }}></i>
                  {' '}Kiểm Soát Khóa &amp; Hạn Dùng
                </h3>
                <button
                  type="button"
                  disabled={!activeStudent || togglingBlock}
                  onClick={() => handleQuickToggleBlock(!currentBlocked)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: '7px',
                    border: 'none',
                    cursor: togglingBlock ? 'wait' : 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    background: currentBlocked ? '#059669' : '#DC2626',
                    color: '#FFFFFF',
                    boxShadow: currentBlocked ? '0 2px 6px rgba(5,150,105,0.25)' : '0 2px 6px rgba(220,38,38,0.25)',
                  }}
                  title={currentBlocked ? 'Mở lại quyền quét QR học liệu ngay lập tức' : 'Ngắt quyền quét QR học liệu ngay lập tức (không ảnh hưởng điểm danh lớp)'}
                >
                  {togglingBlock
                    ? 'Đang xử lý...'
                    : currentBlocked
                    ? '🔓 Mở khóa ngay'
                    : '🔒 Khóa tài khoản ngay'}
                </button>
              </div>

              {/* 1. Công tắc khóa thủ công */}
              <div
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  background: currentBlocked ? '#FEF2F2' : '#F8FAFC',
                  border: `1px solid ${currentBlocked ? '#FECACA' : '#E2E8F0'}`,
                  marginBottom: '0.75rem',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={currentBlocked}
                    onChange={(e) => {
                      if (!activeStudent) return;
                      setBlockedMap(prev => ({ ...prev, [activeStudent.id]: e.target.checked }));
                    }}
                    style={{ accentColor: '#DC2626', width: '16px', height: '16px', marginTop: '2px' }}
                  />
                  <div>
                    <strong style={{ fontSize: '0.84rem', color: currentBlocked ? '#B91C1C' : '#1E293B' }}>
                      🔒 Khóa quyền học liệu số (độc lập trạng thái lớp)
                    </strong>
                    <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                      Chặn ngay lập tức tại cổng QR &amp; Web App dù bé vẫn Đang học hoặc đang giữ quyền.
                    </div>
                  </div>
                </label>

                <div style={{ marginTop: '0.55rem' }}>
                  <input
                    type="text"
                    value={currentBlockedReason}
                    onChange={(e) => {
                      if (!activeStudent) return;
                      setBlockedReasonMap(prev => ({ ...prev, [activeStudent.id]: e.target.value }));
                    }}
                    placeholder="Lý do khóa (hiển thị khi quét QR, VD: Chậm học phí...)"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      background: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '5px' }}>
                    {['Chậm học phí', 'Hết hạn học thử', 'Cấp nhầm tài khoản'].map((reasonPreset) => (
                      <button
                        key={reasonPreset}
                        type="button"
                        onClick={() => {
                          if (!activeStudent) return;
                          setBlockedReasonMap(prev => ({ ...prev, [activeStudent.id]: reasonPreset }));
                        }}
                        style={{
                          fontSize: '0.7rem',
                          padding: '2px 7px',
                          borderRadius: '999px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#475569',
                          cursor: 'pointer',
                        }}
                      >
                        + {reasonPreset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Hạn sử dụng tự động (Học thử / Cấp tạm) */}
              <div
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  background: isCurrentExpired ? '#FFFBEB' : '#F8FAFC',
                  border: `1px solid ${isCurrentExpired ? '#FDE68A' : '#E2E8F0'}`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', flexWrap: 'wrap', gap: '4px' }}>
                  <strong style={{ fontSize: '0.83rem', color: '#0F172A' }}>
                    ⏳ Hạn sử dụng tự động (Học thử / Cấp tạm)
                  </strong>
                  {currentExpiresAt ? (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color: isCurrentExpired ? '#DC2626' : '#059669' }}>
                      {isCurrentExpired
                        ? `Đã hết hạn (${formatCoursewareExpiryVi(currentExpiresAt)})`
                        : `Hết hạn sau ${formatCoursewareExpiryVi(currentExpiresAt)}`}
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '600' }}>Không giới hạn</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    value={currentExpiresAt}
                    onChange={(e) => {
                      if (!activeStudent) return;
                      setExpiresAtMap(prev => ({ ...prev, [activeStudent.id]: e.target.value }));
                    }}
                    style={{
                      padding: '5px 8px',
                      borderRadius: '6px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.8rem',
                      background: '#FFFFFF',
                    }}
                  />
                  {[
                    { label: 'Không giới hạn', days: null },
                    { label: '+7 ngày (Học thử)', days: 7 },
                    { label: '+14 ngày', days: 14 },
                    { label: '+30 ngày', days: 30 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        if (!activeStudent) return;
                        setExpiresAtMap(prev => ({
                          ...prev,
                          [activeStudent.id]: preset.days === null ? '' : addDaysVnInput(preset.days),
                        }));
                      }}
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: preset.days === 7 && activeStudent?.isTrial ? '1px solid #D97706' : '1px solid #CBD5E1',
                        background: preset.days === 7 && activeStudent?.isTrial ? '#FEF3C7' : '#FFFFFF',
                        color: preset.days === 7 && activeStudent?.isTrial ? '#92400E' : '#334155',
                        cursor: 'pointer',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '5px' }}>
                  Bấm <strong>Lưu vào CRM</strong> (hoặc <strong>💾 Lưu tất cả</strong>) để áp dụng ngày hết hạn mới.
                </div>
              </div>
            </div>

            {/* KHỐI XUẤT FILE HÀNG LOẠT (SMART BATCH EXPORT DỰA TRÊN DẤU TÍCH CỘT 1) */}
            {isBatchMode && (
              <div style={styles.batchSectionCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ ...styles.sectionTitle, color: '#0D88C4' }}>
                    <i className="fa-solid fa-file-zipper" style={{ color: '#059669' }}></i> Xuất File Hàng Loạt
                  </h3>
                  <span style={{ fontSize: '0.8rem', fontWeight: '700', color: selectedStudentIds.length > 0 ? '#059669' : '#EF4444' }}>
                    {selectedStudentIds.length > 0
                      ? `Đã chọn: ${selectedStudentIds.length} học viên`
                      : 'Chưa chọn học viên nào'}
                  </span>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#475569', margin: '0.35rem 0 0.85rem 0' }}>
                  Đóng gói các thư học viên được tích chọn thành một tệp nén ZIP ảnh PNG sắc nét (Retina 2x) và tự động đánh dấu <strong>ĐÃ XUẤT THƯ</strong> vào CRM.
                </p>

                <button
                  type="button"
                  onClick={handleExportSelectedZip}
                  disabled={isZipping || selectedStudentIds.length === 0}
                  style={{
                    ...styles.zipBtn,
                    opacity: selectedStudentIds.length === 0 ? 0.5 : 1,
                    cursor: selectedStudentIds.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                  title={
                    selectedStudentIds.length > 0
                      ? `Tải file ZIP cho ${selectedStudentIds.length} học viên đã chọn`
                      : 'Vui lòng tick chọn ít nhất 1 học viên ở Cột 1'
                  }
                >
                  <i className={`fa-solid ${isZipping ? 'fa-spinner fa-spin' : 'fa-file-zipper'}`}></i>
                  {isZipping
                    ? `Đang nén ${zipProgress.current}/${zipProgress.total}...`
                    : selectedStudentIds.length === studentList.length
                    ? `📦 Tải Toàn Bộ ${studentList.length} Thư (File ZIP)`
                    : selectedStudentIds.length > 0
                    ? `📦 Tải ZIP ${selectedStudentIds.length} Thư Đã Chọn`
                    : 'Vui lòng tick chọn học viên để xuất ZIP'}
                </button>
              </div>
            )}

            {/* MẸO DÀNH CHO GIÁO VỤ / THẦY CÔ */}
            <div style={styles.guideCard}>
              <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '0.82rem', color: '#0D88C4', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="fa-solid fa-lightbulb" style={{ color: '#FFCA29' }}></i> Mẹo vận hành tối ưu:
              </h4>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: '#475569', lineHeight: 1.5 }}>
                <li>Nhấn nút <strong>"Chưa xuất"</strong> ở Cột 1 để tự động lọc và tick chọn các bạn mới vào lớp.</li>
                <li>Nhấn nút <strong>📋 Copy Thư (Dán Zalo)</strong> để gửi nhanh ảnh nét căng sang cửa sổ chat Zalo với Ba Mẹ (nhấn Ctrl+V).</li>
                <li>Khi xuất ZIP hoặc copy thư, hệ thống sẽ tự động đổi dấu hiệu sang <strong>"✓ Đã xuất thư"</strong> giúp dễ kiểm soát!</li>
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
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    padding: '0.75rem',
  },
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: '16px',
    width: '96vw',
    maxHeight: '95vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    border: '1px solid #CBD5E1',
  },
  header: {
    padding: '0.9rem 1.4rem',
    backgroundColor: '#0D88C4',
    color: '#FFFFFF',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '3px solid #FFCA29',
  },
  headerIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 202, 41, 0.25)',
    color: '#FFCA29',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
  },
  headerTitle: {
    margin: 0,
    fontSize: '1.12rem',
    fontWeight: '900',
    letterSpacing: '0.4px',
  },
  headerSubtitle: {
    margin: '0.2rem 0 0 0',
    fontSize: '0.82rem',
    opacity: 0.92,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '1.4rem',
    cursor: 'pointer',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
  toast: {
    padding: '0.65rem 1rem',
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '0.88rem',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  progressBanner: {
    padding: '0.6rem 1rem',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.6rem',
    fontSize: '0.86rem',
    fontWeight: '700',
  },
  bodyGrid: {
    display: 'grid',
    gap: '1rem',
    padding: '1rem 1.25rem',
    overflowY: 'auto',
    maxHeight: 'calc(95vh - 75px)',
    boxSizing: 'border-box',
  },

  /* CỘT 1: SIDEBAR */
  sidebarColumn: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    border: '1px solid #E2E8F0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    height: '100%',
    maxHeight: '780px',
  },
  sidebarHeader: {
    padding: '0.75rem',
    borderBottom: '1px solid #E2E8F0',
    backgroundColor: '#FAFAFA',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: '#FFFFFF',
    border: '1px solid #CBD5E1',
    borderRadius: '8px',
    padding: '4px 8px',
    marginBottom: '0.5rem',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '0.82rem',
    color: '#0F172A',
  },
  clearSearchBtn: {
    border: 'none',
    background: 'none',
    color: '#94A3B8',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0 2px',
  },
  filterTabsRow: {
    display: 'flex',
    gap: '4px',
    marginBottom: '0.5rem',
  },
  filterTabBtn: {
    flex: 1,
    padding: '4px 6px',
    fontSize: '0.72rem',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    backgroundColor: '#FFFFFF',
    color: '#64748B',
    fontWeight: '600',
    cursor: 'pointer',
    textAlign: 'center',
  },
  filterTabBtnActive: {
    backgroundColor: '#0D88C4',
    borderColor: '#0D88C4',
    color: '#FFFFFF',
  },
  filterTabBtnActiveWarn: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
    color: '#FFFFFF',
  },
  filterTabBtnActiveSuccess: {
    backgroundColor: '#059669',
    borderColor: '#059669',
    color: '#FFFFFF',
  },
  selectionQuickActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '4px',
  },
  textActionBtn: {
    border: 'none',
    background: 'none',
    color: '#0369A1',
    cursor: 'pointer',
    fontWeight: '600',
    padding: 0,
    fontSize: '0.76rem',
  },
  studentListScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px',
  },
  studentListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 8px',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '4px',
    transition: 'all 0.15s ease',
    border: '1px solid transparent',
    backgroundColor: '#FFFFFF',
  },
  studentListItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#38BDF8',
    boxShadow: '0 1px 3px rgba(56, 189, 248, 0.2)',
  },
  exportedBadge: {
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    padding: '2px 6px',
    borderRadius: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    whiteSpace: 'nowrap',
  },
  unexportedBadge: {
    fontSize: '0.68rem',
    fontWeight: '600',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    padding: '2px 6px',
    borderRadius: '10px',
    whiteSpace: 'nowrap',
  },
  sidebarFooter: {
    padding: '6px 10px',
    borderTop: '1px solid #E2E8F0',
    backgroundColor: '#FAFAFA',
    textAlign: 'center',
  },

  /* CỘT 2: PREVIEW */
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
    backgroundColor: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '10px',
    padding: '5px 8px',
    marginBottom: '0.75rem',
  },
  navBtn: {
    padding: '4px 10px',
    borderRadius: '6px',
    border: '1px solid #CBD5E1',
    backgroundColor: '#F1F5F9',
    color: '#334155',
    fontWeight: '700',
    fontSize: '0.78rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  carouselIndicator: {
    textAlign: 'center',
    fontSize: '0.85rem',
    color: '#0F172A',
  },
  previewBox: {
    width: '100%',
    maxWidth: '355px',
    aspectRatio: '750 / 1200',
    backgroundColor: '#E2E8F0',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #CBD5E1',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '2rem',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
  },
  actionRow: {
    display: 'flex',
    gap: '0.6rem',
    width: '100%',
    maxWidth: '380px',
    marginTop: '0.75rem',
  },
  copyBtn: {
    flex: 1.2,
    padding: '0.65rem 0.5rem',
    backgroundColor: '#059669',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    boxShadow: '0 2px 4px rgba(5, 150, 105, 0.25)',
  },
  downloadBtn: {
    flex: 1,
    padding: '0.65rem 0.5rem',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '700',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    boxShadow: '0 2px 4px rgba(2, 132, 199, 0.25)',
  },

  /* CỘT 3: CẤU HÌNH */
  settingsColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '0.9rem',
    border: '1px solid #E2E8F0',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  sectionTitle: {
    margin: '0 0 0.6rem 0',
    fontSize: '0.92rem',
    fontWeight: '800',
    color: '#0F172A',
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  statusExportedTag: {
    fontSize: '0.74rem',
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    padding: '3px 8px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  statusUnexportedTag: {
    fontSize: '0.74rem',
    fontWeight: '600',
    color: '#B45309',
    backgroundColor: '#FEF3C7',
    padding: '3px 8px',
    borderRadius: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.6rem',
    backgroundColor: '#F8FAFC',
    padding: '0.75rem',
    borderRadius: '8px',
  },
  infoLabel: {
    display: 'block',
    fontSize: '0.72rem',
    color: '#64748B',
    marginBottom: '2px',
  },
  infoValue: {
    fontSize: '0.84rem',
    color: '#0F172A',
  },
  saveBtn: {
    padding: '0.35rem 0.75rem',
    backgroundColor: '#0D88C4',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '700',
    fontSize: '0.78rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  bookGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.5rem',
  },
  bookCheckboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.55rem 0.65rem',
    borderRadius: '8px',
    border: '1px solid #E2E8F0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  retainOptionBox: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px dashed #E2E8F0',
  },
  batchSectionCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: '12px',
    padding: '0.9rem',
    border: '1.5px solid #BAE6FD',
  },
  zipBtn: {
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: '#0284C7',
    color: '#FFFFFF',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '800',
    fontSize: '0.9rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    boxShadow: '0 4px 6px -1px rgba(2, 132, 199, 0.3)',
    transition: 'all 0.15s ease',
  },
  guideCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: '10px',
    padding: '0.75rem',
    border: '1px solid #FDE68A',
  },
};
