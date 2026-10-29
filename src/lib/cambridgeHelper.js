/**
 * HỆ THỐNG KHẢO THÍ CHỨNG CHỈ QUỐC TẾ CAMBRIDGE - ANH NGỮ NHẬT MỸ
 * Tiêu chuẩn nhận diện: Xanh #0c83c1 - Vàng #ffcc29
 */

export const CAMBRIDGE_CONFIG = {
  TEN_TRUNG_TAM: "TRUNG TÂM ANH NGỮ NHẬT MỸ",
  TEN_NGAN: "ANH NGỮ NHẬT MỸ",
  TEN_CONG_TY: "CÔNG TY TNHH NGOẠI NGỮ TRI THỨC VIỆT",
  TEN_TAI_KHOAN_QR: "CONG TY TNHH NGOAI NGU TRI THUC VIET",
  NGAN_HANG: "MB",
  ACQ_ID: "970422", // Mã BIN MB Bank
  SO_TAI_KHOAN: "6119916886",
  MAU_XANH_THUONG_HIEU: "#0c83c1",
  MAU_VANG_THUONG_HIEU: "#ffcc29",
  HOTLINE_CHUAN: "0911.767.069",
  DON_VI_UY_QUYEN: "VN120"
};

export const DEFAULT_LEVELS_CONFIG = {
  STARTERS: 1200000,
  MOVERS: 1300000,
  FLYERS: 1400000,
  KET: 1500000,
  PET: 1600000
};

/**
 * Chuẩn hóa họ tên in hoa không dấu (Chuẩn Cambridge & Cú pháp chuyển khoản)
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  str = str.replace(/Đ/g, 'D');
  return str.toUpperCase().trim();
}

/**
 * Định dạng số điện thoại hotline chuẩn 0xxx.xxx.xxx
 */
export function formatHotline(val) {
  if (!val) return CAMBRIDGE_CONFIG.HOTLINE_CHUAN;
  let str = val.toString().replace(/[^0-9]/g, '');
  if (str.length === 9 && !str.startsWith('0')) {
    str = '0' + str;
  }
  if (str.length === 10) {
    return str.substring(0, 4) + '.' + str.substring(4, 7) + '.' + str.substring(7);
  }
  return str;
}

/**
 * Sinh mã biên lai tự động: BL-CAM-yyMMdd-xx
 */
export function generateReceiptCode(date = new Date(), index = 1) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const seq = String(index).padStart(2, '0');
  return `BL-CAM-${yy}${mm}${dd}-${seq}`;
}

/**
 * Mẫu Email Biên lai Điện tử Thu Lệ Phí Thi Cambridge (Chuẩn theo Apps Script)
 */
export function renderReceiptEmailHtml({
  fullName,
  fullNameNoTone,
  level,
  fee,
  receiptCode,
  paymentDate,
  hotline = CAMBRIDGE_CONFIG.HOTLINE_CHUAN
}) {
  const feeFormat = (fee || 0).toLocaleString('vi-VN') + ' VNĐ';
  const timeNow = paymentDate 
    ? new Date(paymentDate).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date().toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 2px solid ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; border-radius: 10px; overflow: hidden; background-color: #ffffff;">
      <!-- HEADER -->
      <div style="background-color: ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; color: white; padding: 22px; text-align: center;">
        <h2 style="margin: 0; font-size: 22px; text-transform: uppercase; letter-spacing: 0.5px;">${CAMBRIDGE_CONFIG.TEN_NGAN}</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">BIÊN LAI THU LỆ PHÍ THI ĐIỆN TỬ</p>
      </div>

      <!-- BODY -->
      <div style="padding: 22px;">
        <p>Kính gửi Quý Phụ huynh học sinh <b>${fullName}</b>,</p>
        <p><b>${CAMBRIDGE_CONFIG.TEN_TRUNG_TAM}</b> trân trọng xác nhận đã nhận đủ số tiền đóng lệ phí dự thi Cambridge Quốc tế cho con:</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 5px solid ${CAMBRIDGE_CONFIG.MAU_XANH_THUONG_HIEU}; padding: 16px; border-radius: 6px; font-size: 14px; line-height: 1.9; margin: 15px 0;">
          • <b>Mã số biên lai:</b> <span style="color: #0c83c1; font-weight: bold;">${receiptCode}</span><br>
          • <b>Họ và tên thí sinh:</b> <b style="color: #d9534f; font-size: 15px;">${fullNameNoTone}</b> (${fullName})<br>
          • <b>Cấp độ dự thi:</b> <b style="color: #0c83c1;">${level}</b><br>
          • <b>Số tiền đã thu:</b> <span style="color: #10b981; font-weight: bold; font-size: 16px;">${feeFormat}</span><br>
          • <b>Thời gian nhận phí:</b> ${timeNow}<br>
          • <b>Hình thức thanh toán:</b> Chuyển khoản VietQR MB Bank (${CAMBRIDGE_CONFIG.SO_TAI_KHOAN})<br>
          • <b>Trạng thái hồ sơ:</b> <span style="background: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 12px;">ĐÃ HOÀN TẤT ĐĂNG KÝ HỢP LỆ</span>
        </div>

        <div style="background-color: #fffbeb; border: 1px solid #fef3c7; padding: 14px; border-radius: 6px; font-size: 13px; color: #92400e; margin-top: 15px;">
          📌 <b>BƯỚC TIẾP THEO:</b><br>
          Hồ sơ của con đã được chốt và gửi sang <b>Hội đồng khảo thí Đại học Cambridge (${CAMBRIDGE_CONFIG.DON_VI_UY_QUYEN})</b>. Trung tâm sẽ thông báo Số báo danh, phòng thi và hướng dẫn quy chế thi cho Quý phụ huynh trước ngày thi chính thức.
        </div>

        <p style="font-size: 12px; color: #64748b; margin-top: 20px; font-style: italic;">
          * Biên lai điện tử này có giá trị xác nhận tài chính chính thức giữa Trung tâm và Quý phụ huynh.
        </p>
      </div>

      <!-- FOOTER -->
      <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 13px; color: #64748b; line-height: 1.6;">
        <div style="font-weight: bold; color: #334155; margin-bottom: 4px;">${CAMBRIDGE_CONFIG.TEN_NGAN}</div>
        <div style="white-space: nowrap;"><span style="color: #64748b;">Hotline hỗ trợ:</span> <b style="color: #0c83c1;">${formatHotline(hotline)}</b></div>
      </div>
    </div>
  `;
}
