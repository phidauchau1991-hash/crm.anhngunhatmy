import QRCode from 'qrcode';
import { getEffectiveBooksForStudent } from './coursewareBooks';

export const CARD_WIDTH = 750;
export const MAIN_CARD_HEIGHT = 990;
export const CARD_HEIGHT = 1200;
export const CARD_SCALE = 2; // Output 1500 x 2400 px Retina

const COLORS = {
  navy: '#0D88C4', // Màu Xanh Nhật Mỹ chuẩn (C85 M34 Y3 K0, R12 G131 B193)
  navyDark: '#095B83', // Xanh đậm bổ trợ
  gold: '#FFCA29', // Màu Vàng Nhật Mỹ chuẩn (C0 M20 Y100 K0, R255 G200 B42)
  goldDark: '#D97706', // Vàng hổ phách tạo tương phản sang trọng
  goldLight: '#FFE899', // Vàng sáng bổ trợ
  goldBg: '#FFFDF5',
  headerBg: '#FFFFFF', // Nền Header màu trắng tinh khôi theo yêu cầu Thầy Đấu
  cream: '#F8FBFC', // Nền thẻ xanh nhạt thanh lịch quý phái
  cardBg: '#FFFFFF',
  textDark: '#0F172A',
  textMuted: '#475569',
  redSeal: '#D71920',
  borderLight: '#E2E8F0',
  borderGold: '#FFCA29',
  accentGreen: '#059669',
};

// Đồng bộ DUY NHẤT 1 hệ thống Typography Geometric Sans-Serif nét dày chắc chắn (giống Thư Thông Báo Lịch Học)
export const FONT_SANS_BRAND = `"Be Vietnam Pro", "Segoe UI", Arial, sans-serif`;

const BRAND_FONT_SPECS = [
  '400 16px "Be Vietnam Pro"',
  '500 16px "Be Vietnam Pro"',
  '600 16px "Be Vietnam Pro"',
  '700 16px "Be Vietnam Pro"',
  '800 16px "Be Vietnam Pro"',
  '900 16px "Be Vietnam Pro"',
  'italic 500 16px "Be Vietnam Pro"',
  'italic 600 16px "Be Vietnam Pro"',
];

const VIETNAMESE_FONT_SAMPLE =
  'THƯ THÔNG BÁO CHÍNH THỨC CẤP PHÁT TÀI KHOẢN HỌC LIỆU SỐ ' +
  'ANH NGỮ NHẬT MỸ HỆ THỐNG ĐÀO TẠO TIẾNG ANH CHUẨN CAMBRIDGE ' +
  'ĐÃ CẤP QUYỀN HỌC LIỆU Ữ Ậ Ỹ Ễ Ỗ ★ → ⋮ 0123456789 SĐT Zalo Ba/Mẹ';

let studentCardFontPromise = null;

/**
 * Ép tải đầy đủ các weight tiếng Việt của Be Vietnam Pro trước khi vẽ lên HTML5 Canvas
 */
export function preloadStudentCardFonts() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve();
  if (studentCardFontPromise) return studentCardFontPromise;

  studentCardFontPromise = (async () => {
    await Promise.allSettled(
      BRAND_FONT_SPECS.map((spec) =>
        document.fonts.load(spec, VIETNAMESE_FONT_SAMPLE)
      )
    );
    await document.fonts.ready;
  })().catch((err) => {
    console.warn('[studentCardCanvas] Font preload warning:', err);
  });

  return studentCardFontPromise;
}

/**
 * Helper thiết lập font và letterSpacing nhất quán trên Canvas
 */
function setBrandFont(ctx, { weight = 500, size = 12, italic = false, spacing = 0 } = {}) {
  ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${FONT_SANS_BRAND}`;
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${spacing}px`;
  }
}

/**
 * Helper tải ảnh từ URL / Data URI
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) return reject(new Error('No image source'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image: ' + src));
    img.src = src;
  });
}

/**
 * Helper vẽ hình chữ nhật bo góc
 */
