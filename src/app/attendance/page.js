'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AttendancePage() {
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [classNotes, setClassNotes] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [copySuccess, setCopySuccess] = useState('');
  
  // Giáo viên dạy thay
  const [teachers, setTeachers] = useState([]);
  const [sessionTeacherId, setSessionTeacherId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isSubstitute, setIsSubstitute] = useState(false);
  const [classSessionNumber, setClassSessionNumber] = useState(1);

  // Nội dung bài học & Bài tập về nhà (Sprint 1)
  const [lessonContent, setLessonContent] = useState({
    vocabularyTopic: '',
    grammarTopic: '',
    readingTopic: '',
    hwWbPages: '',
    hwCopyLines: '',
    hwVideoDeadline: '',
    hwOther: '',
  });

  // State AI Modal (Sprint 3)
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStudent, setAiStudent] = useState(null);
  const [aiMessage, setAiMessage] = useState('');
  const [aiTone, setAiTone] = useState('encouraging');
  const [aiSource, setAiSource] = useState('');
  
  // Validation State (Chặn Điểm danh)
  const [isDateValid, setIsDateValid] = useState(true);
  const [validationMsg, setValidationMsg] = useState('');
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayName, setHolidayName] = useState('');

  // Tải danh sách lớp học
  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const result = await res.json();
      if (result.success) {
        setClasses(result.data);
        if (result.data.length > 0) {
          // Lấy mã lớp từ query param nếu có
          const urlParams = new URLSearchParams(window.location.search);
          const classParam = urlParams.get('classCode');
          if (classParam && result.data.some(c => c.code === classParam)) {
            setSelectedClass(classParam);
          }
        }
      }
    } catch (e) {
      console.error('Không thể tải lớp học:', e);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/users');
      const result = await res.json();
      if (result.success) {
        setTeachers(result.data.filter(u => u.role === 'TEACHER' || u.role === 'DIRECTOR' || u.role === 'MANAGER'));
      }
    } catch (e) {
      console.error('Lỗi tải ds giáo viên:', e);
    }
  };

  // Tải danh sách điểm danh dựa vào Lớp và Ngày
  const fetchAttendance = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`/api/attendance?classCode=${selectedClass}&date=${selectedDate}`);
      const result = await res.json();
      if (result.success) {
        setAttendanceData(result.data.records || []);
        setClassSessionNumber(result.data.classSessionNumber || 1);
        setClassNotes(result.data.classNotes || '');
        setIsHoliday(!!result.data.isHoliday);
        setHolidayName(result.data.holidayName || '');
        setSessionTeacherId(result.data.teacherId || '');
        setIsSubstitute(!!result.data.isSubstitute);
        setLessonContent({
          vocabularyTopic: result.data.vocabularyTopic || '',
          grammarTopic: result.data.grammarTopic || '',
          readingTopic: result.data.readingTopic || '',
          hwWbPages: result.data.hwWbPages || '',
          hwCopyLines: result.data.hwCopyLines || '',
          hwVideoDeadline: result.data.hwVideoDeadline || '',
          hwOther: result.data.hwOther || '',
        });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (e) {
      console.error('Lỗi khi lấy thông tin điểm danh:', e);
      setMessage({ type: 'error', text: 'Kết nối API thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) setUserRole(data.data.role);
      });
  }, []);

  useEffect(() => {
    fetchAttendance();
  }, [selectedClass, selectedDate]);

  // LUỒNG KIỂM TRA QUY TẮC CHẶN ĐIỂM DANH (Strict Attendance Rule)
  useEffect(() => {
    if (!selectedClass || !selectedDate) return;
    
    const clsInfo = classes.find(c => c.code === selectedClass);
    if (!clsInfo) return;

    const targetDate = new Date(selectedDate);
    targetDate.setHours(0,0,0,0);
    const dayOfWeek = targetDate.getDay();

    // 1. Kiểm tra Lịch học (scheduleRaw: "24", "35"...)
    const schedule = clsInfo.scheduleRaw || '';
    const allowedDays = [];
    const vietnameseDays = [];

    if (schedule.includes('2')) { allowedDays.push(1); vietnameseDays.push('Thứ 2'); }
    if (schedule.includes('3')) { allowedDays.push(2); vietnameseDays.push('Thứ 3'); }
    if (schedule.includes('4')) { allowedDays.push(3); vietnameseDays.push('Thứ 4'); }
    if (schedule.includes('5')) { allowedDays.push(4); vietnameseDays.push('Thứ 5'); }
    if (schedule.includes('6')) { allowedDays.push(5); vietnameseDays.push('Thứ 6'); }
    if (schedule.includes('7')) { allowedDays.push(6); vietnameseDays.push('Thứ 7'); }
    if (schedule.includes('8') || schedule.includes('CN') || schedule.toUpperCase().includes('C')) { allowedDays.push(0); vietnameseDays.push('Chủ Nhật'); }

    // Kiểm tra xem ngày chọn có rơi đúng lịch học tuần không
    const matchesSchedule = allowedDays.includes(dayOfWeek);

    // 2. Kiểm tra khoảng thời gian (startDate -> expectedEndDate)
    // Chuyển đổi định dạng ngày DD/MM/YYYY từ API thành Date
    const parseAPIDate = (isoStr, formattedStr) => {
      if (isoStr) return new Date(isoStr);
      if (!formattedStr) return new Date();
      const parts = formattedStr.split('/');
      if (parts.length === 3) {
        return new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
      }
      return new Date(formattedStr);
    };

    const startDate = parseAPIDate(clsInfo.startDateIso, clsInfo.startDate);
    startDate.setHours(0,0,0,0);
    
    const endDate = parseAPIDate(clsInfo.expectedEndDateIso, clsInfo.expectedEndDate);
    endDate.setHours(23,59,59,999);

    const isAfterStart = targetDate >= startDate;

    if (isHoliday) {
      setIsDateValid(false);
      setValidationMsg(`Hôm nay là ngày nghỉ: ${holidayName || 'Ngày lễ'}, không thể điểm danh.`);
    } else if (!matchesSchedule) {
      setIsDateValid(false);
      setValidationMsg(`Lớp học này chỉ có lịch dạy vào [${vietnameseDays.join(', ')}]. Vui lòng chọn đúng thứ học.`);
    } else if (!isAfterStart) {
      setIsDateValid(false);
      setValidationMsg(`Ngày chọn điểm danh không được trước ngày khai giảng (${clsInfo.startDate}).`);
    } else {
      setIsDateValid(true);
      setValidationMsg('');
    }

    // 2. Quy tắc khóa sổ Điểm danh sau 2 ngày theo lịch
    const midnightSelected = new Date(`${selectedDate}T00:00:00`);
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    // Tính khoảng cách số ngày giữa ngày hiện tại và ngày học
    const diffDays = Math.round((todayMidnight - midnightSelected) / (1000 * 60 * 60 * 24));
    
    // Bỏ qua khóa đối với Quản lý (chỉ Giáo viên mới bị khóa sau 2 ngày)
    const isTeacherRole = !userRole || userRole === 'TEACHER' || userRole.includes('TEACHER');
    const locked = isTeacherRole ? (diffDays > 2) : false;
    setIsLocked(locked);

  }, [selectedClass, selectedDate, classes, isHoliday, holidayName, userRole]);

  // Xử lý thay đổi nhanh trạng thái điểm danh cho 1 học sinh
  const handleStatusChange = (studentId, newStatus) => {
    setAttendanceData(prev => 
      prev.map(row => 
        row.id === studentId 
          ? { 
              ...row, 
              status: newStatus,
              teacherNotes: newStatus === 'Vắng không phép' ? '' : row.teacherNotes,
              checkInTime: newStatus !== 'Có mặt' ? '' : row.checkInTime
            } 
          : row
      )
    );
  };

  // Xử lý ghi chú giáo viên hoặc thời gian đi trễ
  const handleDetailChange = (studentId, field, value) => {
    setAttendanceData(prev => 
      prev.map(row => 
        row.id === studentId ? { ...row, [field]: value } : row
      )
    );
  };

  // Nút Điểm danh nhanh tất cả "Có mặt"
  const markAllPresent = () => {
    setAttendanceData(prev => 
      prev.map(row => ({ ...row, status: 'Có mặt' }))
    );
  };

  // Xác nhận lưu điểm danh vào DB
  const saveAttendance = async () => {
    if (!selectedClass || !selectedDate || !isDateValid || isLocked) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    const records = attendanceData.map(row => ({
      studentId: row.id,
      leadId: row.leadId || null,
      isTrial: !!row.isTrial,
      status: row.status === 'Chưa điểm danh' ? 'Có mặt' : row.status,
      checkInTime: row.checkInTime,
      teacherNotes: row.teacherNotes,
      missingWb: !!row.missingWb,
      missingVideo: !!row.missingVideo,
      copyError: !!row.copyError,
      adjustmentNotes: row.adjustmentNotes || null,
    }));

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classCode: selectedClass,
          date: selectedDate,
          records,
          classNotes,
          teacherId: sessionTeacherId,
          isSubstitute,
          ...lessonContent,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setMessage({ type: 'success', text: 'Đã lưu điểm danh và nội dung bài học thành công! Đang quay lại...' });
        setTimeout(() => {
          router.back();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: result.error || 'Có lỗi xảy ra.' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Không thể kết nối đến máy chủ.' });
    } finally {
      setSaving(false);
    }
  };

  // Tạo nội dung Báo cáo Zalo cho cả lớp (3 khối chuẩn)
  const generateClassReport = () => {
    const cls = classes.find(c => c.code === selectedClass);
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dateVN = dateObj.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    const totalSessions = cls?.totalSessions || '?';
    const sessionsDone = classSessionNumber;
    const absentList = attendanceData.filter(r => r.status === 'Vắng không phép' || r.status === 'Vắng có phép');

    let report = `📢 *BÁO CÁO HỌC TẬP LỚP ${selectedClass} \u2014 ${dateVN} (BUỔI ${sessionsDone}/${totalSessions})*`;

    // Helper to get friendly name
    const getShortName = (name) => {
      if (!name) return '';
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2 
        ? parts.slice(-2).map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ') 
        : name;
    };

    // KHỐI 1: Kiểm tra BTVN cũ
    const wbViolators = attendanceData.filter(r => r.missingWb);
    const videoViolators = attendanceData.filter(r => r.missingVideo);
    const copyViolators = attendanceData.filter(r => r.copyError);
    const studentsWithNotes = attendanceData.filter(r => (r.missingWb || r.missingVideo || r.copyError) && r.adjustmentNotes);
    const hasViolations = wbViolators.length > 0 || videoViolators.length > 0 || copyViolators.length > 0;

    if (hasViolations || absentList.length > 0) {
      report += `\n\n1️⃣ *KIỂM TRA BTVN CŨ:*`;
      if (absentList.length > 0) {
        report += `\n\n👤 *Học sinh vắng mặt:* ${absentList.map(r => getShortName(r.name)).join(', ')}`;
      }
      if (wbViolators.length > 0) {
        report += `\n\n• Chưa hoàn thành Workbook: ${wbViolators.map(r => getShortName(r.name)).join(', ')}`;
      }
      if (videoViolators.length > 0) {
        report += `\n• Chưa nộp Video: ${videoViolators.map(r => getShortName(r.name)).join(', ')}`;
      }
      if (copyViolators.length > 0) {
        report += `\n• Lỗi Copy/Thiếu bài: ${copyViolators.map(r => getShortName(r.name)).join(', ')}`;
      }
      if (studentsWithNotes.length > 0) {
        report += `\n\n*Chi tiết cần điều chỉnh:*`;
        studentsWithNotes.forEach((r, i) => {
          report += `\n${i + 1}/ *${getShortName(r.name)}:*`;
          const lines = r.adjustmentNotes.split('\n').filter(l => l.trim());
          lines.forEach(line => { report += `\n- ${line.trim()}`; });
        });
      }
      report += `\n\n👉 *Ba Mẹ nhắc các bé hoàn thành đầy đủ và kiểm tra sách trước khi đi học giúp cô ạ.*`;
    }

    // KHỐI 2: Nội dung bài học
    if (lessonContent.vocabularyTopic || lessonContent.grammarTopic || lessonContent.readingTopic || classNotes) {
      report += `\n\n2️⃣ *NỘI DUNG BÀI HỌC:*`;
      if (lessonContent.vocabularyTopic) report += `\n• Ôn từ vựng: ${lessonContent.vocabularyTopic}`;
      if (lessonContent.grammarTopic) report += `\n• Ôn cấu trúc: ${lessonContent.grammarTopic}`;
      if (lessonContent.readingTopic) report += `\n• Bài đọc: ${lessonContent.readingTopic}`;
      if (classNotes) report += `\n• *Nhận xét:* ${classNotes}`;
    }

    // KHỐI 3: BTVN mới
    if (lessonContent.hwWbPages || lessonContent.hwCopyLines || lessonContent.hwVideoDeadline || lessonContent.hwOther) {
      report += `\n\n3️⃣ *BTVN & Copy (mới):*`;
      if (lessonContent.hwWbPages) report += `\n• Hoàn thành Workbook: ${lessonContent.hwWbPages}`;
      if (lessonContent.hwCopyLines) report += `\n• Copy: ${lessonContent.hwCopyLines}`;
      if (lessonContent.hwVideoDeadline) report += `\n• Nộp Video trước: ${lessonContent.hwVideoDeadline}`;
      if (lessonContent.hwOther) report += `\n• Khác: ${lessonContent.hwOther}`;
    }

    report += `\n\nCô chân thành cảm ơn Quý Phụ huynh đã luôn đồng hành và hỗ trợ các con! ❤️\nAnh ngữ Nhật Mỹ`;
    return report;
  };
  // Mở modal AI Soạn tin (Sprint 3)
  const openAiModal = (row) => {
    setAiStudent(row);
    setShowAiModal(true);
    generateAiReport(row, aiTone);
  };

  const generateAiReport = async (studentRow, toneOverride) => {
    if (!studentRow) return;
    setAiLoading(true);
    try {
      const res = await fetch('/api/ai/suggest-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: studentRow.name,
          status: studentRow.status,
          teacherNotes: studentRow.teacherNotes,
          missingWb: studentRow.missingWb,
          missingVideo: studentRow.missingVideo,
          copyError: studentRow.copyError,
          adjustmentNotes: studentRow.adjustmentNotes,
          lessonContent,
          type: 'session',
          tone: toneOverride || aiTone,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setAiMessage(json.data);
        setAiSource(json.source);
      } else {
        setAiMessage('Không thể tạo tin nhắn AI. Lỗi: ' + json.error);
      }
    } catch (e) {
      setAiMessage('Lỗi kết nối khi tạo tin nhắn AI.');
    } finally {
      setAiLoading(false);
    }
  };

  // Tạo nội dung Báo cáo Cá nhân cho từng phụ huynh (Phần chung + Phần riêng tư)
  const generatePersonalReport = (row) => {
    const cls = classes.find(c => c.code === selectedClass);
    const dateObj = new Date(selectedDate + 'T12:00:00');
    const dateVN = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const sessionsDone = row.totalPresent + row.totalAbsent + 1;
    const totalSessions = cls?.totalSessions || '?';
    // Lấy tên gọi thân mật (2 chữ cuối)
    const nameParts = row.name.trim().split(/\s+/);
    const shortName = nameParts.length >= 2 ? nameParts.slice(-2).join(' ') : row.name;
    const isPresent = row.status === 'Có mặt' || row.status === 'Chưa điểm danh';

    let msg = `Chào Ba/Mẹ bé ${shortName} ạ! ❤️\n`;
    msg += `Hôm nay ${dateVN}, lớp ${selectedClass} — Buổi ${sessionsDone}/${totalSessions}.\n`;

    // PHẦN CHUNG: Nội dung bài học
    if (lessonContent.vocabularyTopic || lessonContent.grammarTopic || lessonContent.readingTopic) {
      msg += `\n📚 NỘI DUNG BÀI HỌC:`;
      if (lessonContent.vocabularyTopic) msg += `\n  • Từ vựng: ${lessonContent.vocabularyTopic}`;
      if (lessonContent.grammarTopic) msg += `\n  • Cấu trúc: ${lessonContent.grammarTopic}`;
      if (lessonContent.readingTopic) msg += `\n  • Bài đọc: ${lessonContent.readingTopic}`;
      if (classNotes) msg += `\n  • Nhận xét lớp: ${classNotes}`;
    }

    // PHẦN RIÊNG: Thông tin cá nhân của học sinh
    msg += `\n\n👤 TÌNH HÌNH RIÊNG CỦA BÉ ${shortName.toUpperCase()}:`;
    msg += isPresent
      ? `\n  ✅ Có mặt đầy đủ.`
      : `\n  ❌ Vắng mặt (${row.status}).`;

    if (row.teacherNotes) msg += `\n  💬 Nhận xét GV: "${row.teacherNotes}"`;

    const hasViolations = row.missingWb || row.missingVideo || row.copyError;
    if (hasViolations) {
      msg += `\n\n  ⚠️ CẦN ĐIỀU CHỈNH:`;
      if (row.missingWb) msg += `\n  • Chưa hoàn thành Workbook`;
      if (row.missingVideo) msg += `\n  • Chưa nộp Video`;
      if (row.copyError) msg += `\n  • Lỗi Copy/Vi phạm khác`;
      if (row.adjustmentNotes) {
        msg += `\n\n  Chi tiết GV ghi chú:`;
        row.adjustmentNotes.split('\n').filter(l => l.trim()).forEach(line => {
          msg += `\n  - ${line.trim()}`;
        });
      }
    } else {
      msg += `\n  🌟 Con học chăm chỉ và hoàn thành bài tập đầy đủ. Ba/Mẹ thưởng cho con lời khen nhé!`;
    }

    // PHẦN CHUNG: BTVN mới
    if (lessonContent.hwWbPages || lessonContent.hwCopyLines || lessonContent.hwVideoDeadline || lessonContent.hwOther) {
      msg += `\n\n📝 BTVN BUỔI TỚI:`;
      if (lessonContent.hwWbPages) msg += `\n  • WB: ${lessonContent.hwWbPages}`;
      if (lessonContent.hwCopyLines) msg += `\n  • Copy: ${lessonContent.hwCopyLines}`;
      if (lessonContent.hwVideoDeadline) msg += `\n  • Nộp Video trước: ${lessonContent.hwVideoDeadline}`;
      if (lessonContent.hwOther) msg += `\n  • Khác: ${lessonContent.hwOther}`;
    }

    msg += `\n\nCảm ơn Ba/Mẹ luôn đồng hành cùng con ạ! 🌟\nAnh ngữ Nhật Mỹ ❤️`;
    return msg;
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(key);
      setTimeout(() => setCopySuccess(''), 2000);
    });
  };

  return (
    <div className="attendance-page-container">
      {/* Header */}
      <div className="page-header-actions">
        <div>
          <h1>Điểm danh & Nhật ký lớp</h1>
          <p>Ghi nhận sỹ số chuyên cần của học viên. Hệ thống tự động chặn điểm danh lệch lịch học lớp.</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="control-panel glass-panel">
        <div className="select-fields">
          <div className="form-group-horizontal">
            <label htmlFor="class-select"><i className="fa-solid fa-school"></i> Lớp học:</label>
            <ClassSelect id="class-select" classes={classes} value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} placeholder="-- Chọn lớp học cần điểm danh --" />
          </div>

          <div className="form-group-horizontal">
            <label htmlFor="date-select"><i className="fa-solid fa-calendar-day"></i> Ngày học:</label>
            <input 
              type="date" 
              id="date-select" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {attendanceData.length > 0 && !loading && isDateValid && !isLocked && (
          <button className="btn btn-secondary btn-sm" onClick={markAllPresent}>
            <i className="fa-solid fa-check-double"></i> Điểm danh nhanh Có mặt
          </button>
        )}
      </div>

      {/* CẢNH BÁO QUY TẮC KHÓA SỔ 48 GIỜ */}
      {isLocked && (
        <div className="alert-box alert-error animated-scale" style={{ margin: '0' }}>
          <i className="fa-solid fa-lock"></i>
          <strong>ĐÃ KHÓA SỔ:</strong> Hệ thống đã khóa sổ sau 2 ngày (Kể từ ngày học). Vui lòng liên hệ Giám đốc để điều chỉnh dữ liệu.
        </div>
      )}

      {/* CẢNH BÁO QUY TẮC CHẶN ĐIỂM DANH */}
      {!isLocked && !isDateValid && !isHoliday && (
        <div className="alert-box alert-error animated-scale" style={{ margin: '0' }}>
          <i className="fa-solid fa-ban"></i>
          <strong>ĐÃ VÔ HIỆU HÓA:</strong> {validationMsg}
        </div>
      )}

      {message.text && (
        <div className={`alert-box alert-${message.type}`}>
          <i className={message.type === 'success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation'}></i>
          <span>{message.text}</span>
        </div>
      )}

      {selectedClass && !isHoliday && !userRole?.includes('TEACHER') && (
        <>
          <div className="teacher-assignment card glass-panel">
            <h3 className="section-title"><i className="fa-solid fa-chalkboard-user"></i> Phân công giáo viên đứng lớp</h3>
            <div className="teacher-form">
              <div className="form-group">
                <label>Giáo viên phụ trách buổi này</label>
                <select 
                  value={sessionTeacherId} 
                  onChange={(e) => {
                    setSessionTeacherId(e.target.value);
                    setIsSubstitute(true); 
                  }}
                  disabled={isLocked}
                >
                  <option value="">-- Chưa xác định --</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName} ({t.username})</option>
                  ))}
                </select>
              </div>
              <div className="form-group checkbox-group" style={{marginTop: '25px'}}>
                <label>
                  <input 
                    type="checkbox" 
                    checked={isSubstitute}
                    onChange={(e) => setIsSubstitute(e.target.checked)}
                    disabled={isLocked}
                  /> 
                  Là giáo viên dạy thay (Tính thù lao dạy thay)
                </label>
              </div>
            </div>
          </div>
        </>
      )}

      {/* NỘI DUNG BÀI HỌC & BÀI TẬP VỀ NHÀ */}
      {attendanceData.length > 0 && !loading && (
        <div className="class-notes-panel glass-panel animated-scale" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Nội dung bài học */}
          <div>
            <label style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <i className="fa-solid fa-book-open-reader"></i> Nội dung bài học buổi này
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>Từ vựng / Hoạt động</label>
                <textarea rows={2} style={{ resize: 'vertical' }} className="detail-text-input" placeholder="VD: Unit 5 - Animals" value={lessonContent.vocabularyTopic} onChange={e => setLessonContent(p => ({...p, vocabularyTopic: e.target.value}))} disabled={isLocked || !isDateValid} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>Cấu trúc ngữ pháp</label>
                <textarea rows={2} style={{ resize: 'vertical' }} className="detail-text-input" placeholder="VD: Present Continuous" value={lessonContent.grammarTopic} onChange={e => setLessonContent(p => ({...p, grammarTopic: e.target.value}))} disabled={isLocked || !isDateValid} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>Bài đọc / Câu chuyện</label>
                <textarea rows={2} style={{ resize: 'vertical' }} className="detail-text-input" placeholder="VD: The Lion and the Mouse" value={lessonContent.readingTopic} onChange={e => setLessonContent(p => ({...p, readingTopic: e.target.value}))} disabled={isLocked || !isDateValid} />
              </div>
            </div>
          </div>

          {/* Bài tập về nhà */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <label style={{ fontWeight: '800', fontSize: '0.95rem', color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <i className="fa-solid fa-pencil"></i> Bài tập về nhà
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.6rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>Trang Workbook</label>
                <textarea rows={2} style={{ resize: 'vertical' }} className="detail-text-input" placeholder="VD: trang 28-29" value={lessonContent.hwWbPages} onChange={e => setLessonContent(p => ({...p, hwWbPages: e.target.value}))} disabled={isLocked || !isDateValid} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>Số dòng Copy</label>
                <textarea rows={2} style={{ resize: 'vertical' }} className="detail-text-input" placeholder="VD: 10 dòng" value={lessonContent.hwCopyLines} onChange={e => setLessonContent(p => ({...p, hwCopyLines: e.target.value}))} disabled={isLocked || !isDateValid} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>Hạn nộp Video</label>
                <textarea rows={2} style={{ resize: 'vertical' }} className="detail-text-input" placeholder="VD: Trước CN 20/07" value={lessonContent.hwVideoDeadline} onChange={e => setLessonContent(p => ({...p, hwVideoDeadline: e.target.value}))} disabled={isLocked || !isDateValid} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '0.25rem', display: 'block' }}>Yêu cầu khác</label>
                <textarea rows={2} style={{ resize: 'vertical' }} className="detail-text-input" placeholder="VD: Chuẩn bị SGK bài 6" value={lessonContent.hwOther} onChange={e => setLessonContent(p => ({...p, hwOther: e.target.value}))} disabled={isLocked || !isDateValid} />
              </div>
            </div>
          </div>

          {/* Nhận xét chung lớp */}
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
            <label style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <i className="fa-solid fa-comments"></i> Nhận xét chung về tinh thần lớp
            </label>
            <textarea placeholder="Ghi nhận tình hình học tập tổng thể của lớp trong buổi học này..." value={classNotes} onChange={(e) => setClassNotes(e.target.value)} disabled={isLocked || !isDateValid} rows={2} className="detail-text-input" style={{ height: 'auto', fontSize: '0.9rem', resize: 'vertical' }} />
          </div>

          {/* Nút Copy Báo cáo Lớp */}
          {attendanceData.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => copyToClipboard(generateClassReport(), 'class')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.1rem', borderRadius: '8px', border: 'none', background: copySuccess === 'class' ? 'var(--color-success)' : 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                <i className={copySuccess === 'class' ? 'fa-solid fa-check' : 'fa-brands fa-whatsapp'}></i>
                {copySuccess === 'class' ? 'Đã copy!' : '📋 Copy Báo cáo Lớp (Zalo)'}
              </button>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>Bấm copy → Paste vào nhóm Zalo của lớp</span>
            </div>
          )}
        </div>
      )}

      {/* Attendance Grid */}
      <div className={`table-container glass-panel ${(!isDateValid || isLocked) ? 'opacity-disabled' : ''}`}>
        {loading ? (
          <div className="loading-state">
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>Đang tải danh sách học viên lớp...</p>
          </div>
        ) : !selectedClass ? (
          <div className="empty-table-state">
            <i className="fa-solid fa-school-circle-xmark"></i>
            <p>Vui lòng tạo lớp học và xếp học viên trước.</p>
          </div>
        ) : isHoliday ? (
          <div className="holiday-state" style={{ padding: '4rem 2rem', textAlign: 'center', background: 'rgba(245, 158, 11, 0.1)', border: '2px dashed var(--color-warning)', borderRadius: '12px', margin: '1rem' }}>
            <i className="fa-solid fa-mug-hot" style={{ fontSize: '3rem', color: 'var(--color-warning)', marginBottom: '1rem' }}></i>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--color-warning)', marginBottom: '0.5rem' }}>HÔM NAY LỚP NGHỈ</h2>
            <p style={{ fontSize: '1rem', color: 'var(--color-text)', fontWeight: '600' }}>Lý do: {holidayName}</p>
          </div>
        ) : attendanceData.length === 0 ? (
          <div className="empty-table-state">
            <i className="fa-solid fa-users-slash"></i>
            <p>Chưa có học viên nào được xếp vào lớp này.</p>
          </div>
        ) : (
          <>
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Mã HV</th>
                  <th style={{ width: '150px' }}>Họ và Tên</th>
                  <th style={{ textAlign: 'center', width: '70px' }} title="Đi học (Có mặt)">Có mặt</th>
                  <th style={{ textAlign: 'center', width: '70px' }} title="Vắng có phép">V.Phép</th>
                  <th style={{ textAlign: 'center', width: '70px' }} title="Vắng không phép">V.K.Phép</th>
                  <th style={{ textAlign: 'center', width: '60px' }} title="Thiếu Workbook">WB</th>
                  <th style={{ textAlign: 'center', width: '60px' }} title="Thiếu Video">Vid</th>
                  <th style={{ textAlign: 'center', width: '60px' }} title="Lỗi Copy">Copy</th>
                  <th style={{ minWidth: '180px' }}>📋 Cần điều chỉnh</th>
                  <th style={{ minWidth: '280px' }}>Nhận xét của Giáo viên (buổi này)</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Chuyên cần khóa học</th>
                  <th style={{ textAlign: 'center', position: 'sticky', right: 0, background: 'var(--color-surface)', zIndex: 5, boxShadow: '-4px 0 10px rgba(0,0,0,0.08)', minWidth: '170px' }}>⚡ Thao Tác & AI</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((row) => (
                  <tr key={row.id} className={`table-row ${row.isTrial ? 'trial-student-row' : ''}`} style={row.isTrial ? { background: 'rgba(245, 158, 11, 0.04)' } : {}}>
                    <td className="std-id">
                      {row.isTrial ? (
                        <span className="status-badge-profile bg-warning-light" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                          <i className="fa-solid fa-clock"></i> {row.id}
                        </span>
                      ) : (
                        row.id
                      )}
                    </td>
                    <td className="std-name">
                      {row.name}
                      {row.isTrial && (
                        <span className="status-badge-profile bg-warning-light" style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: '700', border: '1px dashed var(--color-warning)' }} title="Học viên tiềm năng đang học thử">
                          <i className="fa-solid fa-graduation-cap"></i> Học thử
                        </span>
                      )}
                    </td>
                    
                    {/* Có mặt */}
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="radio" 
                        name={`attendance-${row.id}`} 
                        checked={row.status === 'Có mặt' || row.status === 'Chưa điểm danh'} 
                        onChange={() => handleStatusChange(row.id, 'Có mặt')}
                        disabled={!isDateValid || isLocked}
                        className="radio-present"
                      />
                    </td>

                    {/* Vắng có phép */}
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="radio" 
                        name={`attendance-${row.id}`} 
                        checked={row.status === 'Vắng có phép'} 
                        onChange={() => handleStatusChange(row.id, 'Vắng có phép')}
                        disabled={!isDateValid || isLocked}
                        className="radio-excused"
                      />
                    </td>

                    {/* Vắng không phép */}
                    <td style={{ textAlign: 'center' }}>
                      <input 
                        type="radio" 
                        name={`attendance-${row.id}`} 
                        checked={row.status === 'Vắng không phép'} 
                        onChange={() => handleStatusChange(row.id, 'Vắng không phép')}
                        disabled={!isDateValid || isLocked}
                        className="radio-absent"
                      />
                    </td>

                    {/* Vi phạm bài tập */}
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!row.missingWb} onChange={e => handleDetailChange(row.id, 'missingWb', e.target.checked)} disabled={!isDateValid || isLocked} style={{ width: '18px', height: '18px', accentColor: 'var(--color-danger)', cursor: 'pointer' }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!row.missingVideo} onChange={e => handleDetailChange(row.id, 'missingVideo', e.target.checked)} disabled={!isDateValid || isLocked} style={{ width: '18px', height: '18px', accentColor: 'var(--color-danger)', cursor: 'pointer' }} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={!!row.copyError} onChange={e => handleDetailChange(row.id, 'copyError', e.target.checked)} disabled={!isDateValid || isLocked} style={{ width: '18px', height: '18px', accentColor: 'var(--color-danger)', cursor: 'pointer' }} />
                    </td>

                    {/* Cần điều chỉnh (thay thế Thời gian đi trễ) */}
                    <td style={{ minWidth: '180px' }}>
                      {(row.missingWb || row.missingVideo || row.copyError) ? (
                        <textarea
                          placeholder={`WB: ...\nVideo: ...\nCopy: ...`}
                          value={row.adjustmentNotes || ''}
                          onChange={(e) => handleDetailChange(row.id, 'adjustmentNotes', e.target.value)}
                          disabled={!isDateValid || isLocked}
                          rows={3}
                          className="detail-text-input"
                          style={{ height: 'auto', fontSize: '0.8rem', lineHeight: '1.45', resize: 'vertical', minHeight: '60px' }}
                        />
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>Tick vi phạm để nhập chi tiết</span>
                      )}
                    </td>

                    {/* Nhận xét giáo viên */}
                    <td>
                      <textarea 
                        placeholder={
                          row.status === 'Vắng không phép' 
                            ? 'Không nhận xét khi vắng không phép' 
                            : row.status === 'Vắng có phép' 
                              ? 'Nhập lý do xin nghỉ...' 
                              : 'Nhận xét bài học...'
                        } 
                        value={row.teacherNotes || ''}
                        onChange={(e) => handleDetailChange(row.id, 'teacherNotes', e.target.value)}
                        disabled={!isDateValid || isLocked || row.status === 'Vắng không phép'}
                        className="detail-text-input"
                        rows={2}
                        style={{ height: 'auto', resize: 'vertical', width: '100%', minWidth: '200px' }}
                      />
                    </td>

                    {/* Số buổi cộng dồn */}
                    <td style={{ textAlign: 'center' }}>
                      <span className="accumulated-badge">
                        <span className="text-success" title="Số buổi đi học (Có mặt)">{row.totalPresent}</span>
                        <span className="separator">/</span>
                        <span style={{ color: 'var(--color-primary-dark)', fontWeight: 'bold' }} title="Tổng số buổi đã điểm danh">{row.totalPresent + row.totalAbsent}</span>
                      </span>
                    </td>

                    {/* Nút Copy tin phụ huynh & AI Soạn tin (Sticky Right) */}
                    <td style={{ textAlign: 'center', whiteSpace: 'nowrap', position: 'sticky', right: 0, background: 'var(--color-surface)', zIndex: 5, boxShadow: '-4px 0 10px rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        <button
                          title="Copy tin nhắn chuẩn"
                          onClick={() => copyToClipboard(generatePersonalReport(row), `personal_${row.id}`)}
                          style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', background: copySuccess === `personal_${row.id}` ? 'var(--color-success)' : 'linear-gradient(135deg,#25D366,#128C7E)', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                        >
                          <i className={copySuccess === `personal_${row.id}` ? 'fa-solid fa-check' : 'fa-solid fa-copy'}></i>
                          {copySuccess === `personal_${row.id}` ? 'Copied!' : 'Copy PH'}
                        </button>

                        <button
                          title="Trợ lý AI soạn tin nhắn cá nhân hóa"
                          onClick={() => openAiModal(row)}
                          style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                        >
                          <i className="fa-solid fa-wand-magic-sparkles"></i>
                          AI Soạn tin
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="table-actions-footer">
              {!isLocked && (
                <button 
                  className="btn btn-primary" 
                  onClick={saveAttendance} 
                  disabled={saving || !isDateValid}
                >
                  {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-regular fa-floppy-disk"></i>} Xác nhận điểm danh
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .attendance-page-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
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
        .control-panel {
          padding: 1rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.5rem;
          flex-wrap: wrap;
        }
        .select-fields {
          display: flex;
          gap: 2rem;
          flex-wrap: wrap;
        }
        .form-group-horizontal {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--color-text);
        }
        .form-group-horizontal select, .form-group-horizontal input {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-family: inherit;
          font-weight: 600;
          cursor: pointer;
          min-width: 180px;
        }
        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
          border-radius: 6px;
        }
        .table-container {
          padding: 0;
          overflow: hidden;
          border-radius: 12px;
          transition: opacity 0.3s;
        }
        .opacity-disabled {
          opacity: 0.5;
          pointer-events: none; /* Khóa hoàn toàn tương tác của bảng */
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
        .radio-present, .radio-absent, .radio-excused {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
        .radio-present { accent-color: var(--color-success); }
        .radio-absent { accent-color: var(--color-danger); }
        .radio-excused { accent-color: var(--color-warning); }

        .detail-text-input {
          width: 100%;
          padding: 0.4rem 0.6rem;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: var(--color-bg);
          color: var(--color-text);
          font-family: inherit;
          font-size: 0.85rem;
        }
        .detail-text-input:focus { outline: none; border-color: var(--color-primary); }
        .detail-text-input:disabled { opacity: 0.5; cursor: not-allowed; }

        .accumulated-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--color-border);
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          font-weight: 700;
          font-size: 0.85rem;
          gap: 0.25rem;
        }
        .accumulated-badge .separator { color: var(--color-text-muted); font-weight: 400; }

        .table-actions-footer {
          padding: 1.5rem;
          display: flex;
          justify-content: flex-end;
          border-top: 1px solid var(--color-border);
          background: rgba(255, 255, 255, 0.2);
        }
        .loading-state, .empty-table-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 5rem;
          gap: 1rem;
          color: var(--color-text-muted);
        }
        .loading-state i { font-size: 2.5rem; color: var(--color-primary); }
        .empty-table-state i { font-size: 3rem; }

        .teacher-assignment { padding: 20px; margin-bottom: 20px; }
        .teacher-form { display: flex; gap: 20px; align-items: center; }
        .teacher-form .form-group { flex: 1; }
        .checkbox-group label { display: flex; align-items: center; gap: 8px; cursor: pointer; font-weight: 500;}
        .checkbox-group input { width: auto; transform: scale(1.2); }

        @media (max-width: 768px) {
          .filters { flex-direction: column; }
          .lesson-plan-grid { grid-template-columns: 1fr; }
          .ai-result-actions { flex-direction: column; }
          .teacher-form { flex-direction: column; align-items: flex-start; gap: 10px; }
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
        
        .animated-scale {
          animation: scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes scaleUp {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
      {/* MODAL: AI SOẠN TIN PHỤ HUYNH (SPRINT 3) */}
      {showAiModal && aiStudent && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#8b5cf6' }}></i> Trợ Lý AI Soạn Tin: <span style={{ color: 'var(--color-primary)' }}>{aiStudent.name}</span>
              </h2>
              <button className="close-btn" onClick={() => setShowAiModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>
            </div>

            <div className="modal-body" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Tùy chọn Tone giọng */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text)' }}>Giọng điệu AI:</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {[
                    { id: 'encouraging', label: '🟢 Khuyên bảo & Động viên' },
                    { id: 'solution', label: '🟡 Gợi mở giải pháp' },
                    { id: 'formal', label: '🔴 Trân trọng & Lịch sự' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setAiTone(t.id);
                        generateAiReport(aiStudent, t.id);
                      }}
                      style={{
                        padding: '0.3rem 0.6rem',
                        borderRadius: '6px',
                        border: aiTone === t.id ? '2px solid #8b5cf6' : '1px solid var(--color-border)',
                        background: aiTone === t.id ? 'rgba(139, 92, 246, 0.1)' : 'var(--color-surface)',
                        color: aiTone === t.id ? '#7c3aed' : 'var(--color-text)',
                        fontWeight: '700',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ô hiển thị & chỉnh sửa kết quả AI */}
              <div style={{ position: 'relative' }}>
                {aiLoading ? (
                  <div style={{ minHeight: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px dashed var(--color-border)' }}>
                    <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '1.8rem', color: '#8b5cf6', marginBottom: '0.5rem' }}></i>
                    <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-muted)' }}>AI đang suy nghĩ và lồng ghép lợi ích bài học cho bé...</p>
                  </div>
                ) : (
                  <textarea
                    rows={9}
                    value={aiMessage}
                    onChange={e => setAiMessage(e.target.value)}
                    className="detail-text-input"
                    style={{ width: '100%', height: 'auto', fontSize: '0.9rem', lineHeight: '1.5', fontFamily: 'inherit', padding: '0.85rem', resize: 'vertical' }}
                  />
                )}
                {aiSource && !aiLoading && (
                  <span style={{ position: 'absolute', bottom: '10px', right: '12px', fontSize: '0.72rem', color: 'var(--color-text-muted)', background: 'var(--color-surface)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border)' }}>
                    {aiSource === 'gemini' ? '✨ Powered by Gemini AI' : '⚡ Benefit-Driven Engine'}
                  </span>
                )}
              </div>

            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => generateAiReport(aiStudent, aiTone)}
                disabled={aiLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}
              >
                <i className="fa-solid fa-arrows-rotate"></i> Tạo lại tin khác
              </button>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAiModal(false)}>Đóng</button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  disabled={aiLoading || !aiMessage}
                  onClick={() => {
                    copyToClipboard(aiMessage, `ai_${aiStudent.id}`);
                    setShowAiModal(false);
                  }}
                  style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <i className="fa-brands fa-whatsapp"></i> Copy Gửi Zalo
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
