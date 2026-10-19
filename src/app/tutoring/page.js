'use client';

import React, { useState, useEffect } from 'react';
import TutoringScheduleModal from './components/TutoringScheduleModal';
import TutoringLetterModal from './components/TutoringLetterModal';
import TutoringCompleteModal from './components/TutoringCompleteModal';

export default function TutoringPage() {
  const [stats, setStats] = useState({
    alertCount: 0,
    scheduledCount: 0,
    completedCount: 0,
    totalCount: 0,
    cancelledCount: 0,
    scheduledStudentsCount: 0
  });

  const [alerts, setAlerts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, SCHEDULED, COMPLETED, CANCELLED
  const [teacherFilter, setTeacherFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [schedulePrefill, setSchedulePrefill] = useState(null);

  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [letterPlan, setLetterPlan] = useState(null);

  const [isCompleteOpen, setIsCompleteOpen] = useState(false);
  const [completeTarget, setCompleteTarget] = useState({ session: null, plan: null });

  // Tải dữ liệu ban đầu
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, plansRes, studentsRes, classesRes, usersRes] = await Promise.all([
        fetch('/api/tutoring/stats'),
        fetch('/api/tutoring/alerts'),
        fetch('/api/tutoring'),
        fetch('/api/students'),
        fetch('/api/classes'),
        fetch('/api/users')
      ]);

      const [statsData, alertsData, plansData, studentsData, classesData, usersData] = await Promise.all([
        statsRes.json(),
        alertsRes.json(),
        plansRes.json(),
        studentsRes.json(),
        classesRes.json(),
        usersRes.json()
      ]);

      if (statsData.success) setStats(statsData.data);
      if (alertsData.success) setAlerts(alertsData.data || []);
      if (plansData.success) setPlans(plansData.data || []);
      if (studentsData.success) setStudents(studentsData.data || []);
      if (classesData.success) setClasses(classesData.data || []);
      if (usersData.success) {
        const teacherUsers = (usersData.data || []).filter(
          (u) => u.role === 'TEACHER' || u.role === 'DIRECTOR' || u.role === 'CSKH' || u.role === 'ADVISOR'
        );
        setTeachers(teacherUsers);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu phụ đạo:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Bỏ qua cảnh báo học viên
  const handleDismissAlert = async (cand) => {
    if (!confirm(`Bạn có chắc muốn bỏ qua cảnh báo của học viên ${cand.studentName}?`)) return;
    try {
      const res = await fetch('/api/tutoring/alerts/dismiss', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: cand.studentId,
          alertKey: cand.alertKey,
          reason: 'Người dùng bấm bỏ qua trên Dashboard'
        })
      });
      const json = await res.json();
      if (json.success) {
        setAlerts((prev) => prev.filter((a) => `${a.studentId}|${a.alertKey}` !== `${cand.studentId}|${cand.alertKey}`));
        setStats((prev) => ({ ...prev, alertCount: Math.max(0, prev.alertCount - 1) }));
      }
    } catch (e) {
      console.error(e);
      alert('Không thể bỏ qua cảnh báo');
    }
  };

  // Mở modal xếp lịch từ cảnh báo
  const handleOpenScheduleFromAlert = (cand) => {
    setSchedulePrefill(cand);
    setIsScheduleOpen(true);
  };

  // Mở modal tạo mới tự do
  const handleOpenScheduleNew = () => {
    setSchedulePrefill(null);
    setIsScheduleOpen(true);
  };

  // Sau khi tạo thành công
  const handleScheduleSuccess = (createdPlan, andExport = false) => {
    setIsScheduleOpen(false);
    setSchedulePrefill(null);
    fetchData();

    if (andExport && createdPlan) {
      setLetterPlan(createdPlan);
      setIsLetterOpen(true);
    }
  };

  // Hủy đợt phụ đạo
  const handleCancelPlan = async (plan) => {
    if (!confirm(`Bạn có chắc muốn hủy đợt phụ đạo ${plan.planCode} của học viên ${plan.student?.name}?`)) return;
    try {
      const res = await fetch(`/api/tutoring/${plan.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert(json.error || 'Không thể hủy đợt phụ đạo');
      }
    } catch (e) {
      console.error(e);
      alert('Lỗi hủy đợt phụ đạo');
    }
  };

  // Mở modal đánh giá sau buổi học
  const handleOpenCompleteModal = (session, plan) => {
    setCompleteTarget({ session, plan });
    setIsCompleteOpen(true);
  };

  // Lọc danh sách theo Tab, Giáo viên và Tìm kiếm
  const filteredPlans = plans.filter((plan) => {
    // 1. Lọc theo tab
    if (activeTab === 'SCHEDULED' && plan.status !== 'SCHEDULED' && plan.status !== 'IN_PROGRESS') return false;
    if (activeTab === 'COMPLETED' && plan.status !== 'COMPLETED') return false;
    if (activeTab === 'CANCELLED' && plan.status !== 'CANCELLED') return false;

    // 2. Lọc theo giáo viên
    if (teacherFilter && plan.teacherId !== teacherFilter) return false;

    // 3. Tìm kiếm từ khóa
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const stName = (plan.student?.name || '').toLowerCase();
      const stPhone = (plan.student?.phone || '').toLowerCase();
      const code = (plan.planCode || '').toLowerCase();
      const cls = (plan.classCode || '').toLowerCase();
      const tutor = (plan.tutorName || '').toLowerCase();
      const hasRoom = (plan.sessions || []).some((s) => (s.roomName || '').toLowerCase().includes(q));

      if (!stName.includes(q) && !stPhone.includes(q) && !code.includes(q) && !cls.includes(q) && !tutor.includes(q) && !hasRoom) {
        return false;
      }
    }

    return true;
  });

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen text-slate-800">
      {/* Tiêu đề trang */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-sm">
              <i className="fa-solid fa-book-open-reader"></i>
            </span>
            Quản Lý Phụ Đạo & Bù Bài
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Hệ thống tự động phát hiện học viên vắng học / hổng kiến thức, điều phối lịch kèm và xuất thư báo phụ huynh
          </p>
        </div>

        <button
          onClick={handleOpenScheduleNew}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center gap-2 self-start md:self-auto transition-all"
        >
          <i className="fa-solid fa-plus"></i>
          Tạo Buổi Phụ Đạo Mới
        </button>
      </div>

      {/* 4 Thẻ Thống Kê (Stat Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Cảnh báo Cần Phụ Đạo */}
        <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Cảnh báo Cần Phụ Đạo</span>
            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </span>
          </div>
          <div className="text-3xl font-black text-red-600 mt-3">{stats.alertCount}</div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.scheduledStudentsCount} học viên đã được lên lịch
          </p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
        </div>

        {/* Card 2: Đang Lên Lịch */}
        <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Đang Lên Lịch (Chờ học)</span>
            <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-calendar-days"></i>
            </span>
          </div>
          <div className="text-3xl font-black text-blue-600 mt-3">{stats.scheduledCount}</div>
          <p className="text-xs text-gray-500 mt-1">{stats.scheduledCount} Buổi học sắp tới</p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
        </div>

        {/* Card 3: Đã Hoàn Thành */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Đã Hoàn Thành</span>
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-circle-check"></i>
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-600 mt-3">{stats.completedCount}</div>
          <p className="text-xs text-gray-500 mt-1">Đã điểm danh & đánh giá tiếp thu</p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
        </div>

        {/* Card 4: Tổng Số Buổi Tổ Chức */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Tổng Số Buổi Tổ Chức</span>
            <span className="w-8 h-8 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center text-sm">
              <i className="fa-solid fa-chart-pie"></i>
            </span>
          </div>
          <div className="text-3xl font-black text-gray-900 mt-3">{stats.totalCount}</div>
          <p className="text-xs text-gray-500 mt-1">{stats.cancelledCount} buổi đã hủy</p>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-500/5 rounded-full -mr-8 -mt-8 pointer-events-none"></div>
        </div>
      </div>

      {/* Hàng Đợi Cảnh Báo Học Viên Cần Phụ Đạo & Bù Bài */}
      <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-red-50/70 border-b border-red-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
            <div>
              <h2 className="text-sm font-bold text-red-900 flex items-center gap-2">
                <i className="fa-solid fa-bell text-red-600"></i>
                Hàng Đợi Cảnh Báo Học Viên Cần Phụ Đạo & Bù Bài ({alerts.length})
              </h2>
              <p className="text-xs text-red-700/80">
                Tự động quét từ hệ thống Điểm danh: Học viên vắng liên tiếp hoặc hổng kỹ năng cần bổ trợ
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenScheduleNew}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 self-start md:self-auto transition-colors"
          >
            <i className="fa-solid fa-plus"></i>
            Tạo buổi phụ đạo mới
          </button>
        </div>

        <div className="p-6">
          {alerts.length === 0 ? (
            <div className="py-8 text-center flex flex-col items-center justify-center text-gray-500">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl mb-2">
                <i className="fa-solid fa-check"></i>
              </div>
              <p className="font-semibold text-sm text-gray-700">Tuyệt vời! Hiện không có cảnh báo mới.</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Không có học viên nào vắng từ 2 buổi liên tiếp hoặc hổng kiến thức chưa được xử lý.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alerts.map((cand, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-red-100 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-3 relative overflow-hidden"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <strong className="text-sm font-bold text-gray-900">{cand.studentName}</strong>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 whitespace-nowrap">
                        Vắng {cand.consecutiveAbsences} buổi
                      </span>
                    </div>

                    <div className="text-xs text-gray-500 space-y-0.5">
                      <div>
                        Lớp: <span className="font-semibold text-gray-700">{cand.classCode}</span>
                      </div>
                      <div>
                        SĐT: <span className="text-gray-700">{cand.phone}</span>
                      </div>
                      <div>
                        GV chủ nhiệm: <span className="text-indigo-900 font-medium">{cand.teacherName}</span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-red-50 text-[11px] text-red-800 leading-snug">
                      <i className="fa-solid fa-clock-rotate-left mr-1"></i>
                      {cand.reason}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2 text-xs">
                    <button
                      onClick={() => handleDismissAlert(cand)}
                      className="px-2.5 py-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors font-medium"
                    >
                      Bỏ qua
                    </button>
                    <button
                      onClick={() => handleOpenScheduleFromAlert(cand)}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                    >
                      <i className="fa-solid fa-calendar-plus"></i>
                      Xếp lịch ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Tabs Trạng thái */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl self-start text-xs font-bold">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'SCHEDULED', label: 'Đã lên lịch' },
            { id: 'COMPLETED', label: 'Đã hoàn thành' },
            { id: 'CANCELLED', label: 'Đã hủy' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm font-black'
                  : 'text-gray-600 hover:text-gray-900 font-semibold'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lọc theo giáo viên & Ô tìm kiếm */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="w-full sm:w-auto px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 bg-white"
          >
            <option value="">-- Tất cả giáo viên --</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName} {t.shortName ? `(${t.shortName})` : ''}
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên học viên, mã buổi..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>
      </div>

      {/* Bảng Danh Sách Buổi Phụ Đạo & Bù Bài */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[11px] tracking-wider">
                <th className="px-4 py-3.5">Mã Đợt / Buổi</th>
                <th className="px-4 py-3.5">Học Viên & Lớp</th>
                <th className="px-4 py-3.5">Loại Buổi & Kỹ Năng</th>
                <th className="px-4 py-3.5">Lịch Học & Phòng Học (Trực tiếp)</th>
                <th className="px-4 py-3.5">Giáo Viên Kèm</th>
                <th className="px-4 py-3.5">Trạng Thái</th>
                <th className="px-4 py-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <i className="fa-solid fa-spinner fa-spin text-xl mb-2 block"></i>
                    Đang tải danh sách phụ đạo & bù bài...
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                    <i className="fa-regular fa-folder-open text-2xl mb-2 block"></i>
                    Chưa có buổi phụ đạo nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Mã đợt */}
                    <td className="px-4 py-3.5 align-top">
                      <span className="font-bold text-indigo-900 block">{plan.planCode}</span>
                      <span className="text-[10px] text-gray-400">
                        {plan.sessions?.length || 1} buổi học
                      </span>
                    </td>

                    {/* 2. Học viên & Lớp */}
                    <td className="px-4 py-3.5 align-top">
                      <strong className="text-gray-900 block font-bold text-sm">
                        {plan.student?.name}
                      </strong>
                      <span className="text-gray-500 text-[11px] block">
                        {plan.student?.phone || 'Chưa có SĐT'}
                      </span>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[10px] font-semibold">
                        {plan.classCode || 'Lớp riêng'}
                      </span>
                    </td>

                    {/* 3. Loại buổi & Kỹ năng */}
                    <td className="px-4 py-3.5 align-top space-y-1">
                      <span className="font-semibold text-gray-800 block text-[11px]">
                        {plan.sessionType}
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px]">
                        {plan.focusSkills}
                      </span>
                      {plan.content && (
                        <p className="text-[11px] text-gray-500 line-clamp-1 italic">{plan.content}</p>
                      )}
                    </td>

                    {/* 4. Lịch học & Phòng học */}
                    <td className="px-4 py-3.5 align-top space-y-1.5">
                      {(plan.sessions || []).map((s, sIdx) => (
                        <div
                          key={s.id || sIdx}
                          className="flex items-center justify-between gap-3 p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-indigo-900 mr-2">
                              Buổi {s.sessionNumber}:
                            </span>
                            <span className="font-semibold text-gray-800 mr-1.5">{s.teachingDate}</span>
                            <span className="text-amber-800 font-bold">
                              ({s.startTimeText || '16:30'} – {s.endTimeText || '17:30'})
                            </span>
                            <span className="text-gray-500 block text-[10px]">
                              📍 {s.roomName || 'Phòng học tại trung tâm'}
                            </span>
                          </div>

                          <div>
                            {s.status === 'COMPLETED' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {s.attendanceStatus || 'Có mặt'} ({s.evaluation || 'Tốt'})
                              </span>
                            ) : s.status === 'CANCELLED' ? (
                              <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-600 font-bold text-[10px]">
                                Đã hủy
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenCompleteModal(s, plan)}
                                className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] shadow-sm flex items-center gap-1 transition-colors whitespace-nowrap"
                              >
                                <i className="fa-solid fa-check"></i>
                                Điểm danh
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </td>

                    {/* 5. Giáo viên kèm */}
                    <td className="px-4 py-3.5 align-top">
                      <span className="font-bold text-gray-800 block text-xs">
                        {plan.tutorName || 'Chưa phân công'}
                      </span>
                    </td>

                    {/* 6. Trạng thái đợt */}
                    <td className="px-4 py-3.5 align-top">
                      {plan.status === 'COMPLETED' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <i className="fa-solid fa-circle-check"></i> Đã hoàn thành
                        </span>
                      ) : plan.status === 'IN_PROGRESS' ? (
                        <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <i className="fa-solid fa-spinner fa-spin"></i> Đang phụ đạo
                        </span>
                      ) : plan.status === 'CANCELLED' ? (
                        <span className="px-2.5 py-1 rounded-full bg-gray-200 text-gray-700 font-bold text-[10px] inline-flex items-center gap-1">
                          <i className="fa-solid fa-ban"></i> Đã hủy
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-[10px] inline-flex items-center gap-1">
                          <i className="fa-regular fa-clock"></i> Đã lên lịch
                        </span>
                      )}

                      {plan.letterExportedAt && (
                        <span className="block text-[10px] text-emerald-600 font-semibold mt-1">
                          ✓ Đã gửi thư PH
                        </span>
                      )}
                    </td>

                    {/* 7. Thao tác */}
                    <td className="px-4 py-3.5 align-top text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setLetterPlan(plan);
                            setIsLetterOpen(true);
                          }}
                          title="Xuất thư hẹn phụ huynh (gửi Zalo)"
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs flex items-center gap-1 transition-colors"
                        >
                          <i className="fa-solid fa-envelope-open-text"></i>
                          Xuất Thư
                        </button>

                        {plan.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancelPlan(plan)}
                            title="Hủy đợt phụ đạo này"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <i className="fa-regular fa-trash-can"></i>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Lên lịch phụ đạo */}
      <TutoringScheduleModal
        isOpen={isScheduleOpen}
        onClose={() => {
          setIsScheduleOpen(false);
          setSchedulePrefill(null);
        }}
        onSuccess={handleScheduleSuccess}
        prefillData={schedulePrefill}
        students={students}
        classes={classes}
        teachers={teachers}
      />

      {/* Modal 2: Thư hẹn phụ huynh (Xuất ảnh Zalo) */}
      <TutoringLetterModal
        isOpen={isLetterOpen}
        onClose={() => {
          setIsLetterOpen(false);
          setLetterPlan(null);
          fetchData();
        }}
        plan={letterPlan}
      />

      {/* Modal 3: Điểm danh & Đánh giá tiếp thu sau buổi học */}
      <TutoringCompleteModal
        isOpen={isCompleteOpen}
        onClose={() => {
          setIsCompleteOpen(false);
          setCompleteTarget({ session: null, plan: null });
        }}
        onSuccess={() => {
          setIsCompleteOpen(false);
          setCompleteTarget({ session: null, plan: null });
          fetchData();
        }}
        session={completeTarget.session}
        plan={completeTarget.plan}
      />
    </div>
  );
}
