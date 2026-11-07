import QRCode from 'qrcode';
import { getEffectiveBooksForStudent } from './coursewareBooks';

export const CARD_WIDTH = 750;
export const CARD_HEIGHT = 1000;
export const CARD_SCALE = 2; // Output 1500 x 2000 px Retina

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
  textMuted: '#64748B',
  redSeal: '#D71920',
  borderLight: '#E2E8F0',
  borderGold: '#FFCA29',
  accentGreen: '#059669',
};

// Hệ thống Typography học thuật sang trọng chuẩn Cambridge (thống nhất toàn bộ thẻ)
const FONT_SERIF = `"Playfair Display", "Merriweather", "Times New Roman", "Georgia", serif`;

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
 * Helper vẽ con dấu đỏ Nhật Mỹ chuẩn mực
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
  ctx.font = `bold 10.5px ${FONT_SERIF}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Vẽ chữ cung tròn trên
  const topText = 'ANH NGỮ NHẬT MỸ';
  const topRadius = radius - 11;
  const topArc = Math.PI * 0.72;
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
  ctx.font = `900 19px ${FONT_SERIF}`;
  ctx.fillText('NHẬT MỸ', 0, -1);

  // Chữ phụ: CẤP QUYỀN HỌC LIỆU
  ctx.font = `bold 8px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('★ ĐÃ CẤP QUYỀN HỌC LIỆU ★', 0, 10);

  // Ngày cấp ở cung dưới
  ctx.font = `600 8.5px ${FONT_SERIF}`;
  ctx.fillText(dateStr || 'ĐÃ XÁC THỰC', 0, radius - 11);

  ctx.restore();
}

/**
 * Render thẻ học viên & thư cấp phát học liệu số trên Canvas
 * Trả về canvas đã vẽ với kích thước 1500 x 2000 (Retina 2x)
 */
