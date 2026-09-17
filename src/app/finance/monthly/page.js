'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import MonthlyNoticeTemplate from './components/MonthlyNoticeTemplate';

// Helper parse Ngày học và Giờ học từ ClassCode & Schedule
function getScheduleInfo(classCode, schedule) {
  let days = '—';
  let shiftTime = '—';

  if (schedule) {
    if (schedule.includes('|')) {
      const parts = schedule.split('|');
      days = parts[0].trim();
      shiftTime = parts.slice(1).join('|').trim();
      return { days, shiftTime };
    }
    if (schedule === '7CN' || schedule.toLowerCase() === 't7cn') days = 'Thứ 7, CN';
    else if (schedule === '24' || schedule.toLowerCase() === 't24') days = 'Thứ 2, Thứ 4';
    else if (schedule === '35' || schedule.toLowerCase() === 't35') days = 'Thứ 3, Thứ 5';
    else if (schedule === '46' || schedule.toLowerCase() === 't46') days = 'Thứ 4, Thứ 6';
    else if (schedule === '246' || schedule.toLowerCase() === 't246') days = 'Thứ 2, 4, 6';
    else if (schedule === '357' || schedule.toLowerCase() === 't357') days = 'Thứ 3, 5, 7';
    else if (schedule.includes('Thứ') || schedule.includes('CN') || schedule.includes('Chủ Nhật')) days = schedule;
    else days = schedule.split('').map((d) => (d === 'CN' ? 'CN' : 'T' + d)).join(', ');
  }

  if (shiftTime === '—' && classCode) {
    const parts = classCode.split('_');
    const rawShift = parts.length >= 5 ? parts[4].toLowerCase() : '';
    if (rawShift === '01' || rawShift === 'ca1') shiftTime = 'Ca 1 (17:30 - 19:00)';
    else if (rawShift === '02' || rawShift === 'ca2') shiftTime = 'Ca 2 (19:15 - 20:45)';
    else if (rawShift === '03' || rawShift === 'ca3') shiftTime = 'Ca 3 (08:00 - 09:30)';
    else if (rawShift === '04' || rawShift === 'ca4') shiftTime = 'Ca 4 (09:45 - 11:15)';
    else if (rawShift) shiftTime = 'Ca ' + rawShift.toUpperCase();
  }

  return { days, shiftTime };
}

// Soạn tin nhắn Zalo súc tích, phụ huynh nhìn 3 giây là nắm đầy đủ, gần gũi thân thiện
function generateZaloMessage(record, adjustedDebt = null, currentMonthYear = '') {
  if (!record) return '';
  const previousDebt = adjustedDebt !== null ? parseFloat(adjustedDebt) || 0 : record.previousDebt || 0;
  const currentFee = record.currentFee || record.monthlyRate || 0;
  const excess = record.excessMissing || 0;
  const total = currentFee + previousDebt + excess;
  const monthStr = record.monthYear || currentMonthYear || '';

  const lines = [];
  lines.push(`Dạ Trung tâm xin gửi Ba Mẹ thông tin học phí tháng ${monthStr} của bé ${record.studentName}:`);
  lines.push(`• Lớp: ${record.classCode}`);
  lines.push(
    `• Số buổi học: ${record.actualSessions || 0} buổi${
      record.datesPresent && record.datesPresent.length
        ? ` (Điểm danh: ${record.datesPresent.slice(0, 5).join(', ')}${record.datesPresent.length > 5 ? '...' : ''})`
        : ''
    }`
  );

  if (record.billingType === 'MONTHLY_PREPAID') {
    lines.push(`• Học phí tháng này (${record.committedSessions || 8} buổi): ${Number(currentFee).toLocaleString('vi-VN')}đ`);
    if (excess !== 0) {
      lines.push(`• Dư/thiếu tháng trước: ${excess > 0 ? '+' : ''}${Number(excess).toLocaleString('vi-VN')}đ (${excess > 0 ? 'Thiếu' : 'Dư'})`);
    }
  } else {
    lines.push(`• Học phí tháng này: ${Number(currentFee).toLocaleString('vi-VN')}đ`);
  }

  if (previousDebt > 0) {
    lines.push(`• Học phí chưa hoàn thành (tháng trước): ${Number(previousDebt).toLocaleString('vi-VN')}đ`);
  }

  lines.push(`👉 TỔNG CỘNG CẦN ĐÓNG: ${Number(total).toLocaleString('vi-VN')}đ`);
  lines.push(`\nBa Mẹ có thể quét mã QR trong ảnh đính kèm để chuyển khoản nhanh chóng ạ. Trung tâm xin cảm ơn Ba Mẹ nhiều ạ! ❤️`);

  return lines.join('\n');
}

