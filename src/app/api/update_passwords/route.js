import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    const pAdmin = await bcrypt.hash('NhatMy@2026', 10);
    const pMy = await bcrypt.hash('trucmy@030791', 10);
    const pDau = await bcrypt.hash('phidau@220891', 10);

    const r1 = await prisma.user.updateMany({
      where: { username: 'admin' },
      data: { password: pAdmin }
    });

    const r2 = await prisma.user.updateMany({
      where: { username: 'gv. Ms My' },
      data: { password: pMy }
    });

    const r3 = await prisma.user.updateMany({
      where: { username: 'nv. Mr Đấu' },
      data: { password: pDau }
    });

    return NextResponse.json({ success: true, message: 'Passwords updated locally!', r1, r2, r3 });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
