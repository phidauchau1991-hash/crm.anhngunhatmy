'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardReviewClient from './DashboardReviewClient';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  
  // Smart Alerts State (Sprint 2)
  const [attendanceAlerts, setAttendanceAlerts] = useState([]);
  const [showAttendanceAlertsModal, setShowAttendanceAlertsModal] = useState(false);

  // CRM Alerts (Sprint 5)
  const [crmAlerts, setCrmAlerts] = useState({ birthdays: [], paused: [], tuition: [] });

  // Review Alerts - Cảnh báo Học thử & Nhận xét Định kỳ (Sprint 6)
  const [reviewAlerts, setReviewAlerts] = useState({ trialAlerts: [], reviewAlerts: [] });

  // AI Modal State (Sprint 3 Dashboard)
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStudent, setAiStudent] = useState(null);
  const [aiMessage, setAiMessage] = useState('');
  const [aiTone, setAiTone] = useState('encouraging');
  const [aiSource, setAiSource] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    try {
      let url = `/api/dashboard/stats?preset=${preset}`;
      if (preset === 'custom') {
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
      }
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setStatsData(json.data);
      }
    } catch (err) {
      console.error('Không thể tải thống kê Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [preset, startDate, endDate]);

  useEffect(() => {
    // Fetch Smart Alerts
    fetch('/api/dashboard/alerts')
      .then(res => res.json())
      .then(json => {
        if (json.success) setAttendanceAlerts(json.data);
      })
      .catch(err => console.error('Lỗi tải cảnh báo thông minh:', err));

    // Fetch CRM Alerts (Sprint 5)
    fetch('/api/crm-alerts')
      .then(res => res.json())
      .then(json => {
        if (json.success) setCrmAlerts(json.data);
      })
      .catch(err => console.error('Lỗi tải CRM Alerts:', err));

    // Fetch Review Alerts - Học thử & Nhận xét Định kỳ (Sprint 6)
    fetch('/api/dashboard/review-alerts')
      .then(res => res.json())
      .then(json => {
        if (json.success) setReviewAlerts(json.data);
      })
      .catch(err => console.error('Lỗi tải Review Alerts:', err));
  }, []);

  const openAiAlertModal = (alertData, type = 'alert') => {
    const dataWithType = { ...alertData, aiType: type };
    setAiStudent(dataWithType);
    setShowAiModal(true);
    generateAiAlertReport(dataWithType, aiTone);
  };

  const generateAiAlertReport = async (alertData, toneOverride) => {
    if (!alertData) return;
    setAiLoading(true);
    try {
      let endpoint = '/api/ai/suggest-report';
      let bodyData = {};

      if (alertData.aiType === 'birthday') {
        endpoint = '/api/ai/birthday-wish';
        let age = '';
        if (alertData.dob) {
          const birthYear = new Date(alertData.dob).getFullYear();
          age = new Date().getFullYear() - birthYear;
        }
        bodyData = { studentName: alertData.name, age: age, tone: toneOverride || aiTone };
      } else if (alertData.aiType === 'tuition') {
        endpoint = '/api/ai/tuition-reminder';
        bodyData = { 
          studentName: alertData.student?.name || 'Học viên', 
          amount: (alertData.feeToPay || 0) - (alertData.amountPaid || 0), 
          policy: 'Đóng trước khóa học', 
          tone: toneOverride || aiTone 
        };
      } else {
        bodyData = {
          studentName: alertData.studentName,
          alerts: alertData.alerts,
          type: 'alert',
          tone: toneOverride || aiTone,
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const json = await res.json();
      if (json.success) {
        setAiMessage(json.data);
        setAiSource(json.source || 'gemini');
      } else {
        setAiMessage('Không thể tạo tin nhắn AI. Lỗi: ' + json.error);
      }
    } catch (e) {
      setAiMessage('Lỗi kết nối khi tạo tin nhắn AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const copyToClipboard = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const statusCounts = statsData?.statusCounts || { studying: 0, paused: 0, reserved: 0, dropout: 0, total: 0 };
  const financeStats = statsData?.financeStats || { revenue: 0, debt: 0, totalFeeToPay: 0, ordersCount: 0 };
  const leadsStats = statsData?.leadsStats || { totalLeads: 0, convertedLeads: 0, conversionRate: 0 };
  const lowStockItems = statsData?.lowStockItems || [];
  const alertsStudents = statsData?.alertsStudents || [];

  return (
    <div className="dashboard-page">
      <DashboardReviewClient />

      {/* Header Welcome */}
      <div className="dashboard-welcome">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1>Chào mừng trở lại, <span className="text-gradient">Giám đốc Nhật Mỹ</span>!</h1>
            <p>Dưới đây là tổng quan hoạt động và báo cáo tài chính của trung tâm theo mốc thời gian.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {alertsStudents.length > 0 && (
              <button 
                onClick={() => setShowAlertsModal(true)}
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid #3b82f6',
                  color: '#1d4ed8',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                className="hover-lift"
              >
                <i className="fa-solid fa-phone" style={{ color: '#2563eb' }}></i>
                <span>Cần gọi điện: <strong style={{ color: '#1d4ed8', fontSize: '1rem' }}>{alertsStudents.length}</strong> học viên</span>
              </button>
            )}
            {attendanceAlerts.length > 0 && (
              <button 
                onClick={() => setShowAttendanceAlertsModal(true)}
                style={{
                  background: 'rgba(220, 38, 38, 0.15)',
                  border: '1px solid #dc2626',
                  color: '#991b1b',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                className="hover-lift"
              >
                <i className="fa-solid fa-triangle-exclamation animate-pulse" style={{ color: '#dc2626' }}></i>
                <span>Cảnh báo vi phạm: <strong style={{ color: '#991b1b', fontSize: '1rem' }}>{attendanceAlerts.length}</strong> HV</span>
              </button>
            )}
            {lowStockItems.length > 0 && (
              <div className="inventory-warning-banner">
                <i className="fa-solid fa-triangle-exclamation text-danger animate-pulse"></i>
                <span>
                  Có <strong className="text-danger">{lowStockItems.length}</strong> vật tư sắp hết hàng!
                  <a href="/inventory" className="warning-link">Xem chi tiết &rarr;</a>
                </span>
              </div>
            )}
            {(reviewAlerts.trialAlerts.length > 0) && (
              <Link 
                href="/dashboard/reviews?tab=trial"
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  border: '1px solid #8b5cf6',
                  color: '#6d28d9',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                className="hover-lift"
              >
                <i className="fa-solid fa-user-clock animate-pulse" style={{ color: '#8b5cf6' }}></i>
                <span>Học thử cần nhận xét: <strong style={{ color: '#6d28d9', fontSize: '1rem' }}>{reviewAlerts.trialAlerts.length}</strong></span>
              </Link>
            )}
            {(reviewAlerts.reviewAlerts.length > 0) && (
              <Link 
                href="/dashboard/reviews?tab=periodic"
                style={{
                  background: 'rgba(6, 182, 212, 0.15)',
                  border: '1px solid #06b6d4',
                  color: '#0e7490',
                  padding: '0.5rem 0.85rem',
                  borderRadius: '8px',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                className="hover-lift"
              >
                <i className="fa-solid fa-clipboard-check" style={{ color: '#06b6d4' }}></i>
                <span>Cần nhận xét định kỳ: <strong style={{ color: '#0e7490', fontSize: '1rem' }}>{reviewAlerts.reviewAlerts.length}</strong> HV</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* TOOLBAR MỐC THỜI GIAN LỌC DOANH THU & HỌC VIÊN */}
      <div className="toolbar-panel glass-panel animated-scale" style={{ margin: '1.25rem 0', padding: '1rem 1.25rem', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-calendar-days"></i> Mốc thời gian báo cáo:
            </span>
            
            <div className="preset-buttons" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'today', label: 'Hôm nay' },
                { id: 'thisWeek', label: 'Tuần này' },
                { id: 'thisMonth', label: 'Tháng này' },
                { id: 'lastMonth', label: 'Tháng trước' },
                { id: 'thisQuarter', label: 'Quý này' },
                { id: 'thisYear', label: 'Năm nay' },
                { id: 'custom', label: 'Tùy chọn' },
              ].map(p => (
                <button
                  key={p.id}
                  className={`btn-preset ${preset === p.id ? 'active' : ''}`}
                  onClick={() => setPreset(p.id)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    borderRadius: '6px',
                    border: preset === p.id ? 'none' : '1px solid var(--color-border)',
                    background: preset === p.id ? 'var(--color-primary)' : 'var(--color-surface)',
                    color: preset === p.id ? '#fff' : 'var(--color-text)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {preset === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              />
              <span>đến</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                style={{ padding: '0.35rem 0.6rem', borderRadius: '6px', border: '1px solid var(--color-border)', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* TOP METRICS STATS GRID */}
      <div className="stats-grid">
        {/* Doanh thu thực thu */}
        <div className="stat-card hover-lift" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <i className="fa-solid fa-sack-dollar"></i>
          </div>
          <div className="stat-info">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Doanh thu thu thực tế</span>
            <h2 style={{ color: '#10b981', fontSize: '1.4rem', margin: '0.15rem 0' }}>
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : `${financeStats.revenue.toLocaleString('vi-VN')} đ`}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Phát sinh trong mốc đã chọn</span>
          </div>
        </div>

        {/* Công nợ phát sinh */}
        <div className="stat-card hover-lift" style={{ borderLeft: '4px solid var(--color-warning)' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <i className="fa-solid fa-hand-holding-dollar"></i>
          </div>
          <div className="stat-info">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Công nợ học phí</span>
            <h2 style={{ color: '#f59e0b', fontSize: '1.4rem', margin: '0.15rem 0' }}>
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : `${financeStats.debt.toLocaleString('vi-VN')} đ`}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Còn phải thu trong mốc chọn</span>
          </div>
        </div>

        {/* KHTN Chuyển đổi */}
        <div className="stat-card hover-lift" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <i className="fa-solid fa-filter-circle-dollar"></i>
          </div>
          <div className="stat-info">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>KHTN / Tỷ lệ chốt</span>
            <h2 style={{ color: '#3b82f6', fontSize: '1.4rem', margin: '0.15rem 0' }}>
              {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : `${leadsStats.totalLeads} Lead (${leadsStats.conversionRate}%)`}
            </h2>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{leadsStats.convertedLeads} học viên chốt thành công</span>
          </div>
        </div>

        {/* Lớp & Cảnh báo kho */}
        <a href="/inventory" className="stat-card hover-lift block" style={{ textDecoration: 'none', color: 'inherit', borderLeft: lowStockItems.length > 0 ? '4px solid var(--color-danger)' : '4px solid #8b5cf6' }}>
          <div className="stat-icon" style={{ background: lowStockItems.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(139, 92, 246, 0.1)', color: lowStockItems.length > 0 ? 'var(--color-danger)' : '#8b5cf6' }}>
            <i className={lowStockItems.length > 0 ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-boxes-stacked"}></i>
          </div>
          <div className="stat-info">
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: '600' }}>Vật tư dưới ngưỡng</span>
            <h2 className={lowStockItems.length > 0 ? "text-danger animate-pulse" : ""} style={{ fontSize: '1.4rem', margin: '0.15rem 0' }}>
              {lowStockItems.length}
            </h2>
            <span style={{ fontSize: '0.75rem', color: lowStockItems.length > 0 ? 'var(--color-danger)' : '#64748b', fontWeight: '600' }}>
              {lowStockItems.length > 0 ? 'Cần nhập bổ sung kho' : 'Tồn kho an toàn 100%'}
            </span>
          </div>
        </a>
      </div>

      {/* KHU VỰC PHÂN PHÓI TRẠNG THÁI HỌC VIÊN */}
      <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '12px', margin: '1.5rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-users-viewfinder"></i> Phân loại Học viên theo Trạng thái Vận hành
          </h3>
          <Link href="/students" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Quản lý Học viên &rarr;
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Đang học */}
          <Link href="/students?studentStatus=Đang học" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }} className="hover-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: '#047857', fontSize: '0.9rem' }}>Đang học</span>
                <i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#065f46', margin: '0.3rem 0 0 0' }}>
                {statusCounts.studying} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>HV</span>
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#047857' }}>Đang theo học tại các lớp</span>
            </div>
          </Link>

          {/* Tạm nghỉ */}
          <Link href="/students?studentStatus=Tạm nghỉ" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }} className="hover-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: '#b45309', fontSize: '0.9rem' }}>Tạm nghỉ</span>
                <i className="fa-solid fa-user-clock" style={{ color: '#f59e0b' }}></i>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#92400e', margin: '0.3rem 0 0 0' }}>
                {statusCounts.paused} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>HV</span>
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#b45309' }}>Có ngày hẹn liên hệ CSKH</span>
            </div>
          </Link>

          {/* Bảo lưu */}
          <Link href="/students?studentStatus=Bảo lưu" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(13, 136, 196, 0.08)',
              border: '1px solid rgba(13, 136, 196, 0.3)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }} className="hover-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: 'var(--color-primary-dark)', fontSize: '0.9rem' }}>Bảo lưu</span>
                <i className="fa-solid fa-piggy-bank" style={{ color: 'var(--color-primary)' }}></i>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--color-primary-dark)', margin: '0.3rem 0 0 0' }}>
                {statusCounts.reserved} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>HV</span>
              </h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-dark)' }}>Số tiền bảo lưu được bảo lưu</span>
            </div>
          </Link>

          {/* Nghỉ luôn / Thôi học */}
          <Link href="/students?studentStatus=Nghỉ luôn" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '1rem',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              cursor: 'pointer',
              transition: 'transform 0.2s ease'
            }} className="hover-lift">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', color: '#b91c1c', fontSize: '0.9rem' }}>Nghỉ luôn / Thôi học</span>
                <i className="fa-solid fa-user-xmark" style={{ color: '#ef4444' }}></i>
              </div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#991b1b', margin: '0.3rem 0 0 0' }}>
                {statusCounts.dropout} <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>HV</span>
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Đã có lý do giải trình dropout</span>
            </div>
          </Link>
        </div>
      </div>

      {/* DETAILS GRID: NHẮC NHỞ & CHI TIẾT */}
      <div className="details-grid">
        {/* Tình hình tài chính trong mốc thời gian */}
        <div className="details-card glass-panel hover-lift" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: 'white', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-chart-pie text-warning"></i> Báo cáo Dòng tiền & Giao dịch
            </h3>
            <Link href="/finance" style={{ fontSize: '0.8rem', color: '#38bdf8', textDecoration: 'none', fontWeight: '600', padding: '0.3rem 0.6rem', background: 'rgba(56, 189, 248, 0.1)', borderRadius: '6px' }}>Xem Tài chính &rarr;</Link>
          </div>
          <div className="card-body" style={{ padding: '1.5rem', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', padding: '1.25rem', borderRadius: '12px', border: '1px solid #10b981', position: 'relative', overflow: 'hidden' }}>
                <i className="fa-solid fa-arrow-trend-up" style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '4rem', color: '#10b981', opacity: 0.1 }}></i>
                <span style={{ fontSize: '0.85rem', color: '#047857', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>THỰC THU TRONG KỲ</span>
                <h3 style={{ color: '#059669', fontSize: '1.6rem', margin: 0, fontWeight: '800' }}>
                  {financeStats.revenue.toLocaleString("vi-VN")} <span style={{ fontSize: '1rem' }}>đ</span>
                </h3>
              </div>
              
              <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', padding: '1.25rem', borderRadius: '12px', border: '1px solid #f59e0b', position: 'relative', overflow: 'hidden' }}>
                <i className="fa-solid fa-file-invoice-dollar" style={{ position: 'absolute', right: '-10px', bottom: '-10px', fontSize: '4rem', color: '#f59e0b', opacity: 0.1 }}></i>
                <span style={{ fontSize: '0.85rem', color: '#b45309', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>CÔNG NỢ PHÁT SINH</span>
                <h3 style={{ color: '#d97706', fontSize: '1.6rem', margin: 0, fontWeight: '800' }}>
                  {financeStats.debt.toLocaleString("vi-VN")} <span style={{ fontSize: '1rem' }}>đ</span>
                </h3>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Tổng số lượng hóa đơn:</span>
                <strong style={{ fontSize: '1.1rem', color: '#0f172a' }}>{financeStats.ordersCount}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '600' }}>Hóa đơn chưa thu đủ:</span>
                <strong style={{ fontSize: '1.1rem', color: '#ef4444' }}>{financeStats.unpaidOrdersCount}</strong>
              </div>
              
              {/* Progress Bar Mini */}
              <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', marginTop: '0.75rem', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${financeStats.ordersCount > 0 ? ((financeStats.ordersCount - financeStats.unpaidOrdersCount) / financeStats.ordersCount) * 100 : 0}%`, background: '#10b981' }}></div>
                <div style={{ width: `${financeStats.ordersCount > 0 ? (financeStats.unpaidOrdersCount / financeStats.ordersCount) * 100 : 0}%`, background: '#f59e0b' }}></div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Nhắc nhở chăm sóc & Bảo lưu */}
        <div className="details-card glass-panel">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3><i className="fa-solid fa-bell"></i> Nhắc nhở chăm sóc & bảo lưu</h3>
            {alertsStudents.length > 0 && (
              <button 
                onClick={() => setShowAlertsModal(true)} 
                style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Xem chi tiết tất cả ({alertsStudents.length}) &rarr;
              </button>
            )}
          </div>
          <div className="card-body">
            {alertsStudents.length === 0 ? (
              <div className="empty-state">
                <i className="fa-regular fa-circle-check text-success"></i>
                <p>Không có học viên nào cần liên hệ chăm sóc hoặc sắp hết hạn bảo lưu.</p>
              </div>
            ) : (
              <div className="alert-list">
                {alertsStudents.slice(0, 5).map(student => (
                  <div className="alert-item" key={student.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="item-details">
                      <strong>{student.name} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>({student.id})</span></strong>
                      <span className={`badge-status ${student.status === 'Tạm nghỉ' ? 'bg-warning-light' : 'bg-info-light'}`} style={{ marginLeft: '0.5rem' }}>
                        {student.status}
                      </span>
                    </div>
                    <div className="item-action" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {student.status === 'Tạm nghỉ' ? (
                        <span className="text-warning" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          Hẹn: {student.callbackDate ? new Date(student.callbackDate).toLocaleDateString('vi-VN') : 'N/A'}
                        </span>
                      ) : (
                        <span className="text-info" style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                          Hạn: {student.reservationDeadline ? new Date(student.reservationDeadline).toLocaleDateString('vi-VN') : 'N/A'}
                        </span>
                      )}
                      <Link href="/students" className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                        Xử lý
                      </Link>
                    </div>
                  </div>
                ))}
                {alertsStudents.length > 5 && (
                  <button 
                    onClick={() => setShowAlertsModal(true)} 
                    style={{ width: '100%', marginTop: '0.5rem', padding: '0.5rem', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '6px', color: 'var(--color-primary)', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    Xem thêm {alertsStudents.length - 5} học viên khác &rarr;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CRM ALERTS (SPRINT 5) */}
      <div className="crm-alerts-panel glass-panel" style={{ padding: '1.5rem', borderRadius: '12px', margin: '1.5rem 0' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-bell text-warning"></i> Trung tâm Nhắc nhở Tự động (CRM Alerts)
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {/* Sinh nhật */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', background: '#fdf4ff', borderBottom: '1px solid #fbcfe8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#be185d', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><i className="fa-solid fa-cake-candles"></i> Sinh nhật sắp tới ({crmAlerts.birthdays.filter(s => s.isUpcoming).length})</strong>
              <span style={{ fontSize: '0.75rem', background: '#fce7f3', color: '#9d174d', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>Tháng {new Date().getMonth() + 1}</span>
            </div>
            <div style={{ padding: '1rem' }}>
              {crmAlerts.birthdays.filter(s => s.isUpcoming).length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Không có sinh nhật nào trong 5 ngày tới.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {crmAlerts.birthdays.filter(s => s.isUpcoming).map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{s.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(s.dob).toLocaleDateString('vi-VN')} (Còn {s.daysUntil} ngày)</span>
                      </div>
                      <button onClick={() => openAiAlertModal(s, 'birthday')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', cursor: 'pointer' }}>AI Chúc</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Học phí */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', background: '#fef2f2', borderBottom: '1px solid #fecaca', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><i className="fa-solid fa-money-bill-wave"></i> Nhắc đóng học phí ({crmAlerts.tuition.length})</strong>
              <span style={{ fontSize: '0.75rem', background: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>&gt;20 ngày</span>
            </div>
            <div style={{ padding: '1rem' }}>
              {crmAlerts.tuition.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Không có khoản học phí nào bị trễ.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {crmAlerts.tuition.map(order => (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{order.student?.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lớp {order.class?.code} - {((order.feeToPay || 0) - (order.amountPaid || 0)).toLocaleString('vi-VN')}đ</span>
                      </div>
                      <button onClick={() => openAiAlertModal(order, 'tuition')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', border: 'none', cursor: 'pointer' }}>AI Nhắc</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hết hạn bảo lưu/Tạm nghỉ */}
          <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', background: '#fff7ed', borderBottom: '1px solid #fed7aa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#c2410c', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><i className="fa-solid fa-clock-rotate-left"></i> Sắp hết hạn tạm nghỉ ({crmAlerts.paused.length})</strong>
              <span style={{ fontSize: '0.75rem', background: '#ffedd5', color: '#9a3412', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>3-5 ngày</span>
            </div>
            <div style={{ padding: '1rem' }}>
              {crmAlerts.paused.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Không có học viên nào sắp hết hạn nghỉ.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {crmAlerts.paused.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{s.name}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Hẹn quay lại: {new Date(s.callbackDate).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <Link href={`/students/${s.id}`} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>Chi tiết</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CẢNH BÁO HỌC THỬ (Sprint 6) */}
          <div id="trial-alerts-panel" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#6d28d9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><i className="fa-solid fa-user-clock"></i> Học viên Học thử cần Nhận xét ({reviewAlerts.trialAlerts.length})</strong>
              <span style={{ fontSize: '0.75rem', background: '#ede9fe', color: '#5b21b6', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>2 & 4 buổi</span>
            </div>
            <div style={{ padding: '1rem' }}>
              {reviewAlerts.trialAlerts.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Không có học viên học thử nào cần nhận xét lúc này.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reviewAlerts.trialAlerts.map((t, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{t.leadName}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lớp {t.classCode} • Đã học <strong style={{ color: '#6d28d9' }}>{t.totalSessions} buổi</strong></span>
                      </div>
                      <Link href={`/?action=review_trial&name=${encodeURIComponent(t.leadName || '')}&classCode=${encodeURIComponent(t.classCode || '')}&sessions=${t.totalSessions}`} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700' }}>Viết NX</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CẢNH BÁO NHẬN XÉT ĐỊNH KỲ (Sprint 6) */}
          <div id="review-alerts-panel" style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', background: '#ecfeff', borderBottom: '1px solid #a5f3fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <strong style={{ color: '#0e7490', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><i className="fa-solid fa-clipboard-check"></i> Cần Nhận xét Định kỳ ({reviewAlerts.reviewAlerts.length})</strong>
              <span style={{ fontSize: '0.75rem', background: '#cffafe', color: '#155e75', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>Mốc 8-16-24-32-36 buổi</span>
            </div>
            <div style={{ padding: '1rem' }}>
              {reviewAlerts.reviewAlerts.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>Không có học viên nào đến mốc nhận xét định kỳ.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reviewAlerts.reviewAlerts.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '0.9rem' }}>{r.studentName}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Lớp {r.classCode} • Đã học <strong style={{ color: '#0e7490' }}>{r.sessionCount} buổi</strong> (Mốc {r.milestone})</span>
                      </div>
                      <Link href={`/students/${r.studentId}?action=review&type=periodic&milestone=${r.milestone}`} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#06b6d4', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '700' }}>Viết NX</Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: CHI TIẾT DANH SÁCH HỌC VIÊN CẦN CHĂM SÓC & BẢO LƯU */}
      {showAlertsModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-bell text-warning"></i> Danh sách Học viên Tạm nghỉ & Bảo lưu cần Chăm sóc ({alertsStudents.length})
              </h2>
              <button className="close-btn" onClick={() => setShowAlertsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>
            </div>
            <div className="modal-body" style={{ marginTop: '1rem' }}>
              {alertsStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <p>Không có học viên nào trong danh sách nhắc nhở.</p>
                </div>
              ) : (
                <table className="custom-table" style={{ fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      <th>Họ và Tên / Mã HV</th>
                      <th>Lớp từng học</th>
                      <th>Trạng thái</th>
                      <th>Mốc thời gian cần liên hệ</th>
                      <th>Ghi chú / Số tiền bảo lưu</th>
                      <th style={{ textAlign: 'center' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alertsStudents.map(student => {
                      const classCodes = student.enrollments && student.enrollments.length > 0 
                        ? student.enrollments.map(e => e.classCode).join(', ') 
                        : 'Chưa xếp lớp';

                      return (
                        <tr key={student.id} className="table-row">
                          <td>
                            <strong style={{ display: 'block', color: 'var(--color-primary-dark)' }}>{student.name}</strong>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Mã: {student.id}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: '600', fontFamily: 'monospace' }}>{classCodes}</span>
                          </td>
                          <td>
                            <span className={`status-badge-profile ${student.status === 'Tạm nghỉ' ? 'bg-warning-light' : 'bg-info-light'}`}>
                              {student.status}
                            </span>
                          </td>
                          <td>
                            {student.status === 'Tạm nghỉ' ? (
                              <div>
                                <span style={{ fontWeight: '700', color: '#d97706' }}>
                                  Hẹn gọi: {student.callbackDate ? new Date(student.callbackDate).toLocaleDateString('vi-VN') : 'N/A'}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span style={{ fontWeight: '700', color: 'var(--color-primary)' }}>
                                  Hạn chót: {student.reservationDeadline ? new Date(student.reservationDeadline).toLocaleDateString('vi-VN') : 'N/A'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td style={{ maxWidth: '220px', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {student.status === 'Tạm nghỉ' ? (
                              <span><strong>Lý do:</strong> {student.dropoutReason || 'Chưa cập nhật lý do'}</span>
                            ) : (
                              <div>
                                <span><strong>Số tiền:</strong> {(student.reservationAmount || 0).toLocaleString('vi-VN')} đ</span> <br />
                                <span><strong>Ghi chú:</strong> {student.dropoutReason || 'Bảo lưu học phí'}</span>
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <Link 
                              href="/students" 
                              className="btn btn-primary"
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                            >
                              <i className="fa-solid fa-sliders"></i> Quản trị
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-actions" style={{ marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAlertsModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: SMART ALERTS */}
      {showAttendanceAlertsModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--color-danger)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-triangle-exclamation"></i> Danh sách Học viên Vi phạm Nội quy / Chuyên cần ({attendanceAlerts.length})
              </h2>
              <button className="close-btn" onClick={() => setShowAttendanceAlertsModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--color-text-muted)' }}>&times;</button>
            </div>
            <div className="modal-body" style={{ marginTop: '1rem' }}>
              <table className="custom-table" style={{ fontSize: '0.875rem' }}>
                <thead>
                  <tr>
                    <th>Học viên</th>
                    <th>Lớp học</th>
                    <th>Nội dung vi phạm</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceAlerts.map(alertData => (
                    <tr key={`${alertData.studentId}-${alertData.classCode}`} className="table-row">
                      <td>
                        <strong style={{ display: 'block', color: 'var(--color-primary-dark)' }}>{alertData.studentName}</strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>SĐT: {alertData.phone || 'N/A'}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: '700', fontFamily: 'monospace' }}>{alertData.classCode}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {alertData.alerts.map((a, idx) => (
                            <span key={idx} style={{ 
                              color: a.type === 'consecutiveAbsences' || a.type === 'totalAbsences' ? 'var(--color-danger)' : '#d97706',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}>
                              <i className="fa-solid fa-circle-exclamation"></i> {a.message}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          <button
                            onClick={() => openAiAlertModal(alertData)}
                            style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', transition: 'all 0.2s' }}
                          >
                            <i className="fa-solid fa-wand-magic-sparkles"></i> AI Nhắc nhở
                          </button>

                          <Link 
                            href={`/attendance?classCode=${alertData.classCode}`} 
                            className="btn btn-secondary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            <i className="fa-solid fa-arrow-right-to-bracket"></i> Điểm danh
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-actions" style={{ marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAttendanceAlertsModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: AI SOẠN TIN CẢNH BÁO (DASHBOARD SPRINT 3) */}
      {showAiModal && aiStudent && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated-scale" style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--color-primary-dark)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-wand-magic-sparkles" style={{ color: '#8b5cf6' }}></i> Trợ Lý AI Nhắc Cảnh Báo: <span style={{ color: 'var(--color-primary)' }}>{aiStudent.studentName}</span>
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
                        generateAiAlertReport(aiStudent, t.id);
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
                    {aiSource === 'gemini' ? '✨ Powered by Gemini AI' : '⚡ Natural Benefit Engine'}
                  </span>
                )}
              </div>

            </div>

            <div className="modal-actions" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => generateAiAlertReport(aiStudent, aiTone)}
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
                    copyToClipboard(aiMessage, `ai_${aiStudent.studentId}`);
                    setShowAiModal(false);
                  }}
                  style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <i className="fa-brands fa-whatsapp"></i> {copySuccess === `ai_${aiStudent.studentId}` ? 'Đã Copy!' : 'Copy Gửi Zalo'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