export default function MonthlyBillingPage() {
  const currentDate = new Date();
  const currentMonthYear = `${(currentDate.getMonth() + 1).toString().padStart(2, '0')}/${currentDate.getFullYear()}`;

  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'attendance' | 'notices'
  const [monthYear, setMonthYear] = useState(currentMonthYear);
  const [classFilter, setClassFilter] = useState('all');
  const [message, setMessage] = useState({ type: '', text: '' });

  // Danh sách lớp học toàn hệ thống
  const [allClasses, setAllClasses] = useState([]);

  // Tab 1: Config state
  const [configData, setConfigData] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Modal Thêm / Sửa Học viên Tháng (1 màn hình KHÔNG KÉO THANH TRƯỢT)
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEnrollmentId, setEditingEnrollmentId] = useState(null);
  const [addMode, setAddMode] = useState('new');
  const [searchStudent, setSearchStudent] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingStudent, setSearchingStudent] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Form fields cho modal Thêm / Sửa Học viên Tháng
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNationalId, setFormNationalId] = useState('');
  const [formClassCode, setFormClassCode] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formBillingType, setFormBillingType] = useState('MONTHLY_PREPAID');
  const [formMonthlyRate, setFormMonthlyRate] = useState('1200000');
  const [formMonthlySessions, setFormMonthlySessions] = useState('8');
  const [formNotes, setFormNotes] = useState('');
  const [savingStudent, setSavingStudent] = useState(false);

  // Tab 2: Attendance state
  const [attendanceData, setAttendanceData] = useState({ enrollments: [], attendances: [] });
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Tab 3: Notices state
  const [noticesData, setNoticesData] = useState([]);
  const [loadingNotices, setLoadingNotices] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);

  // Modal Xem Trước Thư Báo & Soạn Tin Nhắn Zalo
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [activeRecord, setActiveRecord] = useState(null);
  const [adjustedDebt, setAdjustedDebt] = useState('');
  const [savingDebt, setSavingDebt] = useState(false);
  const [copyingPreview, setCopyingPreview] = useState(false);
  const [copyingZaloText, setCopyingZaloText] = useState(false);
  const previewTemplateRef = useRef(null);
  // Ref bản in ẩn chụp toàn bộ chiều cao thư báo (100% full height không bao giờ bị cắt)
  const hiddenPrintRef = useRef(null);

  // Xóa học viên: Xác nhận xóa vĩnh viễn (demo) vs rút khỏi tháng
  const [deleteTarget, setDeleteTarget] = useState(null); // { enrollmentId, studentName, studentId, classCode }
  const [deletingStudent, setDeletingStudent] = useState(false);

  // Modal Tạo Lớp Học Mới nhanh (cho học viên tháng)
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const [customClassName, setCustomClassName] = useState('');
  const [classTeacherName, setClassTeacherName] = useState('');
  const [selectedDays, setSelectedDays] = useState([]);
  const [classHoursNotes, setClassHoursNotes] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);

  const handleOpenCreateClassModal = () => {
    setCustomClassName('');
    setClassTeacherName('');
    setSelectedDays([]);
    setClassHoursNotes('');
    setShowCreateClassModal(true);
  };

  // Pay Modal & E-Receipt
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInvoice, setPayInvoice] = useState(null);
  const [payMethod, setPayMethod] = useState('Chuyển khoản');
  const [eReceiptData, setEReceiptData] = useState(null);
  const receiptRef = useRef(null);
  const [copyingReceipt, setCopyingReceipt] = useState(false);

  // Nấc thang lọc thời gian: Năm -> 6 Tháng (Kỳ 1 / Kỳ 2) -> Tháng
  const [currentMStr, currentYStr] = monthYear.split('/');
  const selectedYear = parseInt(currentYStr, 10) || currentDate.getFullYear();
  const selectedMonthNum = parseInt(currentMStr, 10) || currentDate.getMonth() + 1;
  const selectedPeriod = selectedMonthNum <= 6 ? 'H1' : 'H2';

  // Load danh sách lớp khi mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch dữ liệu theo Tab & Tháng
  useEffect(() => {
    if (activeTab === 'config') fetchConfigData();
    else if (activeTab === 'attendance') fetchAttendanceData();
    else if (activeTab === 'notices') fetchNoticesData();
  }, [activeTab, monthYear]);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        setAllClasses(data.data);
      } else if (Array.isArray(data)) {
        setAllClasses(data);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách lớp:', err);
    }
  };

  const fetchConfigData = async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch('/api/finance/monthly/config');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setConfigData(data);
    } catch (err) {
      console.error('Lỗi tải cấu hình:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const fetchAttendanceData = async () => {
    setLoadingAttendance(true);
    try {
      const res = await fetch('/api/finance/monthly/attendance?monthYear=' + encodeURIComponent(monthYear));
      const data = await res.json();
      if (res.ok) setAttendanceData(data);
    } catch (err) {
      console.error('Lỗi tải điểm danh:', err);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchNoticesData = async () => {
    setLoadingNotices(true);
    try {
      const res = await fetch('/api/finance/monthly?monthYear=' + encodeURIComponent(monthYear));
      const data = await res.json();
      if (res.ok && Array.isArray(data)) setNoticesData(data);
    } catch (err) {
      console.error('Lỗi tải thư báo:', err);
    } finally {
      setLoadingNotices(false);
    }
  };

  // Điều khiển Nấc thang Lọc Thời Gian
  const handleYearChange = (newYear) => {
    setMonthYear(`${currentMStr}/${newYear}`);
  };

  const handlePeriodChange = (newPeriod) => {
    if (newPeriod === 'H1') {
      const newM = selectedMonthNum > 6 ? selectedMonthNum - 6 : selectedMonthNum;
      setMonthYear(`${String(newM).padStart(2, '0')}/${selectedYear}`);
    } else {
      const newM = selectedMonthNum <= 6 ? selectedMonthNum + 6 : selectedMonthNum;
      setMonthYear(`${String(newM).padStart(2, '0')}/${selectedYear}`);
    }
  };

  const handleMonthChange = (newMonthStr) => {
    setMonthYear(`${newMonthStr}/${selectedYear}`);
  };

  const handlePrevMonth = () => {
    let prevM = selectedMonthNum - 1;
    let prevY = selectedYear;
    if (prevM === 0) {
      prevM = 12;
      prevY -= 1;
    }
    setMonthYear(`${String(prevM).padStart(2, '0')}/${prevY}`);
  };

  const handleNextMonth = () => {
    let nextM = selectedMonthNum + 1;
    let nextY = selectedYear;
    if (nextM === 13) {
      nextM = 1;
      nextY += 1;
    }
    setMonthYear(`${String(nextM).padStart(2, '0')}/${nextY}`);
  };

  const handleCurrentMonth = () => {
    setMonthYear(currentMonthYear);
  };

  // Tìm kiếm học viên có sẵn
  const handleSearchStudent = async () => {
    if (!searchStudent.trim()) return;
    setSearchingStudent(true);
    try {
      const res = await fetch('/api/students?search=' + encodeURIComponent(searchStudent.trim()) + '&status=all');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Lỗi tìm kiếm học viên:', err);
      setSearchResults([]);
    } finally {
      setSearchingStudent(false);
    }
  };

  // Chọn học viên có sẵn
  const handleSelectExistingStudent = (student) => {
    setSelectedStudent(student);
    setFormName(student.name || '');
    setFormPhone(student.phone || '');
    setFormDob(student.dobRaw || (student.dob ? student.dob.split('T')[0] : ''));
    setFormAddress(student.address || '');
    setFormNationalId(student.nationalId || '');
    if (student.enrollments && student.enrollments.length > 0) {
      setFormClassCode(student.enrollments[0].classCode);
    }
    setSearchResults([]);
  };

  // Mở modal Thêm mới học viên
  const handleOpenAddModal = () => {
    setEditingEnrollmentId(null);
    setAddMode('new');
    setSelectedStudent(null);
    setSearchStudent('');
    setSearchResults([]);
    setFormName('');
    setFormPhone('');
    setFormDob('');
    setFormAddress('');
    setFormNationalId('');
    setFormClassCode(allClasses.length > 0 ? allClasses[0].code : '');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormBillingType('MONTHLY_PREPAID');
    setFormMonthlyRate('1200000');
    setFormMonthlySessions('8');
    setFormNotes('');
    setShowAddModal(true);
  };

  // Mở modal Chỉnh sửa học viên đã có trong danh sách tháng
  const handleOpenEditModal = (enr) => {
    setEditingEnrollmentId(enr.id);
    setSelectedStudent(enr.student);
    setFormName(enr.student?.name || '');
    setFormPhone(enr.student?.phone || '');
    setFormDob(enr.student?.dobRaw || (enr.student?.dob ? enr.student.dob.split('T')[0] : ''));
    setFormAddress(enr.student?.address || '');
    setFormNationalId(enr.student?.nationalId || '');
    setFormClassCode(enr.classCode || '');
    setFormBillingType(enr.billingType || 'MONTHLY_PREPAID');
    setFormMonthlyRate(String(enr.monthlyRate || 0));
    setFormMonthlySessions(String(enr.monthlySessions || 8));
    setFormNotes('');
    setShowAddModal(true);
  };

  // Mở modal xác nhận xóa học viên
  const handleOpenDeleteModal = (enr) => {
    setDeleteTarget({
      enrollmentId: enr.id,
      studentName: enr.student?.name || 'Học viên',
      studentId: enr.studentId,
      classCode: enr.classCode,
    });
  };

  // Xác nhận xóa: permanent = true (xóa vĩnh viễn khỏi toàn bộ hệ thống - dành cho học viên demo)
  // permanent = false (chỉ rút khỏi danh sách học phí tháng)
  const handleConfirmDelete = async (enrollmentId, permanent) => {
    setDeletingStudent(true);
    try {
      const res = await fetch(
        `/api/finance/monthly/config?enrollmentId=${enrollmentId}&permanent=${permanent ? 'true' : 'false'}`,
        {
          method: 'DELETE',
        }
      );
      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: 'success',
          text: permanent
            ? 'Đã xóa vĩnh viễn học viên và toàn bộ dữ liệu liên quan khỏi hệ thống hoàn toàn.'
            : 'Đã xóa học viên khỏi danh sách lớp học phí tháng.',
        });
        setDeleteTarget(null);
        fetchConfigData();
        fetchAttendanceData();
        fetchNoticesData();
      } else {
        alert('Lỗi: ' + (json.error || 'Không thể xóa'));
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setDeletingStudent(false);
    }
  };

  // Tạo Lớp Học Mới nhanh cho học viên tháng
  const handleCreateClass = async (e) => {
    if (e) e.preventDefault();
    if (!customClassName.trim()) {
      alert('Vui lòng nhập tên lớp học!');
      return;
    }
    if (selectedDays.length === 0) {
      alert('Vui lòng chọn ít nhất 1 ngày học trong tuần!');
      return;
    }

    setCreatingClass(true);
    try {
      const scheduleString = selectedDays.join(', ');
      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customCode: customClassName.trim(),
          isMonthly: true,
          teacherName: classTeacherName.trim() || 'Chưa phân công',
          schedule: scheduleString,
          shiftHours: classHoursNotes.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        const createdClass = json.data;
        setMessage({ type: 'success', text: `Đã tạo thành công lớp "${createdClass.code}"!` });
        await fetchClasses();
        setFormClassCode(createdClass.code);
        setShowCreateClassModal(false);
        setCustomClassName('');
        setClassTeacherName('');
        setSelectedDays([]);
        setClassHoursNotes('');
      } else {
        alert('Lỗi: ' + (json.error || 'Không thể tạo lớp'));
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setCreatingClass(false);
    }
  };

  // Lưu Học viên Tháng (Thêm mới hoặc Cập nhật)
  const handleSaveStudent = async () => {
    if (!formName.trim()) {
      alert('Vui lòng nhập Họ và tên học viên!');
      return;
    }
    if (!formClassCode) {
      alert('Vui lòng chọn Lớp học!');
      return;
    }
    if (!formMonthlyRate || parseFloat(formMonthlyRate) <= 0) {
      alert('Vui lòng nhập mức Học phí tháng hợp lệ!');
      return;
    }

    setSavingStudent(true);
    try {
      const payload = {
        enrollmentId: editingEnrollmentId,
        isNewStudent: !editingEnrollmentId && !selectedStudent,
        studentId: selectedStudent ? selectedStudent.id : null,
        name: formName.trim(),
        phone: formPhone.trim(),
        dob: formDob || null,
        address: formAddress.trim() || null,
        nationalId: formNationalId.trim() || null,
        classCode: formClassCode,
        startDate: formStartDate,
        billingType: formBillingType,
        monthlyRate: parseFloat(formMonthlyRate) || 0,
        monthlySessions: formBillingType === 'MONTHLY_PREPAID' ? parseInt(formMonthlySessions, 10) || 0 : null,
        notes: formNotes.trim() || null,
      };

      const res = await fetch('/api/finance/monthly/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setMessage({
          type: 'success',
          text: editingEnrollmentId
            ? `Cập nhật thông tin học viên ${formName} thành công!`
            : `Thêm học viên ${formName} vào danh sách tháng thành công!`,
        });
        setShowAddModal(false);
        fetchConfigData();
        fetchAttendanceData();
        fetchNoticesData();
      } else {
        alert('Lỗi: ' + (json.error || 'Không thể lưu học viên'));
      }
    } catch (err) {
      console.error('Lỗi khi lưu:', err);
      alert('Lỗi kết nối máy chủ!');
    } finally {
      setSavingStudent(false);
    }
  };

  // Toggle Điểm danh nhanh
  const handleToggleAttendance = async (studentId, classCode, date, currentStatus) => {
    let nextStatus = '';
    if (currentStatus === '' || currentStatus === 'Trống') nextStatus = 'Có mặt';
    else if (currentStatus === 'Có mặt') nextStatus = 'Vắng';
    else nextStatus = 'Trống';

    const updatedAttendances = [...attendanceData.attendances];
    const existingIndex = updatedAttendances.findIndex(
      (a) => a.studentId === studentId && a.classCode === classCode && a.date.startsWith(date)
    );

    if (existingIndex >= 0) {
      if (nextStatus === 'Trống') updatedAttendances.splice(existingIndex, 1);
      else updatedAttendances[existingIndex].status = nextStatus;
    } else {
      updatedAttendances.push({ studentId, classCode, date: date + 'T00:00:00.000Z', status: nextStatus });
    }
    setAttendanceData({ ...attendanceData, attendances: updatedAttendances });

    try {
      await fetch('/api/finance/monthly/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, classCode, date, status: nextStatus }),
      });
    } catch (err) {
      console.error('Lỗi cập nhật điểm danh:', err);
    }
  };

  // Chốt sổ hóa đơn
  const handleGenerateInvoice = async (record) => {
    setMessage({ type: '', text: '' });
    setIsProcessing(true);
    try {
      const res = await fetch('/api/finance/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: record.studentId,
          classCode: record.classCode,
          monthYear,
          billingType: record.billingType,
          committedSessions: record.committedSessions,
          actualSessions: record.actualSessions,
          feePerSession: record.feePerSession,
          previousDebt: record.previousDebt,
          currentFee: record.currentFee,
          excessMissing: record.excessMissing,
          totalToPay: record.totalToPay,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage({ type: 'success', text: `Chốt sổ thành công cho ${record.studentName}` });
        fetchNoticesData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Lỗi khi tạo hóa đơn' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi kết nối' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Mở Modal Xem Trước Thư Báo & Soạn Tin Nhắn Zalo
  const handleOpenNoticeModal = (record) => {
    setActiveRecord(record);
    setAdjustedDebt(String(record.previousDebt || 0));
    setPreviewModalOpen(true);
  };

  // Tính toán dữ liệu Thư báo động realtime
  const currentDebtNum = parseFloat(adjustedDebt) || 0;
  const currentFeeNum = activeRecord ? activeRecord.currentFee || activeRecord.monthlyRate || 0 : 0;
  const excessNum = activeRecord ? activeRecord.excessMissing || 0 : 0;
  const calculatedTotalToPay = currentFeeNum + currentDebtNum + excessNum;

  const calculatedTransferContent = activeRecord
    ? `${activeRecord.studentName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .trim()
        .split(' ')
        .pop()
        .toUpperCase()} HP THANG ${monthYear.replace('/', '')}`
    : '';

  const dynamicQrUrl = activeRecord
    ? `https://img.vietqr.io/image/MB-6119916886-compact2.jpg?amount=${calculatedTotalToPay}&addInfo=${encodeURIComponent(
        calculatedTransferContent
      )}&accountName=CONG TY TNHH NGOAI NGU TRI THUC VIET`
    : '';

  const dynamicNoticeData = activeRecord
    ? {
        ...activeRecord,
        monthYear: activeRecord.monthYear || monthYear,
        previousDebt: currentDebtNum,
        totalToPay: calculatedTotalToPay,
        qrUrl: dynamicQrUrl,
      }
    : null;

  // Lưu số tiền nợ cũ mới điều chỉnh vào CSDL
  const handleSaveAdjustedDebt = async () => {
    if (!activeRecord) return;
    setSavingDebt(true);
    try {
      const res = await fetch('/api/finance/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: activeRecord.studentId,
          classCode: activeRecord.classCode,
          monthYear,
          billingType: activeRecord.billingType,
          committedSessions: activeRecord.committedSessions,
          actualSessions: activeRecord.actualSessions,
          feePerSession: activeRecord.feePerSession,
          previousDebt: currentDebtNum,
          currentFee: currentFeeNum,
          excessMissing: excessNum,
          totalToPay: calculatedTotalToPay,
        }),
      });
      if (res.ok) {
        alert('Đã cập nhật số tiền nợ cũ và tổng thanh toán vào hệ thống!');
        fetchNoticesData();
      } else {
        alert('Có lỗi khi lưu điều chỉnh.');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối máy chủ.');
    } finally {
      setSavingDebt(false);
    }
  };

  // Copy Ảnh Thư Báo Dán Zalo - Chụp từ hiddenPrintRef để lấy 100% chiều cao thật, không bao giờ bị cắt dẹp
  const handleCopyPreviewImage = async () => {
    const el = hiddenPrintRef.current || previewTemplateRef.current;
    if (!el) return;
    setCopyingPreview(true);
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1000,
      });
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert('Đã copy Ảnh Thư Báo vào Clipboard! Hãy mở Zalo và dán (Ctrl+V) ngay cho phụ huynh.');
        } catch (err) {
          handleDownloadPreviewImage(canvas);
        } finally {
          setCopyingPreview(false);
        }
      });
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tạo ảnh thư báo: ' + err.message);
      setCopyingPreview(false);
    }
  };

  const handleDownloadPreviewImage = async (existingCanvas = null) => {
    if (existingCanvas) {
      const link = document.createElement('a');
      link.download = `ThuBao_${activeRecord.studentName.replace(/\s+/g, '_')}_Thang_${monthYear.replace('/', '_')}.png`;
      link.href = existingCanvas.toDataURL('image/png');
      link.click();
      return;
    }
    const el = hiddenPrintRef.current || previewTemplateRef.current;
    if (!el) return;
    try {
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 1000,
      });
      const link = document.createElement('a');
      link.download = `ThuBao_${activeRecord.studentName.replace(/\s+/g, '_')}_Thang_${monthYear.replace('/', '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
      alert('Có lỗi khi tải ảnh thư báo.');
    }
  };

  // Copy Tin Nhắn Zalo
  const handleCopyZaloMessage = async () => {
    const text = generateZaloMessage(activeRecord, currentDebtNum, monthYear);
    setCopyingZaloText(true);
    try {
      await navigator.clipboard.writeText(text);
      alert('Đã copy tin nhắn Zalo vào Clipboard! Hãy mở Zalo dán (Ctrl+V) cho phụ huynh.');
    } catch (err) {
      console.error(err);
      alert('Không thể tự copy. Vui lòng bôi đen và copy thủ công.');
    } finally {
      setCopyingZaloText(false);
    }
  };

  // Xác nhận Thu tiền -> In Phiếu thu
  const handlePayInvoice = async () => {
    if (!payInvoice) return;
    try {
      const res = await fetch('/api/finance/monthly/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: payInvoice.invoiceId,
          paymentMethod: payMethod,
          amountPaid: payInvoice.totalToPay,
        }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Thu tiền thành công!' });
        setEReceiptData({
          studentName: payInvoice.studentName,
          totalPaid: payInvoice.totalToPay,
          oldDebt: payInvoice.previousDebt || 0,
          tuitionPaid: payInvoice.currentFee || payInvoice.totalToPay,
          remainingDebt: 0,
          monthYear,
          paymentMethod: payMethod,
          date: new Date().toLocaleDateString('vi-VN'),
          time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          cashier: 'Admin',
        });
        fetchNoticesData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy Ảnh Phiếu thu
  const copyReceiptImage = async () => {
    if (!receiptRef.current) return;
    setCopyingReceipt(true);
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, logging: false });
      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          alert('Đã copy Phiếu thu điện tử vào Clipboard! Hãy mở Zalo và dán (Ctrl+V) ngay.');
        } catch (err) {
          downloadReceiptImage();
        } finally {
          setCopyingReceipt(false);
        }
      });
    } catch (err) {
      console.error(err);
      setCopyingReceipt(false);
    }
  };

  const downloadReceiptImage = async () => {
    if (!receiptRef.current) return;
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, logging: false });
      const link = document.createElement('a');
      link.download = `PhieuThu_${eReceiptData.studentName.replace(/\s+/g, '_')}_Thang_${monthYear.replace('/', '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error(err);
    }
  };

  // Checkbox chọn học viên
  const toggleSelectRow = (key) => {
    setSelectedRows((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };
  const toggleSelectAll = () => {
    const fd = getFilteredNotices();
    if (selectedRows.length === fd.length) setSelectedRows([]);
    else setSelectedRows(fd.map((r) => r.studentId + '-' + r.classCode));
  };

  // Danh sách các ngày trong tháng
  const getDaysInMonth = (my) => {
    const [m, y] = my.split('/');
    const days = new Date(parseInt(y, 10), parseInt(m, 10), 0).getDate();
    return Array.from({ length: days }, (_, i) => {
      const d = i + 1;
      return `${y}-${m.padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    });
  };
  const daysList = getDaysInMonth(monthYear);

  // Lọc dữ liệu theo lớp
  const classOptions = [...new Set(configData.map((e) => e.classCode))];
  const getFilteredConfig = () => (classFilter === 'all' ? configData : configData.filter((e) => e.classCode === classFilter));
  const getFilteredEnrollments = () =>
    classFilter === 'all' ? attendanceData.enrollments : attendanceData.enrollments.filter((e) => e.classCode === classFilter);
  const getFilteredNotices = () => (classFilter === 'all' ? noticesData : noticesData.filter((e) => e.classCode === classFilter));

  const calculatedFeePerSession =
    formMonthlyRate && formMonthlySessions && formBillingType === 'MONTHLY_PREPAID'
      ? Math.round(parseFloat(formMonthlyRate) / parseInt(formMonthlySessions, 10))
      : parseFloat(formMonthlyRate) || 0;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1>
            <i className="fa-solid fa-file-invoice"></i> Quản Lý Học Phí Tháng
          </h1>
          <p>Hệ sinh thái độc lập: Cấu hình, Điểm danh ma trận ngày, Xuất thư báo & Thu tiền tự động.</p>
        </div>
      </div>

      {/* Thông báo Alert */}
      {message.text && (
        <div className={`alert-box alert-${message.type} animated-scale`}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      {/* 3 Tabs chính */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
        <button
          className={`btn ${activeTab === 'config' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('config')}
          style={{ padding: '0.6rem 1.25rem', fontWeight: '700' }}
        >
          <i className="fa-solid fa-sliders"></i> Cấu hình
        </button>
        <button
          className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('attendance')}
          style={{ padding: '0.6rem 1.25rem', fontWeight: '700' }}
        >
          <i className="fa-solid fa-calendar-check"></i> Điểm danh
        </button>
        <button
          className={`btn ${activeTab === 'notices' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('notices')}
          style={{ padding: '0.6rem 1.25rem', fontWeight: '700' }}
        >
          <i className="fa-solid fa-envelope-open-text"></i> Thư báo HP
        </button>
      </div>

      {/* =========================================================
          TOOLBAR: NẤC THANG CHỌN THỜI GIAN (NĂM -> 6 THÁNG -> THÁNG) & LỌC LỚP
         ========================================================= */}
      <div
        className="toolbar-panel glass-panel"
        style={{ marginBottom: '1.25rem', display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}
      >
        {/* Bộ chọn thời gian theo 3 Nấc Thang */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '800', color: '#085E8A', marginRight: '4px', fontSize: '0.95rem' }}>
            <i className="fa-solid fa-calendar-days"></i> Chọn tháng:
          </label>

          {/* Nút lùi 1 tháng */}
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handlePrevMonth}
            title="Lùi lại 1 tháng"
            style={{ padding: '5px 9px', fontWeight: 'bold' }}
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>

          {/* Nấc 1: Chọn Năm */}
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value, 10))}
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: '1.5px solid #cbd5e1',
              fontWeight: '700',
              color: '#1e293b',
              background: '#fff',
              fontSize: '0.9rem',
            }}
          >
            {[2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y}>
                Năm {y}
              </option>
            ))}
          </select>

          {/* Nấc 2: Chọn Kỳ 6 Tháng */}
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value)}
            style={{
              padding: '0.45rem 0.6rem',
              borderRadius: '6px',
              border: '1.5px solid #cbd5e1',
              fontWeight: '700',
              color: '#334155',
              background: '#fff',
              fontSize: '0.9rem',
            }}
          >
            <option value="H1">6 Tháng Đầu (T1 - T6)</option>
            <option value="H2">6 Tháng Cuối (T7 - T12)</option>
          </select>

          {/* Nấc 3: Chọn Tháng cần xem (Chỉ hiển thị 6 tháng của kỳ) */}
          <select
            value={currentMStr}
            onChange={(e) => handleMonthChange(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '6px',
              border: '2px solid #085E8A',
              fontWeight: '800',
              color: '#085E8A',
              background: '#eff6ff',
              fontSize: '0.95rem',
            }}
          >
            {(selectedPeriod === 'H1' ? ['01', '02', '03', '04', '05', '06'] : ['07', '08', '09', '10', '11', '12']).map(
              (m) => (
                <option key={m} value={m}>
                  Tháng {m}/{selectedYear}
                </option>
              )
            )}
          </select>

          {/* Nút tiến 1 tháng */}
          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={handleNextMonth}
            title="Tiến tới 1 tháng"
            style={{ padding: '5px 9px', fontWeight: 'bold' }}
          >
            <i className="fa-solid fa-chevron-right"></i>
          </button>

          {/* Nút về Tháng hiện tại */}
          {monthYear !== currentMonthYear && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={handleCurrentMonth}
              style={{
                padding: '4px 10px',
                fontSize: '0.8rem',
                background: '#085E8A',
                color: '#fff',
                fontWeight: '700',
                border: 'none',
                borderRadius: '6px',
              }}
              title="Quay lại tháng hiện tại"
            >
              Hiện tại
            </button>
          )}
        </div>

        {/* Lọc theo lớp */}
        <div className="filter-group">
          <label style={{ fontWeight: '600' }}>
            <i className="fa-solid fa-filter"></i> Lọc theo lớp:
          </label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--color-border)', minWidth: '220px' }}
          >
            <option value="all">Tất cả các lớp</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =========================================================
          TAB 1: CẤU HÌNH (CÓ CỘT THAO TÁC: SỬA & XÓA)
         ========================================================= */}
      {activeTab === 'config' && (
        <div className="glass-panel p-4">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: '#1e293b', margin: 0 }}>
              <i className="fa-solid fa-user-gear"></i> Danh Sách Học Viên Đóng Phí Theo Tháng
            </h2>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                className="btn btn-outline"
                onClick={handleOpenCreateClassModal}
                style={{ fontWeight: '700', padding: '0.6rem 1.15rem', borderColor: '#085E8A', color: '#085E8A' }}
                title="Tạo lớp học mới nhanh cho hệ thống và học viên tháng"
              >
                <i className="fa-solid fa-chalkboard-user"></i> + Tạo Lớp Mới
              </button>
              <button className="btn btn-primary" onClick={handleOpenAddModal} style={{ fontWeight: '700', padding: '0.6rem 1.25rem', background: '#085E8A' }}>
                <i className="fa-solid fa-user-plus"></i> + Thêm Học viên
              </button>
            </div>
          </div>

          <div className="table-container" style={{ overflowX: 'auto' }}>
            {loadingConfig ? (
              <div className="loading-state">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <p>Đang tải cấu hình...</p>
              </div>
            ) : getFilteredConfig().length === 0 ? (
              <div className="empty-table-state">
                <p>Chưa có học viên nào được cấu hình đóng theo tháng.</p>
                <button className="btn btn-sm btn-primary mt-2" onClick={handleOpenAddModal}>
                  + Thêm Học Viên Ngay
                </button>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                    <th>Họ tên</th>
                    <th>Số CCCD / Mã định danh</th>
                    <th>Lớp</th>
                    <th>Ngày học</th>
                    <th>Giờ học</th>
                    <th style={{ textAlign: 'center' }}>Loại HP</th>
                    <th style={{ textAlign: 'right' }}>Học phí</th>
                    <th style={{ textAlign: 'center' }}>Số buổi cam kết</th>
                    <th style={{ textAlign: 'right' }}>HP/Buổi</th>
                    <th style={{ textAlign: 'center', width: '100px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredConfig().map((enr, idx) => {
                    const { days, shiftTime } = getScheduleInfo(enr.classCode, enr.class?.schedule);
                    const hpPerSession =
                      enr.monthlySessions && enr.monthlyRate
                        ? Math.round(enr.monthlyRate / enr.monthlySessions)
                        : enr.monthlyRate || 0;
                    return (
                      <tr key={enr.id}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ fontWeight: '700', color: '#085E8A', whiteSpace: 'nowrap' }}>{enr.student?.name}</td>
                        <td style={{ color: '#475569', fontSize: '0.88rem' }}>{enr.student?.nationalId || '—'}</td>
                        <td style={{ whiteSpace: 'nowrap', fontWeight: '500' }}>{enr.classCode}</td>
                        <td style={{ whiteSpace: 'nowrap', color: '#0284c7', fontWeight: '600' }}>{days}</td>
                        <td style={{ whiteSpace: 'pre-line', color: '#475569', fontSize: '0.88rem' }}>{shiftTime}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={`status-badge ${
                              enr.billingType === 'MONTHLY_PREPAID' ? 'bg-info-light' : 'bg-warning-light'
                            }`}
                            style={{ fontWeight: '700' }}
                          >
                            {enr.billingType === 'MONTHLY_PREPAID' ? 'Trước (Prepaid)' : 'Sau (Postpaid)'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>
                          {enr.monthlyRate ? Number(enr.monthlyRate).toLocaleString('vi-VN') + 'đ' : '0đ'}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>
                          {enr.monthlySessions ? `${enr.monthlySessions} buổi` : '—'}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '600', color: '#059669' }}>
                          {hpPerSession ? Number(hpPerSession).toLocaleString('vi-VN') + 'đ' : '0đ'}
                        </td>

                        {/* Nút Sửa & Nút Xóa khỏi tháng */}
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleOpenEditModal(enr)}
                              title="Chỉnh sửa thông tin học viên & cấu hình học phí"
                              style={{ padding: '4px 8px', color: '#0284c7', borderColor: '#0284c7' }}
                            >
                              <i className="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline"
                              onClick={() => handleOpenDeleteModal(enr)}
                              title="Tùy chọn xóa học viên (Xóa vĩnh viễn khỏi hệ thống hoặc rút khỏi tháng)"
                              style={{ padding: '4px 8px', color: '#ef4444', borderColor: '#ef4444' }}
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 2: ĐIỂM DANH
         ========================================================= */}
      {activeTab === 'attendance' && (
        <div
          className="glass-panel p-4"
          style={{
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '12px',
            position: 'relative',
            maxHeight: '75vh',
          }}
        >
          {loadingAttendance ? (
            <div className="loading-state">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Đang tải ma trận điểm danh...</p>
            </div>
          ) : getFilteredEnrollments().length === 0 ? (
            <div className="empty-table-state">
              <p>Chưa có học viên nào trong danh sách điểm danh tháng {monthYear}.</p>
            </div>
          ) : (
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%', fontSize: '0.95rem' }}>
              <thead>
                <tr>
                  <th
                    style={{
                      position: 'sticky',
                      top: 0,
                      left: 0,
                      zIndex: 12,
                      background: '#f1f5f9',
                      padding: '12px 16px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #cbd5e1',
                      minWidth: '180px',
                      textAlign: 'left',
                      fontWeight: '800',
                      color: '#085E8A',
                    }}
                  >
                    Học viên
                  </th>
                  <th
                    style={{
                      position: 'sticky',
                      top: 0,
                      left: '180px',
                      zIndex: 12,
                      background: '#f1f5f9',
                      padding: '12px 16px',
                      whiteSpace: 'nowrap',
                      borderBottom: '2px solid #cbd5e1',
                      minWidth: '170px',
                      textAlign: 'left',
                      fontWeight: '800',
                      color: '#334155',
                    }}
                  >
                    Lớp
                  </th>
                  {daysList.map((d) => (
                    <th
                      key={d}
                      style={{
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                        background: '#f1f5f9',
                        padding: '12px 8px',
                        textAlign: 'center',
                        borderBottom: '2px solid #cbd5e1',
                        minWidth: '54px',
                        fontSize: '1rem',
                        fontWeight: '800',
                        color: '#1e293b',
                      }}
                    >
                      {parseInt(d.split('-')[2], 10)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getFilteredEnrollments().map((enr) => (
                  <tr key={enr.id}>
                    <td
                      style={{
                        position: 'sticky',
                        left: 0,
                        zIndex: 9,
                        background: '#fff',
                        padding: '12px 16px',
                        whiteSpace: 'nowrap',
                        fontWeight: '700',
                        color: '#0f172a',
                        borderBottom: '1px solid #e2e8f0',
                      }}
                    >
                      {enr.student?.name}
                    </td>
                    <td
                      style={{
                        position: 'sticky',
                        left: '180px',
                        zIndex: 9,
                        background: '#fff',
                        padding: '12px 16px',
                        whiteSpace: 'nowrap',
                        borderBottom: '1px solid #e2e8f0',
                        fontSize: '0.88rem',
                        color: '#64748b',
                      }}
                    >
                      {enr.classCode}
                    </td>
                    {daysList.map((d) => {
                      const att = attendanceData.attendances.find(
                        (a) => a.studentId === enr.studentId && a.classCode === enr.classCode && a.date.startsWith(d)
                      );
                      let icon = '';
                      let bgColor = 'transparent';
                      let color = '';

                      if (att?.status === 'Có mặt') {
                        icon = 'fa-check';
                        color = '#10b981';
                        bgColor = '#ecfdf5';
                      } else if (att?.status === 'Vắng') {
                        icon = 'fa-xmark';
                        color = '#ef4444';
                        bgColor = '#fef2f2';
                      }

                      return (
                        <td
                          key={d}
                          style={{
                            textAlign: 'center',
                            cursor: 'pointer',
                            padding: '10px 4px',
                            borderBottom: '1px solid #e2e8f0',
                            background: bgColor,
                            userSelect: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onClick={() => handleToggleAttendance(enr.studentId, enr.classCode, d, att?.status || 'Trống')}
                          title={`Ngày ${d.split('-')[2]}: ${att?.status || 'Chưa điểm danh'}`}
                        >
                          {icon && (
                            <i
                              className={`fa-solid ${icon}`}
                              style={{
                                fontSize: '1.4rem',
                                color: color,
                              }}
                            ></i>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 3: THƯ BÁO HP
         ========================================================= */}
      {activeTab === 'notices' && (
        <div className="table-container glass-panel p-4">
          {loadingNotices ? (
            <div className="loading-state">
              <i className="fa-solid fa-spinner fa-spin"></i>
              <p>Đang tính toán dữ liệu học phí tháng {monthYear}...</p>
            </div>
          ) : getFilteredNotices().length === 0 ? (
            <div className="empty-table-state">
              <p>Không có dữ liệu học phí tháng {monthYear}.</p>
            </div>
          ) : (
            <>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedRows.length === getFilteredNotices().length && getFilteredNotices().length > 0}
                        onChange={toggleSelectAll}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                    </th>
                    <th style={{ width: '45px', textAlign: 'center' }}>STT</th>
                    <th>Học viên</th>
                    <th>Lớp</th>
                    <th>Kiểu đóng</th>
                    <th style={{ textAlign: 'center' }}>Cam kết</th>
                    <th style={{ textAlign: 'center' }}>Thực tế</th>
                    <th style={{ textAlign: 'right' }}>HP/Buổi</th>
                    <th style={{ textAlign: 'right' }}>Dư/Thiếu</th>
                    <th style={{ textAlign: 'right' }}>Học phí chưa hoàn thành</th>
                    <th style={{ textAlign: 'right' }}>Tổng thanh toán</th>
                    <th style={{ textAlign: 'center' }}>Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredNotices().map((row, index) => {
                    const rowKey = `${row.studentId}-${row.classCode}`;
                    return (
                      <tr key={rowKey} style={{ background: selectedRows.includes(rowKey) ? '#f0f9ff' : 'transparent' }}>
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(rowKey)}
                            onChange={() => toggleSelectRow(rowKey)}
                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ textAlign: 'center' }}>{index + 1}</td>
                        <td style={{ fontWeight: '700', color: '#085E8A' }}>{row.studentName}</td>
                        <td>{row.classCode}</td>
                        <td>{row.billingType === 'MONTHLY_PREPAID' ? 'Trước (Prepaid)' : 'Sau (Postpaid)'}</td>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{row.committedSessions}</td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: '#0284c7' }}>{row.actualSessions}</td>
                        <td style={{ textAlign: 'right' }}>{Number(row.feePerSession || 0).toLocaleString('vi-VN')}đ</td>
                        <td
                          style={{
                            textAlign: 'right',
                            fontWeight: '600',
                            color: row.excessMissing > 0 ? '#059669' : row.excessMissing < 0 ? '#dc2626' : '#64748b',
                          }}
                        >
                          {Number(row.excessMissing || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            color: row.previousDebt > 0 ? '#dc2626' : '#64748b',
                            fontWeight: row.previousDebt > 0 ? '700' : 'normal',
                          }}
                        >
                          {Number(row.previousDebt || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: '800', fontSize: '1.05rem', color: '#085E8A' }}>
                          {Number(row.totalToPay || 0).toLocaleString('vi-VN')}đ
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {row.status === 'NOT_GENERATED' ? (
                            <span className="status-badge bg-warning-light" style={{ fontWeight: '600' }}>
                              Chưa chốt
                            </span>
                          ) : row.status === 'UNPAID' ? (
                            <span className="status-badge bg-danger-light" style={{ fontWeight: '700' }}>
                              Chưa đóng
                            </span>
                          ) : (
                            <span className="status-badge bg-success-light" style={{ fontWeight: '700' }}>
                              Đã đóng
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                            {/* Nút mắt 👁️ xem trước realtime */}
                            <button
                              className="btn btn-sm btn-outline"
                              title="Xem trước thư báo & tin nhắn Zalo"
                              onClick={() => handleOpenNoticeModal(row)}
                              style={{ padding: '5px 9px', color: '#0284c7', borderColor: '#0284c7' }}
                            >
                              <i className="fa-solid fa-eye"></i>
                            </button>

                            {/* Chốt sổ hoặc Nút Thư báo */}
                            {row.status === 'NOT_GENERATED' ? (
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleGenerateInvoice(row)}
                                disabled={isProcessing}
                                style={{ fontWeight: '600' }}
                              >
                                <i className="fa-solid fa-file-invoice"></i> Chốt sổ
                              </button>
                            ) : (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: '#10b981', color: '#fff', fontWeight: '700' }}
                                onClick={() => handleOpenNoticeModal(row)}
                              >
                                <i className="fa-solid fa-image"></i> Thư báo
                              </button>
                            )}

                            {/* Nút Thu tiền nếu chưa đóng */}
                            {row.status === 'UNPAID' && (
                              <button
                                className="btn btn-sm"
                                style={{ backgroundColor: '#f59e0b', color: '#fff', fontWeight: '700' }}
                                onClick={() => {
                                  setPayInvoice(row);
                                  setShowPayModal(true);
                                }}
                              >
                                <i className="fa-solid fa-hand-holding-dollar"></i> Thu tiền
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Thanh hành động khi tick chọn nhiều học viên */}
              {selectedRows.length > 0 && (
                <div
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.85rem 1.25rem',
                    background: '#eff6ff',
                    border: '1.5px solid #3b82f6',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: '700', color: '#1d4ed8', fontSize: '1rem' }}>
                    <i className="fa-solid fa-check-double"></i> Đã chọn {selectedRows.length} học viên
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        const selectedList = getFilteredNotices().filter((r) =>
                          selectedRows.includes(`${r.studentId}-${r.classCode}`)
                        );
                        if (selectedList.length > 0) {
                          handleOpenNoticeModal(selectedList[0]);
                        }
                      }}
                    >
                      <i className="fa-solid fa-eye"></i> Mở Thư Báo Đã Chọn
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* =========================================================
          MODAL THÊM / CHỈNH SỬA HỌC VIÊN THÁNG (RỘNG RÃI, ĐỦ CHỖ, KHÔNG BỊ CẮT BÊN PHẢI)
         ========================================================= */}
      {showAddModal && (
        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="modal-content"
            style={{
              width: 'min(980px, 96vw)',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: '1.35rem 1.65rem',
              borderRadius: '16px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              background: '#fff',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.75rem',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h2 style={{ color: '#085E8A', fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                  <i className={`fa-solid ${editingEnrollmentId ? 'fa-pen-to-square' : 'fa-user-plus'}`}></i>{' '}
                  {editingEnrollmentId ? 'Chỉnh Sửa Thông Tin & Cấu Hình Học Viên' : 'Thêm Học Viên Học Phí Tháng'}
                </h2>

                {!editingEnrollmentId && (
                  <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => {
                        setAddMode('new');
                        setSelectedStudent(null);
                      }}
                      style={{
                        fontSize: '0.8rem',
                        padding: '4px 12px',
                        background: addMode === 'new' ? '#085E8A' : 'transparent',
                        color: addMode === 'new' ? '#fff' : '#475569',
                        borderRadius: '4px',
                        fontWeight: '700',
                      }}
                    >
                      Học viên mới
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setAddMode('existing')}
                      style={{
                        fontSize: '0.8rem',
                        padding: '4px 12px',
                        background: addMode === 'existing' ? '#085E8A' : 'transparent',
                        color: addMode === 'existing' ? '#fff' : '#475569',
                        borderRadius: '4px',
                        fontWeight: '700',
                      }}
                    >
                      Chọn học viên có sẵn
                    </button>
                  </div>
                )}
              </div>

              <button className="close-btn" onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {/* Thanh tìm nhanh nếu chọn học viên có sẵn */}
            {!editingEnrollmentId && addMode === 'existing' && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0.6rem 0.85rem',
                  marginBottom: '0.85rem',
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  placeholder="Nhập tên bé hoặc SĐT phụ huynh để tìm..."
                  className="form-control"
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchStudent()}
                  style={{ flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.9rem' }}
                />
                <button
                  className="btn btn-sm btn-primary"
                  onClick={handleSearchStudent}
                  disabled={searchingStudent}
                  style={{ padding: '0.45rem 1rem', fontWeight: '700' }}
                >
                  {searchingStudent ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-search"></i>} Tìm
                </button>
                {selectedStudent && (
                  <span style={{ fontSize: '0.88rem', color: '#10b981', fontWeight: '700' }}>
                    ✓ Đã chọn: {selectedStudent.name}
                  </span>
                )}
              </div>
            )}

            {/* Kết quả tìm kiếm nhanh */}
            {!editingEnrollmentId && addMode === 'existing' && searchResults.length > 0 && !selectedStudent && (
              <div
                style={{
                  maxHeight: '130px',
                  overflowY: 'auto',
                  background: '#fff',
                  border: '1.5px solid #3b82f6',
                  borderRadius: '6px',
                  marginBottom: '0.75rem',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
                }}
              >
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectExistingStudent(s)}
                    style={{
                      padding: '8px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '0.88rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f9ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                  >
                    <span>
                      <strong style={{ color: '#085E8A' }}>{s.name}</strong> - {s.phone || 'Không có SĐT'}
                    </span>
                    <span style={{ color: '#3b82f6', fontWeight: '700' }}>Bấm để chọn</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bố cục 2 Cột Rộng Rãi, Cân Đối */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', flex: 1, minHeight: 0 }}>
              {/* CỘT 1: THÔNG TIN HỌC VIÊN */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1rem 1.15rem',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontWeight: '800', color: '#085E8A', fontSize: '0.95rem', marginBottom: '0.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fa-solid fa-id-card"></i> Thông tin học viên
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                    Họ và Tên *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Nguyễn Văn An"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem', fontWeight: '700', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="09xxxxxxxx"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#085E8A', display: 'block', marginBottom: '3px' }}>
                      Số CCCD (Xuất HĐ)
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Số CCCD..."
                      value={formNationalId}
                      onChange={(e) => setFormNationalId(e.target.value)}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem', borderColor: '#93c5fd', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '0.65rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Ngày sinh
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formDob}
                      onChange={(e) => setFormDob(e.target.value)}
                      style={{ padding: '0.45rem 0.65rem', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Địa chỉ thường trú
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Địa chỉ cư trú..."
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              </div>

              {/* CỘT 2: LỚP HỌC & HỌC PHÍ THÁNG (RỘNG RÃI, ĐỦ CHỖ, KHÔNG BỊ CẮT) */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '1rem 1.15rem',
                  borderRadius: '12px',
                  border: '1.5px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontWeight: '800', color: '#085E8A', fontSize: '0.95rem', marginBottom: '0.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span><i className="fa-solid fa-graduation-cap"></i> Cấu hình lớp & Học phí tháng</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={handleOpenCreateClassModal}
                    style={{ fontSize: '0.75rem', padding: '2px 8px', borderColor: '#085E8A', color: '#085E8A', fontWeight: '700' }}
                    title="Mở nhanh hộp thoại tạo lớp học mới"
                  >
                    <i className="fa-solid fa-plus"></i> Tạo lớp mới
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                    Chọn Lớp học *
                  </label>
                  <select
                    className="form-control"
                    value={formClassCode}
                    onChange={(e) => setFormClassCode(e.target.value)}
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
                  >
                    <option value="">-- Chọn lớp học --</option>
                    {allClasses.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} {c.teacherName ? `(${c.teacherName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Bắt đầu học từ
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      style={{ padding: '0.45rem 0.65rem', fontSize: '0.88rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Tùy chọn đóng phí *
                    </label>
                    <select
                      className="form-control"
                      value={formBillingType}
                      onChange={(e) => setFormBillingType(e.target.value)}
                      style={{
                        padding: '0.45rem 0.65rem',
                        fontSize: '0.88rem',
                        fontWeight: '700',
                        color: formBillingType === 'MONTHLY_PREPAID' ? '#0284c7' : '#d97706',
                        width: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="MONTHLY_PREPAID">Đóng trước (Prepaid)</option>
                      <option value="MONTHLY_POSTPAID">Đóng sau (Postpaid)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Học phí cam kết / Tháng (đ) *
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="VD: 1200000"
                      value={formMonthlyRate}
                      onChange={(e) => setFormMonthlyRate(e.target.value)}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem', fontWeight: '700', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                      Số buổi cam kết
                    </label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="VD: 8"
                      value={formMonthlySessions}
                      onChange={(e) => setFormMonthlySessions(e.target.value)}
                      disabled={formBillingType === 'MONTHLY_POSTPAID'}
                      style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    background: '#fff',
                    border: '1.5px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.4rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Đơn giá tương đương:</span>
                  <strong style={{ fontSize: '0.95rem', color: '#059669', whiteSpace: 'nowrap' }}>
                    {calculatedFeePerSession.toLocaleString('vi-VN')}đ / buổi
                  </strong>
                </div>

                <div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Ghi chú cấu hình (nếu có)..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                marginTop: '1rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowAddModal(false)}
                disabled={savingStudent}
                style={{ padding: '0.5rem 1.25rem', fontWeight: '700' }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveStudent}
                disabled={savingStudent}
                style={{ padding: '0.5rem 1.5rem', fontWeight: '800', background: '#085E8A', color: '#fff' }}
              >
                {savingStudent ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> {editingEnrollmentId ? 'Lưu Thay Đổi' : 'Thêm Học Viên'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

            {/* =========================================================
          MODAL XEM TRƯỚC THƯ BÁO:
          - HÌNH THƯ BÁO CHIẾM PHẦN LỚN Ở TRANG NÀY (ĐẸP MẮT, RÕ RÀNG, ĐỦ CHI TIẾT)
          - NỘI DUNG TIN NHẮN ZALO CHIẾM PHẦN NHỎ Ở DƯỚI
          - BẢN CHỤP ẨN 100% CHIỀU CAO THẬT ĐỂ COPY RA ZALO KHÔNG BỊ CẮT DẸP
         ========================================================= */}
      {previewModalOpen && activeRecord && dynamicNoticeData && (
        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '940px',
              width: '96vw',
              maxHeight: '94vh',
              overflowY: 'auto',
              padding: '1.35rem 1.65rem',
              borderRadius: '16px',
              display: 'block',
              background: '#fff',
            }}
          >
            {/* Header Modal */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '0.65rem',
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2 style={{ color: '#085E8A', margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>
                  <i className="fa-solid fa-envelope-open-text"></i> Thư Báo Học Phí & Soạn Tin Zalo
                </h2>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Học viên: <strong>{activeRecord.studentName}</strong> | Lớp: <strong>{activeRecord.classCode}</strong> | Tháng: <strong>{monthYear}</strong>
                </span>
              </div>
              <button className="close-btn" onClick={() => setPreviewModalOpen(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            {/* KHỐI 1: TÙY CHỌN ĐIỀU CHỈNH NỢ CŨ / HỌC PHÍ CHƯA HOÀN THÀNH */}
            <div
              style={{
                background: '#FFFBEB',
                border: '1.5px solid #F59E0B',
                borderRadius: '10px',
                padding: '0.75rem 1.25rem',
                marginBottom: '1.15rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <i className="fa-solid fa-coins" style={{ fontSize: '1.3rem', color: '#D97706' }}></i>
                <div>
                  <strong style={{ color: '#92400E', fontSize: '0.92rem' }}>Học phí chưa hoàn thành (Nợ cũ tháng trước):</strong>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#78350F' }}>
                    Nhập số tiền nợ cũ nếu muốn chỉnh sửa, Thư báo và mã QR bên dưới sẽ tự động cập nhật số tiền mới:
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number"
                  className="form-control"
                  value={adjustedDebt}
                  onChange={(e) => setAdjustedDebt(e.target.value)}
                  placeholder="0"
                  style={{ width: '140px', fontWeight: '800', fontSize: '0.95rem', textAlign: 'right', color: '#B45309' }}
                />
                <span style={{ fontWeight: '700', color: '#92400E' }}>đ</span>

                <button
                  className="btn btn-sm btn-outline"
                  onClick={handleSaveAdjustedDebt}
                  disabled={savingDebt}
                  style={{ borderColor: '#D97706', color: '#D97706', fontWeight: '700', padding: '4px 10px' }}
                  title="Lưu số nợ này vào hóa đơn của tháng"
                >
                  {savingDebt ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-save"></i>} Lưu nợ
                </button>
              </div>

              {/* Tóm tắt nhanh số tiền mới */}
              <div style={{ width: '100%', borderTop: '1px dashed #FCD34D', paddingTop: '0.35rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem' }}>
                <span>
                  Học phí tháng này: <strong>{Number(currentFeeNum).toLocaleString('vi-VN')}đ</strong> | Cấn trừ dư/thiếu: <strong>{Number(excessNum).toLocaleString('vi-VN')}đ</strong>
                </span>
                <span style={{ color: '#B45309', fontWeight: '800', fontSize: '1.05rem' }}>
                  👉 TỔNG CỘNG MỚI: {Number(calculatedTotalToPay).toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* KHỐI 2: HÌNH THƯ BÁO CHIẾM PHẦN LỚN Ở TRANG NÀY (ĐẸP MẮT, RÕ RÀNG, ĐỦ CHI TIẾT) */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: '#cbd5e1',
                padding: '1.5rem',
                borderRadius: '12px',
                marginBottom: '1.15rem',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)',
                overflowX: 'auto',
              }}
            >
              <div
                ref={previewTemplateRef}
                style={{
                  width: '800px',
                  maxWidth: '100%',
                  background: '#ffffff',
                  borderRadius: '4px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
                  overflow: 'hidden',
                }}
              >
                <MonthlyNoticeTemplate noticeData={dynamicNoticeData} />
              </div>
            </div>

            {/* KHỐI 3: NỘI DUNG TIN NHẮN COPY ZALO CHIẾM PHẦN NHỎ Ở DƯỚI */}
            <div
              style={{
                background: '#F0FDF4',
                border: '1.5px solid #22C55E',
                borderRadius: '10px',
                padding: '0.65rem 1rem',
                marginBottom: '1.15rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <strong style={{ color: '#166534', fontSize: '0.88rem' }}>
                  <i className="fa-solid fa-comment-dots"></i> Tin nhắn Zalo gửi phụ huynh (Đọc lướt trong 3 giây):
                </strong>
                <button
                  className="btn btn-sm"
                  onClick={handleCopyZaloMessage}
                  style={{
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    padding: '3px 10px',
                    borderRadius: '4px',
                  }}
                >
                  {copyingZaloText ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-copy"></i>} Copy Tin Nhắn Zalo
                </button>
              </div>

              <pre
                style={{
                  margin: 0,
                  fontFamily: 'inherit',
                  fontSize: '0.82rem',
                  lineHeight: '1.45',
                  color: '#14532D',
                  whiteSpace: 'pre-wrap',
                  background: '#DCFCE7',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                }}
              >
                {generateZaloMessage(activeRecord, currentDebtNum, monthYear)}
              </pre>
            </div>

            {/* KHỐI 4: CÁC NÚT HÀNH ĐỘNG CUỐI MODAL */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleCopyPreviewImage}
                className="btn"
                style={{
                  background: '#085E8A',
                  color: '#fff',
                  flex: '1.5 1 240px',
                  padding: '0.85rem',
                  fontWeight: '800',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: '8px',
                }}
                disabled={copyingPreview}
              >
                {copyingPreview ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin"></i> Đang tạo ảnh...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-copy"></i> Copy Ảnh Thư Báo (Dán Zalo)
                  </>
                )}
              </button>

              <button
                onClick={handleCopyZaloMessage}
                className="btn"
                style={{
                  background: '#16a34a',
                  color: '#fff',
                  flex: '1.2 1 200px',
                  padding: '0.85rem',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  borderRadius: '8px',
                }}
              >
                <i className="fa-solid fa-message"></i> Copy Tin Nhắn Zalo
              </button>

              <button
                onClick={() => handleDownloadPreviewImage()}
                className="btn btn-secondary"
                style={{
                  padding: '0.85rem 1.25rem',
                  fontWeight: '700',
                  borderRadius: '8px',
                }}
              >
                <i className="fa-solid fa-download"></i> Tải Ảnh Xuống
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BẢN CHỤP ẢNH ẨN ĐỘ PHÂN GIẢI CAO (100% CHIỀU CAO THẬT CỦA THƯ BÁO, KHÔNG BỊ CO HAY CẮT) */}
      {previewModalOpen && dynamicNoticeData && (
        <div
          style={{
            position: 'fixed',
            left: '-99999px',
            top: '0',
            width: '850px',
            pointerEvents: 'none',
            zIndex: -99999,
            opacity: 0,
          }}
        >
          <div ref={hiddenPrintRef} style={{ width: '800px', backgroundColor: '#ffffff', color: '#1e293b' }}>
            <MonthlyNoticeTemplate noticeData={dynamicNoticeData} />
          </div>
        </div>
      )}

            {/* =========================================================
          MODAL XÁC NHẬN XÓA HỌC VIÊN (XÓA VĨNH VIỄN HOẶC RÚT KHỎI THÁNG)
         ========================================================= */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="modal-content"
            style={{
              maxWidth: '560px',
              width: '92%',
              borderRadius: '16px',
              padding: '1.5rem',
              background: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              display: 'block',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid #fee2e2', paddingBottom: '0.75rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626', fontSize: '1.25rem' }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.15rem', fontWeight: '800' }}>Tùy Chọn Xóa Học Viên</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  Học viên: <strong style={{ color: '#0f172a' }}>{deleteTarget.studentName}</strong> (Lớp: {deleteTarget.classCode})
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {/* Lựa chọn 1: Xóa vĩnh viễn khỏi toàn bộ hệ thống */}
              <div style={{ border: '1.5px solid #fca5a5', background: '#fff5f5', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#b91c1c', fontSize: '0.95rem' }}>
                      <i className="fa-solid fa-trash-can"></i> Xóa VĨNH VIỄN khỏi toàn bộ hệ thống
                    </strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#7f1d1d', lineHeight: '1.4' }}>
                      Dành cho <strong>học viên demo / tạo thử nghiệm</strong>. Hệ thống sẽ xóa sạch 100% hồ sơ học viên, điểm danh, hóa đơn liên quan khỏi cơ sở dữ liệu.
                    </p>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={deletingStudent}
                    onClick={() => handleConfirmDelete(deleteTarget.enrollmentId, true)}
                    style={{ background: '#dc2626', color: '#fff', fontWeight: '700', padding: '6px 14px', whiteSpace: 'nowrap', borderRadius: '6px' }}
                  >
                    {deletingStudent ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Xóa vĩnh viễn'}
                  </button>
                </div>
              </div>

              {/* Lựa chọn 2: Xóa khỏi danh sách học phí tháng */}
              <div style={{ border: '1.5px solid #fed7aa', background: '#fffbeb', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div>
                    <strong style={{ color: '#c2410c', fontSize: '0.95rem' }}>
                      <i className="fa-solid fa-arrow-right-from-bracket"></i> Xóa khỏi danh sách học phí tháng
                    </strong>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#7c2d12', lineHeight: '1.4' }}>
                      Rút học viên khỏi danh sách và lớp học phí tháng này. Hoàn toàn độc lập, không liên quan và không ảnh hưởng gì tới các dữ liệu khác.
                    </p>
                  </div>
                  <button
                    className="btn btn-sm"
                    disabled={deletingStudent}
                    onClick={() => handleConfirmDelete(deleteTarget.enrollmentId, false)}
                    style={{ background: '#d97706', color: '#fff', fontWeight: '700', padding: '6px 14px', whiteSpace: 'nowrap', borderRadius: '6px' }}
                  >
                    {deletingStudent ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Xóa khỏi tháng'}
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingStudent}
                style={{ padding: '6px 16px', fontWeight: '700', color: '#64748b' }}
              >
                Hủy bỏ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL TẠO LỚP HỌC MỚI (PHỤC VỤ CHO HỌC VIÊN THÁNG & HỆ THỐNG)
         ========================================================= */}
      {showCreateClassModal && (
        <div className="modal-overlay" style={{ zIndex: 1250, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="modal-content"
            style={{
              width: 'min(580px, 94vw)',
              borderRadius: '16px',
              padding: '1.5rem',
              background: '#fff',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
              display: 'block',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, color: '#085E8A', fontSize: '1.15rem', fontWeight: '800' }}>
                <i className="fa-solid fa-chalkboard-user"></i> Tạo Lớp Học Mới (Học Viên Tháng)
              </h3>
              <button className="close-btn" onClick={() => setShowCreateClassModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#64748b' }}>
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {/* 1. Tên lớp học (Tự do nhập không gợi ý trước) & Giáo viên phụ trách */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem' }}>
                <div style={{ minWidth: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                    Tên / Mã Lớp Học *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Lớp M3 T2-T4, Lớp Kèm Riêng..."
                    value={customClassName}
                    onChange={(e) => setCustomClassName(e.target.value)}
                    required
                    autoFocus
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontWeight: '700', color: '#085E8A', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ minWidth: 0 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Giáo viên phụ trách
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="VD: Ms My, Thầy Hoàng..."
                    value={classTeacherName}
                    onChange={(e) => setClassTeacherName(e.target.value)}
                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* 2. Lịch học: 7 ngày trong tuần tích chọn ngày nào */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
                  Lịch học trong tuần (Tích chọn ngày học) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(76px, 1fr))', gap: '7px' }}>
                  {[
                    { id: 'T2', name: 'Thứ 2' },
                    { id: 'T3', name: 'Thứ 3' },
                    { id: 'T4', name: 'Thứ 4' },
                    { id: 'T5', name: 'Thứ 5' },
                    { id: 'T6', name: 'Thứ 6' },
                    { id: 'T7', name: 'Thứ 7' },
                    { id: 'CN', name: 'Chủ Nhật' },
                  ].map((day) => {
                    const isChecked = selectedDays.includes(day.name);
                    return (
                      <label
                        key={day.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '0.5rem 0.35rem',
                          borderRadius: '8px',
                          border: isChecked ? '2px solid #085E8A' : '1.5px solid #cbd5e1',
                          background: isChecked ? '#e0f2fe' : '#f8fafc',
                          color: isChecked ? '#085E8A' : '#475569',
                          fontWeight: isChecked ? '800' : '600',
                          fontSize: '0.84rem',
                          cursor: 'pointer',
                          userSelect: 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDays([...selectedDays, day.name]);
                            } else {
                              setSelectedDays(selectedDays.filter((d) => d !== day.name));
                            }
                          }}
                          style={{ accentColor: '#085E8A', width: '15px', height: '15px', cursor: 'pointer' }}
                        />
                        <span>{day.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 3. Ca học / Giờ học: textarea tự do nhập và có thể xuống dòng */}
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '4px' }}>
                  Ca học / Giờ học (Tự do nhập, có thể nhấn Enter xuống dòng)
                </label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={'Nhập giờ học hoặc ca học (có thể xuống dòng)...\nVD:\nCa 1: 17:30 - 19:00\nCa 2: 19:15 - 20:45'}
                  value={classHoursNotes}
                  onChange={(e) => setClassHoursNotes(e.target.value)}
                  style={{
                    padding: '0.55rem 0.85rem',
                    fontSize: '0.88rem',
                    width: '100%',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                  }}
                />
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', color: '#64748b', lineHeight: '1.45' }}>
                <i className="fa-solid fa-circle-info" style={{ color: '#085E8A', marginRight: '6px' }}></i>
                Lớp học theo tháng diễn ra xuyên suốt qua các tháng, học phí và điểm danh sẽ được theo dõi tự động theo từng chu kỳ tháng mà không cần khai giảng lại.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setShowCreateClassModal(false)}
                  disabled={creatingClass}
                  style={{ padding: '0.45rem 1.15rem', fontWeight: '700' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creatingClass}
                  style={{ padding: '0.45rem 1.4rem', fontWeight: '800', background: '#085E8A', color: '#fff' }}
                >
                  {creatingClass ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>} Tạo Lớp Học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL THU TIỀN & PHIẾU THU ĐIỆN TỬ
         ========================================================= */}
      {showPayModal && payInvoice && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '480px', width: '92%', borderRadius: '16px', padding: '1.25rem' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
              <h2 style={{ color: '#085E8A', fontSize: '1.2rem', margin: 0 }}>
                <i className="fa-solid fa-hand-holding-dollar"></i> Thu Tiền Học Phí Tháng
              </h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowPayModal(false);
                  setEReceiptData(null);
                }}
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>

            <div className="modal-body">
              {!eReceiptData ? (
                <div>
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #FFCA29',
                      borderRadius: '10px',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ margin: '0 0 0.25rem 0', color: '#64748b' }}>Số tiền cần thu đợt này:</p>
                    <strong style={{ fontSize: '1.6rem', color: '#085E8A', fontWeight: '900' }}>
                      {Number(payInvoice.totalToPay || 0).toLocaleString('vi-VN')}đ
                    </strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Học viên: <strong>{payInvoice.studentName}</strong> | Lớp: {payInvoice.classCode}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label style={{ fontWeight: '700', marginBottom: '0.4rem', display: 'block' }}>
                      Hình thức thanh toán:
                    </label>
                    <select
                      className="form-control"
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value)}
                      style={{ padding: '0.6rem', fontWeight: '600' }}
                    >
                      <option value="Chuyển khoản">Chuyển khoản Ngân hàng (MB Bank)</option>
                      <option value="Tiền mặt">Tiền mặt tại quầy</option>
                      <option value="Quẹt thẻ">Quẹt thẻ POS</option>
                    </select>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', padding: '0.85rem', fontWeight: '800', fontSize: '1.05rem' }}
                    onClick={handlePayInvoice}
                  >
                    <i className="fa-solid fa-circle-check"></i> Xác Nhận Thu Tiền & In Biên Lai
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div
                    ref={receiptRef}
                    style={{
                      background: '#fff',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                      position: 'relative',
                      width: '100%',
                      margin: '0 auto',
                    }}
                  >
                    <div
                      style={{
                        height: '6px',
                        background: 'linear-gradient(90deg, #0D88C4 0%, #0D88C4 60%, #FFCA29 60%, #FFCA29 100%)',
                      }}
                    ></div>

                    <div
                      style={{
                        padding: '1.5rem 1.75rem',
                        textAlign: 'left',
                        color: '#1E293B',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.25rem', gap: '1rem' }}>
                        <img
                          src="/logo.png"
                          alt="Anh ngữ Nhật Mỹ"
                          style={{ height: '54px', width: 'auto', objectFit: 'contain' }}
                          crossOrigin="anonymous"
                        />
                        <div style={{ flex: 1, textAlign: 'center', paddingRight: '10px' }}>
                          <h2
                            style={{
                              margin: '0 0 0.35rem 0',
                              color: '#085E8A',
                              fontSize: '1.25rem',
                              fontWeight: '900',
                              letterSpacing: '0.5px',
                            }}
                          >
                            ANH NGỮ NHẬT MỸ
                          </h2>
                          <div
                            style={{
                              display: 'inline-block',
                              background: '#FFCA29',
                              color: '#085E8A',
                              padding: '0.2rem 0.85rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: '800',
                              letterSpacing: '0.5px',
                            }}
                          >
                            PHIẾU THU ĐIỆN TỬ
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          margin: '1rem 0',
                          borderTop: '2px dashed #E2E8F0',
                          borderBottom: '2px dashed #E2E8F0',
                          padding: '0.85rem 0',
                          fontSize: '0.95rem',
                          lineHeight: '1.7',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Học viên:</span>
                          <strong style={{ color: '#085E8A', fontSize: '1.05rem' }}>
                            {eReceiptData.studentName.toUpperCase()}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Tháng thu:</span>
                          <strong style={{ color: '#085E8A' }}>Tháng {eReceiptData.monthYear}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Ngày lập:</span>
                          <span>
                            {eReceiptData.date} {eReceiptData.time}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Hình thức:</span>
                          <span style={{ fontWeight: '700', color: '#0f172a' }}>{eReceiptData.paymentMethod}</span>
                        </div>
                      </div>

                      <div style={{ margin: '0.75rem 0', fontSize: '0.95rem', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí cần đóng:</span>
                          <span>{Number(eReceiptData.oldDebt || 0).toLocaleString('vi-VN')}đ</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí đóng đợt này:</span>
                          <span style={{ fontWeight: 'bold', color: '#0D88C4' }}>
                            + {Number(eReceiptData.tuitionPaid || 0).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#475569' }}>Học phí còn lại:</span>
                          <span
                            style={{
                              fontWeight: 'bold',
                              color: Number(eReceiptData.remainingDebt || 0) > 0 ? '#E11D48' : '#10B981',
                            }}
                          >
                            {Number(eReceiptData.remainingDebt || 0).toLocaleString('vi-VN')}đ{' '}
                            {Number(eReceiptData.remainingDebt || 0) === 0 ? '(Đã hoàn tất)' : ''}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: '1rem',
                          background: '#FFFBEB',
                          border: '2px solid #FFCA29',
                          borderRadius: '10px',
                          padding: '0.85rem 1rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontWeight: '800', fontSize: '1rem', color: '#085E8A' }}>TỔNG THU ĐỢT NÀY:</span>
                        <span style={{ fontWeight: '900', fontSize: '1.35rem', color: '#0D88C4' }}>
                          {Number(eReceiptData.totalPaid || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                      className="btn"
                      style={{
                        background: '#085E8A',
                        color: '#fff',
                        padding: '0.75rem 1.25rem',
                        fontWeight: '800',
                        fontSize: '0.95rem',
                        flex: 1,
                      }}
                      onClick={copyReceiptImage}
                      disabled={copyingReceipt}
                    >
                      {copyingReceipt ? (
                        <>
                          <i className="fa-solid fa-spinner fa-spin"></i> Đang copy...
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-copy"></i> Copy Ảnh (Dán Zalo)
                        </>
                      )}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.75rem 1.25rem', fontWeight: '700' }}
                      onClick={downloadReceiptImage}
                    >
                      <i className="fa-solid fa-download"></i> Tải Ảnh
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
