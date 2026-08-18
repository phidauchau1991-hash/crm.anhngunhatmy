import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const inventoryId = searchParams.get('inventoryId');
    const type = searchParams.get('type');
    
    let where = {};
    if (inventoryId) where.inventoryId = inventoryId;
    if (type) where.type = type;

    const logs = await prisma.inventoryLog.findMany({
      where,
      include: {
        inventory: { select: { name: true, category: true } },
        student: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit for UI performance
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử kho:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    // type: XUAT_TANG, XUAT_MUON, NHAP_TRA, NHAP_MOI, KIEM_KE
    // targetType: STUDENT, TEACHER, STAFF, SYSTEM, SUPPLIER
    const { type, targetType, targetName, studentId, notes, items, amountCollected, paymentMethod } = body;

    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin loại phiếu hoặc danh sách vật tư' }, { status: 400 });
    }

    // Generate unique receipt code
    const prefix = type.startsWith('NHAP') ? 'PN' : (type.startsWith('XUAT') ? 'PX' : 'PK');
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptCode = `${prefix}-${timestamp}-${randomStr}`;

    const isExport = type.startsWith('XUAT');
    const collectedAmt = parseFloat(amountCollected) || 0;

    const result = await prisma.$transaction(async (tx) => {
      let createdLogs = [];
      let itemNames = [];
      
      for (const item of items) {
        if (!item.inventoryId || !item.quantity || item.quantity <= 0) {
          throw new Error('Thiếu ID vật tư hoặc số lượng không hợp lệ');
        }

        const actualQuantity = isExport ? -item.quantity : item.quantity;

        // 1. Kiểm tra tồn kho trước khi xuất
        if (isExport) {
          const inv = await tx.inventory.findUnique({ where: { id: item.inventoryId } });
          if (!inv) throw new Error(`Không tìm thấy vật tư có mã ${item.inventoryId}`);
          if (inv.currentStock < item.quantity) {
            throw new Error(`Vật tư [${inv.name}] không đủ tồn kho (Còn: ${inv.currentStock}, Yêu cầu: ${item.quantity})`);
          }
          itemNames.push(`${inv.name} (x${item.quantity})`);
        }

        // 2. Tạo log
        const log = await tx.inventoryLog.create({
          data: {
            receiptCode,
            type,
            inventoryId: item.inventoryId,
            quantity: actualQuantity,
            targetType: targetType || 'SYSTEM',
            targetName: targetName || null,
            studentId: studentId || null,
            notes: notes || null,
          }
        });
        createdLogs.push(log);

        // 3. Cập nhật tồn kho
        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: {
            currentStock: {
              increment: actualQuantity
            }
          }
        });
      }

      // 4. Nếu có thu tiền mua vật tư/giáo trình từ học viên, tự động ghi nhận Hóa đơn Thu tiền vào Hệ thống Tài chính
      if (collectedAmt > 0 && studentId) {
        const student = await tx.student.findUnique({ where: { id: studentId }, include: { enrollments: { where: { status: 'Đang học' } } } });
        const classCode = student?.enrollments[0]?.classCode || 'XUAT_KHO';
        const now = new Date();
        const year = String(now.getFullYear()).substring(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const orderId = `ORD_ITEM_${year}${month}_${randomStr}`;

        await tx.orderFinance.create({
          data: {
            id: orderId,
            studentId,
            classCode,
            promoType: `Thu tiền Xuất kho / Bán vật tư (${itemNames.join(', ')}) [Qua ${paymentMethod || 'Chuyển khoản'}${notes ? `. Ghi chú: ${notes}` : ''}]`,
            promoDiscount: 0,
            feeToPay: collectedAmt,
            amountPaid: collectedAmt,
            paymentStatus: 'Đã đóng',
            paymentPolicy: 'Đóng trước',
            paymentDeadline: now,
            giftName: itemNames.join(', ')
          }
        });
      }

      return { receiptCode, logsCount: createdLogs.length, amountCollected: collectedAmt };
    });

    return NextResponse.json({ success: true, message: 'Thực hiện giao dịch kho thành công', data: result });
  } catch (error) {
    console.error('Lỗi khi tạo phiếu kho:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
