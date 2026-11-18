import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseCoursewareExpiresAt } from '@/lib/coursewareAccess';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      studentIds,
      customBooksMap = {},
      retainAccessMap = {},
      blockedMap = {},
      blockedReasonMap = {},
      expiresAtMap = {},
      markExported = true,
    } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Danh sách mã học viên không hợp lệ' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Cập nhật từng học viên (hỗ trợ cả Học viên chính thức bảng Student lẫn Học viên học thử bảng Lead)
    const updatePromises = studentIds.map(async (rawId) => {
      const idStr = String(rawId).trim();
      const updateData = {};

      // Lấy key map linh hoạt theo rawId hoặc idStr
      const codes = customBooksMap[rawId] !== undefined ? customBooksMap[rawId] : customBooksMap[idStr];
      if (codes !== undefined) {
        if (Array.isArray(codes)) {
          updateData.customBookCodes = JSON.stringify([...new Set(codes.map(c => String(c).trim()).filter(Boolean))]);
        } else if (typeof codes === 'string') {
          updateData.customBookCodes = codes;
        }
      }

      const retainVal = retainAccessMap[rawId] !== undefined ? retainAccessMap[rawId] : retainAccessMap[idStr];
      if (retainVal !== undefined) {
        updateData.retainCoursewareAccess = Boolean(retainVal);
      }

      const blockedVal = blockedMap[rawId] !== undefined ? blockedMap[rawId] : blockedMap[idStr];
      if (blockedVal !== undefined) {
        updateData.coursewareBlocked = Boolean(blockedVal);
      }

      const blockedReasonVal =
        blockedReasonMap[rawId] !== undefined ? blockedReasonMap[rawId] : blockedReasonMap[idStr];
      if (blockedReasonVal !== undefined) {
        updateData.coursewareBlockedReason = String(blockedReasonVal || '').trim() || null;
      }

      const expiresVal = expiresAtMap[rawId] !== undefined ? expiresAtMap[rawId] : expiresAtMap[idStr];
      if (expiresVal !== undefined) {
        updateData.coursewareExpiresAt = parseCoursewareExpiresAt(expiresVal);
      }

      if (markExported) {
        updateData.coursewareLetterExportedAt = now;
      }

      if (Object.keys(updateData).length === 0) return null;

      // Xác định là Lead học thử (ID dạng số nguyên hoặc LEAD_...) hay Student chính thức (HV...)
      const isNumericLeadId = typeof rawId === 'number' || /^\d+$/.test(idStr) || idStr.startsWith('LEAD_');
      if (isNumericLeadId) {
        const numericId = Number(idStr.replace(/^LEAD_/, ''));
        if (!isNaN(numericId)) {
          const existingLead = await prisma.lead.findUnique({ where: { id: numericId } });
          if (existingLead) {
            return prisma.lead.update({
              where: { id: numericId },
              data: updateData,
            });
          }
        }
      }

      // Học viên chính thức (String ID)
      const existingStudent = await prisma.student.findUnique({ where: { id: idStr } });
      if (existingStudent) {
        return prisma.student.update({
          where: { id: idStr },
          data: updateData,
        });
      }

      return null;
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      success: true,
      message: markExported
        ? `Đã lưu cấu hình sách và đánh dấu xuất thư thành công cho ${studentIds.length} học viên.`
        : `Đã lưu cấu hình phân quyền sách thành công cho ${studentIds.length} học viên vào CRM.`,
      exportedAt: markExported ? now.toISOString() : null,
      studentIds,
    });
  } catch (error) {
    console.error('Lỗi lưu cấu hình học liệu / xuất thư hàng loạt:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
