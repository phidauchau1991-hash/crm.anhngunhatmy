import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { studentIds, customBooksMap = {}, retainAccessMap = {}, markExported = true } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Danh sách mã học viên không hợp lệ' },
        { status: 400 }
      );
    }

    const now = new Date();

    // Cập nhật từng học viên trong batch (hoặc qua transaction)
    const updatePromises = studentIds.map(async (id) => {
      const updateData = {};

      // 1. Phân quyền giáo trình nếu có cấu hình tùy chỉnh
      if (customBooksMap && customBooksMap[id] !== undefined) {
        const codes = customBooksMap[id];
        if (Array.isArray(codes)) {
          updateData.customBookCodes = JSON.stringify([...new Set(codes.map(c => String(c).trim()).filter(Boolean))]);
        } else if (typeof codes === 'string') {
          updateData.customBookCodes = codes;
        }
      }

      // 2. Quyền bảo lưu học liệu khi tạm nghỉ / nghỉ luôn
      if (retainAccessMap && retainAccessMap[id] !== undefined) {
        updateData.retainCoursewareAccess = Boolean(retainAccessMap[id]);
      }

      // 3. Đánh dấu thời điểm xuất thư học liệu
      if (markExported) {
        updateData.coursewareLetterExportedAt = now;
      }

      if (Object.keys(updateData).length > 0) {
        return prisma.student.update({
          where: { id },
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
