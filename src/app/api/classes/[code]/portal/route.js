import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { code } = await params;
    const classCode = decodeURIComponent(code);

    // 1. Fetch Class Info
    const classInfo = await prisma.class.findUnique({
      where: { code: classCode },
      include: { teacher: true }
    });

    if (!classInfo) {
      return NextResponse.json({ success: false, error: 'Không tìm thấy lớp học' }, { status: 404 });
    }

    // 2. Fetch Enrolled Students
    const enrollments = await prisma.enrollment.findMany({
      where: { classCode },
      include: { student: true }
    });
    
    // We also need Leads who are trial in this class
    const trialLeads = await prisma.lead.findMany({
      where: { status: 'Học thử', trialClassCode: classCode }
    });

    // 3. Fetch Attendance Summaries (Sessions/Columns)
    const sessions = await prisma.attendanceSummary.findMany({
      where: { classCode },
      orderBy: { date: 'asc' }
    });

    // 4. Fetch all attendance records for this class
    const attendances = await prisma.attendance.findMany({
      where: { classCode }
    });

    // Process students matrix data
    const studentsData = [];
    const matrix = {};

    // Helper to calculate student stats
    const processStudent = (id, name, isTrial) => {
      let totalAbsent = 0;
      let totalWb = 0;
      let totalVideo = 0;
      
      const studentAttendances = attendances.filter(a => isTrial ? a.leadId === id : a.studentId === id);
      
      matrix[id] = {};
      
      studentAttendances.forEach(a => {
        const dateStr = new Date(a.date).toISOString();
        matrix[id][dateStr] = {
          status: a.status,
          missingWb: a.missingWb,
          missingVideo: a.missingVideo,
          copyError: a.copyError,
          teacherNotes: a.teacherNotes
        };
        
        if (a.status === 'Vắng không phép' || a.status === 'Vắng có phép' || a.status === 'Nghỉ có phép') {
          totalAbsent++;
        }
        if (a.missingWb) totalWb++;
        if (a.missingVideo) totalVideo++;
      });
      
      studentsData.push({
        id,
        name,
        isTrial,
        totalAbsent,
        totalWb,
        totalVideo
      });
    };

    enrollments.forEach(e => processStudent(e.student.id, e.student.name, false));
    trialLeads.forEach(l => processStudent(l.id, l.name, true));

    // For exam grades (from ExamResult table Sprint 4)
    const examResults = await prisma.examResult.findMany({
      where: { classCode },
      include: { config: true }
    });

    const grades = enrollments.map(e => {
      const midTerm = examResults.find(r => r.studentId === e.student.id && r.config.examType === 'Giữa khóa');
      const finalTerm = examResults.find(r => r.studentId === e.student.id && r.config.examType === 'Cuối khóa');
      
      return {
        id: e.student.id,
        name: e.student.name,
        midTerm: midTerm ? {
          processTotal: midTerm.processTotal,
          speakingScore: midTerm.speakingScore,
          listeningScore: midTerm.listeningScore,
          rwScore: midTerm.rwScore,
          totalScore: midTerm.totalScore,
          grade: midTerm.grade
        } : null,
        finalTerm: finalTerm ? {
          processTotal: finalTerm.processTotal,
          speakingScore: finalTerm.speakingScore,
          listeningScore: finalTerm.listeningScore,
          rwScore: finalTerm.rwScore,
          totalScore: finalTerm.totalScore,
          grade: finalTerm.grade
        } : null
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        classInfo,
        students: studentsData,
        sessions,
        matrix,
        grades
      }
    });

  } catch (error) {
    console.error('Portal API Error:', error);
    return NextResponse.json({ success: false, error: 'Lỗi server khi lấy dữ liệu Sổ Đầu Bài' }, { status: 500 });
  }
}
