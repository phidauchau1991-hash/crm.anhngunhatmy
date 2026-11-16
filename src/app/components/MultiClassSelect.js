'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatClassCode, getClassDisplayLabel, groupAndSortClasses } from '@/lib/classHelper';

/**
 * Dropdown chọn nhiều lớp học (Checkbox + Tìm kiếm + Phân nhóm chuẩn UX):
 * 1. Lớp theo khóa đang mở (gom theo Cấp độ A->Z)
 * 2. Lớp Học Kèm / Đóng Theo Tháng
 * 3. Lớp đã kết thúc (luôn đẩy xuống dưới cùng)
 */
export default function MultiClassSelect({
  classes = [],
  selectedCodes = [],
  onChange,
  placeholder = 'Tất cả lớp (Toàn trung tâm)',
  hideEnded = false,
  minWidth = '230px',
  maxWidth = '290px',
  popoverWidth = '360px',
  align = 'left',
  buttonStyle = {},
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const matchesSearch = (cls, isEnded = false) => {
    if (!normalizedQuery) return true;
    const label = getClassDisplayLabel(cls, isEnded).toLowerCase();
    const rawCode = (cls.code || '').toLowerCase();
    const capDo = (cls.capDo || '').toLowerCase();
    const teacher = (cls.teacherName || '').toLowerCase();
    return (
      label.includes(normalizedQuery) ||
      rawCode.includes(normalizedQuery) ||
      capDo.includes(normalizedQuery) ||
      teacher.includes(normalizedQuery)
    );
  };

  const { courseGroups, monthlyClasses, endedClasses } = useMemo(() => {
    const grouped = groupAndSortClasses(classes, { hideEnded });
    if (!normalizedQuery) return grouped;

    return {
      courseGroups: grouped.courseGroups
        .map((g) => ({ ...g, items: g.items.filter((c) => matchesSearch(c, false)) }))
        .filter((g) => g.items.length > 0),
      monthlyClasses: grouped.monthlyClasses.filter((c) => matchesSearch(c, false)),
      endedClasses: grouped.endedClasses.filter((c) => matchesSearch(c, true)),
    };
  }, [classes, hideEnded, normalizedQuery]);

  const toggleCode = (code) => {
    if (!onChange) return;
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter((c) => c !== code));
    } else {
      onChange([...selectedCodes, code]);
    }
  };

  const getButtonText = () => {
    if (selectedCodes.length === 0) return placeholder;
    if (selectedCodes.length === 1) {
      const code = selectedCodes[0];
      const matched = Array.isArray(classes) ? classes.find((c) => c.code === code) : null;
      return matched ? getClassDisplayLabel(matched) : formatClassCode(code);
    }
    return `Đã chọn ${selectedCodes.length} lớp`;
  };

  const renderItem = (cls, isEnded = false) => {
    const checked = selectedCodes.includes(cls.code);
    const label = getClassDisplayLabel(cls, isEnded);

    return (
      <label
        key={cls.code}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 8px',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.84rem',
          background: checked ? '#f0f9ff' : 'transparent',
          color: isEnded ? '#64748b' : '#1e293b',
          fontWeight: checked ? 600 : 400,
          opacity: isEnded && !checked ? 0.85 : 1,
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleCode(cls.code)}
          style={{ width: '15px', height: '15px', accentColor: '#0284c7', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${label} (${cls.code})`}>
          {label}
        </span>
      </label>
    );
  };

  const renderSectionHeader = (title, { color = '#0284c7', background = '#f8fafc', borderColor = '#f1f5f9' } = {}) => (
    <div
      style={{
        fontSize: '0.72rem',
        fontWeight: 700,
        color,
        padding: '6px 8px 4px',
        textTransform: 'uppercase',
        letterSpacing: '0.02em',
        borderTop: `1px solid ${borderColor}`,
        background,
        marginTop: '2px',
      }}
    >
      {title}
    </div>
  );

  const hasAnyResult = courseGroups.length > 0 || monthlyClasses.length > 0 || endedClasses.length > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          border: selectedCodes.length > 0 ? '1px solid #0284c7' : '1px solid var(--color-border)',
          background: selectedCodes.length > 0 ? '#f0f9ff' : 'white',
          color: selectedCodes.length > 0 ? '#0369a1' : 'var(--color-text)',
          fontWeight: selectedCodes.length > 0 ? 600 : 400,
          fontSize: '0.88rem',
          minWidth,
          maxWidth,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: 'pointer',
          textAlign: 'left',
          ...buttonStyle,
        }}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {getButtonText()}
        </span>
        <i className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', opacity: 0.7, flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            ...(align === 'right' ? { right: 0 } : { left: 0 }),
            zIndex: 60,
            width: popoverWidth,
            maxWidth: '92vw',
            background: 'white',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15)',
            padding: '0.6rem',
          }}
        >
          <input
            type="text"
            placeholder="Tìm lớp, cấp độ, giáo viên..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '0.45rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              fontSize: '0.84rem',
              marginBottom: '0.45rem',
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.25rem 0.3rem 0.45rem',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '0.35rem',
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange?.([]);
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#0284c7',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Tất cả (Bỏ lọc)
            </button>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              Đang chọn: <strong>{selectedCodes.length}</strong>
            </span>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {courseGroups.map((group) => (
              <React.Fragment key={group.key}>
                {renderSectionHeader(group.label)}
                {group.items.map((cls) => renderItem(cls, false))}
              </React.Fragment>
            ))}

            {monthlyClasses.length > 0 && (
              <React.Fragment>
                {renderSectionHeader('--- Lớp Học Kèm / Đóng Theo Tháng ---', {
                  color: '#7c3aed',
                  background: '#faf5ff',
                  borderColor: '#f3e8ff',
                })}
                {monthlyClasses.map((cls) => renderItem(cls, false))}
              </React.Fragment>
            )}

            {!hideEnded && endedClasses.length > 0 && (
              <React.Fragment>
                {renderSectionHeader('--- Lớp đã kết thúc ---', {
                  color: '#64748b',
                  background: '#f8fafc',
                  borderColor: '#e2e8f0',
                })}
                {endedClasses.map((cls) => renderItem(cls, true))}
              </React.Fragment>
            )}

            {!hasAnyResult && (
              <div style={{ padding: '0.85rem', textAlign: 'center', fontSize: '0.84rem', color: '#94a3b8' }}>
                Không tìm thấy lớp phù hợp
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