function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

/**
 * Helper vẽ con dấu đỏ Nhật Mỹ chuẩn mực (Font Be Vietnam Pro đồng nhất)
 */
function drawOfficialStamp(ctx, cx, cy, radius, dateStr) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.15); // Góc nghiêng tự nhiên ~ -8.5 độ

  ctx.strokeStyle = COLORS.redSeal;
  ctx.fillStyle = COLORS.redSeal;

  // Viền ngoài đôi
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
  ctx.stroke();

  // Viền chấm bên trong
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.arc(0, 0, radius - 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Chữ trên: ANH NGỮ NHẬT MỸ
  setBrandFont(ctx, { weight: 800, size: 9.5, spacing: 0 });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const topText = 'ANH NGỮ NHẬT MỸ';
  const topRadius = radius - 11;
  const topArc = Math.PI * 0.74;
  const startAngle = -Math.PI / 2 - topArc / 2;
  const step = topArc / (topText.length - 1);

  for (let i = 0; i < topText.length; i++) {
    const angle = startAngle + i * step;
    ctx.save();
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillText(topText[i], 0, -topRadius);
    ctx.restore();
  }

  // Đường kẻ ngang giữa
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-radius + 18, -17);
  ctx.lineTo(radius - 18, -17);
  ctx.moveTo(-radius + 18, 17);
  ctx.lineTo(radius - 18, 17);
  ctx.stroke();

  // Chữ chính giữa: NHẬT MỸ
  setBrandFont(ctx, { weight: 900, size: 17.5, spacing: 0 });
  ctx.fillText('NHẬT MỸ', 0, -2, 82);

  // Chữ phụ: ĐÃ CẤP QUYỀN HỌC LIỆU
  setBrandFont(ctx, { weight: 700, size: 7.2, spacing: 0 });
  ctx.fillText('★ ĐÃ CẤP QUYỀN HỌC LIỆU ★', 0, 10, 86);

  // Ngày cấp ở cung dưới
  setBrandFont(ctx, { weight: 700, size: 8, spacing: 0 });
  ctx.fillText(dateStr || 'ĐÃ XÁC THỰC', 0, radius - 11);

  ctx.restore();
}

/**
 * Render thẻ học viên & thư cấp phát học liệu số trên Canvas
 * Trả về canvas đã vẽ với kích thước 1500 x 2400 (Retina 2x)
 */
