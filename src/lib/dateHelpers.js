/**
 * Helper tính toán khoảng thời gian (startDate, endDate) dựa trên preset hoặc ngày tự chọn
 */
export function getDateRangeFromPreset(preset, customStart = '', customEnd = '') {
  const now = new Date();
  let startDate = null;
  let endDate = null;

  if (preset === 'today') {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (preset === 'thisWeek') {
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day; // Thứ 2 là đầu tuần
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    endDate.setHours(23, 59, 59, 999);
  } else if (preset === 'thisMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (preset === 'lastMonth') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (preset === 'thisQuarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
    startDate = new Date(now.getFullYear(), quarterMonth, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), quarterMonth + 3, 0, 23, 59, 59, 999);
  } else if (preset === 'thisYear') {
    startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  } else if (preset === 'custom' && (customStart || customEnd)) {
    if (customStart) {
      startDate = new Date(customStart);
      startDate.setHours(0, 0, 0, 0);
    }
    if (customEnd) {
      endDate = new Date(customEnd);
      endDate.setHours(23, 59, 59, 999);
    }
  }

  return { startDate, endDate };
}

export function formatDateRangeLabel(preset, customStart = '', customEnd = '') {
  if (preset === 'all' || !preset) return 'Tất cả thời gian';
  if (preset === 'today') return 'Hôm nay';
  if (preset === 'thisWeek') return 'Tuần này';
  if (preset === 'thisMonth') return 'Tháng này';
  if (preset === 'lastMonth') return 'Tháng trước';
  if (preset === 'thisQuarter') return 'Quý này';
  if (preset === 'thisYear') return 'Năm nay';
  if (preset === 'custom') {
    if (customStart && customEnd) return `Từ ${customStart} đến ${customEnd}`;
    if (customStart) return `Từ ngày ${customStart}`;
    if (customEnd) return `Đến ngày ${customEnd}`;
    return 'Khoảng ngày tùy chọn';
  }
  return 'Mốc thời gian';
}
