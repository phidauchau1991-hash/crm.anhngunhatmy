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
        inventory: { select: { name: true, category: true, unit: true, unitCost: true, unitPrice: true } },
        student: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 150, // Limit for UI performance
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
    const { type, targetType, targetName, studentId, notes, items, amountCollected, paymentMethod, campaignName } = body;

    if (!type || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin loại phiếu hoặc danh sách vật tư' }, { status: 400 });
    }

    // Generate unique receipt code
    const prefix = type.startsWith('NHAP') ? 'PN' : (type.startsWith('XUAT') ? 'PX' : 'PK');
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const receiptCode = `${prefix}-${timestamp}-${randomStr}`;

    const isExport = type.startsWith('XUAT');
    const isAudit = type === 'KIEM_KE';
    const collectedAmt = Math.round(parseFloat(amountCollected) || 0);

    const result = await prisma.$transaction(async (tx) => {
      let createdLogs = [];
      let itemNames = [];
      
      for (const item of items) {
        if (!item.inventoryId) {
          throw new Error('Thiếu ID vật tư');
        }

        const inv = await tx.inventory.findUnique({ where: { id: item.inventoryId } });
        if (!inv) throw new Error(`Không tìm thấy vật tư có mã ${item.inventoryId}`);

        let actualQuantity = 0;
        if (isAudit) {
          if (item.actualStock !== undefined && item.actualStock !== null && item.actualStock !== '') {
            const targetStock = parseInt(item.actualStock, 10);
            if (isNaN(targetStock) || targetStock < 0) {
              throw new Error('Số lượng tồn thực tế kiểm kê phải >= 0');
            }
            actualQuantity = targetStock - inv.currentStock;
          } else {
            actualQuantity = parseInt(item.quantity, 10) || 0;
          }
          if (actualQuantity === 0) {
            throw new Error(`Số lượng tồn thực tế của [${inv.name}] không thay đổi so với hệ thống (${inv.currentStock})`);
          }
          if (inv.currentStock + actualQuantity < 0) {
            throw new Error(`Tồn kho sau điều chỉnh của [${inv.name}] không thể âm`);
          }
        } else {
          const qty = parseInt(item.quantity, 10);
          if (!qty || qty <= 0) {
            throw new Error('Số lượng giao dịch phải lớn hơn 0');
          }
          actualQuantity = isExport ? -qty : qty;

          // 1. Kiểm tra tồn kho trước khi xuất
          if (isExport) {
            if (inv.currentStock < qty) {
              throw new Error(`Vật tư [${inv.name}] không đủ tồn kho (Còn: ${inv.currentStock}, Yêu cầu: ${qty})`);
            }
            itemNames.push(`${inv.name} (x${qty})`);
          }
        }

        const logUnitCost = item.unitCost !== undefined && item.unitCost !== null && item.unitCost !== ''
          ? (parseFloat(String(item.unitCost).replace(/[^0-9.-]/g, '')) || 0)
          : (inv.unitCost || 0);

        const logCampaign = item.campaignName || campaignName || null;

        // 2. Tạo log
        const log = await tx.inventoryLog.create({
          data: {
            receiptCode,
            type,
            inventoryId: item.inventoryId,
            quantity: actualQuantity,
            unitCost: logUnitCost,
            campaignName: logCampaign,
            targetType: targetType || 'SYSTEM',
            targetName: targetName || null,
            studentId: studentId || null,
            notes: notes || (isAudit ? `Kiểm kê cân bằng tồn thực tế -> ${inv.currentStock + actualQuantity}` : null),
          }
        });
        createdLogs.push(log);

        // 3. Cập nhật tồn kho (và cập nhật giá vốn nếu nhập mới có giá mới)
        const updateData = {
          currentStock: {
            increment: actualQuantity
          }
        };
        if (type === 'NHAP_MOI' && item.unitCost && parseFloat(item.unitCost) > 0) {
          updateData.unitCost = logUnitCost;
        }

        await tx.inventory.update({
          where: { id: item.inventoryId },
          data: updateData
        });
      }

      // 4. Nếu có thu tiền mua vật tư/giáo trình từ học viên, tự động ghi nhận Hóa đơn + PaymentLog vào Tài chính
      if (collectedAmt > 0 && studentId) {
        const student = await tx.student.findUnique({ where: { id: studentId }, include: { enrollments: { where: { status: 'Đang học' } } } });
        const classCode = student?.enrollments[0]?.classCode || 'XUAT_KHO';
        const now = new Date();
        const year = String(now.getFullYear()).substring(2);
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const orderId = `ORD_ITEM_${year}${month}_${randomStr}`;
        const payMethod = paymentMethod || 'Chuyển khoản';

        await tx.orderFinance.create({
          data: {
            id: orderId,
            studentId,
            classCode,
            promoType: `Thu tiền Xuất kho / Bán vật tư (${itemNames.join(', ')}) [Qua ${payMethod}${notes ? `. Ghi chú: ${notes}` : ''}]`,
            promoDiscount: 0,
            feeToPay: collectedAmt,
            amountPaid: collectedAmt,
            paymentStatus: 'Đã đóng',
            paymentPolicy: 'Đóng trước',
            paymentDeadline: now,
            giftName: itemNames.join(', '),
            branchId: student?.branchId || 'CN1_BinhDuong',
          }
        });

        await tx.paymentLog.create({
          data: {
            orderId,
            amount: collectedAmt,
            paymentMethod: payMethod,
            notes: `Thu bán vật tư từ Kho (${receiptCode})`,
          }
        });
      }

      return { receiptCode, logsCount: createdLogs.length, amountCollected: collectedAmt };
    });

    try { await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(PASSIVE)'); } catch (_) {}

    return NextResponse.json({ success: true, message: 'Thực hiện giao dịch kho thành công', data: result });
  } catch (error) {
    console.error('Lỗi khi tạo phiếu kho:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