export async function renderStudentCardCanvas({
  student,
  classInfo = null,
  customBooks = null,
  portalToken = '',
  issuedDate = new Date(),
}) {
  // 1. Đảm bảo toàn bộ weight tiếng Việt của Be Vietnam Pro đã nạp xong trước khi vẽ Canvas
  await preloadStudentCardFonts();

  // 2. Tạo canvas với tỉ lệ Retina 2x
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH * CARD_SCALE;
  canvas.height = CARD_HEIGHT * CARD_SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(CARD_SCALE, CARD_SCALE);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 3. Chuẩn bị dữ liệu học viên & sách
  const effectiveBooks = customBooks || getEffectiveBooksForStudent(student, classInfo);
  const studentToken = portalToken || student.portalToken || student.parentPortalToken || '';

  // URL điều hướng an toàn qua CRM có chứng chỉ SSL Let's Encrypt chuẩn
  const crmOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : process.env.NEXT_PUBLIC_CRM_URL || 'https://crm.anhngunhatmy.edu.vn';
  const webAppUrl = `${crmOrigin.replace(/\/+$/, '')}/hoclieu?token=${encodeURIComponent(studentToken)}`;

  // 4. Sinh QR Code nội bộ bằng QRCode dataURL
  let qrImage = null;
  try {
    const qrDataUrl = await QRCode.toDataURL(webAppUrl, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: COLORS.navy, light: '#FFFFFF' },
    });
    qrImage = await loadImage(qrDataUrl);
  } catch (err) {
    console.error('Lỗi sinh mã QR:', err);
  }

  // 5. Thử nạp logo Nhật Mỹ (tỷ lệ gốc 1:1)
  let logoImg = null;
  try {
    logoImg = await loadImage('/logo.png');
  } catch (err) {
    // Nếu không nạp được logo, dùng monogram fallback
  }

  // ==========================================
  // BẮT ĐẦU VẼ CÁC LỚP ĐỒ HỌA (CHỮ DÀY CHẮC CHẮN)
  // ==========================================

  // --- LỚP 1: Nền thẻ sang trọng (Thư chính 0..990) & Nền trắng Cuống phiếu (990..1200) ---
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, CARD_WIDTH, MAIN_CARD_HEIGHT);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, MAIN_CARD_HEIGHT, CARD_WIDTH, CARD_HEIGHT - MAIN_CARD_HEIGHT);

  // Viền khung hoàng gia đôi viền Gold ngoài ôm trọn Thư chính
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 16, 16, CARD_WIDTH - 32, MAIN_CARD_HEIGHT - 28, 16, false, true);
  ctx.strokeStyle = COLORS.goldLight;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 22, 22, CARD_WIDTH - 44, MAIN_CARD_HEIGHT - 40, 12, false, true);

  // --- LỚP 2: Header NỀN TRẮNG (#FFFFFF) Nổi Bật Logo Nhật Mỹ ---
  const headerHeight = 158;
  ctx.fillStyle = COLORS.headerBg;
  ctx.beginPath();
  ctx.moveTo(24, 24);
  ctx.lineTo(CARD_WIDTH - 24, 24);
  ctx.lineTo(CARD_WIDTH - 24, 24 + headerHeight);
  ctx.lineTo(24, 24 + headerHeight);
  ctx.closePath();
  ctx.fill();

  // Chỉ Gold kép ngăn cách header và thân thư
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(24, 24 + headerHeight, CARD_WIDTH - 48, 3.5);
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillRect(24, 24 + headerHeight + 3.5, CARD_WIDTH - 48, 1);

  // Vẽ Logo Nhật Mỹ nguyên bản (tỷ lệ vuông 1:1 chuẩn xác 105x105)
  const logoX = 50;
  const logoY = 48;
  const logoSize = 105;

  if (logoImg) {
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
  } else {
    ctx.fillStyle = COLORS.navy;
    drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 14, true, false);
    ctx.fillStyle = COLORS.gold;
    setBrandFont(ctx, { weight: 900, size: 42, spacing: 0 });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NM', logoX + logoSize / 2, logoY + logoSize / 2);
  }

  // Tên trung tâm & Slogan & Hệ thống đào tạo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const headerBrandX = logoX + logoSize + 22;
  const headerBrandY = 50;
  const brandBlueGrad = ctx.createLinearGradient(headerBrandX, headerBrandY, headerBrandX, headerBrandY + 30);
  brandBlueGrad.addColorStop(0, '#0D88C4');
  brandBlueGrad.addColorStop(1, '#086A9B');
  ctx.fillStyle = brandBlueGrad;
  setBrandFont(ctx, { weight: 900, size: 26, spacing: 0.25 });
  ctx.fillText('ANH NGỮ NHẬT MỸ', headerBrandX, headerBrandY, 360);

  // Slogan ngay dưới tên
  ctx.fillStyle = COLORS.goldDark;
  setBrandFont(ctx, { weight: 600, size: 13, italic: true, spacing: 0.15 });
  ctx.fillText('Dedicated to Excellence', headerBrandX + 1, 86, 360);

  // Huy hiệu góc phải Header
  const rightHeaderText = 'CAMBRIDGE ENGLISH';
  setBrandFont(ctx, { weight: 800, size: 11.5, spacing: 0.3 });
  const rightHeaderW = ctx.measureText(rightHeaderText).width;
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.goldDark;
  ctx.fillText(rightHeaderText, CARD_WIDTH - 48, 66);

  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 600, size: 11.5, italic: true, spacing: 0.1 });
  ctx.fillText('Digital Learning Pass', CARD_WIDTH - 48, 88);

  // Dòng Hệ thống đào tạo chuẩn Cambridge (tự tính khoảng hở để không đụng cột phải)
  const leftSystemMaxW = Math.max(300, CARD_WIDTH - 48 - rightHeaderW - 18 - headerBrandX);
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 700, size: 11, spacing: 0.15 });
  ctx.fillText('HỆ THỐNG ĐÀO TẠO TIẾNG ANH CHUẨN CAMBRIDGE', headerBrandX, 114, leftSystemMaxW);

  // --- LỚP 3: Tiêu đề Thư thông báo ---
  const titleY = 212;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 800, size: 12, spacing: 2.2 });
  ctx.fillText('THƯ THÔNG BÁO CHÍNH THỨC', CARD_WIDTH / 2, titleY, 560);

  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 900, size: 23.5, spacing: 0.5 });
  ctx.fillText('CẤP PHÁT TÀI KHOẢN HỌC LIỆU SỐ', CARD_WIDTH / 2, titleY + 27, 650);
  setBrandFont(ctx, { weight: 500, size: 12, spacing: 0 });

  // Đường trang trí kim loại dưới tiêu đề
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(CARD_WIDTH / 2 - 110, titleY + 68);
  ctx.lineTo(CARD_WIDTH / 2 + 110, titleY + 68);
  ctx.stroke();

  // Hình thoi trang trí giữa đường
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.moveTo(CARD_WIDTH / 2, titleY + 68 - 5);
  ctx.lineTo(CARD_WIDTH / 2 + 5, titleY + 68);
  ctx.lineTo(CARD_WIDTH / 2, titleY + 68 + 5);
  ctx.lineTo(CARD_WIDTH / 2 - 5, titleY + 68);
  ctx.closePath();
  ctx.fill();

  // --- LỚP 4: Box Thông tin Học Viên ---
  const infoBoxX = 46;
  const infoBoxY = 295;
  const infoBoxW = CARD_WIDTH - 92;
  const infoBoxH = 145;

  ctx.fillStyle = COLORS.cardBg;
  drawRoundedRect(ctx, infoBoxX, infoBoxY, infoBoxW, infoBoxH, 12, true, false);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, infoBoxX, infoBoxY, infoBoxW, infoBoxH, 12, false, true);

  // Dải trang trí bên trái Box thông tin
  ctx.fillStyle = COLORS.navy;
  ctx.beginPath();
  ctx.moveTo(infoBoxX, infoBoxY + 12);
  ctx.lineTo(infoBoxX + 6, infoBoxY + 12);
  ctx.lineTo(infoBoxX + 6, infoBoxY + infoBoxH - 12);
  ctx.lineTo(infoBoxX, infoBoxY + infoBoxH - 12);
  ctx.closePath();
  ctx.fill();

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Hàng 1: Họ tên học viên (dày, vuông vức, uy tín)
  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 700, size: 11, spacing: 0.4 });
  ctx.fillText('HỌ VÀ TÊN HỌC VIÊN', infoBoxX + 24, infoBoxY + 18);

  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 900, size: 22.5, spacing: 0.2 });
  const studentName = (student.name || student.fullName || 'HỌC VIÊN').toUpperCase();
  ctx.fillText(studentName, infoBoxX + 24, infoBoxY + 35, infoBoxW - 190);

  // Badge trạng thái học viên góc phải
  const isEnrolled = student.status === 'Đang học';
  ctx.fillStyle = isEnrolled ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)';
  drawRoundedRect(ctx, infoBoxX + infoBoxW - 150, infoBoxY + 18, 130, 28, 6, true, false);
  ctx.fillStyle = isEnrolled ? COLORS.accentGreen : '#D97706';
  setBrandFont(ctx, { weight: 800, size: 11.5, spacing: 0.2 });
  ctx.textAlign = 'center';
  ctx.fillText(isEnrolled ? '● CHÍNH THỨC' : `● ${student.status || 'BẢO LƯU'}`, infoBoxX + infoBoxW - 85, infoBoxY + 25);

  // Hàng 2: Grid 3 cột (Mã HV - Lớp học - Ngày kích hoạt)
  ctx.textAlign = 'left';
  const colY = infoBoxY + 80;

  // Cột 1: Mã HV
  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 700, size: 10.5, spacing: 0.2 });
  ctx.fillText('MÃ ĐỊNH DANH (ID):', infoBoxX + 24, colY);
  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 800, size: 14.5, spacing: 0 });
  ctx.fillText(student.id || 'N/A', infoBoxX + 24, colY + 18, 180);

  // Cột 2: Lớp học
  const col2X = infoBoxX + 215;
  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 700, size: 10.5, spacing: 0.2 });
  ctx.fillText('LỚP HỌC HIỆN TẠI:', col2X, colY);
  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 800, size: 14.5, spacing: 0 });
  const className = student.classCode || (classInfo ? classInfo.code : 'Chưa xếp lớp');
  ctx.fillText(className, col2X, colY + 18, 215);

  // Cột 3: Ngày cấp thẻ
  const col3X = infoBoxX + 445;
  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 700, size: 10.5, spacing: 0.2 });
  ctx.fillText('NGÀY KÍCH HOẠT:', col3X, colY);
  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 800, size: 14.5, spacing: 0 });
  const dateFormatted = issuedDate instanceof Date ? issuedDate.toLocaleDateString('vi-VN') : String(issuedDate);
  ctx.fillText(dateFormatted, col3X, colY + 18, 185);

  // --- LỚP 5: Box Giáo trình & Con Dấu Đỏ bên phải ---
  const bookBoxY = 455;
  const bookBoxH = 120;
  ctx.fillStyle = COLORS.cardBg;
  drawRoundedRect(ctx, infoBoxX, bookBoxY, infoBoxW, bookBoxH, 12, true, false);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, infoBoxX, bookBoxY, infoBoxW, bookBoxH, 12, false, true);

  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 800, size: 12, spacing: 0.2 });
  ctx.textAlign = 'left';
  ctx.fillText('GIÁO TRÌNH TƯƠNG TÁC ĐƯỢC PHÂN QUYỀN TRUY CẬP:', infoBoxX + 20, bookBoxY + 16);

  // Vẽ các huy hiệu giáo trình (Pill badges)
  let badgeX = infoBoxX + 20;
  let badgeY = bookBoxY + 44;
  const maxBadgeRight = infoBoxX + infoBoxW - 175;

  if (effectiveBooks.length === 0) {
    ctx.fillStyle = COLORS.textMuted;
    setBrandFont(ctx, { weight: 500, size: 12.5, italic: true, spacing: 0 });
    ctx.fillText('Đang cập nhật danh mục sách theo tiến độ lớp...', badgeX, badgeY + 10);
  } else {
    for (const book of effectiveBooks) {
      const badgeText = `📖 ${book.title}`;
      setBrandFont(ctx, { weight: 700, size: 12, spacing: 0 });
      const textW = ctx.measureText(badgeText).width;
      const badgeW = textW + 26;

      if (badgeX + badgeW > maxBadgeRight) {
        badgeX = infoBoxX + 20;
        badgeY += 34;
      }

      ctx.fillStyle = book.color ? `${book.color}15` : 'rgba(13, 136, 196, 0.08)';
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, 28, 6, true, false);
      ctx.strokeStyle = book.color || COLORS.navy;
      ctx.lineWidth = 1.2;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, 28, 6, false, true);

      ctx.fillStyle = book.color || COLORS.navy;
      ctx.textAlign = 'left';
      ctx.fillText(badgeText, badgeX + 13, badgeY + 7);

      badgeX += badgeW + 10;
    }
  }

  // Con dấu đỏ bên phải ô giáo trình
  const stampCx = infoBoxX + infoBoxW - 88;
  const stampCy = bookBoxY + 60;
  drawOfficialStamp(ctx, stampCx, stampCy, 48, dateFormatted);

  // --- LỚP 6: Khu vực Mã QR & Hướng dẫn sử dụng (Chia 2 cột) ---
  const qrSectionY = 588;
  const qrBoxW = 270;
  const qrBoxH = 290;
  const qrBoxX = infoBoxX;

  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrBoxX, qrSectionY, qrBoxW, qrBoxH, 12, true, false);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, qrBoxX, qrSectionY, qrBoxW, qrBoxH, 12, false, true);

  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 800, size: 11.5, spacing: 0.2 });
  ctx.textAlign = 'center';
  ctx.fillText('QUÉT MÃ ĐĂNG NHẬP NHANH', qrBoxX + qrBoxW / 2, qrSectionY + 20);

  if (qrImage) {
    const qrRenderSize = 188;
    const qrPosX = qrBoxX + (qrBoxW - qrRenderSize) / 2;
    const qrPosY = qrSectionY + 42;
    ctx.drawImage(qrImage, qrPosX, qrPosY, qrRenderSize, qrRenderSize);
  }

  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 600, size: 10.5, spacing: 0 });
  ctx.textAlign = 'center';
  ctx.fillText('Không cần nhập tài khoản / mật khẩu', qrBoxX + qrBoxW / 2, qrSectionY + 244, qrBoxW - 20);
  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 800, size: 10.5, spacing: 0 });
  ctx.fillText('Quét bằng Zalo hoặc Camera điện thoại', qrBoxX + qrBoxW / 2, qrSectionY + 263, qrBoxW - 20);

  // Cột Hướng dẫn phụ huynh bên phải
  const guideX = qrBoxX + qrBoxW + 20;
  const guideW = infoBoxW - qrBoxW - 20;
  const guideH = qrBoxH;

  ctx.fillStyle = COLORS.cardBg;
  drawRoundedRect(ctx, guideX, qrSectionY, guideW, guideH, 12, true, false);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, guideX, qrSectionY, guideW, guideH, 12, false, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 800, size: 13, spacing: 0.2 });
  ctx.fillText('3 BƯỚC ĐỒNG HÀNH CÙNG BÉ:', guideX + 20, qrSectionY + 20);

  const steps = [
    {
      num: '1',
      title: 'Quét mã QR bằng Camera / Zalo',
      desc: 'Mở ứng dụng Zalo hoặc Camera điện thoại, hướng máy vào mã QR bên cạnh để vào thẳng ứng dụng học liệu.',
    },
    {
      num: '2',
      title: 'Đưa App ra màn hình điện thoại',
      desc: 'Bấm dấu 3 chấm (⋮) góc phải màn hình → Chọn "Thêm vào màn hình chính" để biểu tượng Nhật Mỹ hiện ngoài máy.',
    },
    {
      num: '3',
      title: 'Chỉ 10 - 15 phút mỗi tối cùng con',
      desc: 'Bé nghe audio chuẩn giọng bản ngữ và làm bài tập ôn luyện đều đặn sau mỗi buổi học tại trung tâm.',
    },
  ];

  let stepY = qrSectionY + 52;
  const descMaxWidth = guideW - 74;

  for (const step of steps) {
    // Vòng tròn số thứ tự
    ctx.fillStyle = COLORS.navy;
    ctx.beginPath();
    ctx.arc(guideX + 32, stepY + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    setBrandFont(ctx, { weight: 800, size: 11.5, spacing: 0 });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(step.num, guideX + 32, stepY + 12);

    // Tiêu đề bước
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.navy;
    setBrandFont(ctx, { weight: 800, size: 12, spacing: 0 });
    ctx.fillText(step.title, guideX + 54, stepY + 1, descMaxWidth);

    // Nội dung bước (tự điều chỉnh fontSize nhẹ nếu cần để không quá 3 dòng)
    ctx.fillStyle = COLORS.textMuted;
    let descSize = 10.5;
    setBrandFont(ctx, { weight: 500, size: descSize, spacing: 0 });
    let lines = computeWrapLines(ctx, step.desc, descMaxWidth);
    while (lines.length > 3 && descSize > 9.5) {
      descSize -= 0.25;
      setBrandFont(ctx, { weight: 500, size: descSize, spacing: 0 });
      lines = computeWrapLines(ctx, step.desc, descMaxWidth);
    }
    lines.slice(0, 3).forEach((line, idx) => {
      ctx.fillText(line, guideX + 54, stepY + 20 + idx * 14.5, descMaxWidth);
    });

    stepY += 76;
  }

  // --- LỚP 8: Footer & Hotline hỗ trợ ---
  const footerY = 890;
  const footerBottom = MAIN_CARD_HEIGHT - 18;
  ctx.fillStyle = COLORS.navy;
  ctx.beginPath();
  ctx.moveTo(24, footerY);
  ctx.lineTo(CARD_WIDTH - 24, footerY);
  ctx.lineTo(CARD_WIDTH - 24, footerBottom);
  ctx.lineTo(24, footerBottom);
  ctx.closePath();
  ctx.fill();

  // Chỉ Gold trên footer
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(24, footerY, CARD_WIDTH - 48, 2.5);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Hàng 1: ANH NGỮ NHẬT MỸ
  ctx.fillStyle = '#FFFFFF';
  setBrandFont(ctx, { weight: 900, size: 15.5, spacing: 0.6 });
  ctx.fillText('ANH NGỮ NHẬT MỸ', CARD_WIDTH / 2, footerY + 22);

  // Hàng 2: Slogan Dedicated to Excellence (nằm dưới, nhỏ hơn, in nghiêng)
  ctx.fillStyle = COLORS.goldLight;
  setBrandFont(ctx, { weight: 600, size: 12.5, italic: true, spacing: 0.3 });
  ctx.fillText('Dedicated to Excellence', CARD_WIDTH / 2, footerY + 42);

  // Hàng 3: Hotline hỗ trợ phụ huynh
  ctx.fillStyle = COLORS.gold;
  setBrandFont(ctx, { weight: 700, size: 11.5, spacing: 0.2 });
  ctx.fillText('Hotline hỗ trợ phụ huynh: 0911 767 069', CARD_WIDTH / 2, footerY + 63);

  // --- LỚP 9: CUỐNG PHIẾU XÁC NHẬN CẮT RỜI (NỀN TRẮNG DỄ VIẾT BÚT BI) ---
  setBrandFont(ctx, { weight: 500, size: 12, spacing: 0 });
  const cutY = MAIN_CARD_HEIGHT + 10; // y = 1000

  ctx.save();
  ctx.strokeStyle = '#64748B';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  ctx.moveTo(24, cutY);
  ctx.lineTo(CARD_WIDTH - 24, cutY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(26, cutY - 9, 24, 18);
  ctx.fillStyle = '#475569';
  setBrandFont(ctx, { weight: 700, size: 13, spacing: 0 });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('✂', 30, cutY + 1);

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(CARD_WIDTH - 230, cutY - 8, 202, 16);
  ctx.fillStyle = '#64748B';
  setBrandFont(ctx, { weight: 700, size: 9.5, spacing: 0.2 });
  ctx.textAlign = 'right';
  ctx.fillText('PHẦN CẮT GỬI LẠI TRUNG TÂM', CARD_WIDTH - 34, cutY);
  ctx.restore();

  // Khung cuống phiếu bên dưới
  const slipX = 34;
  const slipY = cutY + 15; // y = 1015
  const slipW = CARD_WIDTH - 68;
  const slipH = CARD_HEIGHT - slipY - 14; // 171

  ctx.fillStyle = '#FAFCFF';
  drawRoundedRect(ctx, slipX, slipY, slipW, slipH, 10, true, false);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, slipX, slipY, slipW, slipH, 10, false, true);

  // Tiêu đề cuống phiếu
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 900, size: 13, spacing: 0.2 });
  ctx.fillText('PHIẾU XÁC NHẬN ĐÃ CÀI HỌC LIỆU SỐ LÊN ĐIỆN THOẠI', CARD_WIDTH / 2, slipY + 11, slipW - 24);

  // Ghi chú nhỏ khích lệ học viên
  ctx.fillStyle = COLORS.textMuted;
  setBrandFont(ctx, { weight: 600, size: 10.5, italic: true, spacing: 0 });
  ctx.fillText(
    '(Ba Mẹ quét mã cài App xong, vui lòng điền phiếu này gửi lại Thầy Cô để bé nhận sao thưởng nhé ạ!)',
    CARD_WIDTH / 2,
    slipY + 30,
    slipW - 24
  );

  // Đường kẻ phân cách nhẹ
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(slipX + 16, slipY + 49);
  ctx.lineTo(slipX + slipW - 16, slipY + 49);
  ctx.stroke();

  // Dòng 1: Thông tin in sẵn để không nhầm lẫn
  const row1Y = slipY + 58;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textDark;
  setBrandFont(ctx, { weight: 700, size: 11.5, spacing: 0 });
  ctx.fillText(`Họ tên học viên: ${studentName} (${student.id || 'N/A'})`, slipX + 18, row1Y, slipW - 185);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.navy;
  setBrandFont(ctx, { weight: 700, size: 11.5, spacing: 0 });
  ctx.fillText(`Lớp: ${className}`, slipX + slipW - 18, row1Y, 155);

  // Dòng 2: Checkbox Xác nhận cài App
  const row2Y = slipY + 86;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, slipX + 18, row2Y, 15, 15, 3, true, false);
  ctx.strokeStyle = COLORS.navy;
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, slipX + 18, row2Y, 15, 15, 3, false, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.textDark;
  setBrandFont(ctx, { weight: 700, size: 11.5, spacing: 0 });
  ctx.fillText('Đã cài biểu tượng Anh Ngữ Nhật Mỹ ra màn hình điện thoại', slipX + 42, row2Y + 1, slipW - 60);

  // Helper vẽ dòng điền tay chấm đứt chuẩn xác
  const drawDottedFieldLine = (label, yPos) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.textDark;
    setBrandFont(ctx, { weight: 700, size: 11, spacing: 0 });
    ctx.fillText(label, slipX + 18, yPos);
    const labelWidth = ctx.measureText(label).width;
    ctx.save();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(slipX + 24 + labelWidth, yPos + 12);
    ctx.lineTo(slipX + slipW - 18, yPos + 12);
    ctx.stroke();
    ctx.restore();
  };

  drawDottedFieldLine('SĐT Zalo Ba/Mẹ (để nhận báo cáo 14 ngày):', slipY + 115);
  drawDottedFieldLine('Họ tên & Chữ ký của Ba/Mẹ:', slipY + 143);

  return canvas;
}

/**
 * Helper tính toán các dòng ngắt chữ theo maxWidth trên Canvas
 */
function computeWrapLines(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trimEnd());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  if (line.trim()) lines.push(line.trimEnd());
  return lines;
}

/**
 * Chuyển đổi canvas thành Blob PNG chuẩn
 */
export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Không thể tạo file ảnh từ Canvas'));
    }, 'image/png', 1.0);
  });
}
