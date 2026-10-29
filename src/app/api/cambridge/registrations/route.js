import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { removeVietnameseTones, generateReceiptCode, DEFAULT_LEVELS_CONFIG } from '@/lib/cambridgeHelper';

// GET: Lấy danh sách thí sinh đăng ký Cambridge
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get('batchId');
    const level = searchParams.get('level');
    const paymentStatus = searchParams.get('paymentStatus');
    const receiptSent = searchParams.get('receiptSent');
    const search = searchParams.get('search') || '';

    const where = {};
    if (batchId && batchId !== 'all') {
      where.batchId = batchId;
    }
    if (level && level !== 'all') {
      where.level = level;
    }
    if (paymentStatus && paymentStatus !== 'all') {
      where.paymentStatus = paymentStatus;
    }
    if (receiptSent === 'sent') {
      where.receiptSentAt = { not: null };
    } else if (receiptSent === 'unsent') {
      where.receiptSentAt = null;
    }

    if (search.trim()) {
      const s = search.trim();
      const sNoTone = removeVietnameseTones(s);
      where.OR = [
        { fullName: { contains: s } },
        { fullNameNoTone: { contains: sNoTone } },
        { parentPhone: { contains: s } },
        { parentEmail: { contains: s } },
        { receiptCode: { contains: s } }
      ];
    }

    const registrations = await prisma.cambridgeRegistration.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' }
      ],
      include: {
        batch: {
          select: {
            id: true,
            title: true,
            examDate: true,
            status: true
          }
        },
        student: {
          select: {
            id: true,
            fullName: true,
            studentCode: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({ success: true, registrations });
  } catch (error) {
    console.error('Error fetching Cambridge registrations:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi tải danh sách thí sinh' }, { status: 500 });
  }
}

// POST: Thêm mới thí sinh vào đợt thi (Thủ công từ Admin hoặc Picker học viên)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      batchId,
      studentId = null,
      fullName,
      gender = 'MALE',
      dob,
      parentPhone,
      parentEmail,
      level,
      fee,
      notes = ''
    } = body;

    if (!batchId || !fullName || !level) {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng cung cấp đợt thi, họ và tên thí sinh và cấp độ thi'
      }, { status: 400 });
    }

    // Lấy thông tin đợt thi
    const batch = await prisma.cambridgeExamBatch.findUnique({
      where: { id: batchId }
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Đợt thi không tồn tại' }, { status: 404 });
    }

    // Tính học phí nếu chưa truyền
    let candidateFee = Number(fee);
    if (!candidateFee || candidateFee <= 0) {
      try {
        const levels = typeof batch.levelsConfig === 'string'
          ? JSON.parse(batch.levelsConfig)
          : (batch.levelsConfig || DEFAULT_LEVELS_CONFIG);
        candidateFee = Number(levels[level]) || DEFAULT_LEVELS_CONFIG[level] || 1200000;
      } catch (e) {
        candidateFee = DEFAULT_LEVELS_CONFIG[level] || 1200000;
      }
    }

    // Chuẩn hóa tên không dấu
    const fullNameNoTone = removeVietnameseTones(fullName);
    const transferContent = `CAM - ${fullNameNoTone}`;

    // Format ngày sinh
    let parsedDob = null;
    let dobStr = '';
    if (dob) {
      parsedDob = new Date(dob);
      const d = parsedDob.getDate().toString().padStart(2, '0');
      const m = (parsedDob.getMonth() + 1).toString().padStart(2, '0');
      const y = parsedDob.getFullYear();
      dobStr = `${d}/${m}/${y}`;
    }

    // Tự động tìm học viên trong CRM nếu chưa truyền studentId
    let finalStudentId = studentId;
    if (!finalStudentId && (parentPhone || fullName)) {
      const matched = await prisma.student.findFirst({
        where: {
          OR: [
            ...(parentPhone ? [{ parentPhone: parentPhone.replace(/[^0-9]/g, '') }, { phone: parentPhone.replace(/[^0-9]/g, '') }] : []),
            { fullName: fullName.trim() }
          ]
        },
        select: { id: true }
      });
      if (matched) {
        finalStudentId = matched.id;
      }
    }

    const registration = await prisma.cambridgeRegistration.create({
      data: {
        batchId,
        studentId: finalStudentId,
        fullName: fullName.trim(),
        fullNameNoTone,
        gender: gender || 'MALE',
        dob: parsedDob,
        dobStr,
        parentPhone: parentPhone ? parentPhone.trim() : null,
        parentEmail: parentEmail ? parentEmail.trim() : null,
        level,
        fee: candidateFee,
        paymentStatus: 'CHUA_DONG',
        transferContent,
        notes: notes ? notes.trim() : null
      },
      include: {
        student: {
          select: { id: true, fullName: true, studentCode: true }
        }
      }
    });

    return NextResponse.json({ success: true, registration });
  } catch (error) {
    console.error('Error creating registration:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi thêm thí sinh' }, { status: 500 });
  }
}

