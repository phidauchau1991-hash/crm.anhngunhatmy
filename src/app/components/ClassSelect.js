import React from 'react';
import { getClassDisplayLabel, groupAndSortClasses } from '@/lib/classHelper';

export default function ClassSelect({ classes, value, onChange, placeholder = "-- Chọn lớp --", hideEnded = false, ...props }) {
  if (!classes || !Array.isArray(classes)) {
    return (
      <select value={value} onChange={onChange} {...props}>
        <option value="">{placeholder}</option>
      </select>
    );
  }

  const { courseGroups, monthlyClasses, endedClasses } = groupAndSortClasses(classes, { hideEnded });

  return (
    <select value={value} onChange={onChange} {...props}>
      <option value="">{placeholder}</option>

      {courseGroups.map((group) => (
        <optgroup key={group.key} label={group.label}>
          {group.items.map((c) => (
            <option key={c.code} value={c.code}>
              {getClassDisplayLabel(c)}
            </option>
          ))}
        </optgroup>
      ))}

      {monthlyClasses.length > 0 && (
        <optgroup label="--- Lớp Học Kèm / Đóng Theo Tháng ---">
          {monthlyClasses.map((c) => (
            <option key={c.code} value={c.code}>
              {getClassDisplayLabel(c)}
            </option>
          ))}
        </optgroup>
      )}

      {!hideEnded && endedClasses.length > 0 && (
        <optgroup label="--- Lớp đã kết thúc ---">
          {endedClasses.map((c) => (
            <option key={c.code} value={c.code} style={{ color: '#94a3b8' }}>
              {getClassDisplayLabel(c, true)}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
