'use client';

import React, { useState, useEffect, useMemo } from 'react';
import BatchModal from './components/BatchModal';
import CandidateModal from './components/CandidateModal';
import EmailReportModal from './components/EmailReportModal';
import { formatHotline, CAMBRIDGE_CONFIG } from '@/lib/cambridgeHelper';

export default function CambridgePage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [emailFilter, setEmailFilter] = useState('ALL');

  // Selected candidates for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals state
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);

  const [isCandidateModalOpen, setIsCandidateModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  const [isEmailReportOpen, setIsEmailReportOpen] = useState(false);
  const [emailReportData, setEmailReportData] = useState(null);
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch batches
  const fetchBatches = async (selectNewId = null) => {
    setLoading(true);
    try {
      const res = await fetch('/api/cambridge/batches');
      const data = await res.json();
      if (data.success && data.batches) {
        setBatches(data.batches);
        if (selectNewId) {
          setSelectedBatchId(selectNewId);
        } else if (!selectedBatchId && data.batches.length > 0) {
          // Mặc định chọn đợt thi đầu tiên (mới nhất)
          setSelectedBatchId(data.batches[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
      showToast('Không thể tải danh sách đợt thi', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch registrations for selected batch
  const fetchRegistrations = async (batchId) => {
    if (!batchId) {
      setRegistrations([]);
      return;
    }
    setLoadingRegistrations(true);
    try {
      const res = await fetch(`/api/cambridge/registrations?batchId=${batchId}`);
      const data = await res.json();
      if (data.success && data.registrations) {
        setRegistrations(data.registrations);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
      showToast('Lỗi tải danh sách thí sinh', 'error');
    } finally {
      setLoadingRegistrations(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatchId) {
      fetchRegistrations(selectedBatchId);
    }
  }, [selectedBatchId]);

  // Current selected batch object
  const currentBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  // Dynamic KPI Stats based on current batch registrations
  const stats = useMemo(() => {
    const total = registrations.length;
    const paidList = registrations.filter(r => r.paymentStatus === 'DA_DONG');
    const unpaidList = registrations.filter(r => r.paymentStatus === 'CHUA_DONG');

    const totalCollected = paidList.reduce((sum, r) => sum + (r.fee || 0), 0);
    const totalExpected = registrations.reduce((sum, r) => sum + (r.fee || 0), 0);
    const totalUnpaidAmount = totalExpected - totalCollected;

    const receiptsSentCount = paidList.filter(r => r.receiptSentAt !== null).length;
    const pendingReceiptCount = paidList.filter(r => r.receiptSentAt === null).length;

    const levels = {
      STARTERS: registrations.filter(r => r.level === 'STARTERS').length,
      MOVERS: registrations.filter(r => r.level === 'MOVERS').length,
      FLYERS: registrations.filter(r => r.level === 'FLYERS').length,
      KET: registrations.filter(r => r.level === 'KET').length,
      PET: registrations.filter(r => r.level === 'PET').length,
    };

    return {
      total,
      paidCount: paidList.length,
      unpaidCount: unpaidList.length,
      totalCollected,
      totalExpected,
      totalUnpaidAmount,
      receiptsSentCount,
      pendingReceiptCount,
      levels,
      completionRate: total > 0 ? Math.round((paidList.length / total) * 100) : 0
    };
  }, [registrations]);

  // Filtered registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(item => {
      // 1. Level Filter
      if (levelFilter !== 'ALL' && item.level !== levelFilter) return false;

      // 2. Payment Filter
      if (paymentFilter !== 'ALL' && item.paymentStatus !== paymentFilter) return false;

      // 3. Email Filter
      if (emailFilter === 'SENT' && !item.receiptSentAt) return false;
      if (emailFilter === 'UNSENT' && item.receiptSentAt) return false;

      // 4. Search Filter
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const nameMatch = item.fullName?.toLowerCase().includes(query);
        const nameNoToneMatch = item.fullNameNoTone?.toLowerCase().includes(query);
        const phoneMatch = item.parentPhone?.includes(query);
        const emailMatch = item.parentEmail?.toLowerCase().includes(query);
        const codeMatch = item.receiptCode?.toLowerCase().includes(query);
        if (!nameMatch && !nameNoToneMatch && !phoneMatch && !emailMatch && !codeMatch) return false;
      }

      return true;
    });
  }, [registrations, levelFilter, paymentFilter, emailFilter, searchQuery]);

  // Toggle 1-Click Payment Approval
  const handleTogglePayment = async (candidate) => {
    const isCurrentlyPaid = candidate.paymentStatus === 'DA_DONG';
    const newStatus = isCurrentlyPaid ? 'CHUA_DONG' : 'DA_DONG';

    const confirmMsg = isCurrentlyPaid
      ? `Xác nhận chuyển trạng thái thí sinh ${candidate.fullName} về CHƯA ĐÓNG PHÍ?`
      : `Xác nhận thu lệ phí ${(candidate.fee || 0).toLocaleString('vi-VN')}đ cho thí sinh ${candidate.fullName}?`;

    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch('/api/cambridge/registrations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: candidate.id,
          paymentStatus: newStatus
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(
          newStatus === 'DA_DONG'
            ? `Đã duyệt thu phí! Mã biên lai: ${data.registration.receiptCode}`
            : 'Đã chuyển trạng thái về chưa đóng phí'
        );
        // Cập nhật state trực tiếp để UI phản hồi 0ms
        setRegistrations(prev => prev.map(r => r.id === candidate.id ? data.registration : r));
        fetchBatches(); // Làm mới số liệu tổng quan của các đợt thi
      } else {
        showToast(data.error || 'Lỗi khi cập nhật trạng thái', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  // Single candidate receipt send
  const handleSendSingleReceipt = async (candidate) => {
    if (!candidate.parentEmail) {
      showToast('Thí sinh chưa có email phụ huynh để gửi biên lai!', 'error');
      return;
    }

    if (!confirm(`Gửi biên lai thu phí điện tử đến email: ${candidate.parentEmail}?`)) return;

    setIsSendingEmails(true);
    try {
      const res = await fetch('/api/cambridge/registrations/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatchId,
          registrationIds: [candidate.id]
        })
      });

      const data = await res.json();
      if (data.success) {
        setEmailReportData(data);
        setIsEmailReportOpen(true);
        fetchRegistrations(selectedBatchId);
        fetchBatches();
      } else {
        showToast(data.error || 'Lỗi khi gửi email', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi máy chủ khi gửi email', 'error');
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Bulk receipt send
  const handleBulkSendReceipts = async () => {
    let idsToSend = selectedIds;
    let confirmMsg = '';

    if (idsToSend.length > 0) {
      confirmMsg = `Gửi email biên lai điện tử cho ${idsToSend.length} thí sinh đã chọn?`;
    } else {
      if (stats.pendingReceiptCount === 0) {
        showToast('Hiện không có thí sinh nào đã đóng phí mà chưa gửi biên lai!', 'error');
        return;
      }
      confirmMsg = `Gửi email biên lai điện tử cho toàn bộ ${stats.pendingReceiptCount} thí sinh đã đóng phí trong đợt này?`;
      idsToSend = undefined; // backend sẽ tự quét tất cả chưa gửi
    }

    if (!confirm(confirmMsg)) return;

    setIsSendingEmails(true);
    try {
      const res = await fetch('/api/cambridge/registrations/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: selectedBatchId,
          registrationIds: idsToSend
        })
      });

      const data = await res.json();
      if (data.success) {
        setEmailReportData(data);
        setIsEmailReportOpen(true);
        fetchRegistrations(selectedBatchId);
        fetchBatches();
      } else {
        showToast(data.error || 'Lỗi gửi email', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi máy chủ khi gửi email', 'error');
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Export VN120 Excel
  const handleExportVN120 = () => {
    if (!selectedBatchId) return;
    window.open(`/api/cambridge/export-vn120?batchId=${selectedBatchId}`, '_blank');
  };

  // Copy registration link for parents
  const handleCopyRegistrationLink = () => {
    if (!selectedBatchId) return;
    const url = `${window.location.origin}/cambridge/register?batchId=${selectedBatchId}`;
    navigator.clipboard.writeText(url);
    showToast('Đã sao chép link đăng ký của Phụ huynh vào Clipboard!');
  };

  // Delete candidate
  const handleDeleteCandidate = async (candidate) => {
    if (!confirm(`Xóa thí sinh ${candidate.fullName} khỏi đợt thi? Hành động này không thể hoàn tác.`)) return;

    try {
      const res = await fetch(`/api/cambridge/registrations?id=${candidate.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa thí sinh');
        setRegistrations(prev => prev.filter(r => r.id !== candidate.id));
        fetchBatches();
      } else {
        showToast(data.error || 'Lỗi khi xóa', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi máy chủ', 'error');
    }
  };

  // Delete batch
  const handleDeleteBatch = async () => {
    if (!currentBatch) return;
    if (!confirm(`Bạn có chắc muốn xóa đợt thi "${currentBatch.title}"?`)) return;

    try {
      const res = await fetch(`/api/cambridge/batches/${currentBatch.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast('Đã xóa đợt thi thành công');
        setSelectedBatchId('');
        fetchBatches();
      } else {
        showToast(data.error || 'Lỗi khi xóa đợt thi', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi máy chủ khi xóa đợt thi', 'error');
    }
  };

  // Select all checkbox handler
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredRegistrations.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelectId = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Helper badge color for levels
  const getLevelBadgeStyle = (level) => {
    switch (level) {
      case 'STARTERS':
        return { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' };
      case 'MOVERS':
        return { background: '#dbeafe', color: '#1d4ed8', border: '1px solid #bfdbfe' };
      case 'FLYERS':
        return { background: '#f3e8ff', color: '#7e22ce', border: '1px solid #e9d5ff' };
      case 'KET':
        return { background: '#ffedd5', color: '#c2410c', border: '1px solid #fed7aa' };
      case 'PET':
        return { background: '#ffe4e6', color: '#be123c', border: '1px solid #fecdd3' };
      default:
        return { background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' };
    }
  };

  return (
    <div className="cambridge-page" style={{ padding: '1.5rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 20px',
          background: toast.type === 'error' ? '#ef4444' : '#10b981',
          color: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '0.95rem'
        }}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-xmark' : 'fa-circle-check'}`}></i>
          <span>{toast.message}</span>
        </div>
      )}

      {/* ============ HEADER ============ */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #0c83c1 0%, #09618f 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.6rem',
            boxShadow: '0 4px 10px rgba(12, 131, 193, 0.3)'
          }}>
            <i className="fa-solid fa-award"></i>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '800', color: '#1e293b' }}>
                Khảo Thí Chứng Chỉ Quốc Tế Cambridge
              </h1>
              <span style={{
                background: '#fef3c7',
                color: '#92400e',
                border: '1px solid #fde68a',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 'bold'
              }}>
                ỦY QUYỀN VN120
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
              Quản lý đợt thi, thu lệ phí VietQR 1-click, gửi biên lai điện tử tự động và kết xuất biểu mẫu nộp Hội đồng VN120
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setEditingBatch(null);
              setIsBatchModalOpen(true);
            }}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '8px',
              border: 'none',
              background: '#0c83c1',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(12, 131, 193, 0.3)'
            }}
          >
            <i className="fa-solid fa-plus"></i> Tạo Đợt Thi Mới
          </button>

          {currentBatch && (
            <button
              onClick={handleCopyRegistrationLink}
              title="Sao chép link form đăng ký trực tuyến cho phụ huynh"
              style={{
                padding: '0.65rem 1.1rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#334155',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-link" style={{ color: '#0c83c1' }}></i> Link Đăng Ký PH
            </button>
          )}
        </div>
      </header>

      {/* ============ BATCH SELECTOR & INFO BAR ============ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: '1rem',
          marginBottom: '1rem'
        }}>
          {/* Dropdown đợt thi */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '320px' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569', whiteSpace: 'nowrap' }}>
              <i className="fa-solid fa-calendar-day" style={{ color: '#0c83c1' }}></i> Đợt thi:
            </label>
            <select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              disabled={loading || batches.length === 0}
              style={{
                flex: '1',
                padding: '0.65rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.95rem',
                fontWeight: '600',
                color: '#1e293b',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              {batches.length === 0 ? (
                <option value="">Chưa có đợt thi nào - Bấm "Tạo Đợt Thi Mới" bên trên</option>
              ) : (
                batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.title} (Ngày thi: {b.examDate ? new Date(b.examDate).toLocaleDateString('vi-VN') : 'Chưa định'}) - [{b.status === 'OPEN' ? '🟢 Đang mở' : b.status === 'CLOSED' ? '🔴 Đã đóng' : '🔵 Hoàn tất'}]
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Nút hành động đợt thi */}
          {currentBatch && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  setEditingBatch(currentBatch);
                  setIsBatchModalOpen(true);
                }}
                style={{
                  padding: '0.55rem 0.9rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <i className="fa-solid fa-gear"></i> Cấu hình đợt thi
              </button>

              <button
                onClick={handleDeleteBatch}
                title="Xóa đợt thi này"
                style={{
                  padding: '0.55rem 0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #fee2e2',
                  background: '#fef2f2',
                  color: '#b91c1c',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <i className="fa-solid fa-trash"></i>
              </button>
            </div>
          )}
        </div>

        {/* Thông tin vắn tắt đợt thi */}
        {currentBatch && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            fontSize: '0.875rem',
            color: '#475569'
          }}>
            <div>
              <span style={{ color: '#64748b' }}>Ngày thi chính thức:</span>{' '}
              <b style={{ color: '#0c83c1' }}>
                {currentBatch.examDate ? new Date(currentBatch.examDate).toLocaleDateString('vi-VN') : '---'}
              </b>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Hạn chót đăng ký:</span>{' '}
              <b style={{ color: '#e11d48' }}>
                {currentBatch.closeHour || '17:00'} ngày {currentBatch.registrationDeadline ? new Date(currentBatch.registrationDeadline).toLocaleDateString('vi-VN') : '---'}
              </b>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Hotline hỗ trợ:</span>{' '}
              <b>{formatHotline(currentBatch.hotline)}</b>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Tài khoản nộp phí:</span>{' '}
              <b>MB Bank {currentBatch.bankAccount}</b>
            </div>
          </div>
        )}
      </div>

      {/* ============ 4 STAT CARDS ============ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem',
        marginBottom: '1.5rem'
      }}>
        {/* Card 1: Tổng Thí Sinh */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: '#f1f5f9',
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>
              Tổng Thí Sinh Đăng Ký
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              ST: {stats.levels.STARTERS} | MO: {stats.levels.MOVERS} | FL: {stats.levels.FLYERS} | KET: {stats.levels.KET} | PET: {stats.levels.PET}
            </div>
          </div>
        </div>

        {/* Card 2: Đã Thu Lệ Phí */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: '#ecfdf5',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-circle-check"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#047857', textTransform: 'uppercase' }}>
              Đã Thu Lệ Phí ({stats.completionRate}%)
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#059669', lineHeight: 1.2 }}>
              {stats.totalCollected.toLocaleString('vi-VN')} đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: '4px' }}>
              {stats.paidCount} / {stats.total} thí sinh đã hoàn tất
            </div>
          </div>
        </div>

        {/* Card 3: Chưa Đóng Phí */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: '#fff1f2',
            color: '#f43f5e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-hourglass-half"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#be123c', textTransform: 'uppercase' }}>
              Chưa Thu Phí
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#e11d48', lineHeight: 1.2 }}>
              {stats.totalUnpaidAmount.toLocaleString('vi-VN')} đ
            </div>
            <div style={{ fontSize: '0.75rem', color: '#be123c', marginTop: '4px' }}>
              {stats.unpaidCount} thí sinh đang chờ chuyển khoản
            </div>
          </div>
        </div>

        {/* Card 4: Biên Lai Điện Tử */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            borderRadius: '12px',
            background: '#f0f9ff',
            color: '#0c83c1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            flexShrink: 0
          }}>
            <i className="fa-solid fa-envelope-circle-check"></i>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#0369a1', textTransform: 'uppercase' }}>
              Biên Lai Đã Gửi Email
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0c83c1', lineHeight: 1.2 }}>
              {stats.receiptsSentCount} / {stats.paidCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '4px' }}>
              {stats.pendingReceiptCount > 0 ? (
                <span style={{ color: '#d97706', fontWeight: 'bold' }}>
                  Còn {stats.pendingReceiptCount} thí sinh chưa gửi biên lai
                </span>
              ) : (
                <span style={{ color: '#059669' }}>✓ 100% đã gửi biên lai</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============ ACTION TOOLBAR & FILTERS ============ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {/* Left: Search & Filter dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, SĐT, mã BL..."
              style={{
                width: '100%',
                padding: '0.55rem 0.85rem 0.55rem 2.2rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            />
            <i className="fa-solid fa-magnifying-glass" style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '0.85rem'
            }}></i>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Level Filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.8rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'white',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả cấp độ</option>
            <option value="STARTERS">STARTERS</option>
            <option value="MOVERS">MOVERS</option>
            <option value="FLYERS">FLYERS</option>
            <option value="KET">KET</option>
            <option value="PET">PET</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.8rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'white',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả thanh toán</option>
            <option value="DA_DONG">✓ Đã đóng phí</option>
            <option value="CHUA_DONG">⏳ Chưa đóng phí</option>
          </select>

          {/* Email Filter */}
          <select
            value={emailFilter}
            onChange={(e) => setEmailFilter(e.target.value)}
            style={{
              padding: '0.55rem 0.8rem',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              fontSize: '0.875rem',
              background: 'white',
              color: '#334155',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Tất cả trạng thái email</option>
            <option value="SENT">✓ Đã gửi email biên lai</option>
            <option value="UNSENT">⏳ Chưa gửi email biên lai</option>
          </select>
        </div>

        {/* Right: Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Add candidate button */}
          <button
            onClick={() => {
              setEditingCandidate(null);
              setIsCandidateModalOpen(true);
            }}
            disabled={!currentBatch}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: '1px solid #0c83c1',
              background: '#f0f9ff',
              color: '#0c83c1',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              cursor: currentBatch ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <i className="fa-solid fa-user-plus"></i> Thêm Thí Sinh
          </button>

          {/* Bulk send receipts button */}
          <button
            onClick={handleBulkSendReceipts}
            disabled={isSendingEmails || !currentBatch}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#f59e0b',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              cursor: isSendingEmails || !currentBatch ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.2)'
            }}
          >
            {isSendingEmails ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Đang gửi...
              </>
            ) : (
              <>
                <i className="fa-solid fa-paper-plane"></i>
                {selectedIds.length > 0 ? `Gửi Biên Lai (${selectedIds.length})` : 'Gửi Email Biên Lai'}
              </>
            )}
          </button>

          {/* Export VN120 Excel */}
          <button
            onClick={handleExportVN120}
            disabled={!currentBatch || registrations.length === 0}
            style={{
              padding: '0.55rem 1.1rem',
              borderRadius: '8px',
              border: 'none',
              background: '#10b981',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '0.875rem',
              cursor: !currentBatch || registrations.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
            }}
          >
            <i className="fa-solid fa-file-excel"></i> Xuất File Chuẩn VN120
          </button>
        </div>
      </div>

      {/* ============ CANDIDATES TABLE ============ */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        {loadingRegistrations ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#0c83c1' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '2rem' }}></i>
            <p style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>Đang tải danh sách thí sinh...</p>
          </div>
        ) : filteredRegistrations.length === 0 ? (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155' }}>Chưa có thí sinh nào trong đợt này</h3>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              Bấm nút <b>"Thêm Thí Sinh"</b> hoặc chia sẻ link đăng ký trực tuyến cho phụ huynh để bắt đầu tiếp nhận hồ sơ.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 'bold' }}>
                  <th style={{ padding: '12px 14px', width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredRegistrations.length && filteredRegistrations.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={{ padding: '12px 8px', width: '50px', textAlign: 'center' }}>STT</th>
                  <th style={{ padding: '12px 14px' }}>Thí Sinh (Chuẩn Cambridge)</th>
                  <th style={{ padding: '12px 14px' }}>Cấp Độ & Lệ Phí</th>
                  <th style={{ padding: '12px 14px' }}>Phụ Huynh & Liên Hệ</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Duyệt Thu Tiền 1-Click</th>
                  <th style={{ padding: '12px 14px' }}>Biên Lai & Email</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', width: '100px' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.map((candidate, index) => {
                  const isPaid = candidate.paymentStatus === 'DA_DONG';
                  const isSelected = selectedIds.includes(candidate.id);
                  const levelBadge = getLevelBadgeStyle(candidate.level);

                  return (
                    <tr
                      key={candidate.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isSelected ? '#f0f9ff' : 'white',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = '#fafafa';
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = 'white';
                      }}
                    >
                      {/* Checkbox */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectId(candidate.id)}
                        />
                      </td>

                      {/* STT */}
                      <td style={{ padding: '12px 8px', textAlign: 'center', color: '#64748b', fontWeight: 'bold' }}>
                        {index + 1}
                      </td>

                      {/* Thí Sinh */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '800', color: '#0c83c1', fontSize: '0.95rem' }}>
                            {candidate.fullNameNoTone}
                          </span>
                          {candidate.studentId && (
                            <span style={{
                              background: '#e0f2fe',
                              color: '#0369a1',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 'bold'
                            }}>
                              Học viên CRM
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          {candidate.fullName} • {candidate.gender === 'FEMALE' ? 'Nữ' : 'Nam'} • {candidate.dobStr || (candidate.dob ? new Date(candidate.dob).toLocaleDateString('vi-VN') : '---')}
                        </div>
                      </td>

                      {/* Cấp độ & Lệ phí */}
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: '800',
                          marginBottom: '4px',
                          ...levelBadge
                        }}>
                          {candidate.level}
                        </span>
                        <div style={{ fontWeight: 'bold', color: '#10b981', fontSize: '0.9rem' }}>
                          {(candidate.fee || 0).toLocaleString('vi-VN')} đ
                        </div>
                      </td>

                      {/* Thông tin phụ huynh */}
                      <td style={{ padding: '12px 14px' }}>
                        {candidate.parentPhone ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <i className="fa-solid fa-phone" style={{ color: '#0c83c1', fontSize: '0.75rem' }}></i>
                            <a
                              href={`tel:${candidate.parentPhone}`}
                              style={{ color: '#1e293b', fontWeight: '600', textDecoration: 'none' }}
                            >
                              {candidate.parentPhone}
                            </a>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Chưa có SĐT</span>
                        )}

                        {candidate.parentEmail ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#64748b' }}>
                            <i className="fa-solid fa-envelope" style={{ color: '#94a3b8', fontSize: '0.75rem' }}></i>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px', whiteSpace: 'nowrap' }}>
                              {candidate.parentEmail}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#ef4444', fontSize: '0.75rem', display: 'block' }}>
                            <i className="fa-solid fa-triangle-exclamation"></i> Thiếu email
                          </span>
                        )}
                      </td>

                      {/* Duyệt Thu Tiền 1-Click */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        {isPaid ? (
                          <button
                            onClick={() => handleTogglePayment(candidate)}
                            title="Bấm để hủy duyệt thu phí"
                            style={{
                              background: '#ecfdf5',
                              border: '1px solid #10b981',
                              color: '#065f46',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <i className="fa-solid fa-check"></i> ĐÃ THU TIỀN
                          </button>
                        ) : (
                          <button
                            onClick={() => handleTogglePayment(candidate)}
                            title="Bấm để xác nhận thu tiền 1-click và sinh mã biên lai"
                            style={{
                              background: '#fff7ed',
                              border: '1px dashed #f97316',
                              color: '#c2410c',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontWeight: 'bold',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <i className="fa-solid fa-hand-holding-dollar"></i> Chưa thu (Bấm duyệt)
                          </button>
                        )}

                        {candidate.paymentDate && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                            {new Date(candidate.paymentDate).toLocaleDateString('vi-VN')} {new Date(candidate.paymentDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      {/* Mã Biên Lai & Email */}
                      <td style={{ padding: '12px 14px' }}>
                        {candidate.receiptCode ? (
                          <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: '#0c83c1', fontSize: '0.85rem' }}>
                            {candidate.receiptCode}
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>---</span>
                        )}

                        <div style={{ marginTop: '4px' }}>
                          {candidate.receiptSentAt ? (
                            <span style={{
                              background: '#d1fae5',
                              color: '#065f46',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 'bold',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }} title={`Gửi lúc: ${new Date(candidate.receiptSentAt).toLocaleString('vi-VN')}`}>
                              <i className="fa-solid fa-check-double"></i> Đã gửi email
                            </span>
                          ) : isPaid ? (
                            <button
                              onClick={() => handleSendSingleReceipt(candidate)}
                              style={{
                                background: '#fef3c7',
                                border: '1px solid #fde68a',
                                color: '#92400e',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <i className="fa-solid fa-paper-plane"></i> Gửi biên lai
                            </button>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                              Chờ thu phí
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Thao Tác */}
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => {
                              setEditingCandidate(candidate);
                              setIsCandidateModalOpen(true);
                            }}
                            title="Sửa thông tin"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              background: 'white',
                              color: '#475569',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem'
                            }}
                          >
                            <i className="fa-solid fa-pen-to-square"></i>
                          </button>

                          <button
                            onClick={() => handleDeleteCandidate(candidate)}
                            title="Xóa thí sinh"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                              background: '#fff1f2',
                              color: '#e11d48',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem'
                            }}
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============ MODALS ============ */}
      <BatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        batch={editingBatch}
        onSaved={(savedBatch) => {
          showToast(editingBatch ? 'Cập nhật đợt thi thành công' : 'Tạo đợt thi mới thành công');
          fetchBatches(savedBatch.id);
        }}
      />

      <CandidateModal
        isOpen={isCandidateModalOpen}
        onClose={() => setIsCandidateModalOpen(false)}
        batch={currentBatch}
        candidate={editingCandidate}
        onSaved={(savedCandidate) => {
          showToast(editingCandidate ? 'Cập nhật thí sinh thành công' : 'Đã thêm thí sinh mới');
          fetchRegistrations(selectedBatchId);
          fetchBatches();
        }}
      />

      <EmailReportModal
        isOpen={isEmailReportOpen}
        onClose={() => setIsEmailReportOpen(false)}
        reportData={emailReportData}
      />
    </div>
  );
}
