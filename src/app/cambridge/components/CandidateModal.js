'use client';

import React, { useState, useEffect } from 'react';
import { removeVietnameseTones, DEFAULT_LEVELS_CONFIG } from '@/lib/cambridgeHelper';

export default function CandidateModal({ isOpen, onClose, batch, candidate, onSaved }) {
  const [formData, setFormData] = useState({
    batchId: '',
    studentId: '',
    fullName: '',
    gender: 'MALE',
    dob: '',
    parentPhone: '',
    parentEmail: '',
    level: 'STARTERS',
    fee: 1200000,
    notes: ''
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Student Search / Picker state
  const [searchStudentText, setSearchStudentText] = useState('');
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [selectedStudentName, setSelectedStudentName] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (candidate) {
      setFormData({
        batchId: candidate.batchId || batch?.id || '',
        studentId: candidate.studentId || '',
        fullName: candidate.fullName || '',
        gender: candidate.gender || 'MALE',
        dob: candidate.dob ? new Date(candidate.dob).toISOString().slice(0, 10) : '',
        parentPhone: candidate.parentPhone || '',
        parentEmail: candidate.parentEmail || '',
        level: candidate.level || 'STARTERS',
        fee: candidate.fee || 1200000,
        notes: candidate.notes || ''
      });
      setSelectedStudentName(candidate.student ? `${candidate.student.name || ''} (${candidate.student.id || ''})` : '');
    } else {
      const defaultLevel = 'STARTERS';
      const defaultFee = batch?.levelsConfig?.[defaultLevel] || DEFAULT_LEVELS_CONFIG[defaultLevel] || 1200000;
      setFormData({
        batchId: batch?.id || '',
        studentId: '',
        fullName: '',
        gender: 'MALE',
        dob: '',
        parentPhone: '',
        parentEmail: '',
        level: defaultLevel,
        fee: defaultFee,
        notes: ''
      });
      setSelectedStudentName('');
    }
    setSearchStudentText('');
    setStudentSuggestions([]);
    setError('');
  }, [candidate, batch, isOpen]);

  // Tìm kiếm học viên trong CRM khi gõ
  useEffect(() => {
    if (!searchStudentText.trim() || searchStudentText.length < 2) {
      setStudentSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingStudents(true);
      try {
        const res = await fetch(`/api/students?search=${encodeURIComponent(searchStudentText.trim())}`);
        const data = await res.json();
        if (data.students) {
          setStudentSuggestions(data.students.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingStudents(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchStudentText]);

  if (!isOpen) return null;

  // Chọn học viên từ CRM
  const handleSelectStudent = (student) => {
    let dobVal = '';
    if (student.birthday) {
      try {
        dobVal = new Date(student.birthday).toISOString().slice(0, 10);
      } catch (e) {}
    }

    const phone = student.parentPhone || student.phone || '';
    const email = student.parentEmail || student.email || '';

    setFormData(prev => ({
      ...prev,
      studentId: student.id,
      fullName: student.name || student.fullName,
      parentPhone: phone,
      parentEmail: email,
      gender: student.gender === 'Nữ' || student.gender === 'FEMALE' ? 'FEMALE' : 'MALE',
      dob: dobVal
    }));

    setSelectedStudentName(`${student.name || student.fullName} (${student.id})`);
    setStudentSuggestions([]);
    setSearchStudentText('');
  };

  const handleClearSelectedStudent = () => {
    setSelectedStudentName('');
    setFormData(prev => ({ ...prev, studentId: '' }));
  };

  const handleLevelChange = (lvl) => {
    const feeForLevel = batch?.levelsConfig?.[lvl] || DEFAULT_LEVELS_CONFIG[lvl] || 1200000;
    setFormData(prev => ({
      ...prev,
      level: lvl,
      fee: feeForLevel
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.fullName.trim()) {
      setError('Vui lòng nhập họ và tên thí sinh');
      return;
    }

    setSaving(true);
    try {
      const url = candidate ? '/api/cambridge/registrations' : '/api/cambridge/registrations';
      const method = candidate ? 'PATCH' : 'POST';
      const payload = candidate ? { id: candidate.id, ...formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        onSaved(data.registration);
        onClose();
      } else {
        setError(data.error || 'Có lỗi xảy ra khi lưu thí sinh');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ');
    } finally {
      setSaving(false);
    }
  };

  const previewNameNoTone = removeVietnameseTones(formData.fullName);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      backdropFilter: 'blur(3px)',
      padding: '1rem'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '650px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0c83c1 0%, #09618f 100%)',
          color: 'white',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              <i className="fa-solid fa-user-graduate"></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
                {candidate ? 'Chỉnh Sửa Thông Tin Thí Sinh' : 'Thêm Thí Sinh Dự Thi Cambridge'}
              </h2>
              <p style={{ margin: 0, fontSize: '0.825rem', opacity: 0.9 }}>
                Đợt thi: {batch?.title || 'Hiện tại'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'white',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              borderRadius: '8px',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* Quick Picker from CRM Students */}
          {!candidate && (
            <div style={{
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '10px',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#0369a1', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fa-solid fa-bolt"></i> Chọn nhanh học viên từ CRM (Tự điền 100% hồ sơ):
              </div>

              {selectedStudentName ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #7dd3fc'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0c83c1' }}>
                    <i className="fa-solid fa-check-circle"></i> Đã chọn: {selectedStudentName}
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelectedStudent}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Bỏ chọn
                  </button>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={searchStudentText}
                    onChange={(e) => setSearchStudentText(e.target.value)}
                    placeholder="Gõ tên hoặc số điện thoại học viên CRM..."
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.85rem',
                      border: '1px solid #7dd3fc',
                      borderRadius: '6px',
                      fontSize: '0.9rem',
                      background: 'white'
                    }}
                  />
                  {searchingStudents && (
                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: '#0284c7' }}>
                      <i className="fa-solid fa-spinner fa-spin"></i>
                    </div>
                  )}

                  {studentSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      marginTop: '4px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      zIndex: 20,
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {studentSuggestions.map(st => (
                        <div
                          key={st.id}
                          onClick={() => handleSelectStudent(st)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f1f5f9',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#1e293b' }}>
                              {st.name || st.fullName}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                              {st.phone || st.parentPhone || 'Chưa có SĐT'} | {st.classes?.map(c => c.classCode).join(', ') || 'Chưa vào lớp'}
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Chọn
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Form Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Họ và tên thí sinh (Tiếng Việt) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
                placeholder="VD: CHÂU NHẬT TRƯỜNG"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}
                required
              />
              {previewNameNoTone && (
                <div style={{ fontSize: '0.75rem', color: '#0c83c1', marginTop: '4px', fontWeight: 'bold' }}>
                  <i className="fa-solid fa-id-card"></i> In trên chứng chỉ: <code>{previewNameNoTone}</code>
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Giới tính
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  background: 'white'
                }}
              >
                <option value="MALE">Nam (MALE)</option>
                <option value="FEMALE">Nữ (FEMALE)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Ngày sinh
              </label>
              <input
                type="date"
                value={formData.dob}
                onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Số điện thoại phụ huynh
              </label>
              <input
                type="text"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="VD: 0901234567"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Email phụ huynh (Nhận biên lai)
              </label>
              <input
                type="email"
                value={formData.parentEmail}
                onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                placeholder="phuhuynh@gmail.com"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Cấp độ dự thi <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <select
                value={formData.level}
                onChange={(e) => handleLevelChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '0.95rem',
                  fontWeight: 'bold',
                  color: '#0c83c1',
                  background: 'white'
                }}
              >
                {(batch?.activeLevels || ['STARTERS', 'MOVERS', 'FLYERS', 'KET', 'PET']).map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                Lệ phí thi (VNĐ) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                value={(formData.fee || 0).toLocaleString('vi-VN')}
                onChange={(e) => {
                  const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                  setFormData({ ...formData, fee: val });
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  color: '#10b981'
                }}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
              Ghi chú hồ sơ
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="VD: Cần hỗ trợ chuyển ca thi, thí sinh lớp Panda..."
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            />
          </div>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: 'white',
                color: '#475569',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.65rem 1.5rem',
                borderRadius: '8px',
                border: 'none',
                background: '#0c83c1',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(12, 131, 193, 0.3)'
              }}
            >
              {saving ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Đang lưu...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-check"></i> {candidate ? 'Lưu Thay Đổi' : 'Thêm Thí Sinh'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
