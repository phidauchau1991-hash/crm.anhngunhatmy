import html2canvas from 'html2canvas';
import { toVnDateInputValue } from '@/lib/coursewareAccess';

/**
 * Bộ nhận diện thương hiệu chuẩn duy nhất của Hệ thống Anh ngữ Nhật Mỹ.
 * Đồng bộ toàn bộ thư mời, phiếu báo kết quả, thông báo học phí, biên lai và thẻ học liệu.
 */
export const BRAND = {
  blue: '#0D88C4',       // Xanh Nhật Mỹ chủ đạo
  blueDark: '#08557B',   // Xanh đậm sang trọng tạo chiều sâu
  blueLight: '#E8F5FD',  // Nền xanh nhạt thanh tao
  blueSoft: '#F0F9FF',   // Nền khối nhấn dịu mắt
  blueBorder: '#BAE6FD', // Viền xanh nhạt tinh tế
  gold: '#FFCA29',       // Vàng Nhật Mỹ điểm nhấn
  goldDark: '#D97706',   // Vàng hổ phách tương phản cao trên nền sáng
  goldBg: '#FFFDF5',     // Nền kem vàng nhẹ
  goldBorder: '#FDE68A', // Viền vàng thanh nhã
  ink: '#0F172A',        // Chữ đen than sắc nét
  slate: '#1E293B',      // Chữ nội dung chính
  muted: '#475569',      // Chữ phụ rõ nét trên điện thoại
  subtle: '#64748B',     // Nhãn nhỏ
  white: '#FFFFFF',
  surface: '#FAFDFE',    // Nền thân thư sáng mịn
  border: '#E2E8F0',
  greenBadge: '#059669',
  greenBadgeBg: '#ECFDF5',
  greenBorder: '#A7F3D0',
  redSeal: '#D71920',
};

export const FONT_UNIFIED = '"Be Vietnam Pro", "Segoe UI", Arial, sans-serif';

export const CENTER_INFO = {
  name: 'ANH NGỮ NHẬT MỸ',
  slogan: 'Dedicated to Excellence',
  hotline: '0911 767 069',
  website: 'anhngunhatmy.edu.vn',
  address: 'Số 15, Đường D9, KDC Phú Tân, Phường Bình Dương, Thành phố Hồ Chí Minh',
};

export const INVITE_TONE_PROFILES = {
  KIDS: {
    label: 'Thiếu nhi (bé / ba mẹ)',
    prep2Title: 'Ba mẹ & bé chuẩn bị',
    trialPrep2Default:
      'Trang phục gọn gàng, thoải mái, tinh thần tự tin và có mặt trước giờ học 05 - 10 phút để thầy cô đón bé làm quen lớp.',
    assessmentPrep2Default:
      'Ba mẹ đưa bé đến đúng giờ hẹn với tinh thần thoải mái, tự tin; không cần ôn tập áp lực trước buổi đánh giá.',
    arrivalNote:
      '(Ba mẹ đưa bé có mặt tại sảnh trung tâm trước giờ hẹn 05 - 10 phút để thầy cô đón tiếp)',
  },
  TEEN: {
    label: 'Thiếu niên / Lớp Tháng (học viên / em)',
    prep2Title: 'Học viên cần chuẩn bị',
    trialPrep2Default:
      'Trang phục lịch sự, mang theo tập vở và bút viết; có mặt trước giờ học 05 - 10 phút để giáo viên hướng dẫn vào lớp.',
    assessmentPrep2Default:
      'Học viên đến đúng giờ hẹn, mang theo bút viết và giữ tinh thần thoải mái, tự tin để hoàn thành bài đánh giá tốt nhất.',
    arrivalNote:
      '(Học viên có mặt tại trung tâm trước giờ hẹn 05 - 10 phút để ổn định vị trí và làm quen giảng viên)',
  },
};

/**
 * Tự động nhận diện đối tượng Thiếu niên / Học viên lớn dựa vào mã lớp hoặc cấp độ.
 */
export function detectTeenAudience(rawContext = '') {
  return /KET|PET|B1|TOEIC|IELTS|ĐẠI HỌC|DAI HOC|CẤP 3|CAP 3|HỌC KÈM|HOC KEM|THIẾU NIÊN|THIEU NIEN|MONTHLY/i.test(
    String(rawContext || '')
  );
}

/**
 * Parse chuỗi ngày hoặc Date chuẩn múi giờ Việt Nam (Asia/Ho_Chi_Minh),
 * tránh lỗi lệch -1 ngày khi DB lưu ISO UTC dạng YYYY-MM-DDT17:00:00.000Z.
 */
