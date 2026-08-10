import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import fs from 'fs';
import path from 'path';

async function handleInventoryAlert(request) {
  try {
    // 1. Secure the route using a simple auth check
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const CRON_TOKEN = process.env.CRON_TOKEN || 'nhatmy-cron-alert-token-xyz';

    if (authHeader !== `Bearer ${CRON_TOKEN}` && token !== CRON_TOKEN) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query all Inventory items from the database
    const allItems = await prisma.inventory.findMany({
      orderBy: { id: 'asc' }
    });
    
    // Low stock is defined as: quantity <= minThreshold (currentStock <= threshold)
    const lowStockItems = allItems.filter(item => item.currentStock <= item.threshold);
    const hasLowStock = lowStockItems.length > 0;

    let emailAlertStatus = 'NO_ALERT_NEEDED';
    let logFilePath = '';

    if (hasLowStock) {
      // 3. Format beautiful HTML layout
      const timestampStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      
      const tableRows = lowStockItems.map(item => {
        const isOutOfStock = item.currentStock === 0;
        const badgeClass = isOutOfStock ? 'badge-danger' : 'badge-warning';
        const badgeText = isOutOfStock ? 'Hết hàng' : 'Sắp hết hàng';
        
        return `
          <tr>
            <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle;"><code>${item.id}</code></td>
            <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle;"><strong>${item.name}</strong></td>
            <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle;">${item.category}</td>
            <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: ${isOutOfStock ? '#ef4444' : '#d97706'}; font-weight: bold; text-align: center; vertical-align: middle;">${item.currentStock}</td>
            <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; color: #334155; text-align: center; vertical-align: middle;">${item.threshold}</td>
            <td style="padding: 12px; font-size: 14px; border-bottom: 1px solid #e2e8f0; text-align: center; vertical-align: middle;">
              <span class="badge ${badgeClass}">${badgeText}</span>
            </td>
          </tr>
        `;
      }).join('\n');

      const inventoryUrl = `${request.nextUrl.origin}/inventory`;

      const htmlEmail = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cảnh Báo Tồn Kho Dưới Ngưỡng Tối Thiểu</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f6f9;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e1e4e8;
    }
    .header {
      background-color: #ef4444;
      color: #ffffff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      padding: 24px;
    }
    .summary {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 12px 16px;
      margin-bottom: 20px;
      border-radius: 0 4px 4px 0;
    }
    .summary p {
      margin: 0;
      font-size: 14px;
      color: #991b1b;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background-color: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 12px;
      font-size: 13px;
      border-bottom: 2px solid #e2e8f0;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 4px;
      text-align: center;
    }
    .badge-danger {
      background-color: #fee2e2;
      color: #ef4444;
    }
    .badge-warning {
      background-color: #fef3c7;
      color: #d97706;
    }
    .footer {
      background-color: #f8fafc;
      padding: 16px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .btn-action {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CRM Anh Ngữ Nhật Mỹ</h1>
      <p>Cảnh Báo Tồn Kho Dưới Ngưỡng Tối Thiểu</p>
    </div>
    <div class="content">
      <div class="summary">
        <p>Hệ thống phát hiện có ${lowStockItems.length} vật tư đã xuống dưới ngưỡng cảnh báo an toàn.</p>
      </div>
      <table>
        <thead>
          <tr>
            <th style="background-color: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 12px; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Mã</th>
            <th style="background-color: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 12px; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Tên vật tư</th>
            <th style="background-color: #f8fafc; color: #475569; font-weight: 600; text-align: left; padding: 12px; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Danh mục</th>
            <th style="background-color: #f8fafc; color: #475569; font-weight: 600; text-align: center; padding: 12px; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Tồn kho</th>
            <th style="background-color: #f8fafc; color: #475569; font-weight: 600; text-align: center; padding: 12px; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Ngưỡng</th>
            <th style="background-color: #f8fafc; color: #475569; font-weight: 600; text-align: center; padding: 12px; font-size: 13px; border-bottom: 2px solid #e2e8f0;">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div style="text-align: center;">
        <a href="${inventoryUrl}" class="btn-action" target="_blank">Đi tới Quản lý Kho</a>
      </div>
    </div>
    <div class="footer">
      <p>Báo cáo được tạo tự động lúc ${timestampStr}</p>
      <p>Hệ thống Quản lý & Vận hành CRM Anh Ngữ Nhật Mỹ &copy; 2026</p>
    </div>
  </div>
</body>
</html>`;

      // Determine where to write the log file
      // Check the exact workspace root folder first, fallback to Next.js root directory
      const workspaceRoot = 'd:\\2. TÀI LIỆU LỖI THỜI\\4. CRM NHẬT MỸ';
      let logsDir = path.join(workspaceRoot, 'logs');
      if (!fs.existsSync(workspaceRoot)) {
        logsDir = path.join(process.cwd(), 'logs');
      }
      
      // Create folder if not exists
      fs.mkdirSync(logsDir, { recursive: true });
      logFilePath = path.join(logsDir, 'inventory-alerts.log');

      // Construct detailed log format
      const itemsListText = lowStockItems.map(item => {
        const statusText = item.currentStock === 0 ? 'HẾT HÀNG' : 'SẮP HẾT HÀNG';
        return `- ${item.id}: ${item.name} (${item.category}) - Stock: ${item.currentStock}/${item.threshold} [${statusText}]`;
      }).join('\n');

      const logContent = `
========================================================================
TIMESTAMP: ${timestampStr}
EVENT: INVENTORY LOW STOCK ALERT
TOTAL LOW STOCK ITEMS: ${lowStockItems.length}
------------------------------------------------------------------------
ITEMS DETAILS:
${itemsListText}
------------------------------------------------------------------------
MOCK EMAIL STATUS: SUCCESS (Sent to director@nhatmy.edu.vn)
HTML EMAIL CONTENT:
${htmlEmail}
========================================================================
\n`;

      fs.appendFileSync(logFilePath, logContent, 'utf8');
      emailAlertStatus = 'MOCKED_AND_LOGGED';
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      lowStockCount: lowStockItems.length,
      lowStockItems,
      emailAlertStatus,
      logFilePath
    });

  } catch (error) {
    console.error('Lỗi khi thực hiện kiểm tra cảnh báo tồn kho:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return handleInventoryAlert(request);
}

export async function POST(request) {
  return handleInventoryAlert(request);
}
