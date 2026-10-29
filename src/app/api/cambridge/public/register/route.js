import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { removeVietnameseTones, formatHotline, renderRegistrationEmailHtml, parseBatchLevels, CAMBRIDGE_CONFIG } from '@/lib/cambridgeHelper';
import { sendEmail } from '@/lib/emailService';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      batchId,
      registrationId,
      fullName,
      gender = 'MALE',
      dob,
      parentPhone,
      parentEmail,
      level = 'STARTERS',
      notes = ''
    } = body;

    if (!batchId || !fullName || !level || !parentEmail) {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng điền đầy đủ Họ tên, Cấp độ và Email phụ huynh nhận phiếu xác nhận'
      }, { status: 400 });
    }

    // 1. Kiểm tra đợt thi
    const batch = await prisma.cambridgeExamBatch.findUnique({
      where: { id: batchId }
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Đợt thi không tồn tại' }, { status: 404 });
    }

    // Kiểm tra hạn chót nếu là đăng ký mới
    if (!registrationId && batch.registrationDeadline) {
      const deadline = new Date(batch.registrationDeadline);
      const [hours, minutes] = (batch.closeHour || '17:00').split(':').map(n => parseInt(n, 10) || 0);
      deadline.setHours(hours, minutes, 59, 999);
      if (new Date() > deadline || batch.status !== 'OPEN') {
        return NextResponse.json({
          success: false,
          error: `Đợt thi này đã hết hạn đăng ký vào lúc ${batch.closeHour || '17:00'} ngày ${new Date(batch.registrationDeadline).toLocaleDateString('vi-VN')}. Vui lòng liên hệ Hotline ${formatHotline(batch.hotline)} để được hỗ trợ!`
        }, { status: 400 });
      }
    }

    // 2. Tính lệ phí và kiểm tra cấp độ mở
    const { activeLevels, fees } = parseBatchLevels(batch.levelsConfig);
    const selectedLevel = activeLevels.includes(level) ? level : activeLevels[0] || 'STARTERS';
    const fee = Number(fees[selectedLevel]) || 1200000;

    // 3. Chuẩn hóa tên bắt buộc CHỮ IN HOA (Chuẩn VN120 & Cambridge)
    const fullNameUpper = fullName.trim().toUpperCase();
    const fullNameNoTone = removeVietnameseTones(fullNameUpper);
    const transferContent = `CAM - ${fullNameNoTone}`;

    let parsedDob = null;
    let dobStr = '';
    if (dob) {
      parsedDob = new Date(dob);
      const d = parsedDob.getDate().toString().padStart(2, '0');
      const m = (parsedDob.getMonth() + 1).toString().padStart(2, '0');
      const y = parsedDob.getFullYear();
      dobStr = `${d}/${m}/${y}`;
    }

    let registration = null;
    let isEdit = false;

    // 4. Nếu là chỉnh sửa hồ sơ cũ
    if (registrationId) {
      const idNum = parseInt(registrationId, 10);
      const existing = await prisma.cambridgeRegistration.findUnique({
        where: { id: idNum }
      });

      if (!existing) {
        return NextResponse.json({ success: false, error: 'Hồ sơ cần sửa không tồn tại' }, { status: 404 });
      }

      if (existing.paymentStatus === 'DA_DONG') {
        return NextResponse.json({
          success: false,
          error: 'Hồ sơ đã được trung tâm xác nhận thu phí. Để thay đổi thông tin, vui lòng gọi Hotline!'
        }, { status: 400 });
      }

      isEdit = true;
      registration = await prisma.cambridgeRegistration.update({
        where: { id: idNum },
        data: {
          fullName: fullNameUpper,
          fullNameNoTone,
          gender,
          dob: parsedDob,
          dobStr,
          parentPhone: parentPhone ? parentPhone.trim() : null,
          parentEmail: parentEmail ? parentEmail.trim() : null,
          level: selectedLevel,
          fee,
          transferContent,
          notes: notes ? notes.trim() : null
        }
      });
    } else {
      // 5. Nếu là đăng ký mới: Tự động tìm liên kết Student trong CRM an toàn
      let matchedStudentId = null;
      try {
        const cleanPhone = parentPhone ? parentPhone.replace(/[^0-9]/g, '') : '';
        const searchConditions = [];
        if (cleanPhone) {
          searchConditions.push({ phone: cleanPhone });
        }
        if (fullNameUpper) {
          searchConditions.push({ name: fullNameUpper });
        }

        if (searchConditions.length > 0) {
          const found = await prisma.student.findFirst({
            where: { OR: searchConditions },
            select: { id: true }
          });
          if (found) {
            matchedStudentId = found.id;
          }
        }
      } catch (errStudent) {
        console.warn('Bỏ qua lỗi tìm kiếm học viên CRM:', errStudent?.message);
      }

      registration = await prisma.cambridgeRegistration.create({
        data: {
          batchId,
          studentId: matchedStudentId,
          fullName: fullNameUpper,
          fullNameNoTone,
          gender,
          dob: parsedDob,
          dobStr,
          parentPhone: parentPhone ? parentPhone.trim() : null,
          parentEmail: parentEmail ? parentEmail.trim() : null,
          level: selectedLevel,
          fee,
          paymentStatus: 'CHUA_DONG',
          transferContent,
          notes: notes ? notes.trim() : null
        }
      });
    }

    // 6. Tạo đường dẫn chỉnh sửa thông tin cho phụ huynh
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = forwardedHost || request.headers.get('host') || '';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    let origin = 'https://crm.anhngunhatmy.edu.vn';
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      origin = `${proto}://${host}`;
    }
    const editUrl = `${origin}/cambridge/register?batchId=${batchId}&editId=${registration.id}`;

    const deadlineStr = batch.registrationDeadline
      ? new Date(batch.registrationDeadline).toLocaleDateString('vi-VN')
      : '';

    // 7. Gửi Email Xác nhận Đăng ký kèm mã VietQR cho Phụ huynh
    const emailSubject = isEdit
      ? `[XÁC NHẬN CHỈNH SỬA] Đã cập nhật thông tin thi Cambridge ${level} - ${fullNameNoTone}`
      : `[XÁC NHẬN ĐĂNG KÝ] Lệ phí thi Cambridge ${level} - ${fullNameNoTone}`;

    const emailHtml = renderRegistrationEmailHtml({
      fullName: registration.fullName,
      fullNameNoTone: registration.fullNameNoTone,
      gender: registration.gender,
      dobStr: registration.dobStr,
      parentPhone: registration.parentPhone,
      level: registration.level,
      fee: registration.fee,
      transferContent: registration.transferContent,
      editUrl,
      closeHour: batch.closeHour || '17:00',
      deadlineStr,
      hotline: batch.hotline,
      isEdit
    });

    // Gửi email bất đồng bộ (không làm chậm response người dùng)
    sendEmail({
      to: registration.parentEmail,
      subject: emailSubject,
      htmlBody: emailHtml
    }).catch(err => {
      console.error('[Public Register] Lỗi gửi email xác nhận cho phụ huynh:', err);
    });

    // 8. Tạo mã VietQR Data URL trả về cho client hiển thị ngay
    let qrDataURL = null;
    try {
      const qrRes = await fetch(`${origin}/api/vietqr?amount=${fee}&addInfo=${encodeURIComponent(transferContent)}`);
      if (qrRes.ok) {
        const qrJson = await qrRes.json();
        if (qrJson.qrDataURL) {
          qrDataURL = qrJson.qrDataURL;
        }
      }
    } catch (e) {
      console.error('[Public Register] Lỗi sinh VietQR:', e);
    }

    if (!qrDataURL) {
      // Fallback ảnh trực tiếp
      qrDataURL = `https://img.vietqr.io/image/970422-6119916886-compact2.png?amount=${fee}&addInfo=${encodeURIComponent(transferContent)}&accountName=CONG%20TY%20TNHH%20NGOAI%20NGU%20TRI%20THUC%20VIET`;
    }

    return NextResponse.json({
      success: true,
      registration,
      isEdit,
      editUrl,
      qrDataURL,
      bankInfo: {
        bankName: batch.bankName || CAMBRIDGE_CONFIG.NGAN_HANG,
        accountNo: batch.bankAccount || CAMBRIDGE_CONFIG.SO_TAI_KHOAN,
        accountName: batch.bankAccountName || CAMBRIDGE_CONFIG.TEN_TAI_KHOAN_QR,
        amount: fee,
        transferContent
      },
      message: isEdit
        ? 'Cập nhật thông tin thành công! Thư xác nhận mới đã được gửi về email của Quý phụ huynh.'
        : 'Đăng ký dự thi thành công! Phiếu xác nhận và hướng dẫn chuyển khoản đã được gửi về email của Quý phụ huynh.'
    });

  } catch (error) {
    console.error('Error in public register API:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi hệ thống khi gửi đăng ký'
    }, { status: 500 });
  }
}
