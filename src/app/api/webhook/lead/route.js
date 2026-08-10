import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request) {
  try {
    const data = await request.json();
    const { name, phone, course } = data;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc (name, phone)' },
        { status: 400, headers: corsHeaders }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        phone,
        status: 'Mới',
        notes: course ? `Đăng ký từ Website. Khóa học quan tâm: ${course}` : 'Đăng ký từ Website.',
        branchId: 'CN1_BinhDuong',
      }
    });

    return NextResponse.json(
      { success: true, message: 'Đã nhận Lead thành công', data: lead },
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error('Webhook Lead Error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi server nội bộ' },
      { status: 500, headers: corsHeaders }
    );
  }
}