export async function renderStudentCardCanvas({
  student,
  classInfo = null,
  customBooks = null,
  portalToken = '',
  issuedDate = new Date(),
}) {
  // 1. Chờ phông chữ trình duyệt sẵn sàng
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch (e) {
      // Bỏ qua nếu môi trường không hỗ trợ font API
    }
  }

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
  
  // URL điều hướng an toàn qua CRM có chứng chỉ SSL Let's Encrypt chuẩn (tránh lỗi SSL subdomain)
  const crmOrigin = (typeof window !== 'undefined' && window.location?.origin) 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_CRM_URL || 'https://crm.anhngunhatmy.edu.vn');
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

  // 5. Thử nạp logo Nhật Mỹ (nếu có trong public)
  let logoImg = null;
  try {
    logoImg = await loadImage('/logo.png');
  } catch (err) {
    // Nếu không nạp được logo, dùng monogram fallback
  }

  // ==========================================
  // BẮT ĐẦU VẼ CÁC LỚP ĐỒ HỌA
  // ==========================================

  // --- LỚP 1: Nền thẻ sang trọng ---
  ctx.fillStyle = COLORS.cream;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Viền khung hoàng gia đôi viền Gold ngoài
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 2.5;
  drawRoundedRect(ctx, 16, 16, CARD_WIDTH - 32, CARD_HEIGHT - 32, 16, false, true);
  ctx.strokeStyle = COLORS.goldLight;
  ctx.lineWidth = 1;
  drawRoundedRect(ctx, 22, 22, CARD_WIDTH - 44, CARD_HEIGHT - 44, 12, false, true);

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

  // Vẽ Logo Nhật Mỹ nguyên bản (giữ nguyên hình dạng nhận diện gốc, không viền vàng, không cắt xén)
  const logoX = 50;
  const logoY = 48;
  const logoSize = 105;

  if (logoImg) {
    ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
  } else {
    // Fallback Monogram
    ctx.fillStyle = COLORS.navy;
    drawRoundedRect(ctx, logoX, logoY, logoSize, logoSize, 14, true, false);
    ctx.fillStyle = COLORS.gold;
    ctx.font = `900 44px ${FONT_SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NM', logoX + logoSize / 2, logoY + logoSize / 2);
  }

  // Tên trung tâm & Slogan & Hệ thống đào tạo
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // 1. Tên thương hiệu ANH NGỮ NHẬT MỸ - Màu Xanh Nhật Mỹ chuẩn nhận diện (theo yêu cầu Thầy Đấu)
  const headerBrandX = logoX + logoSize + 22;
  const headerBrandY = 52;
  const brandBlueGrad = ctx.createLinearGradient(headerBrandX, headerBrandY, headerBrandX, headerBrandY + 30);
  brandBlueGrad.addColorStop(0, '#0D88C4'); // Xanh thương hiệu Nhật Mỹ
  brandBlueGrad.addColorStop(1, '#086A9B'); // Xanh đậm Nhật Mỹ tạo độ sắc nét, tương phản hoàn hảo trên nền trắng
  ctx.fillStyle = brandBlueGrad;
  ctx.font = `900 28px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('ANH NGỮ NHẬT MỸ', headerBrandX, headerBrandY);

  // 2. Slogan chuẩn đặt ngay dưới tên - Điểm nhấn Vàng hoàng gia tinh tế
  ctx.fillStyle = COLORS.goldDark;
  ctx.font = `italic 600 13px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('Dedicated to Excellence', logoX + logoSize + 24, 88);

  // 3. Hệ thống đào tạo chuẩn Cambridge
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `700 12.5px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.3px';
  ctx.fillText('HỆ THỐNG ĐÀO TẠO TIẾNG ANH CHUẨN CAMBRIDGE', logoX + logoSize + 22, 114);

  // Huy hiệu góc phải Header trên nền trắng
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.goldDark;
  ctx.font = `800 12px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.5px';
  ctx.fillText('CAMBRIDGE ENGLISH', CARD_WIDTH - 50, 68);
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `italic 500 11.5px ${FONT_SERIF}`;
  ctx.fillText('Digital Learning Pass', CARD_WIDTH - 50, 90);

  // --- LỚP 3: Tiêu đề Thư thông báo ---
  const titleY = 212;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `800 12.5px ${FONT_SERIF}`;
  ctx.letterSpacing = '2.5px';
  ctx.fillText('THƯ THÔNG BÁO CHÍNH THỨC', CARD_WIDTH / 2, titleY);

  ctx.fillStyle = COLORS.navy;
  ctx.font = `900 24px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.8px';
  ctx.fillText('CẤP PHÁT TÀI KHOẢN HỌC LIỆU SỐ', CARD_WIDTH / 2, titleY + 28);

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

  // Thông tin học viên bên trong
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Hàng 1: Họ tên học viên (font Serif sang trọng quý phái)
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `700 11px ${FONT_SERIF}`;
  ctx.fillText('HỌ VÀ TÊN HỌC VIÊN', infoBoxX + 24, infoBoxY + 18);

  ctx.fillStyle = COLORS.navy;
  ctx.font = `900 24px ${FONT_SERIF}`;
  const studentName = (student.name || student.fullName || 'HỌC VIÊN').toUpperCase();
  ctx.fillText(studentName, infoBoxX + 24, infoBoxY + 34);

  // Badge trạng thái học viên góc phải
  const isEnrolled = student.status === 'Đang học';
  ctx.fillStyle = isEnrolled ? 'rgba(5, 150, 105, 0.12)' : 'rgba(217, 119, 6, 0.12)';
  drawRoundedRect(ctx, infoBoxX + infoBoxW - 145, infoBoxY + 18, 125, 28, 6, true, false);
  ctx.fillStyle = isEnrolled ? COLORS.accentGreen : '#D97706';
  ctx.font = `800 12px ${FONT_SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText(isEnrolled ? '● CHÍNH THỨC' : `● ${student.status || 'BẢO LƯU'}`, infoBoxX + infoBoxW - 82, infoBoxY + 25);

  // Hàng 2: Grid 3 cột (Mã HV - Lớp học - Giáo viên)
  ctx.textAlign = 'left';
  const colY = infoBoxY + 80;

  // Cột 1: Mã HV
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `600 11px ${FONT_SERIF}`;
  ctx.fillText('MÃ ĐỊNH DANH (ID):', infoBoxX + 24, colY);
  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 15px ${FONT_SERIF}`;
  ctx.fillText(student.id || 'N/A', infoBoxX + 24, colY + 18);

  // Cột 2: Lớp học
  const col2X = infoBoxX + 220;
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `600 11px ${FONT_SERIF}`;
  ctx.fillText('LỚP HỌC HIỆN TẠI:', col2X, colY);
  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 15px ${FONT_SERIF}`;
  const className = student.classCode || (classInfo ? classInfo.code : 'Chưa xếp lớp');
  ctx.fillText(className, col2X, colY + 18);

  // Cột 3: Ngày cấp thẻ
  const col3X = infoBoxX + 440;
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `600 11px ${FONT_SERIF}`;
  ctx.fillText('NGÀY KÍCH HOẠT:', col3X, colY);
  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 15px ${FONT_SERIF}`;
  const dateFormatted = issuedDate instanceof Date ? issuedDate.toLocaleDateString('vi-VN') : String(issuedDate);
  ctx.fillText(dateFormatted, col3X, colY + 18);

  // --- LỚP 5: Box Giáo trình & VỊ TRÍ CON DẤU ĐỎ MỚI (CẠNH SÁCH, KHÔNG CHE CHỮ) ---
  const bookBoxY = 455;
  const bookBoxH = 120;
  ctx.fillStyle = COLORS.cardBg;
  drawRoundedRect(ctx, infoBoxX, bookBoxY, infoBoxW, bookBoxH, 12, true, false);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, infoBoxX, bookBoxY, infoBoxW, bookBoxH, 12, false, true);

  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 12.5px ${FONT_SERIF}`;
  ctx.textAlign = 'left';
  ctx.fillText('GIÁO TRÌNH TƯƠNG TÁC ĐƯỢC PHÂN QUYỀN TRUY CẬP:', infoBoxX + 20, bookBoxY + 16);

  // Vẽ các huy hiệu giáo trình (Pill badges) ở bên trái
  let badgeX = infoBoxX + 20;
  let badgeY = bookBoxY + 44;
  const maxBadgeRight = infoBoxX + infoBoxW - 175; // Dành khoảng trống 175px bên phải cho Con Dấu Đỏ

  if (effectiveBooks.length === 0) {
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `italic 13px ${FONT_SERIF}`;
    ctx.fillText('Đang cập nhật danh mục sách theo tiến độ lớp...', badgeX, badgeY + 10);
  } else {
    for (const book of effectiveBooks) {
      const badgeText = `📖 ${book.title}`;
      ctx.font = `bold 12.5px ${FONT_SERIF}`;
      const textW = ctx.measureText(badgeText).width;
      const badgeW = textW + 28;

      // Nếu chạm vào khu vực con dấu đỏ bên phải thì xuống hàng
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
      ctx.fillText(badgeText, badgeX + 14, badgeY + 7);

      badgeX += badgeW + 10;
    }
  }

  // --- VỊ TRÍ CON DẤU ĐỎ MỚI: ĐẶT TẠI KHOẢNG TRỐNG BÊN PHẢI Ô GIÁO TRÌNH ---
  // Vừa chứng thực danh mục sách được cấp, vừa không đè lên chữ hướng dẫn 3 bước phía dưới!
  const stampCx = infoBoxX + infoBoxW - 88;
  const stampCy = bookBoxY + 60;
  drawOfficialStamp(ctx, stampCx, stampCy, 48, dateFormatted);

  // --- LỚP 6: Khu vực Mã QR & Hướng dẫn sử dụng (Chia 2 cột) ---
  const qrSectionY = 590;
  const qrBoxW = 270;
  const qrBoxH = 295;
  const qrBoxX = infoBoxX;

  // Khung QR Code bên trái
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrBoxX, qrSectionY, qrBoxW, qrBoxH, 12, true, false);
  ctx.strokeStyle = COLORS.gold;
  ctx.lineWidth = 1.8;
  drawRoundedRect(ctx, qrBoxX, qrSectionY, qrBoxW, qrBoxH, 12, false, true);

  // Tiêu đề nhỏ trên QR
  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 12px ${FONT_SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('QUÉT MÃ ĐĂNG NHẬP NHANH', qrBoxX + qrBoxW / 2, qrSectionY + 20);

  // Vẽ hình ảnh QR
  if (qrImage) {
    const qrRenderSize = 190;
    const qrPosX = qrBoxX + (qrBoxW - qrRenderSize) / 2;
    const qrPosY = qrSectionY + 42;
    ctx.drawImage(qrImage, qrPosX, qrPosY, qrRenderSize, qrRenderSize);
  }

  // Chú thích dưới QR
  ctx.fillStyle = COLORS.textMuted;
  ctx.font = `600 10.5px ${FONT_SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('Không cần nhập tài khoản/mật khẩu', qrBoxX + qrBoxW / 2, qrSectionY + 248);
  ctx.fillStyle = COLORS.navy;
  ctx.font = `bold 11px ${FONT_SERIF}`;
  ctx.fillText('anhngunhatmy.edu.vn', qrBoxX + qrBoxW / 2, qrSectionY + 266);

  // Cột Hướng dẫn phụ huynh bên phải (HOÀN TOÀN THOÁNG ĐÃNG, KHÔNG CÒN BỊ CON DẤU CHE)
  const guideX = qrBoxX + qrBoxW + 20;
  const guideW = infoBoxW - qrBoxW - 20;
  const guideH = qrBoxH;

  ctx.fillStyle = COLORS.cardBg;
  drawRoundedRect(ctx, guideX, qrSectionY, guideW, guideH, 12, true, false);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.2;
  drawRoundedRect(ctx, guideX, qrSectionY, guideW, guideH, 12, false, true);

  // Tiêu đề hướng dẫn
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.navy;
  ctx.font = `800 13.5px ${FONT_SERIF}`;
  ctx.fillText('3 BƯỚC ĐỒNG HÀNH CÙNG BÉ:', guideX + 20, qrSectionY + 22);

  const steps = [
    {
      num: '1',
      title: 'Quét mã QR bằng Camera / Zalo',
      desc: 'Mở ứng dụng Zalo hoặc Camera điện thoại, hướng máy quét mã QR bên cạnh để vào thẳng ứng dụng học liệu.',
    },
    {
      num: '2',
      title: 'Thêm vào Màn hình chính (App)',
      desc: 'Nhấn biểu tượng Chia sẻ (Safari) hoặc Ba chấm (Chrome) -> chọn "Thêm vào MH chính" để tạo lối tắt như một ứng dụng độc lập.',
    },
    {
      num: '3',
      title: 'Học tập tương tác hàng ngày',
      desc: 'Bé dễ dàng xem bài giảng video, nghe audio chuẩn giọng bản xứ và làm bài tập củng cố sau mỗi buổi học tại trung tâm.',
    },
  ];

  let stepY = qrSectionY + 56;
  for (const step of steps) {
    // Vòng tròn số thứ tự
    ctx.fillStyle = COLORS.navy;
    ctx.beginPath();
    ctx.arc(guideX + 32, stepY + 12, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `800 11px ${FONT_SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(step.num, guideX + 32, stepY + 12);

    // Tiêu đề bước
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = COLORS.navy;
    ctx.font = `800 12.5px ${FONT_SERIF}`;
    ctx.fillText(step.title, guideX + 54, stepY + 2);

    // Nội dung bước (thoáng đãng, sắc nét, không bị che khuất)
    ctx.fillStyle = COLORS.textMuted;
    ctx.font = `500 10.5px ${FONT_SERIF}`;
    wrapText(ctx, step.desc, guideX + 54, stepY + 22, guideW - 74, 16);

    stepY += 72;
  }

  // --- LỚP 8: Footer & Hotline hỗ trợ (Theo chuẩn mới Thầy Đấu yêu cầu) ---
  const footerY = 896;
  ctx.fillStyle = COLORS.navy;
  ctx.beginPath();
  ctx.moveTo(24, footerY);
  ctx.lineTo(CARD_WIDTH - 24, footerY);
  ctx.lineTo(CARD_WIDTH - 24, CARD_HEIGHT - 24);
  ctx.lineTo(24, CARD_HEIGHT - 24);
  ctx.closePath();
  ctx.fill();

  // Chỉ Gold trên footer
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(24, footerY, CARD_WIDTH - 48, 2.5);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Hàng 1: ANH NGỮ NHẬT MỸ (canh giữa)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 15.5px ${FONT_SERIF}`;
  ctx.letterSpacing = '1px';
  ctx.fillText('ANH NGỮ NHẬT MỸ', CARD_WIDTH / 2, footerY + 23);

  // Hàng 2: Slogan Dedicated to Excellence (canh giữa, font italic tương tự khung trên)
  ctx.fillStyle = COLORS.goldLight;
  ctx.font = `italic 600 13px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.6px';
  ctx.fillText('Dedicated to Excellence', CARD_WIDTH / 2, footerY + 43);

  // Hàng 3: Hotline & Website (canh giữa)
  ctx.fillStyle = COLORS.gold;
  ctx.font = `600 11px ${FONT_SERIF}`;
  ctx.letterSpacing = '0.3px';
  ctx.fillText('Hotline hỗ trợ phụ huynh: 0911 767 069  •  Website: anhngunhatmy.edu.vn', CARD_WIDTH / 2, footerY + 63);

  return canvas;
}

/**
 * Helper ngắt dòng chữ dài trên canvas
 */
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
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
