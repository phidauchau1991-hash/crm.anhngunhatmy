import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { CAMBRIDGE_CONFIG, parseBatchLevels, formatHotline } from '@/lib/cambridgeHelper';

// GET: Chi tiết 1 đợt thi Cambridge kèm toàn bộ thí sinh
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const batch = await prisma.cambridgeExamBatch.findUnique({
      where: { id },
      include: {
        registrations: {
          orderBy: { createdAt: 'desc' },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                phone: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy đợt thi' }, { status: 404 });
    }

    const { activeLevels, fees } = parseBatchLevels(batch.levelsConfig);

    return NextResponse.json({
      success: true,
      batch: {
        ...batch,
        activeLevels,
        levelsConfig: fees
      }
    });
  } catch (error) {
    console.error('Error fetching batch detail:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi tải chi tiết đợt thi' }, { status: 500 });
  }
}

// PUT: Cập nhật thông tin đợt thi
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      title,
      examDate,
      registrationDeadline,
      closeHour,
      hotline,
      authorizedCenter,
      companyName,
      centerName,
      bankAccount,
      bankAccountName,
      bankName,
      levelsConfig,
      status,
      notes
    } = body;

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (examDate !== undefined) updateData.examDate = new Date(examDate);
    if (registrationDeadline !== undefined) updateData.registrationDeadline = new Date(registrationDeadline);
    if (closeHour !== undefined) updateData.closeHour = closeHour.trim();
    if (hotline !== undefined) updateData.hotline = formatHotline(hotline);
    if (authorizedCenter !== undefined) updateData.authorizedCenter = authorizedCenter.trim();
    if (companyName !== undefined) updateData.companyName = companyName.trim();
    if (centerName !== undefined) updateData.centerName = centerName.trim();
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount.trim();
    if (bankAccountName !== undefined) updateData.bankAccountName = bankAccountName.trim();
    if (bankName !== undefined) updateData.bankName = bankName.trim();
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes ? notes.trim() : null;

    if (levelsConfig !== undefined) {
      updateData.levelsConfig = typeof levelsConfig === 'object'
        ? JSON.stringify(levelsConfig)
        : levelsConfig;
    }

    const updatedBatch = await prisma.cambridgeExamBatch.update({
      where: { id },
      data: updateData
    });

    return NextResponse.json({ success: true, batch: updatedBatch });
  } catch (error) {
    console.error('Error updating batch:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi cập nhật đợt thi' }, { status: 500 });
  }
}

// DELETE: Xóa đợt thi
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    // Kiểm tra xem đợt thi có thí sinh nào đã đóng tiền chưa
    const paidCount = await prisma.cambridgeRegistration.count({
      where: {
        batchId: id,
        paymentStatus: 'DA_DONG'
      }
    });

    if (paidCount > 0) {
      return NextResponse.json({
        success: false,
        error: `Không thể xóa đợt thi này vì đã có ${paidCount} thí sinh nộp lệ phí. Vui lòng chuyển trạng thái hoặc xử lý hoàn phí trước!`
      }, { status: 400 });
    }

    // Xóa tất cả đăng ký chưa đóng của đợt thi trước
    await prisma.cambridgeRegistration.deleteMany({
      where: { batchId: id }
    });

    await prisma.cambridgeExamBatch.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Đã xóa đợt thi thành công' });
  } catch (error) {
    console.error('Error deleting batch:', error);
    return NextResponse.json({ success: false, error: error.message || 'Lỗi khi xóa đợt thi' }, { status: 500 });
  }
}