// PATCH: Cập nhật thông tin thí sinh hoặc Duyệt thu tiền 1-click
export async function PATCH(request) {
  try {
    const body = await request.json();
    const { id, paymentStatus, ...updateFields } = body;

    const idNum = parseInt(id, 10);
    if (!id || isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'Thiếu hoặc sai ID thí sinh' }, { status: 400 });
    }

    const existing = await prisma.cambridgeRegistration.findUnique({
      where: { id: idNum }
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy hồ sơ thí sinh' }, { status: 404 });
    }

    const dataToUpdate = {};

    // Xử lý đổi trạng thái thanh toán (1-Click Toggle)
    if (paymentStatus !== undefined && paymentStatus !== existing.paymentStatus) {
      dataToUpdate.paymentStatus = paymentStatus;

      if (paymentStatus === 'DA_DONG') {
        dataToUpdate.paymentDate = new Date();
        // Nếu chưa có mã biên lai thì tự động sinh
        if (!existing.receiptCode) {
          const now = new Date();
          const yy = String(now.getFullYear()).slice(-2);
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          const dd = String(now.getDate()).padStart(2, '0');
          const todayPrefix = `BL-CAM-${yy}${mm}${dd}-`;

          const countToday = await prisma.cambridgeRegistration.count({
            where: {
              receiptCode: { startsWith: todayPrefix }
            }
          });
          dataToUpdate.receiptCode = generateReceiptCode(now, countToday + 1);
        }
      } else if (paymentStatus === 'CHUA_DONG') {
        dataToUpdate.paymentDate = null;
      }
    }

    // Các trường cập nhật khác
    if (updateFields.fullName !== undefined) {
      dataToUpdate.fullName = updateFields.fullName.trim();
      dataToUpdate.fullNameNoTone = removeVietnameseTones(updateFields.fullName);
      dataToUpdate.transferContent = `CAM - ${dataToUpdate.fullNameNoTone}`;
    }
    if (updateFields.gender !== undefined) dataToUpdate.gender = updateFields.gender;
    if (updateFields.dob !== undefined) {
      if (updateFields.dob) {
        const parsedDob = new Date(updateFields.dob);
        dataToUpdate.dob = parsedDob;
        const d = parsedDob.getDate().toString().padStart(2, '0');
        const m = (parsedDob.getMonth() + 1).toString().padStart(2, '0');
        const y = parsedDob.getFullYear();
        dataToUpdate.dobStr = `${d}/${m}/${y}`;
      } else {
        dataToUpdate.dob = null;
        dataToUpdate.dobStr = '';
      }
    }
    if (updateFields.parentPhone !== undefined) dataToUpdate.parentPhone = updateFields.parentPhone ? updateFields.parentPhone.trim() : null;
    if (updateFields.parentEmail !== undefined) dataToUpdate.parentEmail = updateFields.parentEmail ? updateFields.parentEmail.trim() : null;
    if (updateFields.level !== undefined) dataToUpdate.level = updateFields.level;
    if (updateFields.fee !== undefined) dataToUpdate.fee = Number(updateFields.fee);
    if (updateFields.notes !== undefined) dataToUpdate.notes = updateFields.notes ? updateFields.notes.trim() : null;
    if (updateFields.studentId !== undefined) dataToUpdate.studentId = updateFields.studentId || null;

    // Cập nhật kết quả thi (nếu có nhập)
    if (updateFields.listeningScore !== undefined) dataToUpdate.listeningScore = updateFields.listeningScore;
    if (updateFields.readingWritingScore !== undefined) dataToUpdate.readingWritingScore = updateFields.readingWritingScore;
    if (updateFields.speakingScore !== undefined) dataToUpdate.speakingScore = updateFields.speakingScore;
    if (updateFields.totalScore !== undefined) dataToUpdate.totalScore = updateFields.totalScore;
    if (updateFields.grade !== undefined) dataToUpdate.grade = updateFields.grade;
    if (updateFields.certificateNumber !== undefined) dataToUpdate.certificateNumber = updateFields.certificateNumber;
    if (updateFields.certificateDate !== undefined) {
      dataToUpdate.certificateDate = updateFields.certificateDate ? new Date(updateFields.certificateDate) : null;
    }
    if (updateFields.certificateUrl !== undefined) dataToUpdate.certificateUrl = updateFields.certificateUrl;

    const updated = await prisma.cambridgeRegistration.update({
      where: { id: idNum },
      data: dataToUpdate,
      include: {
        student: {
          select: { id: true, fullName: true, studentCode: true }
        }
      }
    });

    return NextResponse.json({ success: true, registration: updated });
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi cập nhật thí sinh' }, { status: 500 });
  }
}

// DELETE: Xóa thí sinh khỏi đợt thi
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idNum = parseInt(id, 10);

    if (!id || isNaN(idNum)) {
      return NextResponse.json({ success: false, error: 'Thiếu hoặc sai ID thí sinh' }, { status: 400 });
    }

    await prisma.cambridgeRegistration.delete({
      where: { id: idNum }
    });

    return NextResponse.json({ success: true, message: 'Đã xóa thí sinh thành công' });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi xóa thí sinh' }, { status: 500 });
  }
}
