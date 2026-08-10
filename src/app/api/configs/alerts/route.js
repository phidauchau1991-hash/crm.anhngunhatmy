import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    let config = await prisma.alertConfig.findFirst();
    if (!config) {
      config = await prisma.alertConfig.create({
        data: {} // Use defaults from schema
      });
    }
    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Lỗi khi lấy cấu hình cảnh báo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { consecutiveAbsences, totalAbsencesLimit, missingWbLimit, missingVideoLimit, copyErrorLimit } = body;
    
    let config = await prisma.alertConfig.findFirst();
    
    if (config) {
      config = await prisma.alertConfig.update({
        where: { id: config.id },
        data: {
          consecutiveAbsences: parseInt(consecutiveAbsences) || 2,
          totalAbsencesLimit: parseInt(totalAbsencesLimit) || 5,
          missingWbLimit: parseInt(missingWbLimit) || 2,
          missingVideoLimit: parseInt(missingVideoLimit) || 2,
          copyErrorLimit: parseInt(copyErrorLimit) || 2,
        },
      });
    } else {
      config = await prisma.alertConfig.create({
        data: {
          consecutiveAbsences: parseInt(consecutiveAbsences) || 2,
          totalAbsencesLimit: parseInt(totalAbsencesLimit) || 5,
          missingWbLimit: parseInt(missingWbLimit) || 2,
          missingVideoLimit: parseInt(missingVideoLimit) || 2,
          copyErrorLimit: parseInt(copyErrorLimit) || 2,
        },
      });
    }
    
    return NextResponse.json({ success: true, message: 'Đã cập nhật cấu hình cảnh báo', data: config });
  } catch (error) {
    console.error('Lỗi khi cập nhật cấu hình cảnh báo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
