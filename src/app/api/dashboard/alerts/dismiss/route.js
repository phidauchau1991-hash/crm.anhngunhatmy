import { NextResponse } from 'next/server';
import { dismissKeys } from '@/lib/alertDismissals';

export async function POST(request) {
  try {
    const { keys } = await request.json();
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ success: false, error: 'Thiếu keys' }, { status: 400 });
    }
    await dismissKeys(keys);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Lỗi dismiss cảnh báo:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
