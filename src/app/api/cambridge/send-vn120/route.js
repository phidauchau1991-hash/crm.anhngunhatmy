import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import * as XLSX from 'xlsx';
import { CAMBRIDGE_CONFIG } from '@/lib/cambridgeHelper';
import { sendEmail } from '@/lib/emailService';

// POST: Gửi email danh sách thí sinh kèm file Excel chuẩn VN120 sang Hội đồng khảo thí
export async function POST(request) {
  try {
    const body = await request.json();
    const { batchId, recipientEmail, ccEmail, filter = 'paid', customMessage } = body;

    if (!batchId) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin đợt thi (batchId)' }, { status: 400 });
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return NextResponse.json({ success: false, error: 'Vui lòng nhập địa chỉ email hợp lệ của Hội đồng VN120' }, { status: 400 });
    }

    const batch = await prisma.cambridgeExamBatch.findUnique({
      where: { id: batchId },
      include: {
        registrations: {
          orderBy: [
            { level: 'asc' },
            { fullNameNoTone: 'asc' }
          ]
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Đợt thi không tồn tại' }, { status: 404 });
    }

    let candidates = batch.registrations;
    if (filter === 'paid') {
      candidates = candidates.filter(c => c.paymentStatus === 'DA_DONG');
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        success: false,
        error: filter === 'paid'
          ? 'Chưa có thí sinh nào hoàn tất lệ phí để gửi cho Hội đồng thi!'
          : 'Không có thí sinh nào trong đợt thi này!'
      }, { status: 400 });
    }

    const examDateFormatted = batch.examDate
      ? new Date(batch.examDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : 'Chưa xác định';

    const dateFileStr = batch.examDate
      ? new Date(batch.examDate).toISOString().slice(0, 10).replace(/-/g, '')
      : 'export';

    // Tạo các dòng dữ liệu theo tiêu chuẩn Hội đồng khảo thí VN120
    const rows = [
      ['DANH SÁCH THÍ SINH ĐĂNG KÝ DỰ THI CHỨNG CHỈ CAMBRIDGE QUỐC TẾ'],
      [`Hội đồng khảo thí ủy quyền: ${batch.authorizedCenter || 'VN120'} | Đơn vị đăng ký: ${batch.centerName || CAMBRIDGE_CONFIG.TEN_TRUNG_TAM}`],
      [`Đợt thi: ${batch.title} - Ngày thi chính thức: ${examDateFormatted} - Hotline: ${batch.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN}`],
      [], // Dòng trống ngăn cách
      [
        'STT',
        'Họ và tên không dấu (Chuẩn Cambridge)',
        'Họ và tên thí sinh (Tiếng Việt)',
        'Giới tính',
        'Ngày sinh (dd/MM/yyyy)',
        'Cấp độ dự thi',
        'Số điện thoại phụ huynh',
        'Email phụ huynh',
        'Lệ phí dự thi (VNĐ)',
        'Tình trạng thanh toán',
        'Mã biên lai điện tử',
        'Ghi chú đăng ký'
      ]
    ];

    candidates.forEach((c, index) => {
      let genderVi = 'Nam';
      if (c.gender === 'FEMALE' || c.gender === 'NỮ' || c.gender === 'NU') {
        genderVi = 'Nữ';
      }

      const paymentStatusVi = c.paymentStatus === 'DA_DONG' ? 'Đã hoàn tất đóng phí' : 'Chưa đóng phí';

      rows.push([
        index + 1,
        c.fullNameNoTone || '',
        c.fullName || '',
        genderVi,
        c.dobStr ? `'${c.dobStr}` : (c.dob ? `'${new Date(c.dob).toLocaleDateString('vi-VN')}` : ''),
        c.level || '',
        c.parentPhone || '',
        c.parentEmail || '',
        c.fee || 0,
        paymentStatusVi,
        c.receiptCode || '',
        c.notes || 'Đã đăng ký trực tuyến'
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);

    ws['!cols'] = [
      { wch: 6 },
      { wch: 32 },
      { wch: 28 },
      { wch: 10 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 22 },
      { wch: 22 },
      { wch: 26 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Danh_sach_VN120");
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const fileName = `Danh_sach_Cambridge_VN120_${dateFileStr}.xlsx`;

    // Thống kê phân loại cấp độ
    const levelCounts = {};
    candidates.forEach(c => {
      levelCounts[c.level] = (levelCounts[c.level] || 0) + 1;
    });
    const levelBreakdownStr = Object.entries(levelCounts)
      .map(([lvl, cnt]) => `<b>${lvl}</b>: ${cnt} thí sinh`)
      .join(' | ');

    // Tiêu đề & Nội dung Email gửi Hội đồng VN120
    const subject = `[Anh Ngữ Nhật Mỹ] Danh sách thí sinh dự thi Cambridge - Đợt ${batch.title} (Ngày thi: ${examDateFormatted})`;

    const htmlBody = `
      <div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; max-width: 680px; margin: 0 auto; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0c83c1 0%, #0369a1 100%); padding: 24px; color: #ffffff; text-align: center;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">TRUNG TÂM NGOẠI NGỮ NHẬT MỸ</h2>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Bộ Phận Khảo Thí Chứng Chỉ Quốc Tế Cambridge</p>
        </div>

        <div style="padding: 24px 28px; background: #ffffff;">
          <p style="margin-top: 0; font-size: 15px;">
            <b>Kính gửi:</b> Ban Thư ký & Ban Khảo thí - <b>Hội đồng thi Đại học Cambridge (VN120)</b>,
          </p>
          <p style="font-size: 14px; color: #334155;">
            Trung tâm Ngoại ngữ Nhật Mỹ xin kính gửi đến Quý Hội đồng danh sách thí sinh đã đăng ký dự thi kỳ thi chứng chỉ tiếng Anh Quốc tế Cambridge, thông tin chi tiết như sau:
          </p>

          <div style="background: #f8fafc; border-left: 4px solid #0c83c1; padding: 16px; border-radius: 0 8px 8px 0; margin: 18px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 160px;">Đợt thi:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #0f172a;">${batch.title}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Ngày thi dự kiến:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #0c83c1;">${examDateFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Tổng số thí sinh:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #10b981;">${candidates.length} thí sinh</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Chi tiết cấp độ:</td>
                <td style="padding: 4px 0; color: #334155;">${levelBreakdownStr || 'Đa cấp độ'}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">Đơn vị đăng ký:</td>
                <td style="padding: 4px 0; color: #334155;">${batch.centerName || CAMBRIDGE_CONFIG.TEN_TRUNG_TAM}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;">File đính kèm:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #0284c7;">📎 ${fileName} (Chuẩn form VN120)</td>
              </tr>
            </table>
          </div>

          ${customMessage ? `
            <div style="background: #f0fdf4; border: 1px dashed #16a34a; border-radius: 8px; padding: 12px 16px; margin-bottom: 18px; font-size: 13.5px; color: #166534;">
              <b>Ghi chú từ trung tâm:</b> ${customMessage.replace(/\n/g, '<br/>')}
            </div>
          ` : ''}

          <p style="font-size: 14px; color: #334155;">
            Toàn bộ dữ liệu thí sinh đã được kiểm tra tính hợp lệ và chuẩn hóa theo đúng định dạng mẫu của Hội đồng VN120. Quý Hội đồng vui lòng xem chi tiết trong file Excel được đính kèm thư này.
          </p>

          <p style="font-size: 14px; color: #334155; margin-bottom: 24px;">
            Kính mong Quý Hội đồng tiếp nhận và phản hồi xác nhận để Trung tâm tiếp tục các công tác chuẩn bị tiếp theo.
          </p>

          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 13px; color: #64748b;">
            <p style="margin: 0 0 4px 0; font-weight: bold; color: #1e293b;">BỘ PHẬN KHẢO THÍ - ANH NGỮ NHẬT MỸ</p>
            <p style="margin: 0 0 4px 0;">📧 Email liên hệ: cambridge@anhngunhatmy.edu.vn</p>
            <p style="margin: 0 0 4px 0;">📞 Hotline hỗ trợ: ${batch.hotline || CAMBRIDGE_CONFIG.HOTLINE_CHUAN}</p>
            <p style="margin: 0;">🌐 Website: https://crm.anhngunhatmy.edu.vn</p>
          </div>
        </div>
      </div>
    `;

    // Gửi email kèm file đính kèm
    const sendResult = await sendEmail({
      to: recipientEmail,
      cc: ccEmail || 'cambridge@anhngunhatmy.edu.vn',
      subject,
      htmlBody,
      attachments: [
        {
          filename: fileName,
          content: excelBuffer,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      ]
    });

    if (!sendResult.success) {
      return NextResponse.json({
        success: false,
        error: sendResult.error || 'Lỗi khi gửi email đến Hội đồng VN120'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      recipientEmail,
      ccEmail: ccEmail || 'cambridge@anhngunhatmy.edu.vn',
      candidateCount: candidates.length,
      fileName,
      messageId: sendResult.messageId,
      simulated: sendResult.simulated || false
    });
  } catch (error) {
    console.error('Lỗi khi gửi danh sách cho Hội đồng VN120:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi xử lý gửi danh sách Hội đồng thi'
    }, { status: 500 });
  }
}
