import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const next5Days = new Date(today);
    next5Days.setDate(today.getDate() + 5);

    const twentyDaysAgo = new Date(today);
    twentyDaysAgo.setDate(today.getDate() - 20);

    // 1. Birthdays in current month
    const allStudents = await prisma.student.findMany({
      where: { status: 'Đang học' },
      select: { id: true, name: true, dob: true, phone: true }
    });

    const currentMonth = today.getMonth();
    const birthdays = allStudents.filter(s => {
      if (!s.dob) return false;
      const dobDate = new Date(s.dob);
      return dobDate.getMonth() === currentMonth;
    }).map(s => {
      const dobDate = new Date(s.dob);
      const nextBirthday = new Date(today.getFullYear(), dobDate.getMonth(), dobDate.getDate());
      const daysUntil = Math.ceil((nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return { ...s, daysUntil, isUpcoming: daysUntil >= 0 && daysUntil <= 5 };
    }).sort((a, b) => a.daysUntil - b.daysUntil);

    // 2. Paused students near callback date
    const pausedStudents = await prisma.student.findMany({
      where: {
        status: 'Tạm nghỉ',
        callbackDate: {
          gte: today,
          lte: next5Days
        }
      },
      select: { id: true, name: true, phone: true, callbackDate: true }
    });

    // 3. Tuition alerts (Classes started >= 20 days ago, unpaid orders)
    const unpaidOrders = await prisma.orderFinance.findMany({
      where: {
        paymentStatus: {
          in: ['Chưa đóng', 'Chưa đóng đủ']
        }
      },
      include: {
        student: { select: { name: true, phone: true } },
        class: { select: { code: true, startDate: true } }
      }
    });

    const tuitionAlerts = unpaidOrders.filter(order => {
      if (!order.class || !order.class.startDate) return false;
      const startDate = new Date(order.class.startDate);
      return startDate <= twentyDaysAgo;
    });

    return NextResponse.json({
      success: true,
      data: {
        birthdays,
        paused: pausedStudents,
        tuition: tuitionAlerts
      }
    });
  } catch (error) {
    console.error('Error fetching CRM alerts:', error);
    return NextResponse.json({ success: false, error: 'Cannot fetch alerts' }, { status: 500 });
  }
}
