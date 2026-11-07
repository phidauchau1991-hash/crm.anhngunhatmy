'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import ClassSelect from '../components/ClassSelect';
import PaidStamp from '@/components/PaidStamp';
import CoursewareNoticeModal from '@/components/CoursewareNoticeModal';
import { AVAILABLE_COURSEWARE_BOOKS, parseCustomBookCodes } from '@/lib/coursewareBooks';

const getNormalizedStatus = (st) => {
  if (!st) return 'Đang học';
  const clean = String(st).trim();
  if (clean.includes('Ä') || clean.includes('ang h') || clean.includes('há» c') || clean === 'Đang học') return 'Đang học';
  if (clean.includes('Tạm nghỉ') || clean.includes('Tam nghi')) return 'Tạm nghỉ';
  if (clean.includes('Bảo lưu') || clean.includes('Bao luu')) return 'Bảo lưu';
  if (clean.includes('Nghỉ luôn') || clean.includes('Nghi luon') || clean === 'Thôi học') return 'Nghỉ luôn';
  return clean;
};

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [opStatusFilter, setOpStatusFilter] = useState('all'); // 'all', 'Đang học', 'Tạm nghỉ', 'Bảo lưu', 'Nghỉ luôn'
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [classFilter, setClassFilter] = useState('all');
  const [birthdayMonth, setBirthdayMonth] = useState('all');
  const [statusSummary, setStatusSummary] = useState({ total: 0, studying: 0, paused: 0, reserved: 0, dropout: 0 });

  // Trạng thái modal Thêm Học Viên
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [eReceiptData, setEReceiptData] = useState(null);
  const receiptRef = useRef(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Trạng thái modal Chỉnh sửa / Đại tu học viên
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [editTab, setEditTab] = useState('basic'); // 'basic', 'transfer', 'reserve', 'dropout'
  const [editStudentData, setEditStudentData] = useState(null);
  const [loadingEditData, setLoadingEditData] = useState(false);
  const [transferPreview, setTransferPreview] = useState(null);

  // Trạng thái xuất Thư học liệu & Thẻ học viên điện tử (Giai đoạn 1)
  const [isCoursewareModalOpen, setIsCoursewareModalOpen] = useState(false);
  const [coursewareModalStudents, setCoursewareModalStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  // AI Birthday State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiStudent, setAiStudent] = useState(null);
  const [aiMessage, setAiMessage] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Dữ liệu cho Cascading Dropdowns & Kho
  const [courseConfigs, setCourseConfigs] = useState([]);
  const [classes, setClasses] = useState([]);
  const [monthlyClasses, setMonthlyClasses] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredCapDos, setFilteredCapDos] = useState([]);
  const [filteredLevels, setFilteredLevels] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);

  // Form Thêm học viên
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    dob: '',
    address: '',
    nationalId: '',
    specialPolicyType: 'Không giảm',
    specialPolicyValue: '0',
    enrollmentMode: 'COURSE', // 'COURSE' | 'MONTHLY'
    billingType: 'MONTHLY_PREPAID',
    monthlyRate: '1.200.000',
    monthlySessions: '8',
    program: '',
    level: '',
    classCode: '',
    amountPaid: '0',
    promoType: '',
    promoDiscount: '0',
    promoReason: '',
    customFee: '0',
    customReason: '',
    giftInventoryId: '',
    giftQuantity: 1,
    giftNotes: 'Tặng quà khi nhập học',
    paymentPolicy: 'Đóng trước',
    capDo: '',
  });

  // Form Chỉnh sửa học viên
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    dob: '',
    address: '',
    nationalId: '',
    specialPolicyType: 'Không giảm',
    specialPolicyValue: '0',
    status: 'Đang học',
    callbackDate: '',
    newClassCode: '',
    reservationAmount: '0',
    reservationDeadline: '',
    dropoutReasonType: 'Lý do khác',
    dropoutReasonText: '',
    manualAdjustment: '0',
    manualReason: '',
  });

  // Form Thu học phí (Tích hợp bán/tặng giáo trình & quà tặng ghi danh)
  const [paymentForm, setPaymentForm] = useState({
    collectAmount: '',
    paymentMethod: 'Chuyển khoản',
    notes: '',
    includeItem: false,
    itemId: '',
    itemDistributionType: 'TANG_KEM_KHOA', // 'TANG_KEM_KHOA' | 'BAN'
    itemPrice: '0',
    itemQuantity: 1,
    includeGift: false,
    giftId: '',
    giftQuantity: 1,
  });

  // Form Cấp phát vật tư / Bán mới / Mua lại
  const [giftForm, setGiftForm] = useState({
    inventoryId: '',
    quantity: 1,
    reason: 'Tặng kèm khi nhập học',
    discountType: 'Miễn phí 100%',
    itemPrice: '0',
    collectAmount: '0',
    paymentMethod: 'Chuyển khoản',
    notes: 'Cấp phát vật tư học viên',
  });

  // Tải danh sách học viên
  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = `/api/students?search=${encodeURIComponent(searchTerm)}&status=${statusFilter}&studentStatus=${encodeURIComponent(opStatusFilter)}&preset=${datePreset}&classCode=${encodeURIComponent(classFilter)}&birthdayMonth=${birthdayMonth}`;
      if (datePreset === 'custom') {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const result = await res.json();
      if (result.success) {
        setStudents(result.data);
        if (result.statusSummary) {
          setStatusSummary(result.statusSummary);
        }
      }
    } catch (e) {
      console.error('Không thể tải học viên:', e);
    } finally {
      setLoading(false);
    }
  };

  const openAiBirthdayModal = (student) => {
    setAiStudent(student);
    setAiMessage('');
    setShowAiModal(true);
  };

  const handleGenerateAiBirthday = async () => {
    if (!aiStudent) return;
    setIsGeneratingAi(true);
    setAiMessage('');
    try {
      // Tính tuổi
      let age = '';
      if (aiStudent.dob) {
        const parts = aiStudent.dob.split('/');
        if (parts.length === 3) {
          const birthYear = parseInt(parts[2]);
          age = new Date().getFullYear() - birthYear;
        }
      }
      
      const res = await fetch('/api/ai/birthday-wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: aiStudent.name,
          age: age
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiMessage(data.data);
      } else {
        alert(data.error || 'Lỗi sinh tin nhắn AI');
      }
    } catch (error) {
      alert('Lỗi kết nối AI');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopyAiMessage = () => {
    navigator.clipboard.writeText(aiMessage);
    alert('Đã chép vào bộ nhớ tạm! Bạn có thể dán vào Zalo ngay.');
  };

  // Tải cấu hình và lớp học
  const fetchConfigsAndClasses = async () => {
    try {
      const resConfigs = await fetch('/api/course-configs');
      const resultConfigs = await resConfigs.json();
      if (resultConfigs.success) {
        setCourseConfigs(resultConfigs.data);
      }

      const resClasses = await fetch('/api/classes');
      const resultClasses = await resClasses.json();
      if (resultClasses.success) {
        setClasses(resultClasses.data.filter(c => c.level !== 'MONTHLY'));
        setMonthlyClasses(resultClasses.data.filter(c => c.level === 'MONTHLY'));
      }

      const resInventory = await fetch('/api/inventory');
      const resultInventory = await resInventory.json();
      if (resultInventory.success) {
        setInventoryItems(resultInventory.data);
      }
    } catch (e) {
      console.error('Không thể tải cấu hình:', e);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [searchTerm, statusFilter, opStatusFilter, datePreset, startDate, endDate, classFilter, birthdayMonth]);

  useEffect(() => {
    fetchConfigsAndClasses();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const convertName = urlParams.get('convertName');
      const convertPhone = urlParams.get('convertPhone');
      const convertDob = urlParams.get('convertDob');
      const convertAddress = urlParams.get('convertAddress');
      const convertLeadId = urlParams.get('convertLeadId');
      const convertTrialClass = urlParams.get('convertTrialClass');
      const paramStudentStatus = urlParams.get('studentStatus');
      
      if (paramStudentStatus) {
        setOpStatusFilter(paramStudentStatus);
      }

      if (convertName) {
        const decodedTrialClass = convertTrialClass ? decodeURIComponent(convertTrialClass) : '';
        setFormData(prev => ({
          ...prev,
          name: decodeURIComponent(convertName),
          phone: convertPhone ? decodeURIComponent(convertPhone) : '',
          dob: convertDob ? decodeURIComponent(convertDob) : '',
          address: convertAddress ? decodeURIComponent(convertAddress) : '',
          convertLeadId: convertLeadId || '',
          classCode: decodedTrialClass || prev.classCode,
        }));
        setIsModalOpen(true);
        
        // Dọn dẹp query params trên thanh URL tránh lặp lại hành vi khi reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [classes]);

  // Tự động nhận diện Lớp học thử (nếu từ Chăm sóc học viên chuyển sang) là Lớp theo Khóa hay Lớp theo Tháng
  useEffect(() => {
    if (!isModalOpen || !formData.classCode) return;
    const isMonthlyCls = monthlyClasses.some(c => c.code === formData.classCode);
    if (isMonthlyCls && formData.enrollmentMode !== 'MONTHLY') {
      setFormData(prev => ({ ...prev, enrollmentMode: 'MONTHLY' }));
      return;
    }
    const courseCls = classes.find(c => c.code === formData.classCode);
    if (courseCls && !formData.level && courseConfigs.length > 0) {
      const cfg = courseConfigs.find(c => c.level === courseCls.level);
      if (cfg) {
        const configsUnderProgram = courseConfigs.filter(c => c.program === cfg.program);
        const uniqueCapDos = Array.from(new Set(configsUnderProgram.map(c => c.capDo)));
        const configsUnderCapDo = courseConfigs.filter(c => c.program === cfg.program && c.capDo === cfg.capDo);
        const clsUnderLevel = classes.filter(c => c.level === cfg.level);
        setFilteredCapDos(uniqueCapDos);
        setFilteredLevels(configsUnderCapDo);
        setFilteredClasses(clsUnderLevel);
        setFormData(prev => ({
          ...prev,
          enrollmentMode: 'COURSE',
          program: cfg.program,
          capDo: cfg.capDo,
          level: cfg.level,
        }));
      }
    }
  }, [isModalOpen, formData.classCode, classes, monthlyClasses, courseConfigs]);

  // Format số tiền mặt hàng nghìn (hỗ trợ cả số âm)
  const formatNumber = (val) => {
    if (val === undefined || val === null || val === '') return '0';
    const isNegative = val.toString().startsWith('-');
    const clean = val.toString().replace(/\D/g, '');
    if (!clean) return isNegative ? '-' : '0';
    const num = parseInt(clean);
    return (isNegative ? '-' : '') + num.toLocaleString('vi-VN');
  };

  const parseNumber = (val) => {
    if (!val) return 0;
    const isNegative = val.toString().startsWith('-');
    const clean = val.toString().replace(/\./g, '').replace(/\D/g, '');
    const num = parseFloat(clean) || 0;
    return isNegative ? -num : num;
  };

  // Mở modal chỉnh sửa
  const openEditModal = async (studentId) => {
    setSelectedStudentId(studentId);
    setEditTab('basic');
    setIsEditModalOpen(true);
    setLoadingEditData(true);
    setMessage({ type: '', text: '' });
    setTransferPreview(null);

    try {
      const res = await fetch(`/api/students/${studentId}`);
      const result = await res.json();
      if (result.success) {
        setEditStudentData(result.data);
        
        const std = result.data.student;
        const currentClassPaid = result.data.currentClass?.amountPaid || 0;
        setEditForm({
          name: std.name || '',
          phone: std.phone || '',
          dob: std.dob || '',
          address: std.address || '',
          nationalId: std.nationalId || '',
          specialPolicyType: std.specialPolicyType || 'Không giảm',
          specialPolicyValue: formatNumber(std.specialPolicyValue || 0),
          status: std.status || 'Đang học',
          callbackDate: std.callbackDate || '',
          newClassCode: '',
          reservationAmount: formatNumber(std.reservationAmount || 0),
          reservationDeadline: std.reservationDeadline || '',
          dropoutReasonType: 'Lý do khác',
          dropoutReasonText: std.dropoutReason || '',
          billingType: result.data.currentClass?.billingType || 'COURSE',
          monthlyRate: result.data.currentClass?.monthlyRate || '',
          monthlySessions: result.data.currentClass?.monthlySessions || '',
          transferType: 'normal',
          repeatDiscountType: 'percent_30',
          repeatDiscountAmount: '',
          repeatDiscountPercent: '',
          overrideAmountPaidOld: formatNumber(currentClassPaid),
          manualAdjustment: '',
          manualReason: '',
        });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Lỗi kết nối API lấy chi tiết.' });
    } finally {
      setLoadingEditData(false);
    }
  };

  // Submit Cấp phát / Bán xuất kho vật tư
  const handleGiftSubmit = async (e) => {
    e.preventDefault();
    if (!giftForm.inventoryId || giftForm.quantity <= 0) return;
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    try {
      const collectAmt = parseNumber(giftForm.collectAmount);
      const isPaid = collectAmt > 0;
      const payload = {
        type: isPaid ? 'XUAT_BAN' : 'XUAT_TANG',
        targetType: 'STUDENT',
        targetName: editStudentData?.student?.name,
        studentId: selectedStudentId,
        amountCollected: collectAmt,
        paymentMethod: giftForm.paymentMethod,
        notes: `Lý do: ${giftForm.reason}${giftForm.notes ? `. Ghi chú: ${giftForm.notes}` : ''}`,
        items: [{ inventoryId: giftForm.inventoryId, quantity: parseInt(giftForm.quantity) }]
      };
      
      const res = await fetch('/api/inventory/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: `Xuất kho thành công! Mã phiếu: ${json.data.receiptCode}${isPaid ? ` (Đã tạo phiếu thu ${collectAmt.toLocaleString()}đ)` : ''}` });
        setGiftForm({
          inventoryId: '',
          quantity: 1,
          reason: 'Tặng kèm khi nhập học',
          discountType: 'Miễn phí 100%',
          itemPrice: '0',
          collectAmount: '0',
          paymentMethod: 'Chuyển khoản',
          notes: 'Cấp phát vật tư học viên',
        });
        fetchConfigsAndClasses(); // Refresh inventory stock
        fetchStudents();
      } else {
        setMessage({ type: 'error', text: json.error });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối API cấp phát vật tư.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Tính toán trước chi phí chuyển lớp khi đổi newClassCode trong Form
  useEffect(() => {
    if (editTab !== 'transfer' || !editForm.newClassCode) {
      setTransferPreview(null);
      return;
    }

    const newClass = classes.find(c => c.code === editForm.newClassCode);
    const newConfig = courseConfigs.find(c => c.level === newClass?.level);

    if (!newClass || !newConfig) return;

    const totalSessionsNew = newClass.totalSessions || 32;
    const sessionsRemainingNew = newClass.sessionsRemaining !== undefined ? newClass.sessionsRemaining : totalSessionsNew;
    // Đơn giá 1 buổi mới = Học phí gốc / Tổng số buổi mới
    const costPerSessionNew = totalSessionsNew > 0 ? (newConfig.price / totalSessionsNew) : 0;
    // Học phí lớp mới chỉ tính cho số buổi còn lại
    const proRatedPriceNew = costPerSessionNew * sessionsRemainingNew;

    // Tính ưu đãi học lại nếu có
    let repeatDiscountAmount = 0;
    if (editForm.transferType === 'repeat') {
      if (editForm.repeatDiscountType === 'percent_30') {
        repeatDiscountAmount = proRatedPriceNew * 0.3;
      } else if (editForm.repeatDiscountType === 'percent_50') {
        repeatDiscountAmount = proRatedPriceNew * 0.5;
      } else if (editForm.repeatDiscountType === 'free') {
        repeatDiscountAmount = proRatedPriceNew;
      } else if (editForm.repeatDiscountType === 'custom_percent') {
        repeatDiscountAmount = (proRatedPriceNew * (parseFloat(editForm.repeatDiscountPercent) || 0)) / 100;
      } else if (editForm.repeatDiscountType === 'custom_vnd') {
        repeatDiscountAmount = parseNumber(editForm.repeatDiscountAmount);
      }
    }

    // Học phí lớp mới (sau khi áp dụng ưu đãi đặc biệt của học sinh nếu có)
    const specialDiscount = parseNumber(editForm.specialPolicyValue);
    const totalDiscountNew = repeatDiscountAmount + specialDiscount;
    const newClassFeeBase = Math.max(0, proRatedPriceNew - totalDiscountNew);

    if (!editStudentData?.currentClass) {
      // Học viên chưa có lớp -> Xem trước học phí xếp lớp ban đầu (khấu trừ)
      setTransferPreview({
        isInitial: true,
        priceNew: newConfig.price,
        proRatedPriceNew,
        repeatDiscountAmount,
        specialDiscount,
        newClassFeeBase,
        difference: newClassFeeBase,
        selectedClassInfo: newClass,
      });
      return;
    }

    const currentClass = editStudentData.currentClass;

    // Số tiền thực đóng lớp cũ (lấy giá trị người dùng nhập ghi đè nếu có, hoặc mặc định từ currentClass)
    const amountPaidOld = editForm.overrideAmountPaidOld !== undefined && editForm.overrideAmountPaidOld !== ''
      ? parseNumber(editForm.overrideAmountPaidOld)
      : (currentClass.amountPaid || 0);

    const oldTotalSessions = currentClass.totalSessions || 32;
    // Chi phí buổi học lớp cũ: (Học phí gốc / Tổng số buổi cũ) * Số buổi đã học
    const baseOldFee = currentClass.feeToPay > 0 ? currentClass.feeToPay : (currentClass.price || 0);
    const costPerSessionOld = oldTotalSessions > 0 ? (baseOldFee / oldTotalSessions) : 0;
    const costUsedOld = editForm.transferType === 'lateral' ? 0 : Math.round(costPerSessionOld * (currentClass.attendedSessions || 0));

    // Tiền dư lớp cũ còn lại / Nợ cũ
    const financialDifference = amountPaidOld - costUsedOld;
    const balanceOld = financialDifference > 0 ? financialDifference : 0;
    const debtOld = financialDifference < 0 ? Math.abs(financialDifference) : 0;

    // Cấn trừ + Điều chỉnh thủ công
    const manualAdj = parseNumber(editForm.manualAdjustment);
    const difference = (newClassFeeBase - balanceOld + debtOld) + manualAdj;

    setTransferPreview({
      isInitial: false,
      amountPaidOld,
      attendedSessions: currentClass.attendedSessions || 0,
      totalSessionsOld: oldTotalSessions,
      costUsedOld,
      balanceOld,
      debtOld,
      priceNew: newConfig.price,
      proRatedPriceNew,
      repeatDiscountAmount,
      specialDiscount,
      newClassFeeBase,
      difference,
      selectedClassInfo: newClass,
      manualAdj,
    });
  }, [
    editForm.newClassCode,
    editTab,
    editStudentData,
    courseConfigs,
    classes,
    editForm.specialPolicyValue,
    editForm.manualAdjustment,
    editForm.transferType,
    editForm.repeatDiscountType,
    editForm.repeatDiscountAmount,
    editForm.repeatDiscountPercent,
    editForm.overrideAmountPaidOld
  ]);

  // Submit chỉnh sửa học viên (Phân loại theo Action)
  const handleEditSubmit = async (e, actionType) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    let payload = { action: actionType };

    if (actionType === 'basic') {
      payload = {
        ...payload,
        name: editForm.name,
        phone: editForm.phone,
        dob: editForm.dob,
        address: editForm.address,
        nationalId: editForm.nationalId,
        specialPolicyType: editForm.specialPolicyType,
        specialPolicyValue: parseNumber(editForm.specialPolicyValue),
      };
    } else if (actionType === 'statusChange') {
      payload = {
        ...payload,
        status: editForm.status,
        callbackDate: editForm.status === 'Tạm nghỉ' ? editForm.callbackDate : null,
        dropoutReasonType: editForm.dropoutReasonType,
        dropoutReasonText: editForm.dropoutReasonText,
      };
    } else if (actionType === 'finance') {
      payload = {
        ...payload,
        billingType: editForm.billingType,
        monthlyRate: parseFloat(editForm.monthlyRate) || 0,
        monthlySessions: parseInt(editForm.monthlySessions, 10) || null,
      };
    } else if (actionType === 'transfer') {
      let repeatDiscountVal = 0;
      if (editForm.repeatDiscountType === 'custom_vnd') {
        repeatDiscountVal = parseNumber(editForm.repeatDiscountAmount);
      } else if (editForm.repeatDiscountType === 'custom_percent') {
        repeatDiscountVal = parseFloat(editForm.repeatDiscountPercent) || 0;
      }

      payload = {
        ...payload,
        action: 'classTransfer',
        newClassCode: editForm.newClassCode,
        transferType: editForm.transferType || 'normal',
        repeatDiscountType: editForm.repeatDiscountType || 'none',
        repeatDiscountValue: repeatDiscountVal,
        manualAdjustment: parseNumber(editForm.manualAdjustment),
        manualReason: editForm.manualReason,
        overrideAmountPaidOld: editForm.overrideAmountPaidOld !== undefined && editForm.overrideAmountPaidOld !== ''
          ? parseNumber(editForm.overrideAmountPaidOld)
          : undefined,
      };
    } else if (actionType === 'reserve') {
      payload = {
        ...payload,
        reservationAmount: parseNumber(editForm.reservationAmount),
        reservationDeadline: editForm.reservationDeadline,
      };
    } else if (actionType === 'dropout') {
      payload = {
        ...payload,
        dropoutReason: `${editForm.dropoutReasonType}: ${editForm.dropoutReasonText}`,
      };
    }

    try {
      const res = await fetch(`/api/students/${selectedStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Cập nhật nghiệp vụ thành công!' });
        fetchStudents();
        setTimeout(() => setIsEditModalOpen(false), 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  
  // Helper mở Thư học liệu & Thẻ học viên điện tử
  const handleOpenSingleCourseware = (student) => {
    setCoursewareModalStudents([student]);
    setIsCoursewareModalOpen(true);
  };

  const handleOpenBatchCourseware = (studentListToExport = null) => {
    const list = studentListToExport || students.filter(s => selectedStudentIds.includes(s.id));
    if (!list || list.length === 0) {
      alert('Vui lòng chọn ít nhất một học viên để xuất thư học liệu!');
      return;
    }
    setCoursewareModalStudents(list);
    setIsCoursewareModalOpen(true);
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDisplayed = (displayedList) => {
    if (selectedStudentIds.length === displayedList.length && displayedList.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(displayedList.map(s => s.id));
    }
  };

  const refreshEditData = async () => {
    if (!selectedStudentId) return;
    try {
      const res = await fetch(`/api/students/${selectedStudentId}`);
      const result = await res.json();
      if (result.success) {
        setEditStudentData(result.data);
      }
    } catch (e) {
      console.error('Không thể làm mới chi tiết học viên:', e);
    }
  };

  const captureReceiptCanvas = async () => {
    if (!receiptRef.current) return null;
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    return await html2canvas(receiptRef.current, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      logging: false,
    });
  };

  const copyReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await captureReceiptCanvas();
      if (!canvas) throw new Error('Không tạo được vùng ảnh');
      canvas.toBlob(async (blob) => {
        try {
          if (!navigator.clipboard || typeof window.ClipboardItem === 'undefined') {
            throw new Error('Clipboard không được hỗ trợ');
          }
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
          ]);
          alert('✅ Đã copy hình ảnh Phiếu thu điện tử vào Clipboard! Hãy mở Zalo/Facebook và dán (Ctrl+V) ngay.');
        } catch (err) {
          console.error(err);
          alert('Trình duyệt không hỗ trợ copy ảnh trực tiếp vào Clipboard (yêu cầu HTTPS/quyền). Vui lòng dùng nút "Tải Ảnh".');
        }
      }, 'image/png', 1);
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo ảnh phiếu thu: ' + (err?.message || err));
    }
  };

  const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await captureReceiptCanvas();
      if (!canvas) throw new Error('Không tạo được vùng ảnh');
      const studentNameClean = (eReceiptData?.studentName || 'HocVien')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/\s+/g, '_');
      const link = document.createElement('a');
      link.download = `PhieuThu_${studentNameClean}_${(eReceiptData?.receiptCode || '2026').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tải ảnh: ' + (err?.message || err));
    }
  };

  const handleCollectTuitionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const isBookGift = paymentForm.itemDistributionType === 'TANG_KEM_KHOA';
      const parsedItemPrice = isBookGift ? 0 : parseNumber(paymentForm.itemPrice);

      const res = await fetch(`/api/students/${selectedStudentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'collectTuition',
          amountPaid: parseNumber(paymentForm.collectAmount),
          paymentMethod: paymentForm.paymentMethod,
          notes: paymentForm.notes,
          includeItem: paymentForm.includeItem,
          itemId: paymentForm.itemId,
          itemDistributionType: paymentForm.itemDistributionType || 'TANG_KEM_KHOA',
          itemPrice: parsedItemPrice,
          itemQuantity: paymentForm.itemQuantity,
          includeGift: paymentForm.includeGift,
          giftId: paymentForm.giftId,
          giftQuantity: paymentForm.giftQuantity || 1,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: `Ghi nhận thu tiền học phí & giáo trình/tặng phẩm thành công!` });
        fetchStudents();
        fetchConfigsAndClasses();
        
        const studentName = editStudentData?.student?.name || 'Học viên';
        const totalCourseFee = editStudentData?.orders?.reduce((sum, o) => sum + (o.feeToPay || 0), 0) || 0;
        const oldDebt = editStudentData?.orders?.reduce((sum, o) => sum + ((o.feeToPay || 0) - (o.amountPaid || 0)), 0) || 0;
        const totalPaid = parseNumber(paymentForm.collectAmount);
        
        const receiptItems = [];

        // 1. Giáo trình
        let bookCost = 0;
        let bookName = '';
        if (paymentForm.includeItem && paymentForm.itemId) {
          const selectedItem = inventoryItems.find(i => i.id === paymentForm.itemId);
          const cfg = courseConfigs.find(c => c.bookName === selectedItem?.name);
          const originalPrice = cfg?.bookPrice || 250000;
          const isGift = paymentForm.itemDistributionType === 'TANG_KEM_KHOA';
          const qty = parseInt(paymentForm.itemQuantity, 10) || 1;
          const price = isGift ? 0 : (parsedItemPrice * qty);

          bookCost = price;
          bookName = selectedItem?.name ? `${selectedItem.name} (x${qty})` : 'Giáo trình';

          receiptItems.push({
            type: isGift ? 'MATERIAL_GIFT' : 'MATERIAL_SOLD',
            name: bookName,
            quantity: qty,
            price,
            originalPrice: isGift ? (originalPrice * qty) : null,
            badge: isGift ? 'TẶNG KÈM THEO KHÓA HỌC' : 'GIÁO TRÌNH BÁN',
            badgeColor: isGift ? '#059669' : '#0D88C4'
          });
        }

        // 2. Quà tặng ghi danh
        if (paymentForm.includeGift && paymentForm.giftId) {
          const selectedGift = inventoryItems.find(i => i.id === paymentForm.giftId);
          const qty = parseInt(paymentForm.giftQuantity, 10) || 1;
          const giftName = selectedGift?.name ? `${selectedGift.name} (x${qty})` : 'Quà tặng ghi danh';

          receiptItems.push({
            type: 'GIFT',
            name: giftName,
            quantity: qty,
            price: 0,
            originalPrice: null,
            badge: 'QUÀ TẶNG GHI DANH',
            badgeColor: '#D97706'
          });
        }

        const tuitionPaid = Math.max(0, totalPaid - bookCost);
        const remainingDebt = Math.max(0, oldDebt - tuitionPaid);
        const receiptCode = result.receiptCode || `PT-${new Date().toISOString().replace(/[-:T]/g, '').slice(2, 10)}`;
        
        setEReceiptData({
          receiptCode,
          studentName,
          courseFee: totalCourseFee > 0 ? totalCourseFee : oldDebt,
          oldDebt,
          tuitionPaid,
          remainingDebt,
          items: receiptItems,
          bookName,
          bookCost,
          totalPaid,
          date: new Date().toLocaleDateString('vi-VN'),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          cashier: 'Thu ngân / Kế toán',
          paymentMethod: paymentForm.paymentMethod,
        });
        
        setPaymentForm({
          collectAmount: '',
          paymentMethod: 'Chuyển khoản',
          notes: '',
          includeItem: false,
          itemId: '',
          itemDistributionType: 'TANG_KEM_KHOA',
          itemPrice: '0',
          itemQuantity: 1,
          includeGift: false,
          giftId: '',
          giftQuantity: 1,
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra khi thu tiền.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Các hàm xử lý đổi ô chọn Form thêm học viên
  const handleProgramChange = (e) => {
    const program = e.target.value;
    const configsUnderProgram = courseConfigs.filter(cfg => cfg.program === program);
    const uniqueCapDos = Array.from(new Set(configsUnderProgram.map(cfg => cfg.capDo)));
    setFilteredCapDos(uniqueCapDos);
    setFilteredLevels([]);
    setFilteredClasses([]);
    setFormData(prev => ({ ...prev, program, capDo: '', level: '', classCode: '' }));
  };

  const handleCapDoChange = (e) => {
    const capDo = e.target.value;
    const configsUnderCapDo = courseConfigs.filter(cfg => cfg.program === formData.program && cfg.capDo === capDo);
    setFilteredLevels(configsUnderCapDo);
    setFilteredClasses([]);
    setFormData(prev => ({ ...prev, capDo, level: '', classCode: '' }));
  };

  const handleLevelChange = (e) => {
    const level = e.target.value;
    const filteredCls = classes.filter(cls => cls.level === level);
    setFilteredClasses(filteredCls);
    setFormData(prev => ({ ...prev, level, classCode: '' }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCurrencyChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatNumber(value);
    setFormData(prev => ({ ...prev, [name]: formatted }));
  };

  const handleEditCurrencyChange = (e) => {
    const { name, value } = e.target;
    const formatted = formatNumber(value);
    setEditForm(prev => ({ ...prev, [name]: formatted }));
  };

  // Submit thêm mới học viên
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    if (!formData.nationalId) {
      setMessage({ type: 'error', text: 'Số định danh / CCCD là bắt buộc.' });
      setSubmitting(false);
      return;
    }

    if (formData.enrollmentMode === 'MONTHLY') {
      if (!formData.classCode) {
        setMessage({ type: 'error', text: 'Vui lòng chọn Lớp học kèm / theo tháng.' });
        setSubmitting(false);
        return;
      }
      if (parseNumber(formData.monthlyRate) <= 0) {
        setMessage({ type: 'error', text: 'Vui lòng nhập mức Học phí tháng hợp lệ.' });
        setSubmitting(false);
        return;
      }
    } else {
      if (parseNumber(formData.promoDiscount) > 0 && !formData.promoReason.trim()) {
        setMessage({ type: 'error', text: 'Vui lòng nhập "Lý do giảm thêm" để đối soát.' });
        setSubmitting(false);
        return;
      }

      if (parseNumber(formData.customFee) > 0 && !formData.customReason.trim()) {
        setMessage({ type: 'error', text: 'Vui lòng nhập "Lý do thu khác" khi áp dụng học phí thỏa thuận.' });
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          specialPolicyValue: parseNumber(formData.specialPolicyValue),
          promoDiscount: parseNumber(formData.promoDiscount),
          amountPaid: parseNumber(formData.amountPaid),
          customFee: parseNumber(formData.customFee),
          customReason: formData.customReason,
          monthlyRate: parseNumber(formData.monthlyRate),
          monthlySessions: parseInt(formData.monthlySessions, 10) || 8,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({
          type: 'success',
          text: formData.enrollmentMode === 'MONTHLY'
            ? `Thêm học viên thành công! Mã số: ${result.data.id} (Đã đồng bộ sang mục Học phí tháng)`
            : `Thêm học viên thành công! Mã số: ${result.data.id}`
        });
        setFormData({
          name: '', phone: '', dob: '', address: '', nationalId: '', specialPolicyType: 'Không giảm',
          specialPolicyValue: '0', enrollmentMode: 'COURSE', billingType: 'MONTHLY_PREPAID',
          monthlyRate: '1.200.000', monthlySessions: '8',
          program: '', level: '', classCode: '', amountPaid: '0', promoType: '', promoDiscount: '0', promoReason: '',
          customFee: '0', customReason: '', giftInventoryId: '', giftQuantity: 1, giftNotes: 'Tặng quà khi nhập học',
          paymentPolicy: 'Đóng trước',
          capDo: '',
        });
        fetchStudents();
        setTimeout(() => setIsModalOpen(false), 2000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra.' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
      const res = await fetch('/api/import', {
        method: 'POST',
        body: uploadData,
      });

      const result = await res.json();
      if (result.success) {
        setMessage({
          type: 'success',
          text: `Nhập dữ liệu thành công! Đã thêm ${result.data.classesImported} lớp học và ${result.data.studentsImported} học viên.`
        });
        fetchStudents();
        fetchConfigsAndClasses();
      } else {
        setMessage({ type: 'error', text: result.error || 'Lỗi khi nhập file Excel.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Lỗi kết nối API nạp Excel.' });
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      const res = await fetch('/api/import/template');
      if (!res.ok) throw new Error('Không thể tải file mẫu');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'File_Mau_Import_NhatMy.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Lỗi tải file mẫu: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleExportFilteredStudents = () => {
    const displayedStudents = students.filter(student => {
      if (opStatusFilter !== 'all' && student.status !== opStatusFilter) return false;
      return true;
    });

    if (displayedStudents.length === 0) {
      alert("Không có dữ liệu để xuất.");
      return;
    }

    const exportData = displayedStudents.map(student => ({
      'Mã HV': student.id,
      'Họ & Tên': student.name,
      'Trạng thái': student.status,
      'CCCD / Định danh': student.nationalId,
      'Ngày sinh': student.dob,
      'Số điện thoại': student.phone,
      'Lớp học / Lý do nghỉ': student.status === 'Nghỉ luôn' ? student.dropoutReason : (student.status === 'Tạm nghỉ' ? `Tạm nghỉ (Hẹn: ${student.callbackDate ? new Date(student.callbackDate).toLocaleDateString('vi-VN') : ''})` : student.classCode),
      'Ưu đãi đặc biệt': student.specialPolicy,
      'Công nợ còn lại': student.debt,
      'Đã đóng': student.totalPaid,
      'Ví (VND)': student.walletBalance
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachHocVien");
    
    // Tạo tên file có ngày giờ
    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g, "");
    let fileName = `DanhSachHocVien_${dateStr}.xlsx`;
    if (birthdayMonth !== 'all') {
      fileName = `SinhNhatThang${birthdayMonth}_${dateStr}.xlsx`;
    }

    XLSX.writeFile(workbook, fileName);
  };

  const getSelectedCourseDetails = () => {
    const config = courseConfigs.find(cfg => cfg.level === formData.level);
    return {
      price: config?.price || 0,
      totalSessions: config?.totalSessions || 32,
      bookName: config?.bookName || '',
      bookPrice: config?.bookPrice || 0,
    };
  };

  const getSelectedClassDetails = () => {
    if (!formData.classCode || formData.classCode === 'none') return null;
    return classes.find(c => c.code === formData.classCode);
  };

  const selectedClassInfo = getSelectedClassDetails();
  const courseDetails = getSelectedCourseDetails();

  // Calculate pro-rated price if a class is selected (làm tròn xuống hàng chục nghìn)
  let proRatedPrice = courseDetails.price;
  if (selectedClassInfo) {
    const costPerSession = courseDetails.price / selectedClassInfo.totalSessions;
    const rawProRated = costPerSession * selectedClassInfo.sessionsRemaining;
    proRatedPrice = Math.floor(rawProRated / 10000) * 10000;
  }

  const customFeeVal = parseNumber(formData.customFee);
  const fixedDiscountVal = parseNumber(formData.specialPolicyValue);
  const baseFee = Math.max(0, proRatedPrice - fixedDiscountVal);
  const promoDiscountVal = parseNumber(formData.promoDiscount);
  
  // Ghi đè nếu có học phí thỏa thuận
  const finalFeeToPay = customFeeVal > 0 ? customFeeVal : Math.max(0, baseFee - promoDiscountVal);
  const paidAmountVal = parseNumber(formData.amountPaid);
  const remainingDebt = Math.max(0, finalFeeToPay - paidAmountVal);

  const uniquePrograms = Array.from(new Set(courseConfigs.map(cfg => cfg.program)));

  return (
    <div className="students-container">
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1>Quản lý Học viên</h1>
          <p>Danh sách thông tin học viên, lớp học và tiến trình công nợ.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={handleExportFilteredStudents} className="btn btn-secondary" style={{ display: 'inline-flex', gap: '0.5rem', background: '#e0f2fe', color: '#0369a1', cursor: 'pointer', border: '1px solid #bae6fd' }} title="Xuất danh sách hiển thị ra Excel">
            <i className="fa-solid fa-file-export"></i> Xuất ra Excel
          </button>
          <button onClick={handleDownloadTemplate} className="btn btn-secondary" style={{ display: 'inline-flex', gap: '0.5rem', background: '#ffe07a', color: '#1e293b', cursor: 'pointer' }} title="Tải file mẫu Excel">
            <i className="fa-solid fa-file-arrow-down"></i> Tải File Mẫu
          </button>
          <button className="btn" onClick={() => document.getElementById('excel-file-input').click()} style={{ display: 'inline-flex', gap: '0.5rem', background: 'var(--color-success)', color: 'white', cursor: 'pointer' }} title="Nhập danh sách học viên từ file Excel">
            <i className="fa-solid fa-file-excel"></i> Nhập từ Excel
          </button>
          <input 
            type="file" 
            id="excel-file-input" 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
            onChange={handleExcelUpload} 
          />
          <button className="btn btn-primary" onClick={() => { setMessage({ type: '', text: '' }); setIsModalOpen(true); }}>
            <i className="fa-solid fa-user-plus" style={{ marginRight: '0.5rem' }}></i> Thêm học viên mới
          </button>
        </div>
      </div>

      {/* STATUS METRICS CHIPS SUMMARY */}
      <div className="glass-panel animated-scale" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <i className="fa-solid fa-users"></i> Trạng thái Vận hành:
            </span>
            <button
              type="button"
              onClick={() => setOpStatusFilter('all')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                borderRadius: '20px',
                border: opStatusFilter === 'all' ? 'none' : '1px solid var(--color-border)',
                background: opStatusFilter === 'all' ? 'var(--color-primary)' : 'var(--color-surface)',
                color: opStatusFilter === 'all' ? '#fff' : 'var(--color-text)',
                cursor: 'pointer'
              }}
            >
              Tất cả ({statusSummary.total})
            </button>
            <button
              type="button"
              onClick={() => setOpStatusFilter('Đang học')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                borderRadius: '20px',
                border: opStatusFilter === 'Đang học' ? 'none' : '1px solid rgba(16, 185, 129, 0.3)',
                background: opStatusFilter === 'Đang học' ? '#10b981' : 'rgba(16, 185, 129, 0.1)',
                color: opStatusFilter === 'Đang học' ? '#fff' : '#047857',
                cursor: 'pointer'
              }}
            >
              🟢 Đang học ({statusSummary.studying})
            </button>
            <button
              type="button"
              onClick={() => setOpStatusFilter('Tạm nghỉ')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                borderRadius: '20px',
                border: opStatusFilter === 'Tạm nghỉ' ? 'none' : '1px solid rgba(245, 158, 11, 0.3)',
                background: opStatusFilter === 'Tạm nghỉ' ? '#f59e0b' : 'rgba(245, 158, 11, 0.1)',
                color: opStatusFilter === 'Tạm nghỉ' ? '#fff' : '#b45309',
                cursor: 'pointer'
              }}
            >
              🟡 Tạm nghỉ ({statusSummary.paused})
            </button>
            <button
              type="button"
              onClick={() => setOpStatusFilter('Bảo lưu')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                borderRadius: '20px',
                border: opStatusFilter === 'Bảo lưu' ? 'none' : '1px solid rgba(13, 136, 196, 0.3)',
                background: opStatusFilter === 'Bảo lưu' ? 'var(--color-primary-dark)' : 'rgba(13, 136, 196, 0.1)',
                color: opStatusFilter === 'Bảo lưu' ? '#fff' : 'var(--color-primary-dark)',
                cursor: 'pointer'
              }}
            >
              🔵 Bảo lưu ({statusSummary.reserved})
            </button>
            <button
              type="button"
              onClick={() => setOpStatusFilter('Nghỉ luôn')}
              style={{
                padding: '0.35rem 0.75rem',
                fontSize: '0.8rem',
                fontWeight: '700',
                borderRadius: '20px',
                border: opStatusFilter === 'Nghỉ luôn' ? 'none' : '1px solid rgba(239, 68, 68, 0.3)',
                background: opStatusFilter === 'Nghỉ luôn' ? '#ef4444' : 'rgba(239, 68, 68, 0.1)',
                color: opStatusFilter === 'Nghỉ luôn' ? '#fff' : '#b91c1c',
                cursor: 'pointer'
              }}
            >
              🔴 Nghỉ luôn ({statusSummary.dropout})
            </button>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="toolbar-panel glass-panel">
        <div className="search-box">
          <i className="fa-solid fa-magnifying-glass"></i>
          <input 
            type="text" 
            placeholder="Tìm theo tên, mã số, SĐT, CCCD..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <label htmlFor="filter-opstatus"><i className="fa-solid fa-user-gear"></i> Trạng thái Vận hành:</label>
          <select id="filter-opstatus" value={opStatusFilter} onChange={(e) => setOpStatusFilter(e.target.value)}>
            <option value="all">Tất cả Vận hành</option>
            <option value="Đang học">🟢 Đang học</option>
            <option value="Tạm nghỉ">🟡 Tạm nghỉ</option>
            <option value="Bảo lưu">🔵 Bảo lưu</option>
            <option value="Nghỉ luôn">🔴 Nghỉ luôn (Thôi học)</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-datepreset"><i className="fa-solid fa-calendar-days"></i> Ngày đăng ký:</label>
          <select id="filter-datepreset" value={datePreset} onChange={(e) => setDatePreset(e.target.value)}>
            <option value="all">Tất cả mốc ngày</option>
            <option value="today">Hôm nay</option>
            <option value="thisWeek">Tuần này</option>
            <option value="thisMonth">Tháng này</option>
            <option value="lastMonth">Tháng trước</option>
            <option value="thisQuarter">Quý này</option>
            <option value="thisYear">Năm nay</option>
            <option value="custom">Tùy chọn khoảng ngày</option>
          </select>
        </div>

        {datePreset === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }} />
            <span>-</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.8rem' }} />
          </div>
        )}

        <div className="filter-group">
          <label htmlFor="filter-class"><i className="fa-solid fa-chalkboard-user"></i> Lớp học:</label>
          <ClassSelect 
            id="filter-class" 
            classes={[...classes, ...monthlyClasses]}
            value={classFilter} 
            onChange={(e) => setClassFilter(e.target.value)} 
            placeholder="Tất cả lớp học"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="filter-birthday"><i className="fa-solid fa-cake-candles"></i> Tháng sinh:</label>
          <select id="filter-birthday" value={birthdayMonth} onChange={(e) => setBirthdayMonth(e.target.value)}>
            <option value="all">Tất cả tháng</option>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="filter-status"><i className="fa-solid fa-filter"></i> Lọc Học phí:</label>
          <select id="filter-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả học phí</option>
            <option value="paid">Đã đóng đủ</option>
            <option value="partial">Chưa đóng đủ</option>
            <option value="unpaid">Chưa đóng</option>
          </select>
        </div>
      </div>

      {/* Dynamic Filtered List calculation */}
      {(() => {
        const displayedStudents = students.filter(student => {
          if (opStatusFilter !== 'all' && student.status !== opStatusFilter) return false;
          return true;
        });

        return (
          <>
            {opStatusFilter === 'Nghỉ luôn' && (
              <div className="dropout-stats-banner glass-panel animated-scale" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-danger)', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <i className="fa-solid fa-user-slash"></i> Báo cáo & Thống kê Danh sách Học viên Nghỉ luôn (Thôi học)
                    </h3>
                    <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                      Tổng số học viên thôi học chính thức hiện tại: <strong style={{ color: 'var(--color-danger)', fontSize: '1.15rem' }}>{displayedStudents.length} học viên</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Students Table */}
            <div className="table-container glass-panel">
              {selectedStudentIds.length > 0 && (
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: '700' }}>
                    Đã chọn <strong style={{ color: '#0B2A4A', fontSize: '1.05rem' }}>{selectedStudentIds.length}</strong> / {displayedStudents.length} học viên
                  </span>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#0B2A4A', color: '#FFFFFF', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', padding: '0.45rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={() => handleOpenBatchCourseware(displayedStudents.filter(s => selectedStudentIds.includes(s.id)))}
                  >
                    <i className="fa-solid fa-id-card"></i> 📱 Xuất Thư Học Liệu Đã Chọn ({selectedStudentIds.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={() => setSelectedStudentIds([])}
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              )}
              {loading ? (
                <div className="loading-state">
                  <i className="fa-solid fa-spinner fa-spin"></i>
                  <p>Đang tải danh sách học viên...</p>
                </div>
              ) : displayedStudents.length === 0 ? (
                <div className="empty-table-state">
                  <i className="fa-regular fa-folder-open"></i>
                  <p>Không tìm thấy học viên nào thuộc danh mục này.</p>
                </div>
              ) : (
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={displayedStudents.length > 0 && selectedStudentIds.length === displayedStudents.length}
                          onChange={() => toggleSelectAllDisplayed(displayedStudents)}
                          title="Chọn tất cả để xuất thẻ hàng loạt"
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th>Mã HV</th>
                      <th>Họ & Tên</th>
                      <th>Trạng thái</th>
                      <th>CCCD / Định danh</th>
                      <th>Ngày sinh</th>
                      <th>Số điện thoại</th>
                      <th>Lớp học / Lý do nghỉ</th>
                      <th>Ưu đãi đặc biệt</th>
                      <th style={{ textAlign: 'right' }}>Công nợ còn lại</th>
                      <th style={{ textAlign: 'right' }}>Đã đóng</th>
                      <th style={{ textAlign: 'right' }}>Ví (VND)</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedStudents.map((student) => (
                      <tr key={student.id} className="table-row">
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleSelectStudent(student.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td className="std-id">{student.id}</td>
                        <td className="std-name">{student.name}</td>
                        <td>
                          <span className={`status-badge-profile ${
                            student.status === 'Đang học' ? 'bg-success-light' :
                            student.status === 'Tạm nghỉ' ? 'bg-warning-light' :
                            student.status === 'Bảo lưu' ? 'bg-info-light' : 'bg-danger-light'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td><span className="cccd-badge">{student.nationalId}</span></td>
                        <td>{student.dob}</td>
                        <td>{student.phone}</td>
                        <td>
                          {student.status === 'Nghỉ luôn' ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-danger)', fontWeight: '600' }}>
                              <i className="fa-solid fa-comment-dots"></i> {student.dropoutReason || 'Nghỉ luôn (Chưa nhập lý do)'}
                            </span>
                          ) : student.status === 'Tạm nghỉ' ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-warning-dark)', fontWeight: '600' }}>
                              <i className="fa-solid fa-clock"></i> Tạm nghỉ {student.callbackDate ? `(Hẹn: ${new Date(student.callbackDate).toLocaleDateString('vi-VN')})` : ''}
                            </span>
                          ) : (
                            <span className="badge-class">
                              <i className="fa-solid fa-school-flag"></i> {student.classCode}
                            </span>
                          )}
                        </td>
                        <td className="policy-cell">{student.specialPolicy}</td>
                        <td style={{ textAlign: 'right', fontWeight: 'bold', color: student.debt > 0 ? 'var(--color-danger)' : 'var(--color-text)' }}>
                          {student.debt.toLocaleString('vi-VN')}đ
                          {student.historicalDebt > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#c05621', fontWeight: '600', marginTop: '2px' }} title="Công nợ đọng từ các khóa học trước">
                              (+Nợ cũ: {student.historicalDebt.toLocaleString('vi-VN')}đ)
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }} title={`Lớp hiện tại: ${student.totalPaid.toLocaleString('vi-VN')}đ | Tích lũy toàn khóa: ${(student.allTimeTotalPaid || student.totalPaid).toLocaleString('vi-VN')}đ`}>
                          {student.totalPaid.toLocaleString('vi-VN')}đ
                          {student.bookPaidInClass > 0 && (
                            <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: '600', marginTop: '1px' }} title="Đã thanh toán tiền giáo trình cho lớp này">
                              (+Sách: {student.bookPaidInClass.toLocaleString('vi-VN')}đ)
                            </div>
                          )}
                          {student.allTimeTotalPaid !== undefined && student.allTimeTotalPaid !== student.totalPaid && (
                            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 'normal', marginTop: '2px' }}>
                              (Toàn khóa: {student.allTimeTotalPaid.toLocaleString('vi-VN')}đ)
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-primary-dark)', fontWeight: 'bold' }}>
                          {student.walletBalance ? `${student.walletBalance.toLocaleString('vi-VN')}đ` : '0đ'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-buttons">
                            <button 
                              className="action-btn" 
                              style={{ color: '#0D88C4', background: 'rgba(13, 136, 196, 0.1)' }} 
                              title="📚 Thư Thông Báo Cấp Học Liệu Số" 
                              onClick={() => handleOpenSingleCourseware(student)}
                            >
                              <i className="fa-solid fa-book-open"></i>
                            </button>
                            <Link href={`/students/${student.id}`} className="action-btn view-btn" title="Xem chi tiết">
                              <i className="fa-regular fa-eye"></i>
                            </Link>
                            <button className="action-btn edit-btn" style={{ color: 'var(--color-success)' }} title="AI Sinh nhật" onClick={() => openAiBirthdayModal(student)}>
                              <i className="fa-solid fa-cake-candles"></i>
                            </button>
                            <button className="action-btn edit-btn" title="Nghiệp vụ / Chỉnh sửa" onClick={() => openEditModal(student.id)}>
                              <i className="fa-regular fa-pen-to-square"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        );
      })()}

      {/* Modal: Thêm Học Viên Mới */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale">
            <div className="modal-header">
              <h2><i className="fa-solid fa-user-plus"></i> Thêm Học Viên & Xếp Lớp</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            {message.text && (
              <div className={`alert-box alert-${message.type}`}>
                <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-grid">
                {/* Thông tin cá nhân */}
                <div className="form-section">
                  <h3><i className="fa-regular fa-address-card"></i> Thông tin học viên</h3>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Họ và Tên *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Họ và tên học viên" />
                    </div>
                    <div className="form-group">
                      <label>Số định danh / CCCD *</label>
                      <input type="text" name="nationalId" value={formData.nationalId} onChange={handleInputChange} required placeholder="CCCD" />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Số điện thoại</label>
                      <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="SĐT liên hệ" />
                    </div>
                    <div className="form-group">
                      <label>Ngày sinh</label>
                      <input type="date" name="dob" value={formData.dob} onChange={handleInputChange} />
                    </div>
                  </div>
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label>Loại ưu đãi đặc biệt</label>
                      <select name="specialPolicyType" value={formData.specialPolicyType} onChange={handleInputChange}>
                        <option value="Không giảm">Không giảm</option>
                        <option value="Miễn giảm nội bộ">Miễn giảm nội bộ</option>
                        <option value="Khó khăn">Gia đình khó khăn</option>
                        <option value="Học bổng">Học bổng</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Mức giảm cố định (VND)</label>
                      <input type="text" name="specialPolicyValue" value={formData.specialPolicyValue} onChange={handleCurrencyChange} disabled={formData.specialPolicyType === 'Không giảm'} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Địa chỉ</label>
                    <input type="text" name="address" value={formData.address} onChange={handleInputChange} placeholder="Địa chỉ thường trú" />
                  </div>
                </div>

                {/* Xếp lớp & Học phí */}
                <div className="form-section">
                  <h3><i className="fa-solid fa-graduation-cap"></i> Xếp lớp & Học phí</h3>
                  
                  {/* Chuyển đổi linh hoạt: Học theo Khóa vs Học theo Tháng / Học kèm đặc biệt */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', background: '#f1f5f9', padding: '0.35rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, enrollmentMode: 'COURSE', classCode: '' }))}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: formData.enrollmentMode !== 'MONTHLY' ? 'var(--color-primary)' : 'transparent',
                        color: formData.enrollmentMode !== 'MONTHLY' ? '#fff' : '#475569',
                        boxShadow: formData.enrollmentMode !== 'MONTHLY' ? '0 2px 6px rgba(13,136,196,0.25)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-layer-group"></i> Học theo Khóa chuẩn
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        enrollmentMode: 'MONTHLY',
                        classCode: monthlyClasses.some(c => c.code === prev.classCode) ? prev.classCode : (monthlyClasses[0]?.code || '')
                      }))}
                      style={{
                        flex: 1,
                        padding: '0.55rem 0.75rem',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        background: formData.enrollmentMode === 'MONTHLY' ? '#059669' : 'transparent',
                        color: formData.enrollmentMode === 'MONTHLY' ? '#fff' : '#475569',
                        boxShadow: formData.enrollmentMode === 'MONTHLY' ? '0 2px 6px rgba(5,150,105,0.25)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className="fa-solid fa-calendar-check"></i> Học Kèm / Đóng theo Tháng
                    </button>
                  </div>

                  {formData.enrollmentMode === 'MONTHLY' ? (
                    <div className="fee-preview-box animated-scale" style={{ background: '#f0fdf4', border: '1px solid #86efac', padding: '1rem' }}>
                      <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <i className="fa-solid fa-circle-check"></i>
                        <span>Dành cho lớp Học kèm đặc biệt, Luyện thi TOEIC, B1, Cấp 3... Tự động đồng bộ sang mục <strong>Quản lý Học phí Tháng</strong>!</span>
                      </div>

                      <div className="form-group">
                        <label>1. Chọn Lớp Học Kèm / Lớp Tháng *</label>
                        <select
                          name="classCode"
                          value={formData.classCode}
                          onChange={handleInputChange}
                          required
                          style={{ fontWeight: '700', color: '#065f46', border: '1px solid #34d399', background: '#fff' }}
                        >
                          <option value="">-- Chọn lớp học kèm / lớp tháng --</option>
                          {monthlyClasses.map(cls => (
                            <option key={cls.code} value={cls.code}>
                              {cls.code} {cls.teacherName ? `(${cls.teacherName})` : ''} {cls.schedule ? `- ${cls.schedule}` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-grid-2" style={{ marginTop: '0.75rem' }}>
                        <div className="form-group">
                          <label>2. Hình thức thu học phí tháng *</label>
                          <select
                            name="billingType"
                            value={formData.billingType || 'MONTHLY_PREPAID'}
                            onChange={handleInputChange}
                          >
                            <option value="MONTHLY_PREPAID">Thu đầu tháng (Đóng trước)</option>
                            <option value="MONTHLY_POSTPAID">Thu cuối tháng (Đóng sau theo buổi thực học)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>3. Số buổi tiêu chuẩn / tháng *</label>
                          <input
                            type="number"
                            name="monthlySessions"
                            min="1"
                            max="31"
                            value={formData.monthlySessions || '8'}
                            onChange={handleInputChange}
                            placeholder="VD: 8"
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginTop: '0.75rem' }}>
                        <label>4. Mức học phí 1 tháng (VND) *</label>
                        <input
                          type="text"
                          name="monthlyRate"
                          value={formData.monthlyRate || ''}
                          onChange={handleCurrencyChange}
                          placeholder="VD: 1.200.000"
                          required
                          style={{ fontWeight: '800', color: '#047857', fontSize: '1rem' }}
                        />
                        <p className="field-note" style={{ color: '#047857', marginTop: '0.3rem' }}>
                          <i className="fa-solid fa-calculator"></i> Đơn giá tương đương: <strong>{Math.round(parseNumber(formData.monthlyRate) / (parseInt(formData.monthlySessions, 10) || 8)).toLocaleString('vi-VN')}đ / buổi</strong>
                        </p>
                      </div>

                      {/* Vật tư cấp phát kèm theo cho học viên tháng */}
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #86efac' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#065f46', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <i className="fa-solid fa-gift"></i> Quà tặng / Giáo trình cấp phát (Tùy chọn)
                        </h4>
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label>Chọn vật tư / giáo trình</label>
                            <select 
                              name="giftInventoryId"
                              value={formData.giftInventoryId} 
                              onChange={handleInputChange}
                            >
                              <option value="">-- Không tặng / cấp phát --</option>
                              {inventoryItems.map(item => (
                                <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                                  {item.name} (Tồn: {item.currentStock})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Số lượng</label>
                            <input 
                              type="number" 
                              name="giftQuantity"
                              min="1" 
                              value={formData.giftQuantity} 
                              onChange={handleInputChange} 
                              disabled={!formData.giftInventoryId}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="form-grid-3">
                        <div className="form-group">
                          <label>1. Độ tuổi (DO_TUOI)</label>
                          <select name="program" value={formData.program} onChange={handleProgramChange}>
                            <option value="">-- Chọn --</option>
                            {uniquePrograms.map(prog => (
                              <option key={prog} value={prog}>{prog}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>2. Cấp độ (CAP_DO)</label>
                          <select name="capDo" value={formData.capDo} onChange={handleCapDoChange} disabled={!formData.program}>
                            <option value="">-- Chọn --</option>
                            {filteredCapDos.map(cd => (
                              <option key={cd} value={cd}>{cd}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>3. Khóa học (KHOA_HOC)</label>
                          <select name="level" value={formData.level} onChange={handleLevelChange} disabled={!formData.capDo}>
                            <option value="">-- Chọn --</option>
                            {filteredLevels.map(cfg => (
                              <option key={cfg.id} value={cfg.level}>{cfg.level}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="form-group" style={{ marginTop: '1rem' }}>
                        <label>4. Lớp học</label>
                        <ClassSelect 
                          name="classCode" 
                          classes={filteredClasses}
                          value={formData.classCode} 
                          onChange={handleInputChange} 
                          disabled={!formData.level}
                          placeholder="Chờ xếp lớp"
                        />
                        {selectedClassInfo && (
                          <p className="field-note" style={{ color: 'var(--color-primary-dark)', fontWeight: '600', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            <i className="fa-solid fa-circle-info"></i> Lớp đã học {selectedClassInfo.sessionsTaught} buổi - Còn lại {selectedClassInfo.sessionsRemaining} buổi - Tổng {selectedClassInfo.totalSessions} buổi.
                          </p>
                        )}
                      </div>

                      {formData.level && (
                        <div className="fee-preview-box">
                          <h4><i className="fa-solid fa-receipt"></i> Tóm tắt học phí</h4>
                          <div className="fee-row">
                            <span>Học phí khóa gốc:</span>
                            <span>{courseDetails.price.toLocaleString('vi-VN')}đ</span>
                          </div>
                          {selectedClassInfo && (
                            <div className="fee-row text-primary" style={{ fontWeight: '600' }}>
                              <span>Học phí khấu trừ ({selectedClassInfo.sessionsRemaining} buổi còn lại):</span>
                              <span>{proRatedPrice.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                            </div>
                          )}
                          {fixedDiscountVal > 0 && (
                            <div className="fee-row text-danger">
                              <span>Giảm giá đặc biệt:</span>
                              <span>-{fixedDiscountVal.toLocaleString('vi-VN')}đ</span>
                            </div>
                          )}
                          <div className="form-grid-2" style={{ marginTop: '0.5rem' }}>
                            <div className="form-group">
                              <label>Giảm thêm (Seasonal)</label>
                              <input type="text" name="promoDiscount" value={formData.promoDiscount} onChange={handleCurrencyChange} />
                            </div>
                            <div className="form-group">
                              <label>Thực đóng đợt này</label>
                              <input type="text" name="amountPaid" value={formData.amountPaid} onChange={handleCurrencyChange} />
                            </div>
                          </div>

                          <div className="form-grid-2" style={{ marginTop: '0.5rem' }}>
                            <div className="form-group">
                              <label>Học phí thỏa thuận / Thực thu</label>
                              <input type="text" name="customFee" value={formData.customFee} onChange={handleCurrencyChange} placeholder="Ghi đè học phí..." />
                            </div>
                            <div className="form-group">
                              <label>Lý do thu khác {customFeeVal > 0 && <span className="text-danger">*</span>}</label>
                              <input type="text" name="customReason" value={formData.customReason} onChange={handleInputChange} required={customFeeVal > 0} placeholder="VD: Dạy kèm bù riêng..." />
                            </div>
                          </div>

                          {promoDiscountVal > 0 && (
                            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                              <label style={{ color: 'var(--color-danger)' }}>Lý do giảm thêm *</label>
                              <input type="text" name="promoReason" value={formData.promoReason} onChange={handleInputChange} required placeholder="Giải trình lý do giảm giá" />
                            </div>
                          )}

                          <div className="form-group" style={{ marginTop: '0.5rem' }}>
                            <label>Chính sách đóng phí tháng</label>
                            <select name="paymentPolicy" value={formData.paymentPolicy} onChange={handleInputChange}>
                              <option value="Đóng trước">Đóng trước (Thu trước học phí khi vào tháng)</option>
                              <option value="Đóng sau">Đóng sau (Thu học phí sau khi học xong tháng)</option>
                            </select>
                          </div>

                          <div className="fee-total-rows">
                            <div className="fee-row total-fee">
                              <span>Phải đóng:</span>
                              <span>{finalFeeToPay.toLocaleString('vi-VN')}đ</span>
                            </div>
                            <div className="fee-row debt-fee">
                              <span>Công nợ còn lại:</span>
                              <span className={remainingDebt > 0 ? "text-danger" : "text-success"}>
                                {remainingDebt.toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          </div>

                          {/* Vật tư cấp phát kèm theo */}
                          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--color-border)' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-primary-dark)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <i className="fa-solid fa-gift"></i> Quà tặng / Giáo trình cấp phát (Tùy chọn)
                            </h4>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label>Chọn vật tư / giáo trình</label>
                                <select 
                                  name="giftInventoryId"
                                  value={formData.giftInventoryId} 
                                  onChange={handleInputChange}
                                >
                                  <option value="">-- Không tặng / cấp phát --</option>
                                  {inventoryItems.map(item => (
                                    <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                                      {item.name} (Tồn: {item.currentStock})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="form-group">
                                <label>Số lượng</label>
                                <input 
                                  type="number" 
                                  name="giftQuantity"
                                  min="1" 
                                  value={formData.giftQuantity} 
                                  onChange={handleInputChange} 
                                  disabled={!formData.giftInventoryId}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>Lưu học viên</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Đại Tu Chỉnh Sửa Nghiệp Vụ */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '850px' }}>
            <div className="modal-header">
              <h2><i className="fa-solid fa-sliders"></i> Nghiệp vụ Quản trị Học viên</h2>
              <button className="close-btn" onClick={() => setIsEditModalOpen(false)}>&times;</button>
            </div>

            {loadingEditData ? (
              <div className="loading-state">
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <p>Đang tải dữ liệu học viên...</p>
              </div>
            ) : (
              <>
                {/* Profile Summary & Magic Link */}
                <div style={{
                  marginBottom: '1.25rem',
                  padding: '1rem',
                  background: 'rgba(13, 136, 196, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-primary-dark)' }}>
                      {editStudentData?.student?.name}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>
                      Mã HV: <strong style={{ color: 'var(--color-text)' }}>{selectedStudentId}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text)' }}>Sổ liên lạc điện tử:</span>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (editStudentData?.student?.parentPortalToken) {
                          const url = window.location.origin + '/parent/' + editStudentData.student.parentPortalToken;
                          navigator.clipboard.writeText(url);
                          setMessage({ type: 'success', text: 'Đã sao chép đường dẫn sổ liên lạc điện tử!' });
                        } else {
                          setMessage({ type: 'error', text: 'Không tìm thấy mã liên kết của học viên.' });
                        }
                      }}
                      className="btn" 
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#ffe07a', color: '#1e293b', border: '1px solid #e2b714', borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}
                    >
                      <i className="fa-regular fa-copy"></i> Sao chép đường dẫn
                    </button>
                  </div>
                </div>

{/* UI: Các phần quản trị */}
                <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

                  <div className="modal-form" style={{ border: "1px solid var(--color-border)", padding: "1.5rem", borderRadius: "12px", background: "var(--color-bg)", position: "relative" }}>
                    {/* TAB: Thanh toán / Thu tiền */}
                    <div className="form-section">
                      <h3>Luồng Nghiệp vụ: Thu tiền Học phí</h3>
                      
                      {editStudentData?.orders ? (
                        (() => {
                          const unpaidOrders = editStudentData.orders.filter(o => o.amountPaid < o.feeToPay);
                          const totalDebt = editStudentData.orders.reduce((sum, o) => sum + (o.feeToPay - o.amountPaid), 0);
                          
                          return (
                            <>
                              <div className="transfer-summary-box" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                <p style={{ fontSize: '1.1rem', color: 'var(--color-danger)' }}>
                                  <strong>Tổng công nợ cần đóng:</strong> {totalDebt.toLocaleString('vi-VN')}đ
                                </p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                  Ví học viên hiện tại: <strong>{(editStudentData?.student?.walletBalance || 0).toLocaleString()}đ</strong>
                                </p>
                              </div>

                              {unpaidOrders.length > 0 ? (
                                <div style={{ marginTop: '1rem' }}>
                                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Danh sách hóa đơn chưa hoàn thành:</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {unpaidOrders.map(o => (
                                      <div key={o.id} style={{ padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '6px', fontSize: '0.85rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                                          <span>Hóa đơn: {o.id} ({o.classCode})</span>
                                          <span className="text-danger">Còn nợ: {(o.feeToPay - o.amountPaid).toLocaleString()}đ</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                                          <span>Học phí: {o.feeToPay.toLocaleString()}đ | Đã đóng: {o.amountPaid.toLocaleString()}đ</span>
                                          <span>Hạn đóng: {o.paymentDeadline ? new Date(o.paymentDeadline).toLocaleDateString('vi-VN') : 'N/A'}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="alert-box alert-success" style={{ marginTop: '1rem' }}>
                                  <i className="fa-solid fa-circle-check"></i>
                                  <span>Học viên đã hoàn thành tất cả các khoản học phí!</span>
                                </div>
                              )}

                              <form onSubmit={handleCollectTuitionSubmit} style={{ marginTop: '1.5rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                                <div className="form-grid-2">
                                  <div className="form-group">
                                    <label>Số tiền thu đợt này (VND) *</label>
                                    <input 
                                      type="text" 
                                      value={paymentForm.collectAmount} 
                                      onChange={(e) => setPaymentForm(prev => ({ ...prev, collectAmount: formatNumber(e.target.value) }))} 
                                      required 
                                      placeholder="Ví dụ: 1.000.000"
                                    />
                                  </div>

                                  <div className="form-group">
                                    <label>Hình thức thanh toán *</label>
                                    <select 
                                      value={paymentForm.paymentMethod} 
                                      onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    >
                                      <option value="Chuyển khoản">Chuyển khoản</option>
                                      <option value="Tiền mặt">Tiền mặt</option>
                                    </select>
                                  </div>
                                </div>

                                {/* MỤC GIÁO TRÌNH & QUÀ TẶNG KÈM THEO */}
                                 <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px dashed var(--color-primary)', borderRadius: '10px', background: 'rgba(13, 136, 196, 0.03)' }}>
                                   
                                   {/* 1. Kèm Giáo trình / Sách học viên */}
                                   <div style={{ marginBottom: paymentForm.includeItem ? '0.85rem' : '0.5rem' }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                       <input 
                                         type="checkbox" 
                                         id="includeItem" 
                                         checked={paymentForm.includeItem} 
                                         onChange={(e) => setPaymentForm(prev => ({ ...prev, includeItem: e.target.checked }))} 
                                         style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                       />
                                       <label htmlFor="includeItem" style={{ fontWeight: '700', color: 'var(--color-primary-dark)', cursor: 'pointer', margin: 0 }}>
                                         <i className="fa-solid fa-book"></i> Kèm Giáo trình / Sách học viên
                                       </label>
                                     </div>

                                     {paymentForm.includeItem && (
                                       <div className="animated-scale" style={{ marginTop: '0.65rem', padding: '0.85rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                         {/* Chọn hình thức cấp phát */}
                                         <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                           <button
                                             type="button"
                                             onClick={() => {
                                               setPaymentForm(prev => ({ ...prev, itemDistributionType: 'TANG_KEM_KHOA', itemPrice: '0' }));
                                             }}
                                             style={{
                                               flex: 1,
                                               padding: '0.45rem 0.6rem',
                                               borderRadius: '6px',
                                               fontSize: '0.82rem',
                                               fontWeight: '700',
                                               border: paymentForm.itemDistributionType === 'TANG_KEM_KHOA' ? '2px solid #059669' : '1px solid #CBD5E1',
                                               background: paymentForm.itemDistributionType === 'TANG_KEM_KHOA' ? '#ECFDF5' : '#F8FAFC',
                                               color: paymentForm.itemDistributionType === 'TANG_KEM_KHOA' ? '#065F46' : '#64748B',
                                               cursor: 'pointer',
                                               display: 'flex',
                                               alignItems: 'center',
                                               justifyContent: 'center',
                                               gap: '0.35rem'
                                             }}
                                           >
                                             <i className="fa-solid fa-gift"></i> Tặng kèm theo khóa (0đ)
                                           </button>
                                           <button
                                             type="button"
                                             onClick={() => {
                                               setPaymentForm(prev => {
                                                 const item = inventoryItems.find(i => i.id === prev.itemId);
                                                 const cfg = courseConfigs.find(c => c.bookName === item?.name);
                                                 const defaultPrice = cfg?.bookPrice || 200000;
                                                 return { ...prev, itemDistributionType: 'BAN', itemPrice: formatNumber(defaultPrice) };
                                               });
                                             }}
                                             style={{
                                               flex: 1,
                                               padding: '0.45rem 0.6rem',
                                               borderRadius: '6px',
                                               fontSize: '0.82rem',
                                               fontWeight: '700',
                                               border: paymentForm.itemDistributionType === 'BAN' ? '2px solid #0D88C4' : '1px solid #CBD5E1',
                                               background: paymentForm.itemDistributionType === 'BAN' ? '#EFF6FF' : '#F8FAFC',
                                               color: paymentForm.itemDistributionType === 'BAN' ? '#085E8A' : '#64748B',
                                               cursor: 'pointer',
                                               display: 'flex',
                                               alignItems: 'center',
                                               justifyContent: 'center',
                                               gap: '0.35rem'
                                             }}
                                           >
                                             <i className="fa-solid fa-cart-shopping"></i> Bán giáo trình (Có thu)
                                           </button>
                                         </div>

                                         <div className="form-grid-2">
                                           <div className="form-group">
                                             <label style={{ fontSize: '0.82rem', fontWeight: '600' }}>Chọn Bộ Giáo trình *</label>
                                             <select 
                                               value={paymentForm.itemId} 
                                               onChange={(e) => {
                                                 const selectedId = e.target.value;
                                                 const item = inventoryItems.find(i => i.id === selectedId);
                                                 const cfg = courseConfigs.find(c => c.bookName === item?.name);
                                                 const defaultPrice = cfg?.bookPrice || 0;
                                                 setPaymentForm(prev => ({
                                                   ...prev,
                                                   itemId: selectedId,
                                                   itemPrice: prev.itemDistributionType === 'TANG_KEM_KHOA' ? '0' : formatNumber(defaultPrice),
                                                 }));
                                               }}
                                             >
                                               <option value="">-- Chọn giáo trình trong kho --</option>
                                               {inventoryItems.map(item => (
                                                 <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                                                   {item.name} ({item.category} - Còn tồn: {item.currentStock})
                                                 </option>
                                               ))}
                                             </select>
                                           </div>

                                           <div className="form-group">
                                             <label style={{ fontSize: '0.82rem', fontWeight: '600' }}>
                                               {paymentForm.itemDistributionType === 'TANG_KEM_KHOA' ? 'Giá trị thu (0đ Miễn phí)' : 'Đơn giá bán (VND)'}
                                             </label>
                                             <input 
                                               type="text" 
                                               value={paymentForm.itemPrice} 
                                               disabled={paymentForm.itemDistributionType === 'TANG_KEM_KHOA'}
                                               onChange={(e) => setPaymentForm(prev => ({ ...prev, itemPrice: formatNumber(e.target.value) }))} 
                                               style={{ background: paymentForm.itemDistributionType === 'TANG_KEM_KHOA' ? '#F1F5F9' : '#FFFFFF' }}
                                             />
                                           </div>
                                         </div>
                                         
                                         <p className="field-note" style={{ color: paymentForm.itemDistributionType === 'TANG_KEM_KHOA' ? '#059669' : '#0D88C4', fontWeight: '600', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                                           {paymentForm.itemDistributionType === 'TANG_KEM_KHOA' ? (
                                             <span><i className="fa-solid fa-circle-check"></i> Giáo trình sẽ hiển thị <strong>0đ [TẶNG KÈM THEO KHÓA HỌC]</strong> trên phiếu thu và tự động xuất kho 1 cuốn.</span>
                                           ) : (
                                             <span><i className="fa-solid fa-circle-check"></i> Tiền giáo trình sẽ tự động được cộng vào phiếu thu và trừ tồn kho 1 cuốn.</span>
                                           )}
                                         </p>
                                       </div>
                                     )}
                                   </div>

                                   {/* 2. Kèm Quà tặng ghi danh / Tri ân (Balo, Áo thun, Bình nước...) */}
                                   <div style={{ borderTop: '1px dashed #CBD5E1', paddingTop: '0.65rem' }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                       <input 
                                         type="checkbox" 
                                         id="includeGift" 
                                         checked={paymentForm.includeGift} 
                                         onChange={(e) => setPaymentForm(prev => ({ ...prev, includeGift: e.target.checked }))} 
                                         style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                       />
                                       <label htmlFor="includeGift" style={{ fontWeight: '700', color: 'var(--color-primary-dark)', cursor: 'pointer', margin: 0 }}>
                                         <i className="fa-solid fa-award"></i> Kèm Quà tặng ghi danh / Tri ân (Balo, Áo thun, Bình nước...)
                                       </label>
                                     </div>

                                     {paymentForm.includeGift && (
                                       <div className="animated-scale" style={{ marginTop: '0.65rem', padding: '0.85rem', background: '#ffffff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                                         <div className="form-grid-2">
                                           <div className="form-group">
                                             <label style={{ fontSize: '0.82rem', fontWeight: '600' }}>Chọn Quà tặng từ Kho *</label>
                                             <select 
                                               value={paymentForm.giftId} 
                                               onChange={(e) => setPaymentForm(prev => ({ ...prev, giftId: e.target.value }))}
                                             >
                                               <option value="">-- Chọn quà tặng / vật phẩm --</option>
                                               {inventoryItems.map(item => (
                                                 <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                                                   {item.name} ({item.category} - Còn tồn: {item.currentStock})
                                                 </option>
                                               ))}
                                             </select>
                                           </div>
                                           <div className="form-group">
                                             <label style={{ fontSize: '0.82rem', fontWeight: '600' }}>Số lượng quà tặng</label>
                                             <input 
                                               type="number" 
                                               min="1" 
                                               value={paymentForm.giftQuantity} 
                                               onChange={(e) => setPaymentForm(prev => ({ ...prev, giftQuantity: parseInt(e.target.value) || 1 }))}
                                             />
                                           </div>
                                         </div>
                                         <p className="field-note" style={{ color: '#D97706', fontWeight: '600', marginTop: '0.35rem', fontSize: '0.8rem' }}>
                                           <i className="fa-solid fa-circle-check"></i> Quà tặng ghi danh sẽ hiển thị <strong>0đ [QUÀ TẶNG GHI DANH]</strong> trên phiếu thu và tự động xuất kho.
                                         </p>
                                       </div>
                                     )}
                                   </div>

                                 </div>

                                 <div className="form-group" style={{ marginTop: '0.75rem' }}>
                                  <label>Ghi chú thu tiền</label>
                                  <input 
                                    type="text" 
                                    value={paymentForm.notes} 
                                    onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))} 
                                    placeholder="Ví dụ: Đóng học phí đợt 2 lớp CN1..." 
                                  />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '0.5rem' }}>
                                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditModalOpen(false)}>Đóng</button>
                                  <button type="submit" className="btn btn-primary" disabled={submitting || (totalDebt <= 0 && !paymentForm.includeItem && !paymentForm.includeGift && parseNumber(paymentForm.collectAmount) <= 0)}>
                                    <i className="fa-solid fa-file-invoice-dollar"></i> Xác nhận thu tiền
                                  </button>
                                </div>
                              </form>
                            </>
                          );
                        })()
                      ) : (
                        <p>Đang tải thông tin hóa đơn...</p>
                      )}
                    </div>
                  </div>
                    {/* TAB 1: Thông tin cơ bản */}
                  {/* TAB 1: Thông tin cơ bản & Phân quyền học liệu */}
                  <form onSubmit={(e) => handleEditSubmit(e, 'basic')} className="modal-form" style={{ border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-bg)', position: 'relative' }}>
                      <div className="form-section">
                        <h3>Chỉnh sửa Hồ sơ Học viên</h3>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Họ và Tên</label>
                            <input type="text" name="name" value={editForm.name} onChange={handleEditInputChange} required />
                          </div>
                          <div className="form-group">
                            <label>Số định danh / CCCD</label>
                            <input type="text" name="nationalId" value={editForm.nationalId} onChange={handleEditInputChange} required />
                          </div>
                        </div>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Số điện thoại</label>
                            <input type="text" name="phone" value={editForm.phone} onChange={handleEditInputChange} />
                          </div>
                          <div className="form-group">
                            <label>Ngày sinh</label>
                            <input type="date" name="dob" value={editForm.dob ? editForm.dob.substring(0,10) : ''} onChange={handleEditInputChange} />
                          </div>
                        </div>
                        <div className="form-grid">
                          <div className="form-group">
                            <label>Địa chỉ</label>
                            <input type="text" name="address" value={editForm.address} onChange={handleEditInputChange} />
                          </div>
                          <div className="form-grid-2">
                            <div className="form-group">
                              <label>Loại ưu đãi</label>
                              <select name="specialPolicyType" value={editForm.specialPolicyType} onChange={handleEditInputChange}>
                                <option value="Không giảm">Không giảm</option>
                                <option value="Miễn giảm nội bộ">Miễn giảm nội bộ</option>
                                <option value="Khó khăn">Gia đình khó khăn</option>
                                <option value="Học bổng">Học bổng</option>
                                <option value="Khác">Khác</option>
                              </select>
                            </div>
                            <div className="form-group">
                              <label>Mức giảm cố định (VND)</label>
                              <input type="text" name="specialPolicyValue" value={editForm.specialPolicyValue} onChange={handleEditCurrencyChange} disabled={editForm.specialPolicyType === 'Không giảm'} />
                            </div>
                          </div>
                        </div>
                      </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        <i className="fa-solid fa-save"></i> Lưu Thông tin
                      </button>
                    </div>
                  </form>

                    {/* TAB 3: Đang học / Tạm nghỉ / Nghỉ luôn */}
                  <form onSubmit={(e) => handleEditSubmit(e, 'statusChange')} className="modal-form" style={{ border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-bg)', position: 'relative' }}>
                      <div className="form-section">
                        <h3>Luồng Trạng thái: Vận hành Học viên</h3>
                        <div className="form-group">
                          <label>Chọn Trạng thái Vận hành *</label>
                          <select name="status" value={editForm.status} onChange={handleEditInputChange}>
                            <option value="Đang học">Đang học (Hoạt động bình thường)</option>
                            <option value="Tạm nghỉ">Tạm nghỉ (Nghỉ tạm thời có lý do - Rút tên khỏi lớp)</option>
                            <option value="Nghỉ luôn">Nghỉ luôn (Nghỉ học chính thức - Rút tên khỏi lớp)</option>
                          </select>
                        </div>

                        {editForm.status === 'Tạm nghỉ' && (
                          <div className="form-group animated-scale" style={{ marginTop: '1rem' }}>
                            <label style={{ color: 'var(--color-warning-dark)' }}>Ngày hẹn liên hệ chăm sóc lại *</label>
                            <input type="date" name="callbackDate" value={editForm.callbackDate ? editForm.callbackDate.substring(0,10) : ''} onChange={handleEditInputChange} required />
                            <p className="field-note"><i className="fa-solid fa-circle-info"></i> Tạm nghỉ sẽ tự động rút tên học viên khỏi sĩ số lớp và dọn danh sách điểm danh. Hệ thống tạo nhắc nhở gọi lại cho phụ huynh trước 5 ngày.</p>
                          </div>
                        )}

                        {editForm.status === 'Nghỉ luôn' && (
                          <div className="animated-scale" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.03)' }}>
                            <h4 style={{ fontSize: '0.95rem', color: 'var(--color-danger)', marginBottom: '0.75rem' }}>
                              <i className="fa-solid fa-user-slash"></i> Thông tin học viên xin Thôi học (Nghỉ luôn)
                            </h4>
                            <div className="form-group">
                              <label>Lý do thôi học chủ đạo *</label>
                              <select name="dropoutReasonType" value={editForm.dropoutReasonType} onChange={handleEditInputChange}>
                                <option value="Học phí quá cao">Học phí quá cao</option>
                                <option value="Dời chỗ ở / Chuyển trường">Dời chỗ ở / Chuyển trường</option>
                                <option value="Không theo kịp chương trình">Không theo kịp chương trình</option>
                                <option value="Bận lịch học văn hóa">Bận lịch học trường công</option>
                                <option value="Lý do khác">Lý do khác</option>
                              </select>
                            </div>
                            <div className="form-group" style={{ marginTop: '0.75rem' }}>
                              <label>Chi tiết giải trình lý do thôi học *</label>
                              <textarea 
                                name="dropoutReasonText" 
                                value={editForm.dropoutReasonText} 
                                onChange={handleEditInputChange}
                                required
                                placeholder="Ghi rõ lý do cụ thể học viên thôi học để phục vụ thống kê đối soát..."
                                rows={3}
                                className="detail-text-input"
                                style={{ height: 'auto', width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--color-border)' }}
                              />
                            </div>
                            <p className="field-note" style={{ color: 'var(--color-danger)', marginTop: '0.5rem' }}>
                              <i className="fa-solid fa-triangle-exclamation"></i> Hệ thống sẽ rút tên học viên khỏi lớp học hiện tại và đưa học viên vào mục <strong>"Thống kê Học viên Nghỉ luôn"</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        <i className="fa-solid fa-save"></i> Lưu Trạng thái
                      </button>
                    </div>
                  </form>

                    {/* TAB 3: Chuyển lớp */}
                  <form onSubmit={(e) => handleEditSubmit(e, 'transfer')} className="modal-form" style={{ border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-bg)', position: 'relative' }}>
                      <div className="form-section">
                        <h3>Luồng Nghiệp vụ: Xếp lớp / Chuyển lớp học</h3>
                        
                        {editStudentData?.currentClass ? (
                          <div className="transfer-summary-box">
                            <p><strong>Lớp hiện tại:</strong> {editStudentData.currentClass.classCode} ({editStudentData.currentClass.level})</p>
                            <p><strong>Số buổi đã học (Điểm danh có mặt):</strong> {editStudentData.currentClass.attendedSessions} / {editStudentData.currentClass.totalSessions} buổi</p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '600', color: 'var(--color-text)' }}>Thực đóng lớp cũ:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <input
                                  type="text"
                                  name="overrideAmountPaidOld"
                                  value={editForm.overrideAmountPaidOld || ''}
                                  onChange={handleEditCurrencyChange}
                                  placeholder="VD: 1.750.000"
                                  style={{ width: '150px', padding: '0.35rem 0.6rem', fontWeight: 'bold', color: '#059669', borderRadius: '6px', border: '1px solid #10b981', background: '#fff' }}
                                />
                                <span style={{ fontWeight: 'bold' }}>đ</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(Có thể chỉnh sửa nếu cần đối soát lại với thực tế)</span>
                            </div>
                          </div>
                        ) : (
                          <div className="alert-box alert-info" style={{ margin: '0 0 1rem 0' }}>
                            <i className="fa-solid fa-circle-info"></i>
                            <span>Học viên hiện tại chưa được xếp lớp. Chọn một lớp học khởi điểm bên dưới để xếp lớp.</span>
                          </div>
                        )}

                        <div className="form-group">
                          <label>Chọn Lớp học muốn xếp / chuyển tới *</label>
                          <ClassSelect 
                            name="newClassCode" 
                            classes={[...classes, ...monthlyClasses]}
                            value={editForm.newClassCode} 
                            onChange={handleEditInputChange} 
                            required
                          />
                          {transferPreview?.selectedClassInfo && (
                            <p className="field-note" style={{ color: 'var(--color-primary-dark)', fontWeight: '600', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              <i className="fa-solid fa-circle-info"></i> Lớp học mới đã dạy {transferPreview.selectedClassInfo.sessionsTaught} buổi - Còn lại {transferPreview.selectedClassInfo.sessionsRemaining} buổi - Tổng {transferPreview.selectedClassInfo.totalSessions} buổi.
                            </p>
                          )}
                        </div>

                        {/* TÙY CHỌN NGHIỆP VỤ: CHUYỂN LỚP / HỌC LẠI / CHUYỂN NGANG */}
                        {editForm.newClassCode && (
                          <div className="form-group" style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <label style={{ fontWeight: '700', color: 'var(--color-primary-dark)', display: 'block', marginBottom: '0.5rem' }}>
                              <i className="fa-solid fa-briefcase"></i> Loại nghiệp vụ chuyển lớp
                            </label>
                            <select 
                              name="transferType" 
                              value={editForm.transferType || 'normal'} 
                              onChange={handleEditInputChange}
                              style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                            >
                              <option value="normal">Chuyển lớp thông thường (Cấn trừ theo số buổi đã học)</option>
                              <option value="repeat">🔄 Học lại khóa học (Repeat Course - Áp dụng chính sách ưu đãi)</option>
                              <option value="lateral">➡️ Chuyển ngang trọn gói (Giữ nguyên tiền, không trừ số buổi cũ)</option>
                            </select>

                            {editForm.transferType === 'repeat' && (
                              <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', border: '1px dashed #16a34a', borderRadius: '8px' }}>
                                <label style={{ display: 'block', fontWeight: '700', color: '#166534', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                  <i className="fa-solid fa-tags"></i> Chính sách ưu đãi Học viên Học Lại
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                  {[
                                    { id: 'percent_30', label: 'Giảm 30%' },
                                    { id: 'percent_50', label: 'Giảm 50%' },
                                    { id: 'free', label: 'Miễn phí (0đ)' },
                                    { id: 'custom_vnd', label: 'Số tiền VND' },
                                    { id: 'custom_percent', label: '% Tùy chỉnh' },
                                  ].map(opt => (
                                    <button
                                      key={opt.id}
                                      type="button"
                                      onClick={() => setEditForm(prev => ({ ...prev, repeatDiscountType: opt.id }))}
                                      style={{
                                        padding: '0.45rem',
                                        borderRadius: '6px',
                                        fontSize: '0.8rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                        border: (editForm.repeatDiscountType || 'percent_30') === opt.id ? '2px solid #16a34a' : '1px solid #cbd5e1',
                                        background: (editForm.repeatDiscountType || 'percent_30') === opt.id ? '#16a34a' : '#fff',
                                        color: (editForm.repeatDiscountType || 'percent_30') === opt.id ? '#fff' : '#334155'
                                      }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>

                                {editForm.repeatDiscountType === 'custom_vnd' && (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>Số tiền miễn giảm trực tiếp (VND):</label>
                                    <input 
                                      type="text" 
                                      name="repeatDiscountAmount" 
                                      value={editForm.repeatDiscountAmount} 
                                      onChange={handleEditCurrencyChange} 
                                      placeholder="Ví dụ: 1.000.000"
                                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #86efac' }}
                                    />
                                  </div>
                                )}

                                {editForm.repeatDiscountType === 'custom_percent' && (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <label style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '600' }}>Phần trăm miễn giảm (%):</label>
                                    <input 
                                      type="number" 
                                      name="repeatDiscountPercent" 
                                      min="0"
                                      max="100"
                                      value={editForm.repeatDiscountPercent} 
                                      onChange={handleEditInputChange} 
                                      placeholder="Ví dụ: 40"
                                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #86efac' }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {transferPreview && (
                          <div className="fee-preview-box animated-scale" style={{ marginTop: '1rem', border: '1px solid #93c5fd', background: '#f8fafc', borderRadius: '10px', padding: '1.25rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <i className="fa-solid fa-calculator"></i> Bảng tính cấn trừ học phí xem trước
                            </h4>
                            
                            {transferPreview.isInitial ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Học phí lớp mới ({transferPreview.selectedClassInfo.sessionsRemaining} buổi còn lại):</span>
                                  <span>{transferPreview.proRatedPriceNew.toLocaleString()}đ</span>
                                </div>
                                {transferPreview.repeatDiscountAmount > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: '600' }}>
                                    <span>Ưu đãi học lại:</span>
                                    <span>-{transferPreview.repeatDiscountAmount.toLocaleString()}đ</span>
                                  </div>
                                )}
                                <div style={{ borderTop: '2px solid #3b82f6', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.1rem', color: '#1e40af' }}>
                                  <span>Tổng học phí cần đóng:</span>
                                  <span>{transferPreview.newClassFeeBase.toLocaleString()}đ</span>
                                </div>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
                                {/* 1. Lớp cũ */}
                                <div style={{ padding: '0.6rem', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                                    <span>1. Lớp cũ: {editStudentData.currentClass.classCode}</span>
                                    <span>Thực đóng: {(transferPreview.amountPaidOld || 0).toLocaleString()}đ</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                    <span>{editForm.transferType === 'lateral' ? 'Chuyển ngang trọn gói (Không tính tiền buổi cũ)' : `Đã học: ${transferPreview.attendedSessions}/${transferPreview.totalSessionsOld || 32} buổi (Tiêu dùng: ${transferPreview.costUsedOld.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ)`}</span>
                                    {transferPreview.balanceOld > 0 ? (
                                      <strong style={{ color: '#059669' }}>Dư chuyển đi: +{transferPreview.balanceOld.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</strong>
                                    ) : transferPreview.debtOld > 0 ? (
                                      <strong style={{ color: '#dc2626' }}>Nợ chuyển tiếp: +{transferPreview.debtOld.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</strong>
                                    ) : (
                                      <strong style={{ color: '#64748b' }}>Đã hoàn tất (0đ)</strong>
                                    )}
                                  </div>
                                </div>

                                {/* 2. Lớp mới */}
                                <div style={{ padding: '0.6rem', background: '#fff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                                    <span>2. Lớp mới: {transferPreview.selectedClassInfo.code}</span>
                                    <span>Giá gốc: {(transferPreview.priceNew || 0).toLocaleString()}đ</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                    <span>Học phí {transferPreview.selectedClassInfo.sessionsRemaining} buổi còn lại:</span>
                                    <span>{transferPreview.proRatedPriceNew.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                  </div>
                                  {transferPreview.repeatDiscountAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontSize: '0.8rem', marginTop: '0.2rem', fontWeight: '600' }}>
                                      <span>- Ưu đãi học viên học lại:</span>
                                      <span>-{transferPreview.repeatDiscountAmount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                    </div>
                                  )}
                                  {transferPreview.specialDiscount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontSize: '0.8rem', marginTop: '0.2rem', fontWeight: '600' }}>
                                      <span>- Ưu đãi chính sách học viên:</span>
                                      <span>-{transferPreview.specialDiscount.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                    </div>
                                  )}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #e2e8f0', marginTop: '0.3rem', paddingTop: '0.3rem', fontWeight: 'bold' }}>
                                    <span>Thành tiền lớp mới:</span>
                                    <span style={{ color: '#1e40af' }}>{transferPreview.newClassFeeBase.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                  </div>
                                </div>

                                {/* 3. Điều chỉnh thủ công */}
                                {transferPreview.manualAdj !== 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0.6rem', background: '#fef3c7', borderRadius: '6px', color: '#b45309', fontWeight: '600', fontSize: '0.85rem' }}>
                                    <span>Điều chỉnh thủ công ({editForm.manualReason || 'Giám đốc'}):</span>
                                    <span>{transferPreview.manualAdj > 0 ? '+' : ''}{transferPreview.manualAdj.toLocaleString()}đ</span>
                                  </div>
                                )}

                                {/* 4. Tổng kết */}
                                <div style={{ borderTop: '2px solid #3b82f6', paddingTop: '0.75rem', marginTop: '0.25rem' }}>
                                  {transferPreview.difference > 0 ? (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                      <span style={{ fontWeight: 'bold', color: '#991b1b', fontSize: '1rem' }}>
                                        <i className="fa-solid fa-money-bill-wave"></i> Học viên CẦN ĐÓNG THÊM:
                                      </span>
                                      <span style={{ fontWeight: '800', color: '#dc2626', fontSize: '1.25rem' }}>
                                        {transferPreview.difference.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
                                      </span>
                                    </div>
                                  ) : (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                                      <span style={{ fontWeight: 'bold', color: '#166534', fontSize: '1rem' }}>
                                        <i className="fa-solid fa-wallet"></i> Tiền thừa cộng vào VÍ HỌC VIÊN:
                                      </span>
                                      <span style={{ fontWeight: '800', color: '#16a34a', fontSize: '1.25rem' }}>
                                        +{Math.abs(transferPreview.difference).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {transferPreview && !transferPreview.isInitial && (
                          <div className="manual-adjustment-box" style={{ marginTop: '1rem', padding: '1rem', border: '1px dashed var(--color-primary)', borderRadius: '8px', background: 'rgba(13, 136, 196, 0.02)' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>
                              <i className="fa-solid fa-sliders"></i> Điều chỉnh thủ công (Dành cho Giám đốc)
                            </h4>
                            <div className="form-grid-2">
                              <div className="form-group">
                                <label>Số tiền điều chỉnh (+/- VND)</label>
                                <input 
                                  type="text" 
                                  name="manualAdjustment" 
                                  value={editForm.manualAdjustment} 
                                  onChange={handleEditCurrencyChange} 
                                  placeholder="Ví dụ: -500.000 hoặc 200.000"
                                />
                              </div>
                              <div className="form-group">
                                <label>Lý do điều chỉnh {parseNumber(editForm.manualAdjustment) !== 0 && <span className="text-danger">*</span>}</label>
                                <input 
                                  type="text" 
                                  name="manualReason" 
                                  value={editForm.manualReason} 
                                  onChange={handleEditInputChange} 
                                  placeholder="Lý do điều chỉnh học phí"
                                  required={parseNumber(editForm.manualAdjustment) !== 0}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        <i className="fa-solid fa-save"></i> Lưu Chuyển lớp
                      </button>
                    </div>
                  </form>

                    {/* TAB 4: Bảo lưu */}
                  <form onSubmit={(e) => handleEditSubmit(e, 'reserve')} className="modal-form" style={{ border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-bg)', position: 'relative' }}>
                      <div className="form-section">
                        <h3>Luồng Nghiệp vụ: Bảo lưu Học phí</h3>
                        
                        {/* Hiển thị tính toán tự động nếu có lớp hiện tại */}
                        {editStudentData?.currentClass && (
                          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(13, 136, 196, 0.05)', borderRadius: '8px', fontSize: '0.9rem' }}>
                            <p style={{ margin: '0 0 0.5rem 0' }}><strong>Chi phí lớp hiện tại ({editStudentData.currentClass.classCode}):</strong></p>
                            <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--color-text-light)' }}>
                              <li>Học phí thực đóng: <strong>{(editStudentData.currentClass.amountPaid || 0).toLocaleString()}đ</strong></li>
                              <li>Số buổi đã điểm danh: <strong>{editStudentData.currentClass.attendedSessions} / {editStudentData.currentClass.totalSessions}</strong></li>
                              <li>Chi phí đã học: <strong>{Math.round(((editStudentData.currentClass.feeToPay || 0) / (editStudentData.currentClass.totalSessions || 32)) * (editStudentData.currentClass.attendedSessions || 0)).toLocaleString()}đ</strong></li>
                            </ul>
                            <div style={{ marginTop: '0.8rem' }}>
                              <button 
                                type="button" 
                                className="btn btn-sm btn-outline"
                                onClick={() => {
                                  const c = editStudentData.currentClass;
                                  const costPerSession = (c.feeToPay || 0) / (c.totalSessions || 32);
                                  const costUsed = costPerSession * (c.attendedSessions || 0);
                                  const diff = (c.amountPaid || 0) - costUsed;
                                  const autoAmount = diff > 0 ? Math.round(diff) : 0;
                                  setEditForm({...editForm, reservationAmount: autoAmount.toLocaleString()});
                                }}
                              >
                                <i className="fa-solid fa-calculator"></i> Tự động điền số dư đề xuất
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="form-grid-2">
                          <div className="form-group">
                            <label>Số tiền bảo lưu (VND)</label>
                            <input type="text" name="reservationAmount" value={editForm.reservationAmount} onChange={handleEditCurrencyChange} />
                          </div>
                          <div className="form-group">
                            <label>Hạn bảo lưu tối đa *</label>
                            <input type="date" name="reservationDeadline" value={editForm.reservationDeadline ? editForm.reservationDeadline.substring(0,10) : ''} onChange={handleEditInputChange} required />
                          </div>
                        </div>
                        <p className="field-note"><i className="fa-solid fa-triangle-exclamation"></i> Bảo lưu sẽ tự động chuyển trạng thái học viên thành "Bảo lưu", cộng tiền vào Ví và rút tên khỏi sỹ số lớp học.</p>
                      </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        <i className="fa-solid fa-save"></i> Lưu Bảo lưu
                      </button>
                    </div>
                  </form>

                    {/* TAB 5: Nghỉ luôn */}
                  <form onSubmit={(e) => handleEditSubmit(e, 'dropout')} className="modal-form" style={{ border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-bg)', position: 'relative' }}>
                      <div className="form-section">
                        <h3>Luồng Nghiệp vụ: Thôi học (Nghỉ luôn)</h3>
                        <div className="form-group">
                          <label>Lý do thôi học chủ đạo *</label>
                          <select name="dropoutReasonType" value={editForm.dropoutReasonType} onChange={handleEditInputChange}>
                            <option value="Học phí quá cao">Học phí quá cao</option>
                            <option value="Dời chỗ ở / Chuyển trường">Dời chỗ ở / Chuyển trường</option>
                            <option value="Không theo kịp chương trình">Không theo kịp chương trình</option>
                            <option value="Bận lịch học văn hóa">Bận lịch học trường công</option>
                            <option value="Lý do khác">Lý do khác</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label>Chi tiết giải trình lý do thôi học *</label>
                          <textarea 
                            name="dropoutReasonText" 
                            value={editForm.dropoutReasonText} 
                            onChange={handleEditInputChange}
                            required
                            placeholder="Mô tả lý do học viên xin thôi học để làm báo cáo cải thiện trung tâm..."
                            rows={4}
                            className="detail-text-input"
                            style={{ height: 'auto' }}
                          />
                        </div>
                      </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        <i className="fa-solid fa-save"></i> Lưu Nghỉ luôn
                      </button>
                    </div>
                  </form>
                    {/* TAB 7: Cấp phát vật tư / Bán bổ sung / Mua lại */}
                  <form onSubmit={(e) => handleEditSubmit(e, 'gift')} className="modal-form" style={{ border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-bg)', position: 'relative' }}>
                      <div className="form-section">
                        <h3>Luồng Nghiệp vụ: Cấp phát Vật tư / Bán bổ sung / Đổi trả</h3>
                        
                        <div className="form-grid-2">
                          <div className="form-group">
                            <label>Chọn vật tư / giáo trình *</label>
                            <select 
                              value={giftForm.inventoryId} 
                              onChange={(e) => {
                                const id = e.target.value;
                                const item = inventoryItems.find(i => i.id === id);
                                const cfg = courseConfigs.find(c => c.bookName === item?.name);
                                const price = cfg?.bookPrice || 0;
                                setGiftForm(prev => ({
                                  ...prev,
                                  inventoryId: id,
                                  itemPrice: formatNumber(price),
                                  collectAmount: giftForm.discountType === 'Miễn phí 100%' ? '0' : formatNumber(price * prev.quantity)
                                }));
                              }}
                            >
                              <option value="">-- Chọn vật tư --</option>
                              {inventoryItems.map(item => (
                                <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                                  {item.name} ({item.category} - Tồn kho: {item.currentStock})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Lý do cấp phát / Xuất bán *</label>
                            <select 
                              value={giftForm.reason} 
                              onChange={(e) => setGiftForm({...giftForm, reason: e.target.value})}
                            >
                              <option value="Tặng kèm khi nhập học">🎁 Tặng kèm khi nhập học (Mặc định)</option>
                              <option value="Mua mới / Mua bổ sung">🛒 Mua mới / Mua bổ sung giáo trình/vật phẩm</option>
                              <option value="Mua lại do làm mất">⚠️ Mua lại do làm mất sách/vật tư</option>
                              <option value="Đổi trả vật tư cũ">🔄 Đổi trả vật tư hỏng/cũ</option>
                              <option value="Lý do khác">Khác</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-grid-3" style={{ marginTop: '0.75rem' }}>
                          <div className="form-group">
                            <label>Số lượng *</label>
                            <input 
                              type="number" 
                              min="1" 
                              value={giftForm.quantity} 
                              onChange={(e) => {
                                const qty = parseInt(e.target.value) || 1;
                                const basePrice = parseNumber(giftForm.itemPrice);
                                let finalAmt = basePrice * qty;
                                if (giftForm.discountType === 'Miễn phí 100%') finalAmt = 0;
                                else if (giftForm.discountType === 'Giảm 50%') finalAmt = finalAmt * 0.5;

                                setGiftForm(prev => ({
                                  ...prev,
                                  quantity: qty,
                                  collectAmount: formatNumber(finalAmt)
                                }));
                              }} 
                            />
                          </div>

                          <div className="form-group">
                            <label>Chính sách Miễn giảm</label>
                            <select 
                              value={giftForm.discountType} 
                              onChange={(e) => {
                                const disc = e.target.value;
                                const basePrice = parseNumber(giftForm.itemPrice);
                                const qty = parseInt(giftForm.quantity) || 1;
                                let finalAmt = basePrice * qty;
                                if (disc === 'Miễn phí 100%') finalAmt = 0;
                                else if (disc === 'Giảm 50%') finalAmt = finalAmt * 0.5;

                                setGiftForm(prev => ({
                                  ...prev,
                                  discountType: disc,
                                  collectAmount: formatNumber(finalAmt)
                                }));
                              }}
                            >
                              <option value="Miễn phí 100%">🎁 Miễn phí 100% (Tặng phẩm)</option>
                              <option value="Không giảm">Thu đủ 100% (Không giảm)</option>
                              <option value="Giảm 50%">Giảm giá 50%</option>
                              <option value="Tùy chỉnh">Tùy chỉnh số tiền thu</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label>Số tiền thu thực tế (VND)</label>
                            <input 
                              type="text" 
                              value={giftForm.collectAmount} 
                              onChange={(e) => setGiftForm(prev => ({ ...prev, collectAmount: formatNumber(e.target.value), discountType: 'Tùy chỉnh' }))} 
                              disabled={giftForm.discountType === 'Miễn phí 100%'}
                            />
                          </div>
                        </div>

                        {parseNumber(giftForm.collectAmount) > 0 && (
                          <div className="form-group animated-scale" style={{ marginTop: '0.75rem' }}>
                            <label>Hình thức thanh toán *</label>
                            <select 
                              value={giftForm.paymentMethod} 
                              onChange={(e) => setGiftForm({...giftForm, paymentMethod: e.target.value})}
                            >
                              <option value="Chuyển khoản">Chuyển khoản</option>
                              <option value="Tiền mặt">Tiền mặt</option>
                            </select>
                          </div>
                        )}

                        <div className="form-group" style={{ marginTop: '0.75rem' }}>
                          <label>Ghi chú chi tiết</label>
                          <input 
                            type="text" 
                            value={giftForm.notes} 
                            onChange={(e) => setGiftForm({...giftForm, notes: e.target.value})} 
                            placeholder="Ghi rõ chi tiết xuất bán/cấp phát..." 
                          />
                        </div>

                        <div className="modal-actions" style={{ marginTop: '1.5rem', justifyContent: 'flex-end', borderTop: 'none' }}>
                          <button type="button" className="btn btn-primary" onClick={handleGiftSubmit} disabled={submitting || !giftForm.inventoryId}>
                            <i className="fa-solid fa-boxes-packing"></i> Xác nhận Cấp phát / Xuất bán
                          </button>
                        </div>
                        <p className="field-note" style={{ marginTop: '1rem' }}>
                          <i className="fa-solid fa-circle-info"></i> Hệ thống tự động tạo Phiếu Xuất Kho, trừ tồn kho và ghi nhận hóa đơn tài chính (nếu có thu tiền).
                        </p>
                      </div>
                  </form>

                  {/* TAB 8: Cấu hình Học phí tháng */}
                  <form onSubmit={(e) => handleEditSubmit(e, 'finance')} className="modal-form" style={{ border: '1px solid var(--color-border)', padding: '1.5rem', borderRadius: '12px', background: 'var(--color-bg)', position: 'relative', marginTop: '1rem' }}>
                    <div className="form-section">
                      <h3>Luồng Nghiệp vụ: Cấu hình Thu phí Tháng (Đặc biệt)</h3>
                      <div className="alert-box alert-warning" style={{ margin: '0 0 1rem 0' }}>
                        <i className="fa-solid fa-triangle-exclamation"></i>
                        <span>Chỉ dùng cho học viên có Lớp hiện tại và đóng học phí hàng tháng (TOEIC, Kèm). Nếu học viên đang học nhiều lớp, hãy dùng Tab "Chuyển lớp" để cấu hình cho từng lớp cụ thể. Tab này áp dụng cho lớp hiển thị ở trên.</span>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Kiểu thu phí *</label>
                          <select name="billingType" value={editForm.billingType || 'COURSE'} onChange={handleEditInputChange} required>
                            <option value="COURSE">Theo khóa (Mặc định)</option>
                            <option value="MONTHLY_PREPAID">Theo tháng - Đóng trước</option>
                            <option value="MONTHLY_POSTPAID">Theo tháng - Đóng sau</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label>Học phí 1 tháng / Đơn giá 1 buổi *</label>
                          <input type="text" name="monthlyRate" value={editForm.monthlyRate || ''} onChange={handleEditInputChange} placeholder="VD: 250000" />
                        </div>
                        
                        <div className="form-group">
                          <label>Số buổi cam kết (Nếu Đóng trước)</label>
                          <input type="number" name="monthlySessions" value={editForm.monthlySessions || ''} onChange={handleEditInputChange} placeholder="VD: 8" />
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={submitting}>
                        <i className="fa-solid fa-save"></i> Lưu Cấu hình Học phí
                      </button>
                    </div>
                  </form>

                      </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CSS Cục bộ */}
      <style>{`
        .students-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .page-header-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .page-header-actions h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: var(--color-text);
        }
        .page-header-actions p {
          color: var(--color-text-muted);
          font-size: 0.9rem;
        }
        .toolbar-panel {
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }
        .search-box {
          position: relative;
          width: 350px;
        }
        .search-box i {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--color-text-muted);
        }
        .search-box input {
          width: 100%;
          padding: 0.6rem 1rem 0.6rem 2.5rem;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          font-family: inherit;
          font-size: 0.9rem;
          background: var(--color-bg);
          color: var(--color-text);
        }
        .search-box input:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--color-text-muted);
        }
        .filter-group select {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
        }
        .table-container {
          padding: 0;
          overflow: hidden;
          border-radius: 12px;
        }
        .custom-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .custom-table th {
          background-color: rgba(13, 136, 196, 0.05);
          color: var(--color-text);
          font-weight: 700;
          padding: 1rem;
          font-size: 0.85rem;
          border-bottom: 2px solid var(--color-border);
        }
        .custom-table td {
          padding: 1rem;
          font-size: 0.85rem;
          border-bottom: 1px solid var(--color-border);
          color: var(--color-text);
        }
        .table-row {
          transition: background-color var(--transition-fast);
        }
        .table-row:hover {
          background-color: rgba(13, 136, 196, 0.02);
        }
        .std-id {
          font-family: monospace;
          font-weight: 700;
          color: var(--color-primary-dark);
        }
        .std-name {
          font-weight: 600;
        }
        .cccd-badge {
          font-family: monospace;
          font-weight: 600;
          background: rgba(100, 116, 139, 0.1);
          color: var(--color-text-muted);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.75rem;
        }
        .badge-class {
          background: rgba(13, 136, 196, 0.1);
          color: var(--color-primary-dark);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .policy-cell {
          font-size: 0.8rem;
          color: var(--color-text-muted);
          max-width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .action-buttons {
          display: flex;
          justify-content: center;
          gap: 0.4rem;
        }
        .action-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-size: 0.8rem;
        }
        .view-btn { color: var(--color-primary); }
        .view-btn:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }
        .edit-btn { color: var(--color-warning); }
        .edit-btn:hover { background: var(--color-warning); color: #1e293b; border-color: var(--color-warning); }
        
        .loading-state, .empty-table-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          gap: 1rem;
          color: var(--color-text-muted);
        }
        .loading-state i {
          font-size: 2.5rem;
          color: var(--color-primary);
        }
        
        /* Modals and forms */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 95%;
          max-width: 1000px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--color-surface);
          padding: 2rem;
          position: relative;
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--color-border);
          padding-bottom: 1rem;
          margin-bottom: 1.5rem;
        }
        .modal-header h2 {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--color-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .close-btn {
          background: none;
          border: none;
          font-size: 2rem;
          cursor: pointer;
          color: var(--color-text-muted);
          line-height: 1;
        }
        
        .modal-tabs {
          display: flex;
          border-bottom: 2px solid var(--color-border);
          margin-bottom: 1.5rem;
          overflow-x: auto;
          gap: 0.25rem;
        }
        .tab-btn {
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          font-weight: 600;
          color: var(--color-text-muted);
          cursor: pointer;
          font-family: inherit;
          font-size: 0.85rem;
          border-bottom: 3px solid transparent;
          white-space: nowrap;
          transition: all var(--transition-fast);
        }
        .tab-btn:hover {
          color: var(--color-primary);
        }
        .tab-btn.active {
          color: var(--color-primary);
          border-bottom-color: var(--color-primary);
        }
        
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }
        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .form-section h3 {
          font-size: 1rem;
          font-weight: 700;
          color: var(--color-primary-dark);
          border-bottom: 2px dashed var(--color-border);
          padding-bottom: 0.5rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .form-group label {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--color-text);
        }
        .form-group input, .form-group select {
          padding: 0.6rem 0.8rem;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: inherit;
          font-size: 0.9rem;
        }
        .form-group input:focus, .form-group select:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1.2fr;
          gap: 0.75rem;
        }
        .fee-preview-box {
          background: rgba(13, 136, 196, 0.03);
          border: 1px solid rgba(13, 136, 196, 0.1);
          border-radius: 8px;
          padding: 1rem;
        }
        .fee-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.85rem;
          padding: 0.25rem 0;
          color: var(--color-text-muted);
        }
        .total-fee {
          border-top: 1px solid var(--color-border);
          padding-top: 0.5rem;
          margin-top: 0.5rem;
          font-weight: bold;
          color: var(--color-text) !important;
        }
        .debt-fee {
          font-weight: bold;
        }
        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          border-top: 1px solid var(--color-border);
          padding-top: 1.5rem;
        }
        
        .transfer-summary-box {
          background: rgba(100, 116, 139, 0.05);
          border: 1px solid var(--color-border);
          padding: 1rem;
          border-radius: 8px;
          font-size: 0.85rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        
        .field-note {
          font-size: 0.75rem;
          color: var(--color-text-muted);
          margin-top: 0.25rem;
        }
        .field-note i {
          color: var(--color-primary);
        }

        .alert-box {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .alert-success { background: rgba(16, 185, 129, 0.1); color: var(--color-success); border: 1px solid rgba(16, 185, 129, 0.2); }
        .alert-error { background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2); }

        .status-badge-profile {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .bg-success-light { background-color: rgba(16, 185, 129, 0.1); color: var(--color-success); }
        .bg-warning-light { background-color: rgba(245, 158, 11, 0.1); color: var(--color-warning-dark); }
        .bg-info-light { background-color: rgba(59, 130, 246, 0.1); color: var(--color-info); }
        .bg-danger-light { background-color: rgba(239, 68, 68, 0.1); color: var(--color-danger); }

        .animated-scale {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleUp {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .detail-text-input {
          width: 100%;
          padding: 0.6rem 0.8rem;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: inherit;
          font-size: 0.9rem;
        }
      `}</style>

      {eReceiptData && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '1.25rem', background: '#f1f5f9', borderRadius: '16px' }}>
            
            <div ref={receiptRef} style={{ background: '#fff', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', position: 'relative' }}>
              {/* Dải line nhận diện thương hiệu Xanh & Vàng */}
              <div style={{ height: '6px', background: 'linear-gradient(90deg, #0D88C4 0%, #0D88C4 60%, #FFCA29 60%, #FFCA29 100%)' }}></div>
              
              <div style={{ padding: '1.5rem 1.75rem 2.25rem 1.75rem', textAlign: 'left', color: '#1E293B', fontFamily: "'Be Vietnam Pro', system-ui, -apple-system, sans-serif", position: 'relative' }}>
                {/* Header: Logo bên trái, Tiêu đề ở giữa */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
                  <img src="/logo.png" alt="Anh ngữ Nhật Mỹ" style={{ height: '54px', width: 'auto', objectFit: 'contain' }} crossOrigin="anonymous" />
                  <div style={{ flex: 1, textAlign: 'center', paddingRight: '10px' }}>
                    <h2 style={{ margin: '0 0 0.35rem 0', color: '#085E8A', fontSize: '1.25rem', fontWeight: '900', letterSpacing: '0.5px' }}>ANH NGỮ NHẬT MỸ</h2>
                    <div style={{ display: 'inline-block', background: '#FFCA29', color: '#085E8A', padding: '0.2rem 0.85rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                      PHIẾU THU ĐIỆN TỬ
                    </div>
                    {eReceiptData.receiptCode && (
                      <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: '700', marginTop: '0.25rem' }}>
                        Số: {eReceiptData.receiptCode}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Thông tin học viên */}
                <div style={{ margin: '1rem 0', borderTop: '2px dashed #E2E8F0', borderBottom: '2px dashed #E2E8F0', padding: '0.85rem 0', fontSize: '0.95rem', lineHeight: '1.7' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Học viên:</span>
                    <strong style={{ color: '#085E8A', fontSize: '1.05rem' }}>{eReceiptData.studentName.toUpperCase()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Ngày lập:</span>
                    <span>{eReceiptData.date} {eReceiptData.time}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748B' }}>Hình thức:</span>
                    <span style={{ fontWeight: '600' }}>{eReceiptData.paymentMethod}</span>
                  </div>
                </div>
                
                {/* Khối chi tiết Học phí */}
                <div style={{ margin: '0.75rem 0', fontSize: '0.95rem', lineHeight: '1.8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Học phí chưa hoàn thành:</span>
                    <span>{Number(eReceiptData.oldDebt || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Học phí đóng đợt này:</span>
                    <span style={{ fontWeight: 'bold', color: '#0D88C4' }}>+ {Number(eReceiptData.tuitionPaid || 0).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#475569' }}>Học phí còn lại:</span>
                    <span style={{ fontWeight: 'bold', color: Number(eReceiptData.remainingDebt || 0) > 0 ? '#E11D48' : '#10B981' }}>
                      {Number(eReceiptData.remainingDebt || 0).toLocaleString('vi-VN')}đ {Number(eReceiptData.remainingDebt || 0) === 0 ? '(Đã hoàn tất)' : ''}
                    </span>
                  </div>
                </div>

                {/* Khối Giáo trình & Quà tặng đi kèm (Hiển thị đầy đủ cả khi 0đ hoặc có giá) */}
                {((eReceiptData.items && eReceiptData.items.length > 0) || eReceiptData.bookName) && (
                  <div style={{ margin: '0.85rem 0 0.5rem 0', borderTop: '1px dashed #CBD5E1', paddingTop: '0.75rem', fontSize: '0.92rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#085E8A', textTransform: 'uppercase', marginBottom: '0.45rem', letterSpacing: '0.5px' }}>
                      Giáo trình & Tặng phẩm đi kèm
                    </div>
                    {eReceiptData.items && eReceiptData.items.length > 0 ? (
                      eReceiptData.items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: idx < eReceiptData.items.length - 1 ? '1px dotted #E2E8F0' : 'none' }}>
                          <div style={{ paddingRight: '0.5rem' }}>
                            <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.9rem' }}>{item.name}</div>
                            <span style={{ 
                              display: 'inline-block', 
                              fontSize: '0.68rem', 
                              fontWeight: '800', 
                              padding: '0.15rem 0.5rem', 
                              borderRadius: '4px', 
                              background: item.badgeColor ? `${item.badgeColor}15` : '#ECFDF5', 
                              color: item.badgeColor || '#059669',
                              border: `1px solid ${item.badgeColor || '#059669'}40`,
                              marginTop: '0.2rem'
                            }}>
                              {item.badge}
                            </span>
                          </div>
                          <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {item.originalPrice != null && Number(item.originalPrice) > 0 && (
                              <div style={{ fontSize: '0.78rem', color: '#94A3B8', textDecoration: 'line-through' }}>
                                {Number(item.originalPrice).toLocaleString('vi-VN')}đ
                              </div>
                            )}
                            <div style={{ fontWeight: '800', fontSize: '0.92rem', color: item.price === 0 ? '#059669' : '#0D88C4' }}>
                              {item.price === 0 ? '0đ (Miễn phí)' : `+ ${Number(item.price).toLocaleString('vi-VN')}đ`}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0' }}>
                        <div style={{ paddingRight: '0.5rem' }}>
                          <div style={{ fontWeight: '600', color: '#1E293B', fontSize: '0.9rem' }}>{eReceiptData.bookName}</div>
                          <span style={{ 
                            display: 'inline-block', 
                            fontSize: '0.68rem', 
                            fontWeight: '800', 
                            padding: '0.15rem 0.5rem', 
                            borderRadius: '4px', 
                            background: Number(eReceiptData.bookCost || 0) > 0 ? '#EFF6FF' : '#ECFDF5', 
                            color: Number(eReceiptData.bookCost || 0) > 0 ? '#0D88C4' : '#059669',
                            border: `1px solid ${Number(eReceiptData.bookCost || 0) > 0 ? '#0D88C4' : '#059669'}40`,
                            marginTop: '0.2rem'
                          }}>
                            {Number(eReceiptData.bookCost || 0) > 0 ? 'GIÁO TRÌNH BÁN' : 'TẶNG KÈM THEO KHÓA HỌC'}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ fontWeight: '800', fontSize: '0.92rem', color: Number(eReceiptData.bookCost || 0) === 0 ? '#059669' : '#0D88C4' }}>
                            {Number(eReceiptData.bookCost || 0) === 0 ? '0đ (Miễn phí)' : `+ ${Number(eReceiptData.bookCost || 0).toLocaleString('vi-VN')}đ`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Khung Tổng thu đợt này với điểm nhấn Vàng & Xanh */}
                <div style={{ marginTop: '1rem', background: '#FFFBEB', border: '2px solid #FFCA29', borderRadius: '10px', padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                  <span style={{ fontWeight: '800', fontSize: '1rem', color: '#085E8A' }}>TỔNG THU ĐỢT NÀY:</span>
                  <span style={{ fontWeight: '900', fontSize: '1.4rem', color: '#0D88C4' }}>{Number(eReceiptData.totalPaid || 0).toLocaleString('vi-VN')}đ</span>
                </div>
                
                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: '#64748B', fontStyle: 'italic' }}>
                  <p style={{ margin: 0 }}>Cảm ơn Quý phụ huynh & Học viên đã tin tưởng và đồng hành cùng Anh ngữ Nhật Mỹ!</p>
                </div>

                {/* CON DẤU MỘC ĐỎ ĐIỆN TỬ "ĐÃ THU TIỀN / PAID" */}
                <PaidStamp 
                  date={eReceiptData.date}
                  time={eReceiptData.time}
                  receiptCode={eReceiptData.receiptCode}
                  size={142}
                  style={{ right: '12px', bottom: '22px' }}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => { setEReceiptData(null); setIsEditModalOpen(false); }}>
                <i className="fa-solid fa-times"></i> Đóng
              </button>
              <button className="btn btn-success" onClick={downloadReceiptImage} style={{ background: '#0D88C4', borderColor: '#0D88C4' }}>
                <i className="fa-solid fa-download"></i> Tải Ảnh
              </button>
              <button className="btn btn-primary" onClick={copyReceiptImage} style={{ background: '#085E8A', borderColor: '#085E8A' }}>
                <i className="fa-solid fa-copy"></i> Copy Zalo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xuất Thư Học Liệu & Thẻ Học Viên Điện Tử */}
      <CoursewareNoticeModal
        isOpen={isCoursewareModalOpen}
        onClose={() => setIsCoursewareModalOpen(false)}
        students={coursewareModalStudents}
        onStudentUpdated={(stdId, codes, retain) => {
          fetchStudents();
        }}
      />
    </div>
  );
}
