import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getBranchFilter } from '@/lib/rbac';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    
    const month = parseInt(searchParams.get('month')) || (now.getMonth() + 1);
    const year = parseInt(searchParams.get('year')) || now.getFullYear();
    const branchId = searchParams.get('branchId') || 'ALL';
    const category = searchParams.get('category') || 'ALL';

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    // Filter điều kiện kho
    const invWhere = {};
    if (branchId !== 'ALL') {
      invWhere.branchId = branchId;
    }
    if (category !== 'ALL') {
      invWhere.category = category;
    }

    // 1. Lấy danh sách tất cả vật tư & các giao dịch
    const items = await prisma.inventory.findMany({
      where: invWhere,
      include: {
        logs: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    // 2. Tính toán Xuất - Nhập - Tồn cho từng vật tư
    const nxtRows = items.map(item => {
      const logs = item.logs || [];
      const currentStock = item.currentStock || 0;
      const unitCost = item.unitCost || 0;
      const unitPrice = item.unitPrice || 0;

      // Giao dịch sau thời điểm chốt tháng (dùng để hồi tố nếu xem tháng cũ)
      let futureDelta = 0;
      // Giao dịch trong tháng
      let inQty = 0;
      let nhapMoi = 0;
      let nhapTra = 0;
      let outQty = 0;
      let xuatTang = 0;
      let xuatBan = 0;
      let xuatMuon = 0;
      let xuatHong = 0;
      let kiemKeAdj = 0;

      logs.forEach(log => {
        const logDate = new Date(log.createdAt);
        if (logDate > endOfMonth) {
          // Hồi tố: quantity dương (nhập) làm tăng tồn, quantity âm (xuất) làm giảm tồn
          futureDelta += log.quantity;
        } else if (logDate >= startOfMonth && logDate <= endOfMonth) {
          const q = log.quantity;
          if (log.type === 'NHAP_MOI') {
            inQty += q;
            nhapMoi += q;
          } else if (log.type === 'NHAP_TRA') {
            inQty += q;
            nhapTra += q;
          } else if (log.type === 'XUAT_TANG') {
            const absQ = Math.abs(q);
            outQty += absQ;
            xuatTang += absQ;
          } else if (log.type === 'XUAT_BAN') {
            const absQ = Math.abs(q);
            outQty += absQ;
            xuatBan += absQ;
          } else if (log.type === 'XUAT_MUON') {
            const absQ = Math.abs(q);
            outQty += absQ;
            xuatMuon += absQ;
          } else if (log.type === 'XUAT_HONG') {
            const absQ = Math.abs(q);
            outQty += absQ;
            xuatHong += absQ;
          } else if (log.type === 'KIEM_KE') {
            kiemKeAdj += q;
          } else {
            if (q > 0) inQty += q;
            else outQty += Math.abs(q);
          }
        }
      });

      // Tồn cuối kỳ = tồn hiện tại trừ đi biến động sau kỳ báo cáo
      const closingStock = Math.max(0, currentStock - futureDelta);
      // Tồn đầu kỳ = Tồn cuối kỳ - (Tổng Nhập - Tổng Xuất + Điều chỉnh kiểm kê)
      const netChangeInPeriod = inQty - outQty + kiemKeAdj;
      let openingStock = closingStock - netChangeInPeriod;
      if (openingStock < 0) openingStock = 0;

      // Định giá tiền tệ
      const openingValue = openingStock * unitCost;
      const inValue = inQty * unitCost;
      const giftCost = xuatTang * unitCost;
      const soldCost = xuatBan * unitCost;
      const soldRevenue = xuatBan * unitPrice;
      const closingValue = closingStock * unitCost;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        unit: item.unit || 'Cái',
        unitCost,
        unitPrice,
        openingStock,
        openingValue,
        inQty,
        nhapMoi,
        nhapTra,
        inValue,
        outQty,
        xuatTang,
        xuatBan,
        xuatMuon,
        xuatHong,
        giftCost,
        soldCost,
        soldRevenue,
        kiemKeAdj,
        closingStock,
        closingValue,
        threshold: item.threshold,
        isLowStock: closingStock > 0 && closingStock <= item.threshold,
        isOutOfStock: closingStock === 0,
      };
    });

    // 3. Lấy tất cả phiếu Xuất Tặng (Marketing Gifts) trong tháng để phân tích chiến dịch
    const giftLogs = await prisma.inventoryLog.findMany({
      where: {
        type: 'XUAT_TANG',
        createdAt: { gte: startOfMonth, lte: endOfMonth },
        ...(category !== 'ALL' ? { inventory: { category } } : {})
      },
      include: {
        inventory: {
          select: { id: true, name: true, category: true, unit: true, unitCost: true }
        },
        student: {
          select: { id: true, name: true, phone: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Gom nhóm theo Chiến dịch / Sự kiện Marketing
    const campaignMap = {};
    giftLogs.forEach(log => {
      const campName = (log.campaignName && log.campaignName.trim()) 
        ? log.campaignName.trim() 
        : 'Quà tặng Ghi danh & Tri ân thường quy';
      
      const qty = Math.abs(log.quantity);
      const costPerUnit = (log.unitCost !== undefined && log.unitCost !== null && log.unitCost > 0)
        ? log.unitCost
        : (log.inventory?.unitCost || 0);
      const totalCost = qty * costPerUnit;

      if (!campaignMap[campName]) {
        campaignMap[campName] = {
          campaignName: campName,
          totalQuantity: 0,
          totalCost: 0,
          items: {},
          students: new Set(),
          logsCount: 0
        };
      }

      campaignMap[campName].totalQuantity += qty;
      campaignMap[campName].totalCost += totalCost;
      campaignMap[campName].logsCount += 1;

      const recipientId = log.studentId || log.targetName || 'Khách vãng lai';
      campaignMap[campName].students.add(recipientId);

      const itemName = log.inventory?.name || log.inventoryId;
      if (!campaignMap[campName].items[itemName]) {
        campaignMap[campName].items[itemName] = {
          name: itemName,
          unit: log.inventory?.unit || 'Cái',
          quantity: 0,
          cost: 0
        };
      }
      campaignMap[campName].items[itemName].quantity += qty;
      campaignMap[campName].items[itemName].cost += totalCost;
    });

    const campaigns = Object.values(campaignMap).map(c => ({
      campaignName: c.campaignName,
      totalQuantity: c.totalQuantity,
      totalCost: c.totalCost,
      recipientsCount: c.students.size,
      logsCount: c.logsCount,
      items: Object.values(c.items)
    })).sort((a, b) => b.totalCost - a.totalCost);

    // 4. Số lượng Học viên mới nhập học trong tháng (dùng tính CAC Quà Tặng)
    const newStudentsCount = await prisma.student.count({
      where: {
        createdAt: { gte: startOfMonth, lte: endOfMonth }
      }
    });

    // 5. Tổng hợp KPIs
    const totalGiftCost = nxtRows.reduce((sum, r) => sum + r.giftCost, 0);
    const totalGiftQuantity = nxtRows.reduce((sum, r) => sum + r.xuatTang, 0);
    const totalInventoryValue = nxtRows.reduce((sum, r) => sum + r.closingValue, 0);
    const totalOpeningValue = nxtRows.reduce((sum, r) => sum + r.openingValue, 0);
    const totalInValue = nxtRows.reduce((sum, r) => sum + r.inValue, 0);
    const totalSoldRevenue = nxtRows.reduce((sum, r) => sum + r.soldRevenue, 0);
    const cacGift = newStudentsCount > 0 ? Math.round(totalGiftCost / newStudentsCount) : 0;

    return NextResponse.json({
      success: true,
      period: {
        month,
        year,
        startOfMonth: startOfMonth.toISOString(),
        endOfMonth: endOfMonth.toISOString(),
      },
      kpis: {
        totalGiftCost,
        totalGiftQuantity,
        totalInventoryValue,
        totalOpeningValue,
        totalInValue,
        totalSoldRevenue,
        newStudentsCount,
        cacGift,
        totalCampaigns: campaigns.length,
      },
      nxtTable: nxtRows,
      campaigns,
      recentGiftLogs: giftLogs.slice(0, 50).map(l => ({
        id: l.id,
        receiptCode: l.receiptCode,
        createdAt: l.createdAt,
        inventoryName: l.inventory?.name || l.inventoryId,
        unit: l.inventory?.unit || 'Cái',
        quantity: Math.abs(l.quantity),
        unitCost: (l.unitCost > 0 ? l.unitCost : (l.inventory?.unitCost || 0)),
        totalCost: Math.abs(l.quantity) * (l.unitCost > 0 ? l.unitCost : (l.inventory?.unitCost || 0)),
        campaignName: l.campaignName || 'Thường quy',
        recipient: l.student?.name || l.targetName || 'Chưa ghi',
        studentId: l.studentId,
        notes: l.notes
      }))
    });
  } catch (error) {
    console.error('Lỗi khi tính toán báo cáo Xuất Nhập Tồn:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
