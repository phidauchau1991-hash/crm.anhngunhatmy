'use client';

import React, { useState, useEffect, useMemo } from 'react';
import ClassSelect from '@/app/components/ClassSelect';
import { formatClassCode } from '@/lib/classHelper';

const TIME_PRESETS = [
  { label: '14:00 - 15:00', start: '14:00', end: '15:00' },
  { label: '15:30 - 16:30', start: '15:30', end: '16:30' },
  { label: '16:30 - 17:30', start: '16:30', end: '17:30' },
  { label: '17:45 - 19:15', start: '17:45', end: '19:15' },
  { label: '19:30 - 20:30', start: '19:30', end: '20:30' },
];

const ROOM_OPTIONS = [
  'Phòng học tại trung tâm',
  'Phòng 101',
  'Phòng 102',
  'Phòng 201',
  'Phòng 202',
  'Phòng 203',
];

function getVnTodayStr() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function addDaysVn(dateStr, daysToAdd) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') ? dateStr : getVnTodayStr();
  const d = new Date(`${base}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + daysToAdd);
  return d.toISOString().slice(0, 10);
}

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const raw = String(timeStr).trim().toUpperCase();
  const m = raw.match(/^(\d{1,2})\s*[:Hh]\s*(\d{0,2})\s*(SA|CH|AM|PM)?$/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const suffix = m[3] || '';
  if ((suffix === 'CH' || suffix === 'PM') && hh < 12) hh += 12;
  if ((suffix === 'SA' || suffix === 'AM') && hh === 12) hh = 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function getStudentClassCodes(st) {
  if (!st) return [];
  const list = [];
  if (Array.isArray(st.activeClasses)) {
    st.activeClasses.forEach((c) => {
      if (c && c.classCode) list.push(c.classCode);
    });
  }
  if (st.classCode && !st.classCode.startsWith('Chưa xếp') && !st.classCode.startsWith('Kèm 1-1')) {
    if (!list.includes(st.classCode)) list.push(st.classCode);
  }
  return list;
}

export default function TutoringScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  prefillData = null,
  prefillList = null,
  editPlanGroup = null,
  students = [],
  classes = [],
  teachers = [],
  existingPlans = [],
}) {
  const isEditMode = Boolean(editPlanGroup && editPlanGroup.primaryPlan);

  const [filterClassCode, setFilterClassCode] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]); // [{ studentId, classCode }]
  const [showAllStudentStatuses, setShowAllStudentStatuses] = useState(false);

  const [sessionType, setSessionType] = useState('Bù bài học viên vắng (Makeup)');
  const [focusSkills, setFocusSkills] = useState('Tổng hợp / Toàn diện');
  const [teacherId, setTeacherId] = useState('');
  const [tutorName, setTutorName] = useState('');
  const [content, setContent] = useState('');
  const [instructions, setInstructions] = useState('');
  const [sessions, setSessions] = useState([]);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Khởi tạo form khi mở modal (hỗ trợ Tạo mới, Tạo từ 1 cảnh báo, Tạo nhóm từ nhiều cảnh báo, hoặc Sửa)
  useEffect(() => {
    if (!isOpen) return;
    const todayVn = getVnTodayStr();

    if (editPlanGroup && editPlanGroup.primaryPlan) {
      const p = editPlanGroup.primaryPlan;
      const memberPlans = Array.isArray(editPlanGroup.plans) && editPlanGroup.plans.length > 0
        ? editPlanGroup.plans
        : [p];

      setSelectedParticipants(
        memberPlans.map((mp) => ({
          studentId: mp.studentId,
          classCode: mp.classCode || '',
        }))
      );
      setFilterClassCode(p.classCode || '');
      setStudentSearch('');
      setSessionType(p.sessionType || 'Bù bài học viên vắng (Makeup)');
      setFocusSkills(p.focusSkills || 'Tổng hợp / Toàn diện');
      setTeacherId(p.teacherId || '');
      setTutorName(p.tutorName || '');
      setContent(p.content || '');
      setInstructions(p.instructions || '');
      setSessions(
        (p.sessions || []).length > 0
          ? p.sessions.map((s) => ({
              id: s.id,
              teachingDate: s.teachingDate || todayVn,
              startTimeText: s.startTimeText || '16:30',
              endTimeText: s.endTimeText || '17:30',
              roomName: s.roomName || 'Phòng học tại trung tâm',
              notes: s.notes || '',
              status: s.status || 'SCHEDULED',
            }))
          : [
              {
                teachingDate: todayVn,
                startTimeText: '16:30',
                endTimeText: '17:30',
                roomName: 'Phòng học tại trung tâm',
                notes: '',
              },
            ]
      );
    } else if (Array.isArray(prefillList) && prefillList.length > 0) {
      const first = prefillList[0];
      setSelectedParticipants(
        prefillList.map((item) => ({
          studentId: item.studentId,
          classCode: item.classCode || '',
        }))
      );
      setFilterClassCode(first.classCode || '');
      setStudentSearch('');
      setSessionType(first.recommendedSessionType || 'Bù bài học viên vắng (Makeup)');
      setFocusSkills(first.recommendedSkills || 'Tổng hợp / Toàn diện');
      setTeacherId(first.teacherId || '');
      setTutorName(first.teacherName || '');
      const reasons = prefillList
        .map((item) => `${item.studentName}: ${item.reason}`)
        .join(' | ');
      setContent(prefillList.length > 1 ? `Bù bài nhóm (${prefillList.length} HV): ${reasons}` : `Bù bài học viên vắng: ${first.reason}`);
      setInstructions('Mang theo sách Student Book và vở ghi chép bài tập đầy đủ');
      setSessions([
        {
          teachingDate: todayVn,
          startTimeText: '16:30',
          endTimeText: '17:30',
          roomName: 'Phòng học tại trung tâm',
          notes: '',
        },
      ]);
    } else if (prefillData) {
      setSelectedParticipants([
        { studentId: prefillData.studentId || '', classCode: prefillData.classCode || '' },
      ].filter((p) => p.studentId));
      setFilterClassCode(prefillData.classCode || '');
      setStudentSearch('');
      setSessionType(prefillData.recommendedSessionType || 'Bù bài học viên vắng (Makeup)');
      setFocusSkills(prefillData.recommendedSkills || 'Tổng hợp / Toàn diện');
      setTeacherId(prefillData.teacherId || '');
      setTutorName(prefillData.teacherName || '');
      setContent(prefillData.reason ? `Bù bài học viên vắng: ${prefillData.reason}` : '');
      setInstructions('Mang theo sách Student Book và vở ghi chép bài tập đầy đủ');
      setSessions([
        {
          teachingDate: todayVn,
          startTimeText: '16:30',
          endTimeText: '17:30',
          roomName: 'Phòng học tại trung tâm',
          notes: '',
        },
      ]);
    } else {
      setSelectedParticipants([]);
      setFilterClassCode('');
      setStudentSearch('');
      setSessionType('Bù bài học viên vắng (Makeup)');
      setFocusSkills('Tổng hợp / Toàn diện');
      setTeacherId('');
      setTutorName('');
      setContent('');
      setInstructions('Mang theo sách vở và đồ dùng học tập đầy đủ');
      setSessions([
        {
          teachingDate: todayVn,
          startTimeText: '16:30',
          endTimeText: '17:30',
          roomName: 'Phòng học tại trung tâm',
          notes: '',
        },
      ]);
    }
    setShowAllStudentStatuses(false);
    setErrorMsg('');
  }, [prefillData, prefillList, editPlanGroup, isOpen]);

  // Khi đổi bộ lọc lớp & chưa chọn GV -> tự động gợi ý GV phụ trách của lớp đó
  const handleFilterClassChange = (newClassCode) => {
    setFilterClassCode(newClassCode);
    if (newClassCode && !teacherId) {
      const clsObj = classes.find((c) => c.code === newClassCode);
      if (clsObj?.teacherId) {
        handleTeacherChange(clsObj.teacherId);
      }
    }
  };

  const handleTeacherChange = (tId) => {
    setTeacherId(tId);
    const teacher = teachers.find((t) => t.id === tId);
    if (teacher) {
      setTutorName(teacher.shortName || teacher.fullName || '');
    } else {
      setTutorName('');
    }
  };

  // Danh sách học viên đã được lọc chính xác theo Lớp + Trạng thái + Từ khóa tìm kiếm
  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    return students.filter((st) => {
      if (!st || !st.id) return false;
      if (!showAllStudentStatuses && st.status && st.status !== 'Đang học') {
        return false;
      }
      if (filterClassCode) {
        const clsCodes = getStudentClassCodes(st);
        if (!clsCodes.includes(filterClassCode)) return false;
      }
      if (q) {
        const name = (st.name || '').toLowerCase();
        const id = (st.id || '').toLowerCase();
        const phone = (st.phone || '').toLowerCase();
        if (!name.includes(q) && !id.includes(q) && !phone.includes(q)) return false;
      }
      return true;
    });
  }, [students, filterClassCode, studentSearch, showAllStudentStatuses]);

  const selectedIdsSet = useMemo(
    () => new Set(selectedParticipants.map((p) => p.studentId)),
    [selectedParticipants]
  );

  const toggleStudent = (st) => {
    if (selectedIdsSet.has(st.id)) {
      setSelectedParticipants((prev) => prev.filter((p) => p.studentId !== st.id));
      return;
    }
    const defaultClass = filterClassCode || getStudentClassCodes(st)[0] || '';
    setSelectedParticipants((prev) => [...prev, { studentId: st.id, classCode: defaultClass }]);
    if (!teacherId && defaultClass) {
      const clsObj = classes.find((c) => c.code === defaultClass);
      if (clsObj?.teacherId) handleTeacherChange(clsObj.teacherId);
    }
  };

  const handleSelectAllFiltered = () => {
    if (filteredStudents.length === 0) return;
    const allAlreadySelected = filteredStudents.every((st) => selectedIdsSet.has(st.id));
    if (allAlreadySelected) {
      const filteredSet = new Set(filteredStudents.map((s) => s.id));
      setSelectedParticipants((prev) => prev.filter((p) => !filteredSet.has(p.studentId)));
    } else {
      setSelectedParticipants((prev) => {
        const next = [...prev];
        const existing = new Set(prev.map((p) => p.studentId));
        for (const st of filteredStudents) {
          if (!existing.has(st.id)) {
            const clsCode = filterClassCode || getStudentClassCodes(st)[0] || '';
            next.push({ studentId: st.id, classCode: clsCode });
          }
        }
        return next;
      });
    }
  };

  const handleAddSession = () => {
    const lastSession = sessions[sessions.length - 1];
    const nextDate = addDaysVn(lastSession?.teachingDate || getVnTodayStr(), 2);
    setSessions([
      ...sessions,
      {
        teachingDate: nextDate,
        startTimeText: lastSession?.startTimeText || '16:30',
        endTimeText: lastSession?.endTimeText || '17:30',
        roomName: lastSession?.roomName || 'Phòng học tại trung tâm',
        notes: '',
      },
    ]);
  };

  const handleRemoveSession = (index) => {
    if (sessions.length <= 1) return;
    setSessions(sessions.filter((_, idx) => idx !== index));
  };

  const handleSessionChange = (index, field, value) => {
    setSessions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const applyTimePreset = (index, preset) => {
    setSessions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], startTimeText: preset.start, endTimeText: preset.end };
      return next;
    });
  };

  // Kiểm tra cảnh báo trùng lịch Giáo viên hoặc Phòng học trong cùng ngày & khung giờ
  const scheduleConflicts = useMemo(() => {
    const warnings = [];
    if (!Array.isArray(existingPlans) || existingPlans.length === 0) return warnings;

    const editingPlanIds = new Set(
      editPlanGroup
        ? (editPlanGroup.plans || [editPlanGroup.primaryPlan]).filter(Boolean).map((p) => p.id)
        : []
    );

    const seenKeys = new Set();

    sessions.forEach((slot, idx) => {
      if (!slot.teachingDate) return;
      const slotStart = parseTimeToMinutes(slot.startTimeText);
      const slotEnd = parseTimeToMinutes(slot.endTimeText);
      const slotRoom = (slot.roomName || '').trim().toLowerCase();

      for (const plan of existingPlans) {
        if (!plan || editingPlanIds.has(plan.id)) continue;
        if (plan.status === 'CANCELLED' || plan.status === 'COMPLETED') continue;

        for (const s of plan.sessions || []) {
          if (s.status !== 'SCHEDULED' || s.teachingDate !== slot.teachingDate) continue;

          const otherStart = parseTimeToMinutes(s.startTimeText);
          const otherEnd = parseTimeToMinutes(s.endTimeText);
          const timesOverlap =
            slotStart !== null && slotEnd !== null && otherStart !== null && otherEnd !== null
              ? slotStart < otherEnd && otherStart < slotEnd
              : (slot.startTimeText || '').trim() === (s.startTimeText || '').trim();

          if (!timesOverlap) continue;

          const teacherConflict = teacherId && plan.teacherId === teacherId;
          const roomConflict =
            slotRoom &&
            slotRoom !== 'phòng học tại trung tâm' &&
            (s.roomName || '').trim().toLowerCase() === slotRoom;

          if (teacherConflict || roomConflict) {
            const batchIdentity = plan.groupCode || plan.id;
            const warnKey = `${idx}|${batchIdentity}|${teacherConflict ? 'T' : ''}${roomConflict ? 'R' : ''}`;
            if (!seenKeys.has(warnKey)) {
              seenKeys.add(warnKey);
              const reasonParts = [];
              if (teacherConflict) reasonParts.push(`GV ${plan.tutorName || 'phụ trách'}`);
              if (roomConflict) reasonParts.push(`Phòng "${s.roomName}"`);
              warnings.push(
                `Buổi ${idx + 1} (${slot.teachingDate}, ${slot.startTimeText}–${slot.endTimeText}): trùng ${reasonParts.join(' & ')} với lịch của ${plan.student?.name || plan.planCode} (${s.startTimeText}–${s.endTimeText}).`
              );
            }
          }
        }
      }
    });

    return warnings;
  }, [sessions, existingPlans, teacherId, editPlanGroup]);

  const handleSubmit = async (andExportLetter = false) => {
    if (selectedParticipants.length === 0) {
      setErrorMsg('Vui lòng tích chọn ít nhất 1 học viên cần phụ đạo');
      return;
    }

    for (let i = 0; i < sessions.length; i++) {
      if (!sessions[i].teachingDate) {
        setErrorMsg(`Vui lòng chọn ngày học cho Buổi số ${i + 1}`);
        return;
      }
    }

    setSaving(true);
    setErrorMsg('');

    try {
      if (isEditMode) {
        const res = await fetch(`/api/tutoring/${editPlanGroup.primaryPlan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applyToGroup: true,
            participants: selectedParticipants,
            teacherId: teacherId || null,
            tutorName: tutorName || null,
            sessionType,
            focusSkills,
            content,
            instructions,
            sessions,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Không thể cập nhật lịch phụ đạo');
        onSuccess(json.plans || [json.data], andExportLetter);
      } else {
        const res = await fetch('/api/tutoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            participants: selectedParticipants,
            teacherId: teacherId || null,
            tutorName: tutorName || null,
            sessionType,
            focusSkills,
            content,
            instructions,
            sessions,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Không thể tạo lịch phụ đạo');
        onSuccess(json.plans || [json.data], andExportLetter);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Lỗi lưu lịch phụ đạo');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const allFilteredSelected =
    filteredStudents.length > 0 && filteredStudents.every((st) => selectedIdsSet.has(st.id));

  return (
    <div className="tsm-overlay" onClick={onClose}>
      <div className="tsm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="tsm-header">
          <div className="tsm-header-left">
            <div className="tsm-icon-badge">
              <i className={`fa-solid ${isEditMode ? 'fa-pen-to-square' : 'fa-calendar-plus'}`}></i>
            </div>
            <div>
              <h2>{isEditMode ? 'Chỉnh Sửa Lịch Phụ Đạo & Bù Bài' : 'Lên Lịch Phụ Đạo & Bù Bài'}</h2>
              <p>Hỗ trợ kèm 1-1 hoặc gom nhóm nhiều học viên từ nhiều lớp vào cùng buổi học trực tiếp</p>
            </div>
          </div>
          <button className="tsm-close-btn" onClick={onClose} aria-label="Đóng">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Body */}
        <div className="tsm-body">
          {errorMsg && (
            <div className="tsm-error-alert">
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nhóm 1: Chọn học viên & lọc theo lớp (Hỗ trợ 1 hoặc nhiều HV, nhiều lớp) */}
          <div className="tsm-section">
            <div className="tsm-section-header-row" style={{ marginBottom: '10px' }}>
              <div className="tsm-section-title" style={{ marginBottom: 0 }}>
                1. Chọn học viên tham gia <span className="req">*</span>{' '}
                <span className="tsm-count-pill">{selectedParticipants.length} học viên đã chọn</span>
              </div>
              <label style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showAllStudentStatuses}
                  onChange={(e) => setShowAllStudentStatuses(e.target.checked)}
                />
                Hiện cả HV tạm nghỉ / bảo lưu
              </label>
            </div>

            {/* Danh sách thẻ badge các HV đã chọn (giữ nguyên khi đổi lớp lọc để ghép nhiều lớp) */}
            {selectedParticipants.length > 0 && (
              <div className="tsm-selected-pills">
                {selectedParticipants.map((p) => {
                  const st = students.find((s) => s.id === p.studentId);
                  const clsDisplay = p.classCode ? formatClassCode(p.classCode) : 'Chưa gắn lớp';
                  return (
                    <span key={p.studentId} className="tsm-student-chip">
                      <strong>{st?.name || p.studentId}</strong>
                      <span className="tsm-chip-class">({clsDisplay})</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedParticipants((prev) => prev.filter((item) => item.studentId !== p.studentId))
                        }
                        title="Bỏ học viên này"
                        className="tsm-chip-remove"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            )}

            {/* Thanh lọc: Chọn Lớp chuẩn + Tìm tên/SĐT */}
            <div className="tsm-grid-2" style={{ marginBottom: '10px' }}>
              <div className="tsm-field">
                <label>Lọc danh sách theo Lớp học</label>
                <ClassSelect
                  classes={classes}
                  value={filterClassCode}
                  onChange={(e) => handleFilterClassChange(e.target.value)}
                  placeholder="-- Tất cả các lớp đang mở --"
                  className="tsm-select"
                />
              </div>

              <div className="tsm-field">
                <label>Tìm nhanh học viên</label>
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Gõ tên, mã HV hoặc SĐT..."
                  className="tsm-input"
                />
              </div>
            </div>

            {/* Khung tick chọn học viên */}
            <div className="tsm-student-picker">
              <div className="tsm-picker-toolbar">
                <span>
                  Hiển thị <strong>{filteredStudents.length}</strong> học viên
                  {filterClassCode ? ` thuộc lớp ${formatClassCode(filterClassCode)}` : ' toàn trung tâm'}
                </span>
                {filteredStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="tsm-btn-select-all"
                  >
                    {allFilteredSelected
                      ? `Bỏ chọn ${filteredStudents.length} bạn đang lọc`
                      : `✓ Chọn tất cả (${filteredStudents.length} bạn)`}
                  </button>
                )}
              </div>

              <div className="tsm-picker-list">
                {filteredStudents.length === 0 ? (
                  <div className="tsm-picker-empty">
                    Không có học viên nào khớp bộ lọc {filterClassCode ? `trong lớp ${formatClassCode(filterClassCode)}` : ''}.
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const checked = selectedIdsSet.has(st.id);
                    const clsCodes = getStudentClassCodes(st);
                    const clsShort = clsCodes.map((c) => formatClassCode(c)).join(', ') || 'Chưa xếp lớp';
                    return (
                      <label key={st.id} className={`tsm-picker-row ${checked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStudent(st)}
                        />
                        <div className="tsm-picker-main">
                          <span className="tsm-picker-name">{st.name}</span>
                          <span className="tsm-picker-meta">
                            {st.id} • {st.phone && st.phone !== 'N/A' ? st.phone : 'Chưa có SĐT'}
                          </span>
                        </div>
                        <span className="tsm-picker-class-tag">{clsShort}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Nhóm 2: Loại buổi & Kỹ năng trọng tâm */}
          <div className="tsm-section">
            <div className="tsm-section-title">2. Phân loại buổi & kỹ năng trọng tâm</div>
            <div className="tsm-grid-2">
              <div className="tsm-field">
                <label>Loại buổi học</label>
                <select value={sessionType} onChange={(e) => setSessionType(e.target.value)} className="tsm-select">
                  <option value="Bù bài học viên vắng (Makeup)">Bù bài học viên vắng (Makeup)</option>
                  <option value="Phụ đạo học lực yếu (Tutoring)">Phụ đạo học lực yếu (Tutoring)</option>
                  <option value="Ôn thi / Kiểm tra bổ sung">Ôn thi / Kiểm tra bổ sung</option>
                  <option value="Phụ đạo theo yêu cầu PH">Phụ đạo theo yêu cầu PH</option>
                </select>
              </div>

              <div className="tsm-field">
                <label>Kỹ năng trọng tâm</label>
                <select value={focusSkills} onChange={(e) => setFocusSkills(e.target.value)} className="tsm-select">
                  <option value="Tổng hợp / Toàn diện">Tổng hợp / Toàn diện</option>
                  <option value="Ngữ pháp (Grammar)">Ngữ pháp (Grammar)</option>
                  <option value="Từ vựng (Vocabulary)">Từ vựng (Vocabulary)</option>
                  <option value="Nghe - Nói (Listening & Speaking)">Nghe - Nói (Listening & Speaking)</option>
                  <option value="Đọc - Viết (Reading & Writing)">Đọc - Viết (Reading & Writing)</option>
                  <option value="Phản xạ giao tiếp (Reflex / Fluency)">Phản xạ giao tiếp (Reflex / Fluency)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Nhóm 3: Giáo viên phụ trách */}
          <div className="tsm-section">
            <div className="tsm-section-title">3. Giáo viên / Trợ giảng phụ trách kèm</div>
            <div className="tsm-grid-2">
              <div className="tsm-field">
                <label>Giáo viên phụ trách</label>
                <select value={teacherId} onChange={(e) => handleTeacherChange(e.target.value)} className="tsm-select">
                  <option value="">-- Chọn giáo viên / trợ giảng --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} {t.shortName ? `(${t.shortName})` : ''} - {t.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="tsm-field">
                <label>Tên hiển thị trên thư phụ huynh</label>
                <input
                  type="text"
                  value={tutorName}
                  onChange={(e) => setTutorName(e.target.value)}
                  placeholder="Ví dụ: Ms My / Thầy Đấu"
                  className="tsm-input"
                />
              </div>
            </div>
          </div>

          {/* Nhóm 4: Lịch học chi tiết */}
          <div className="tsm-section">
            <div className="tsm-section-header-row">
              <div className="tsm-section-title-alt">
                <i className="fa-solid fa-calendar-day text-amber"></i> 4. Lịch học kèm trực tiếp tại trung tâm
              </div>
              <button type="button" onClick={handleAddSession} className="tsm-btn-add-slot">
                <i className="fa-solid fa-plus"></i> Thêm ngày / buổi học
              </button>
            </div>

            {scheduleConflicts.length > 0 && (
              <div className="tsm-conflict-alert">
                <i className="fa-solid fa-triangle-exclamation"></i>
                <div>
                  <strong>Cảnh báo có khả năng trùng lịch:</strong>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                    {scheduleConflicts.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <datalist id="tutoring-room-list">
              {ROOM_OPTIONS.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>

            <div className="tsm-slots-list">
              {sessions.map((slot, idx) => (
                <div key={idx} className="tsm-slot-card">
                  <div className="tsm-slot-header">
                    <span className="tsm-slot-badge">
                      Buổi số {idx + 1}
                      {slot.status === 'COMPLETED' && ' (Đã điểm danh)'}
                    </span>
                    {sessions.length > 1 && slot.status !== 'COMPLETED' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSession(idx)}
                        className="tsm-slot-delete-btn"
                        title="Xóa buổi này"
                      >
                        <i className="fa-regular fa-trash-can"></i> Xóa
                      </button>
                    )}
                  </div>

                  <div className="tsm-slot-grid">
                    <div className="tsm-field">
                      <label>
                        Ngày học <span className="req">*</span>
                      </label>
                      <input
                        type="date"
                        value={slot.teachingDate}
                        onChange={(e) => handleSessionChange(idx, 'teachingDate', e.target.value)}
                        className="tsm-input"
                      />
                    </div>

                    <div className="tsm-field">
                      <label>Giờ bắt đầu</label>
                      <input
                        type="text"
                        value={slot.startTimeText}
                        onChange={(e) => handleSessionChange(idx, 'startTimeText', e.target.value)}
                        placeholder="VD: 16:30"
                        className="tsm-input"
                      />
                    </div>

                    <div className="tsm-field">
                      <label>Giờ kết thúc</label>
                      <input
                        type="text"
                        value={slot.endTimeText}
                        onChange={(e) => handleSessionChange(idx, 'endTimeText', e.target.value)}
                        placeholder="VD: 17:30"
                        className="tsm-input"
                      />
                    </div>

                    <div className="tsm-field">
                      <label>Phòng học trực tiếp</label>
                      <input
                        type="text"
                        list="tutoring-room-list"
                        value={slot.roomName}
                        onChange={(e) => handleSessionChange(idx, 'roomName', e.target.value)}
                        placeholder="Chọn hoặc nhập tên phòng"
                        className="tsm-input"
                      />
                    </div>
                  </div>

                  <div className="tsm-presets-row">
                    <span className="tsm-preset-label">Chọn nhanh giờ:</span>
                    {TIME_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => applyTimePreset(idx, p)}
                        className={`tsm-preset-chip ${
                          slot.startTimeText === p.start && slot.endTimeText === p.end ? 'active' : ''
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nhóm 5: Nội dung & Dặn dò */}
          <div className="tsm-section">
            <div className="tsm-section-title">5. Nội dung ôn tập & dặn dò học viên</div>
            <div className="tsm-field" style={{ marginBottom: '10px' }}>
              <label>Nội dung bài học / Kiến thức cần bù</label>
              <textarea
                rows={2}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ví dụ: Ôn tập Unit 4, luyện thì Hiện tại đơn, bổ trợ nghe..."
                className="tsm-textarea"
              />
            </div>

            <div className="tsm-field">
              <label>Dặn dò học viên (sách vở, dụng cụ mang theo)</label>
              <textarea
                rows={2}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Ví dụ: Mang theo sách Student Book, vở ghi chép bài tập..."
                className="tsm-textarea"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="tsm-footer">
          <button type="button" className="tsm-btn tsm-btn-ghost" onClick={onClose} disabled={saving}>
            Hủy bỏ
          </button>
          <button
            type="button"
            className="tsm-btn tsm-btn-secondary"
            onClick={() => handleSubmit(false)}
            disabled={saving}
          >
            {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-floppy-disk"></i>}
            {isEditMode ? 'Lưu Thay Đổi' : `Lưu Lịch (${selectedParticipants.length} HV)`}
          </button>
          {!isEditMode && (
            <button
              type="button"
              className="tsm-btn tsm-btn-primary"
              onClick={() => handleSubmit(true)}
              disabled={saving}
            >
              {saving ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-envelope-open-text"></i>}
              Lưu & Xuất Thư Báo Zalo
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .tsm-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .tsm-modal {
          background: #ffffff;
          border-radius: 16px;
          max-width: 880px;
          width: 100%;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 20px 60px -12px rgba(15, 23, 42, 0.35);
        }
        .tsm-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: linear-gradient(135deg, #085e8a 0%, #0D88C4 100%);
          color: #ffffff;
          position: relative;
        }
        .tsm-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #FFCA29, #cca120);
        }
        .tsm-header-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .tsm-icon-badge {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          color: #FFCA29;
          flex-shrink: 0;
        }
        .tsm-header h2 {
          font-size: 17.5px;
          font-weight: 800;
          margin: 0 0 2px 0;
        }
        .tsm-header p {
          font-size: 12.5px;
          margin: 0;
          color: #e0f2fe;
        }
        .tsm-close-btn {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.15);
          border: none;
          color: #ffffff;
          cursor: pointer;
          font-size: 16px;
        }
        .tsm-body {
          padding: 18px 24px;
          overflow-y: auto;
          flex: 1;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .tsm-error-alert {
          background: #fee2e2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
        }
        .tsm-conflict-alert {
          background: #fffbeb;
          border: 1px solid #fcd34d;
          color: #92400e;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 12.5px;
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 12px;
        }
        .tsm-section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 15px 16px;
        }
        .tsm-section-title {
          font-size: 12px;
          font-weight: 800;
          color: #085e8a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .tsm-count-pill {
          background: #e0f2fe;
          color: #0369a1;
          padding: 2px 9px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: none;
        }
        .tsm-section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tsm-section-title-alt {
          font-size: 12px;
          font-weight: 800;
          color: #085e8a;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .text-amber { color: #d97706; }

        .tsm-selected-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px 10px;
          background: #f0f9ff;
          border: 1px dashed #7dd3fc;
          border-radius: 10px;
          margin-bottom: 10px;
        }
        .tsm-student-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #ffffff;
          border: 1px solid #bae6fd;
          color: #085e8a;
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 12px;
        }
        .tsm-chip-class {
          color: #64748b;
          font-size: 11px;
        }
        .tsm-chip-remove {
          border: none;
          background: #fee2e2;
          color: #dc2626;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          font-weight: 800;
          cursor: pointer;
          line-height: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .tsm-student-picker {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: hidden;
          background: #ffffff;
        }
        .tsm-picker-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
          font-size: 12px;
          color: #475569;
          flex-wrap: wrap;
          gap: 8px;
        }
        .tsm-btn-select-all {
          background: #e0f2fe;
          color: #0369a1;
          border: 1px solid #bae6fd;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .tsm-picker-list {
          max-height: 205px;
          overflow-y: auto;
          padding: 4px;
        }
        .tsm-picker-empty {
          padding: 18px;
          text-align: center;
          font-size: 12.5px;
          color: #94a3b8;
        }
        .tsm-picker-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 7px;
          cursor: pointer;
          font-size: 13px;
          transition: background 0.12s;
        }
        .tsm-picker-row:hover {
          background: #f1f5f9;
        }
        .tsm-picker-row.checked {
          background: #eff6ff;
        }
        .tsm-picker-row input[type='checkbox'] {
          width: 16px;
          height: 16px;
          accent-color: #0284c7;
          cursor: pointer;
          flex-shrink: 0;
        }
        .tsm-picker-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .tsm-picker-name {
          font-weight: 700;
          color: #0f172a;
        }
        .tsm-picker-meta {
          font-size: 11.5px;
          color: #64748b;
        }
        .tsm-picker-class-tag {
          font-size: 11px;
          font-weight: 700;
          color: #0369a1;
          background: #f0f9ff;
          border: 1px solid #e0f2fe;
          padding: 2px 8px;
          border-radius: 6px;
          white-space: nowrap;
        }

        .tsm-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .tsm-field {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .tsm-field label {
          font-size: 12.5px;
          font-weight: 600;
          color: #475569;
        }
        .req { color: #ef4444; }
        .tsm-select,
        .tsm-input,
        .tsm-textarea {
          width: 100%;
          padding: 8px 11px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          color: #1e293b;
          background: #ffffff;
          box-sizing: border-box;
        }
        .tsm-select:focus,
        .tsm-input:focus,
        .tsm-textarea:focus {
          outline: none;
          border-color: #0D88C4;
          box-shadow: 0 0 0 3px rgba(13, 136, 196, 0.15);
        }

        .tsm-btn-add-slot {
          background: #e0f2fe;
          color: #085e8a;
          border: 1px solid #bae6fd;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 12.5px;
          font-weight: 700;
          cursor: pointer;
        }
        .tsm-slots-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .tsm-slot-card {
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 12px 14px;
        }
        .tsm-slot-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .tsm-slot-badge {
          background: #085e8a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 999px;
        }
        .tsm-slot-delete-btn {
          background: none;
          border: none;
          color: #ef4444;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }
        .tsm-slot-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .tsm-presets-row {
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .tsm-preset-label {
          font-size: 11px;
          color: #64748b;
          font-weight: 600;
        }
        .tsm-preset-chip {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 6px;
          cursor: pointer;
        }
        .tsm-preset-chip.active {
          background: #0284c7;
          color: #ffffff;
          border-color: #0284c7;
        }

        .tsm-footer {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
          padding: 14px 24px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
        }
        .tsm-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 18px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          border: none;
        }
        .tsm-btn-ghost {
          background: #f1f5f9;
          color: #475569;
        }
        .tsm-btn-secondary {
          background: #e0f2fe;
          color: #085e8a;
          border: 1px solid #bae6fd;
        }
        .tsm-btn-primary {
          background: linear-gradient(135deg, #0D88C4 0%, #085e8a 100%);
          color: #ffffff;
        }

        @media (max-width: 720px) {
          .tsm-grid-2 { grid-template-columns: 1fr; }
          .tsm-slot-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
}
