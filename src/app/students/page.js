'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import Link from 'next/link';
import * as XLSX from 'xlsx';

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

  // AI Birthday State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiStudent, setAiStudent] = useState(null);
  const [aiMessage, setAiMessage] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Dữ liệu cho Cascading Dropdowns & Kho
  const [courseConfigs, setCourseConfigs] = useState([]);
  const [classes, setClasses] = useState([]);
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

  // Form Thu học phí (Tích hợp bán giáo trình đi kèm)
  const [paymentForm, setPaymentForm] = useState({
    collectAmount: '',
    paymentMethod: 'Chuyển khoản',
    notes: '',
    includeItem: false,
    itemId: '',
    itemPrice: '0',
    itemQuantity: 1,
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
        setClasses(resultClasses.data);
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
      const paramStudentStatus = urlParams.get('studentStatus');
      
      if (paramStudentStatus) {
        setOpStatusFilter(paramStudentStatus);
      }

      if (convertName) {
        setFormData(prev => ({
          ...prev,
          name: decodeURIComponent(convertName),
          phone: convertPhone ? decodeURIComponent(convertPhone) : '',
          dob: convertDob ? decodeURIComponent(convertDob) : '',
          address: convertAddress ? decodeURIComponent(convertAddress) : '',
        }));
        setIsModalOpen(true);
        
        // Dọn dẹp query params trên thanh URL tránh lặp lại hành vi khi reload
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [classes]);

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

    // Đơn giá 1 buổi mới = Học phí gốc / Tổng số buổi mới
    const costPerSessionNew = newConfig.price / newClass.totalSessions;
    // Học phí lớp mới chỉ tính cho số buổi còn lại
    const proRatedPriceNew = costPerSessionNew * newClass.sessionsRemaining;

    // Học phí lớp mới (sau khi áp dụng ưu đãi đặc biệt của học sinh nếu có)
    const specialDiscount = parseNumber(editForm.specialPolicyValue);
    const newClassFeeBase = Math.max(0, proRatedPriceNew - specialDiscount);

    if (!editStudentData?.currentClass) {
      // Học viên chưa có lớp -> Xem trước học phí xếp lớp ban đầu (khấu trừ)
      setTransferPreview({
        isInitial: true,
        newClassFeeBase,
        selectedClassInfo: newClass,
      });
      return;
    }

    const currentClass = editStudentData.currentClass;

    // Chi phí lớp cũ đã học: (Học phí phải đóng / Tổng số buổi cũ) * Số buổi đã học
    const costPerSessionOld = currentClass.feeToPay / currentClass.totalSessions;
    const costUsedOld = costPerSessionOld * currentClass.attendedSessions;

    // Tiền dư lớp cũ còn lại / Nợ cũ
    const financialDifference = currentClass.amountPaid - costUsedOld;
    const balanceOld = financialDifference > 0 ? financialDifference : 0;
    const debtOld = financialDifference < 0 ? Math.abs(financialDifference) : 0;

    // Cấn trừ + Điều chỉnh thủ công
    const manualAdj = parseNumber(editForm.manualAdjustment);
    const difference = (newClassFeeBase - balanceOld + debtOld) + manualAdj;

    setTransferPreview({
      isInitial: false,
      attendedSessions: currentClass.attendedSessions,
      costUsedOld,
      balanceOld,
      debtOld,
      newClassFeeBase,
      difference,
      selectedClassInfo: newClass,
      manualAdj,
    });
  }, [editForm.newClassCode, editTab, editStudentData, courseConfigs, classes, editForm.specialPolicyValue, editForm.manualAdjustment]);

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
    } else if (actionType === 'transfer') {
      payload = {
        ...payload,
        action: 'classTransfer',
        newClassCode: editForm.newClassCode,
        manualAdjustment: parseNumber(editForm.manualAdjustment),
        manualReason: editForm.manualReason,
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

  const handleCollectTuitionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
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
          itemPrice: parseNumber(paymentForm.itemPrice),
          itemQuantity: paymentForm.itemQuantity,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: `Ghi nhận thu tiền học phí & giáo trình thành công!` });
        fetchStudents();
        fetchConfigsAndClasses();
        const studentName = editStudentData?.student?.fullName || 'Học viên';
        const studentCode = editStudentData?.student?.code || '';
        const totalPaid = parseNumber(paymentForm.collectAmount);
        let bookCost = 0;
        let bookName = '';
        
        if (paymentForm.includeItem) {
            bookCost = parseNumber(paymentForm.itemPrice) * paymentForm.itemQuantity;
            const selectedItem = inventoryItems.find(i => i.id === paymentForm.itemId);
            if (selectedItem) bookName = `${selectedItem.name} (x${paymentForm.itemQuantity})`;
        }
        
        const tuitionPaid = Math.max(0, totalPaid - bookCost);
        
        setEReceiptData({
            studentName,
            studentCode,
            tuition: tuitionPaid,
            bookName,
            bookCost,
            total: totalPaid,
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            cashier: 'Admin',
            paymentMethod: paymentForm.paymentMethod
        });
        setPaymentForm({
          collectAmount: '',
          paymentMethod: 'Chuyển khoản',
          notes: '',
          includeItem: false,
          itemId: '',
          itemPrice: '0',
          itemQuantity: 1,
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
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: `Thêm học viên thành công! Mã số: ${result.data.id}` });
        setFormData({
          name: '', phone: '', dob: '', address: '', nationalId: '', specialPolicyType: 'Không giảm',
          specialPolicyValue: '0', program: '', level: '', classCode: '', amountPaid: '0', promoType: '', promoDiscount: '0', promoReason: '',
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
          <select id="filter-class" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">Tất cả lớp học</option>
            {classes.map((cls) => (
              <option key={cls.code} value={cls.code}>
                {cls.code} {cls.teacherName ? `(${cls.teacherName})` : ''}
              </option>
            ))}
          </select>
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
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-success)', fontWeight: 'bold' }}>
                          {student.totalPaid.toLocaleString('vi-VN')}đ
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--color-primary-dark)', fontWeight: 'bold' }}>
                          {student.walletBalance ? `${student.walletBalance.toLocaleString('vi-VN')}đ` : '0đ'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div className="action-buttons">
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
                    <select name="classCode" value={formData.classCode} onChange={handleInputChange} disabled={!formData.level}>
                      <option value="none">Chờ xếp lớp</option>
                      {filteredClasses.map(cls => (
                        <option key={cls.code} value={cls.code}>{cls.code}</option>
                      ))}
                    </select>
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
                                  Ví học viên hiện tại: <strong>{(editStudentData.student.walletBalance || 0).toLocaleString()}đ</strong>
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

                                {/* MỤC MUA GIÁO TRÌNH VẬT TƯ TÙY CHỌN ĐI KÈM */}
                                <div style={{ marginTop: '1.25rem', padding: '1rem', border: '1px dashed var(--color-primary)', borderRadius: '8px', background: 'rgba(13, 136, 196, 0.03)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: paymentForm.includeItem ? '0.75rem' : 0 }}>
                                    <input 
                                      type="checkbox" 
                                      id="includeItem" 
                                      checked={paymentForm.includeItem} 
                                      onChange={(e) => setPaymentForm(prev => ({ ...prev, includeItem: e.target.checked }))} 
                                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="includeItem" style={{ fontWeight: '700', color: 'var(--color-primary-dark)', cursor: 'pointer', margin: 0 }}>
                                      <i className="fa-solid fa-book"></i> Đóng kèm tiền mua Giáo trình / Vật tư tùy chọn
                                    </label>
                                  </div>

                                  {paymentForm.includeItem && (
                                    <div className="animated-scale">
                                      <div className="form-grid-2">
                                        <div className="form-group">
                                          <label>Chọn Giáo trình / Vật tư *</label>
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
                                                itemPrice: formatNumber(defaultPrice),
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
                                          <label>Giá niêm yết / Đơn giá (VND)</label>
                                          <input 
                                            type="text" 
                                            value={paymentForm.itemPrice} 
                                            onChange={(e) => setPaymentForm(prev => ({ ...prev, itemPrice: formatNumber(e.target.value) }))} 
                                          />
                                        </div>
                                      </div>
                                      
                                      {parseNumber(paymentForm.itemPrice) > 0 && (
                                        <p className="field-note" style={{ color: 'var(--color-success)', fontWeight: '600', marginTop: '0.25rem' }}>
                                          <i className="fa-solid fa-circle-check"></i> Tiền giáo trình sẽ tự động được ghi nhận hóa đơn tài chính và trừ 1 sản phẩm khỏi Kho.
                                        </p>
                                      )}
                                    </div>
                                  )}
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
                                  <button type="submit" className="btn btn-primary" disabled={submitting || (totalDebt <= 0 && (!paymentForm.includeItem || parseNumber(paymentForm.itemPrice) <= 0))}>
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
                            <p><strong>Đã đóng học phí lớp cũ:</strong> {editStudentData.currentClass.amountPaid.toLocaleString()}đ</p>
                          </div>
                        ) : (
                          <div className="alert-box alert-info" style={{ margin: '0 0 1rem 0' }}>
                            <i className="fa-solid fa-circle-info"></i>
                            <span>Học viên hiện tại chưa được xếp lớp. Chọn một lớp học khởi điểm bên dưới để xếp lớp.</span>
                          </div>
                        )}

                        <div className="form-group">
                          <label>Chọn Lớp học muốn xếp / chuyển tới *</label>
                          <select name="newClassCode" value={editForm.newClassCode} onChange={handleEditInputChange} required>
                            <option value="">-- Chọn lớp học --</option>
                            {classes.map(cls => (
                              <option key={cls.code} value={cls.code}>{cls.code} (Cấp độ: {cls.level})</option>
                            ))}
                          </select>
                          {transferPreview?.selectedClassInfo && (
                            <p className="field-note" style={{ color: 'var(--color-primary-dark)', fontWeight: '600', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                              <i className="fa-solid fa-circle-info"></i> Lớp học mới đã học {transferPreview.selectedClassInfo.sessionsTaught} buổi - Còn lại {transferPreview.selectedClassInfo.sessionsRemaining} buổi - Tổng {transferPreview.selectedClassInfo.totalSessions} buổi.
                            </p>
                          )}
                        </div>

                        {transferPreview && (
                          <div className="fee-preview-box animated-scale" style={{ marginTop: '1rem' }}>
                            <h4>
                              <i className="fa-solid fa-calculator"></i>{' '}
                              {transferPreview.isInitial ? 'Thông tin học phí xếp lớp' : 'Tính toán cấn trừ chênh lệch'}
                            </h4>
                            
                            {transferPreview.isInitial ? (
                              <>
                                <div className="fee-row">
                                  <span>Học phí lớp mới ({transferPreview.selectedClassInfo.sessionsRemaining} buổi còn lại):</span>
                                  <span>{transferPreview.newClassFeeBase.toLocaleString()}đ</span>
                                </div>
                                <div className="fee-total-rows" style={{ borderTop: '2px solid var(--color-border)' }}>
                                  <div className="fee-row total-fee">
                                    <span>Tổng học phí cần đóng:</span>
                                    <span>{transferPreview.newClassFeeBase.toLocaleString()}đ</span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="fee-row">
                                  <span>[Dòng 1] Chi phí lớp cũ đã tiêu dùng ({transferPreview.attendedSessions} buổi):</span>
                                  <span>{transferPreview.costUsedOld.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                </div>
                                <div className="fee-row text-success" style={{ fontWeight: '600' }}>
                                  <span>[Dòng 2] Số tiền còn dư của học viên (Thực đóng cũ - Đã dùng):</span>
                                  <span>{transferPreview.balanceOld.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                </div>
                                <div className="fee-row" style={{ fontWeight: '600' }}>
                                  <span>[Dòng 3] Học phí lớp mới ({transferPreview.selectedClassInfo.sessionsRemaining} buổi còn lại):</span>
                                  <span>{transferPreview.newClassFeeBase.toLocaleString()}đ</span>
                                </div>

                                <div className="fee-total-rows" style={{ borderTop: '2px solid var(--color-border)', marginTop: '0.75rem' }}>
                                  {transferPreview.difference > 0 ? (
                                    <div className="fee-row total-fee text-danger">
                                      <span>[Dòng 4] Tổng kết công nợ (Cần đóng thêm):</span>
                                      <span>{transferPreview.difference.toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                    </div>
                                  ) : (
                                    <div className="fee-row total-fee text-success">
                                      <span>[Dòng 4] Tổng kết công nợ (Dư tiền lưu ví/Bảo lưu):</span>
                                      <span>{Math.abs(transferPreview.difference).toLocaleString('vi-VN', { maximumFractionDigits: 0 })}đ</span>
                                    </div>
                                  )}
                                </div>
                              </>
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
                        <p className="field-note"><i className="fa-solid fa-triangle-exclamation"></i> Bảo lưu sẽ tự động chuyển trạng thái học viên thành "Bảo lưu" và rút tên khỏi sỹ số lớp học.</p>
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
          <div className="modal-content" style={{ maxWidth: '420px', padding: '1.5rem', background: '#f8f9fa' }}>
            
            <div ref={receiptRef} style={{ background: '#fff', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', textAlign: 'left', fontFamily: 'monospace', color: '#333' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px dashed #ccc', paddingBottom: '1rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-primary-dark)', fontSize: '1.5rem', fontWeight: '800' }}>NHẬT MỸ ENGLISH</h2>
                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold' }}>PHIẾU THU ĐIỆN TỬ</p>
              </div>
              
              <div style={{ marginBottom: '1rem', fontSize: '1.05rem', lineHeight: '1.6' }}>
                <p style={{ margin: '0.25rem 0' }}><strong>Học viên:</strong> {eReceiptData.studentName}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Ngày lập:</strong> {eReceiptData.date} {eReceiptData.time}</p>
                <p style={{ margin: '0.25rem 0' }}><strong>Hình thức:</strong> {eReceiptData.paymentMethod}</p>
              </div>
              
              <div style={{ margin: '1rem 0', borderTop: '2px solid #eee', paddingTop: '1rem', fontSize: '1.05rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Học phí khóa học:</span>
                  <span style={{ fontWeight: 'bold' }}>{eReceiptData.tuition.toLocaleString('vi-VN')}đ</span>
                </div>
                {eReceiptData.bookCost > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ paddingRight: '1rem' }}>Giáo trình / Vật tư:<br/><small style={{color: '#666'}}>({eReceiptData.bookName})</small></span>
                    <span style={{ fontWeight: 'bold' }}>{eReceiptData.bookCost.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
              </div>
              
              <div style={{ marginTop: '1rem', borderTop: '2px dashed #ccc', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.3rem', color: 'var(--color-primary-dark)' }}>
                <span>TỔNG THU:</span>
                <span>{eReceiptData.total.toLocaleString('vi-VN')}đ</span>
              </div>
              
              <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
                <p style={{ margin: 0 }}>Cảm ơn Quý phụ huynh đã tin tưởng và đồng hành cùng Nhật Mỹ!</p>
              </div>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => { setEReceiptData(null); setIsEditModalOpen(false); }}>
                <i className="fa-solid fa-times"></i> Đóng
              </button>
              <button className="btn btn-success" onClick={downloadReceiptImage}>
                <i className="fa-solid fa-download"></i> Tải Ảnh
              </button>
              <button className="btn btn-primary" onClick={copyReceiptImage}>
                <i className="fa-solid fa-copy"></i> Copy Zalo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
