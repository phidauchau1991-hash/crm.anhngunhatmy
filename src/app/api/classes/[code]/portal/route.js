import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { encryptStudentId } from '@/lib/token';

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

    // 2. Fetch Enrolled Students (Only Active)
    const enrollments = await prisma.enrollment.findMany({
      where: { classCode, status: 'Đang học' },
      include: { student: true }
    });
    
    // Fetch all historical enrollments to also include students who transferred but have no attendance yet
    const historicalEnrollments = await prisma.enrollment.findMany({
      where: { 
        classCode, 
        status: { not: 'Đang học' } 
      },
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

    // 5. Find historical students who have attendance or exam records but are no longer enrolled
    const enrolledIds = new Set(enrollments.map(e => e.student.id));
    const historicalIds = new Set(historicalEnrollments.map(e => e.student.id));
    
    attendances.forEach(a => {
      if (a.studentId && !enrolledIds.has(a.studentId)) {
        historicalIds.add(a.studentId);
      }
    });

    const classStudentIds = Array.from(new Set([
      ...enrollments.map(e => e.student.id),
      ...historicalEnrollments.map(e => e.student.id)
    ]));
    
    // For exam grades (from ExamResult table Sprint 4)
    // Find results recorded directly under this classCode OR
    // results belonging to students of this class matching this class's level
    const examResults = await prisma.examResult.findMany({
      where: {
        OR: [
          { classCode: classCode },
          {
            studentId: { in: classStudentIds },
            config: { level: classInfo.level }
          }
        ]
      },
      include: { config: true },
      orderBy: { createdAt: 'desc' }
    });

    examResults.forEach(e => {
      if (e.studentId && !enrolledIds.has(e.studentId)) {
        historicalIds.add(e.studentId);
      }
    });

    const historicalStudents = await prisma.student.findMany({
      where: { id: { in: Array.from(historicalIds) } }
    });

    // Combine current enrollments and historical students for full class list
    const allStudents = [
      ...enrollments.map(e => e.student),
      ...historicalStudents
    ];

    // Helper to calculate student stats
    const processStudent = (s, isTrial) => {
      const id = s.id;
      const name = s.name;
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
        phone: s.phone || '',
        classCode: classCode,
        level: classInfo?.level || '',
        status: s.status || (isTrial ? 'Học thử' : 'Đang học'),
        customBookCodes: s.customBookCodes || null,
        retainCoursewareAccess: Boolean(s.retainCoursewareAccess),
        coursewareLetterExportedAt: s.coursewareLetterExportedAt ? s.coursewareLetterExportedAt.toISOString() : null,
        portalToken: !isTrial && id ? encryptStudentId(id) : '',
        isTrial,
        totalAbsent,
        totalWb,
        totalVideo,
        isHistorical: !isTrial && !enrolledIds.has(id) // Đánh dấu học viên đã chuyển lớp/nghỉ
      });
    };

    allStudents.forEach(s => processStudent(s, false));
    trialLeads.forEach(l => processStudent(l, true));

    const grades = allStudents.map(student => {
      const midTerm = examResults.find(r => r.studentId === student.id && r.config.examType === 'Giữa khóa');
      const finalTerm = examResults.find(r => r.studentId === student.id && r.config.examType === 'Cuối khóa');
      
      return {
        id: student.id,
        name: student.name,
        isHistorical: !enrolledIds.has(student.id),
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