export function parseVnDateSafe(rawDate, isoDate) {
  const candidate = isoDate || rawDate;
  if (!candidate) return null;

  if (!(candidate instanceof Date)) {
    const str = String(candidate).trim();
    const pureIso = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (pureIso) {
      return new Date(Number(pureIso[1]), Number(pureIso[2]) - 1, Number(pureIso[3]), 12, 0, 0);
    }
    const vnMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (vnMatch) {
      return new Date(Number(vnMatch[3]), Number(vnMatch[2]) - 1, Number(vnMatch[1]), 12, 0, 0);
    }
  }

  const vnYmd = toVnDateInputValue(candidate);
  if (vnYmd) {
    const [y, m, d] = vnYmd.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  const parsed = new Date(candidate);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatVnShortDate(rawDate, isoDate) {
  const d = parseVnDateSafe(rawDate, isoDate);
  if (!d) return String(rawDate || '').trim();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatVnDateWithWeekday(rawDate, isoDate) {
  const d = parseVnDateSafe(rawDate, isoDate);
  if (!d) return String(rawDate || '').trim();
  const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const dayName = daysOfWeek[d.getDay()];
  return `${dayName}, ngày ${formatVnShortDate(d)}`;
}

export function getTodayVnShortDate() {
  if (typeof window === 'undefined') return '';
  return new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

const CRITICAL_BRAND_FONTS = [
  '400 16px "Be Vietnam Pro"',
  '500 16px "Be Vietnam Pro"',
  '600 16px "Be Vietnam Pro"',
  '700 16px "Be Vietnam Pro"',
  '800 16px "Be Vietnam Pro"',
  '900 16px "Be Vietnam Pro"',
  'italic 500 16px "Be Vietnam Pro"',
  'italic 600 16px "Be Vietnam Pro"',
];

const VN_FONT_SAMPLE = 'ANH NGỮ NHẬT MỸ Dedicated to Excellence Ữ Ậ Ỹ Ễ Ỗ Đ Á À Ả Ã Ạ 0123456789';

/**
 * Đợi tải đầy đủ các weight tiếng Việt của Be Vietnam Pro trước khi chụp ảnh.
 */
export async function preloadBrandFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await document.fonts.ready;
    await Promise.allSettled(
      CRITICAL_BRAND_FONTS.map((spec) => document.fonts.load(spec, VN_FONT_SAMPLE))
    );
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve))
    );
  } catch {
    // Bỏ qua nếu Font Loading API bị hạn chế
  }
}

/**
 * Đợi tất cả <img> bên trong element tải xong trước khi html2canvas chụp.
 */
async function waitForImages(element) {
  if (!element) return;
  const imgs = Array.from(element.querySelectorAll('img'));
  await Promise.allSettled(
    imgs.map(async (img) => {
      if (!img.complete) {
        await new Promise((res) => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        });
      }
      if (typeof img.decode === 'function') {
        try {
          await img.decode();
        } catch {
          // Bỏ qua lỗi decode của data URI / SVG
        }
      }
    })
  );
}

/**
 * Chụp DOM thành HTML5 Canvas chuẩn Retina 2x dùng html2canvas.
 */
export async function exportElementToCanvas(element, options = {}) {
  if (!element) throw new Error('Không tìm thấy khung mẫu để xuất ảnh.');
  await preloadBrandFonts();
  await waitForImages(element);

  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#FFFFFF',
    logging: false,
    ...options,
  });
}

/**
 * Tải xuống file PNG Retina 2x.
 */
export async function downloadElementPng(element, filename = 'ThuNhatMy.png') {
  const canvas = await exportElementToCanvas(element);
  const dataUrl = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return dataUrl;
}

/**
 * Sao chép ảnh PNG Retina 2x trực tiếp vào Clipboard (hỗ trợ dán Zalo Ctrl+V).
 * Nếu trình duyệt chặn Clipboard API -> tự fallback tải file PNG về máy.
 */
export async function copyElementPng(element, fallbackFilename = 'ThuNhatMy.png') {
  const canvas = await exportElementToCanvas(element);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Không thể tạo dữ liệu ảnh PNG.');

  try {
    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
      return { status: 'COPIED' };
    }
  } catch (err) {
    console.warn('[copyElementPng] Clipboard fallback to download:', err);
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fallbackFilename;
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return { status: 'FALLBACK_DOWNLOADED' };
}
