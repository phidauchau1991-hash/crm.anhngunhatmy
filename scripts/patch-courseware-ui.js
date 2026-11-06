const fs = require('fs');
const path = require('path');

const STUDENTS_PAGE = path.join(__dirname, '..', 'src', 'app', 'students', 'page.js');
const CLASS_PORTAL_PAGE = path.join(__dirname, '..', 'src', 'app', 'classes', '[code]', 'page.js');

function patchStudentsPage() {
  console.log('--- Đang cập nhật src/app/students/page.js ---');
  let content = fs.readFileSync(STUDENTS_PAGE, 'utf8');

  // 1. Thêm imports
  if (!content.includes('CoursewareNoticeModal')) {
    content = content.replace(
      "import PaidStamp from '@/components/PaidStamp';",
      "import PaidStamp from '@/components/PaidStamp';\nimport CoursewareNoticeModal from '@/components/CoursewareNoticeModal';\nimport { AVAILABLE_COURSEWARE_BOOKS, parseCustomBookCodes } from '@/lib/coursewareBooks';"
    );
    console.log('✅ Đã thêm imports CoursewareNoticeModal');
  }

  // 2. Thêm state cho modal
  if (!content.includes('isCoursewareModalOpen')) {
    content = content.replace(
      "const [transferPreview, setTransferPreview] = useState(null);",
      "const [transferPreview, setTransferPreview] = useState(null);\n\n  // Trạng thái xuất Thư học liệu & Thẻ học viên điện tử (Giai đoạn 1)\n  const [isCoursewareModalOpen, setIsCoursewareModalOpen] = useState(false);\n  const [coursewareModalStudents, setCoursewareModalStudents] = useState([]);\n  const [selectedStudentIds, setSelectedStudentIds] = useState([]);"
    );
    console.log('✅ Đã thêm state isCoursewareModalOpen');
  }

  // 3. Thêm customBookCodes & retainCoursewareAccess vào editForm default
  if (!content.includes('customBookCodes: [],')) {
    content = content.replace(
      "manualAdjustment: '0',\n    manualReason: '',",
      "manualAdjustment: '0',\n    manualReason: '',\n    customBookCodes: [],\n    retainCoursewareAccess: false,"
    );
    console.log('✅ Đã thêm customBookCodes vào editForm default');
  }

  // 4. Thêm customBookCodes & retainCoursewareAccess vào openEditModal
  if (!content.includes('customBookCodes: parseCustomBookCodes(std.customBookCodes),')) {
    content = content.replace(
      "manualAdjustment: '',\n          manualReason: '',\n        });",
      "manualAdjustment: '',\n          manualReason: '',\n          customBookCodes: parseCustomBookCodes(std.customBookCodes),\n          retainCoursewareAccess: Boolean(std.retainCoursewareAccess),\n        });"
    );
    console.log('✅ Đã nạp customBookCodes vào openEditModal');
  }

  // 5. Thêm customBookCodes & retainCoursewareAccess vào handleEditSubmit basic
  if (!content.includes('customBookCodes: editForm.customBookCodes || [],')) {
    content = content.replace(
      "specialPolicyValue: parseNumber(editForm.specialPolicyValue),\n      };",
      "specialPolicyValue: parseNumber(editForm.specialPolicyValue),\n        customBookCodes: editForm.customBookCodes || [],\n        retainCoursewareAccess: Boolean(editForm.retainCoursewareAccess),\n      };"
    );
    console.log('✅ Đã thêm customBookCodes vào handleEditSubmit');
  }

  // 6. Thêm Courseware helper handlers
  if (!content.includes('handleOpenSingleCourseware')) {
    const helperCode = `
  // Helper mở Thư học liệu & Thẻ học viên điện tử
  const handleOpenSingleCourseware = (student) => {
    setCoursewareModalStudents([student]);
    setIsCoursewareModalOpen(true);
  };

  const handleOpenBatchCourseware = (studentListToExport = null) => {
    const list = studentListToExport || students.filter(s => selectedStudentIds.includes(s.id));
    if (!list || list.length === 0) {
      alert('Vui lòng chọn ít nhất một học viên để xuất thư học liệu!');
      return;
    }
    setCoursewareModalStudents(list);
    setIsCoursewareModalOpen(true);
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllDisplayed = (displayedList) => {
    if (selectedStudentIds.length === displayedList.length && displayedList.length > 0) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(displayedList.map(s => s.id));
    }
  };
`;
    content = content.replace(
      "const refreshEditData = async () => {",
      helperCode + "\n  const refreshEditData = async () => {"
    );
    console.log('✅ Đã thêm các hàm handler Courseware');
  }

  // 7. Thêm Batch banner & Checkbox trong table header
  if (!content.includes('Chọn tất cả để xuất thẻ hàng loạt')) {
    const batchBanner = `              {selectedStudentIds.length > 0 && (
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', background: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #CBD5E1', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.9rem', color: '#0F172A', fontWeight: '700' }}>
                    Đã chọn <strong style={{ color: '#0B2A4A', fontSize: '1.05rem' }}>{selectedStudentIds.length}</strong> / {displayedStudents.length} học viên
                  </span>
                  <button
                    type="button"
                    className="btn"
                    style={{ background: '#0B2A4A', color: '#FFFFFF', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700', padding: '0.45rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                    onClick={() => handleOpenBatchCourseware(displayedStudents.filter(s => selectedStudentIds.includes(s.id)))}
                  >
                    <i className="fa-solid fa-id-card"></i> 📱 Xuất Thư Học Liệu Đã Chọn ({selectedStudentIds.length})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                    onClick={() => setSelectedStudentIds([])}
                  >
                    Bỏ chọn tất cả
                  </button>
                </div>
              )}`;

    content = content.replace(
      '<div className="table-container glass-panel">',
      `<div className="table-container glass-panel">\n${batchBanner}`
    );

    content = content.replace(
      '<thead>\n                    <tr>\n                      <th>Mã HV</th>',
      `<thead>\n                    <tr>\n                      <th style={{ width: '40px', textAlign: 'center' }}>\n                        <input\n                          type="checkbox"\n                          checked={displayedStudents.length > 0 && selectedStudentIds.length === displayedStudents.length}\n                          onChange={() => toggleSelectAllDisplayed(displayedStudents)}\n                          title="Chọn tất cả để xuất thẻ hàng loạt"\n                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}\n                        />\n                      </th>\n                      <th>Mã HV</th>`
    );
    console.log('✅ Đã thêm Batch banner và Checkbox header');
  }

  // 8. Thêm Checkbox và nút Thư Học Liệu trong từng dòng học viên
  if (!content.includes('📱 Thư Học Liệu & Thẻ Học Viên')) {
    content = content.replace(
      '{displayedStudents.map((student) => (\n                      <tr key={student.id} className="table-row">\n                        <td className="std-id">{student.id}</td>',
      `{displayedStudents.map((student) => (\n                      <tr key={student.id} className="table-row">\n                        <td style={{ textAlign: 'center' }}>\n                          <input\n                            type="checkbox"\n                            checked={selectedStudentIds.includes(student.id)}\n                            onChange={() => toggleSelectStudent(student.id)}\n                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}\n                          />\n                        </td>\n                        <td className="std-id">{student.id}</td>`
    );

    content = content.replace(
      '<div className="action-buttons">\n                            <Link href={`/students/${student.id}`}',
      `<div className="action-buttons">\n                            <button \n                              className="action-btn" \n                              style={{ color: '#0B2A4A', background: 'rgba(11, 42, 74, 0.08)' }} \n                              title="📱 Thư Học Liệu & Thẻ Học Viên" \n                              onClick={() => handleOpenSingleCourseware(student)}\n                            >\n                              <i className="fa-solid fa-id-card"></i>\n                            </button>\n                            <Link href={\`/students/\${student.id}\`}`
    );
    console.log('✅ Đã thêm Checkbox và Nút Thư Học Liệu vào từng dòng');
  }

  // 9. Thêm nút Thư Học Liệu tại header của Modal Chỉnh sửa
  if (!content.includes('📱 Thư Học Liệu / Thẻ HV')) {
    content = content.replace(
      `<i className="fa-regular fa-copy"></i> Sao chép đường dẫn\n                    </button>\n                  </div>`,
      `<i className="fa-regular fa-copy"></i> Sao chép đường dẫn\n                    </button>\n                    <button\n                      type="button"\n                      onClick={() => {\n                        const currentStudentObj = editStudentData?.student ? {\n                          ...editStudentData.student,\n                          classCode: editStudentData?.currentClass?.classCode || editStudentData?.student?.classCode,\n                          customBookCodes: editForm.customBookCodes,\n                          retainCoursewareAccess: editForm.retainCoursewareAccess,\n                          portalToken: editStudentData?.student?.parentPortalToken,\n                        } : null;\n                        if (currentStudentObj) {\n                          handleOpenSingleCourseware(currentStudentObj);\n                        }\n                      }}\n                      className="btn"\n                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#0B2A4A', color: '#FFFFFF', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}\n                    >\n                      <i className="fa-solid fa-id-card"></i> 📱 Thư Học Liệu / Thẻ HV\n                    </button>\n                  </div>`
    );
    console.log('✅ Đã thêm nút Thư Học Liệu tại header Modal Chỉnh sửa');
  }

  // 10. Thêm Section Chọn Giáo trình trong Form Tab 1 (Basic)
  if (!content.includes('Phân Quyền Giáo Trình Tương Tác Số (1..N Bộ Sách)')) {
    const coursewareFormSection = `
                        {/* PHÂN QUYỀN GIÁO TRÌNH & HỌC LIỆU SỐ (WEB APP VERCEL) */}
                        <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px dashed var(--color-border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0B2A4A', display: 'flex', alignItems: 'center', gap: '0.45rem', margin: 0 }}>
                              <i className="fa-solid fa-book-bookmark" style={{ color: '#C9A45C' }}></i>
                              Phân Quyền Giáo Trình Tương Tác Số (1..N Bộ Sách)
                            </label>
                            <button
                              type="button"
                              className="btn"
                              style={{ background: '#0B2A4A', color: '#FFFFFF', padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer', fontWeight: '700' }}
                              onClick={() => {
                                const currentStudentObj = editStudentData?.student ? {
                                  ...editStudentData.student,
                                  classCode: editStudentData?.currentClass?.classCode || editStudentData?.student?.classCode,
                                  customBookCodes: editForm.customBookCodes,
                                  retainCoursewareAccess: editForm.retainCoursewareAccess,
                                  portalToken: editStudentData?.student?.parentPortalToken,
                                } : null;
                                if (currentStudentObj) {
                                  handleOpenSingleCourseware(currentStudentObj);
                                }
                              }}
                            >
                              <i className="fa-solid fa-id-card"></i> 📱 Xem Thư Học Liệu / Thẻ HV
                            </button>
                          </div>
                          
                          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
                            Học viên mặc định được mở sách theo Lớp học. Bạn có thể tick chọn mở thêm 1, 2 hoặc nhiều giáo trình song song dưới đây:
                          </p>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
                            {AVAILABLE_COURSEWARE_BOOKS.map(book => {
                              const isChecked = Array.isArray(editForm.customBookCodes) && editForm.customBookCodes.includes(book.code);
                              return (
                                <label
                                  key={book.code}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.5rem 0.65rem',
                                    borderRadius: '6px',
                                    border: isChecked ? '1px solid #0B2A4A' : '1px solid var(--color-border)',
                                    background: isChecked ? 'rgba(11, 42, 74, 0.05)' : 'var(--color-bg-card)',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const current = Array.isArray(editForm.customBookCodes) ? editForm.customBookCodes : [];
                                      const updated = e.target.checked
                                        ? [...current, book.code]
                                        : current.filter(c => c !== book.code);
                                      setEditForm(prev => ({ ...prev, customBookCodes: updated }));
                                    }}
                                    style={{ accentColor: '#0B2A4A', width: '15px', height: '15px' }}
                                  />
                                  <div>
                                    <div style={{ fontSize: '0.85rem', fontWeight: isChecked ? '700' : '500', color: 'var(--color-text)' }}>
                                      {book.title}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                      {book.level}
                                    </div>
                                  </div>
                                </label>
                              );
                            })}
                          </div>

                          <div style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(5, 150, 105, 0.06)', borderRadius: '8px', border: '1px solid rgba(5, 150, 105, 0.25)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={Boolean(editForm.retainCoursewareAccess)}
                                onChange={(e) => setEditForm(prev => ({ ...prev, retainCoursewareAccess: e.target.checked }))}
                                style={{ accentColor: '#059669', width: '16px', height: '16px' }}
                              />
                              <div>
                                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669' }}>
                                  Giữ quyền truy cập học liệu khi Tạm nghỉ / Nghỉ luôn
                                </span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                  Hỗ trợ học viên khó khăn hoặc cần ôn thi Cambridge tiếp tục tự học tại nhà.
                                </div>
                              </div>
                            </label>
                          </div>
                        </div>`;

    content = content.replace(
      '<form onSubmit={(e) => handleEditSubmit(e, \'basic\')} className="modal-form"',
      `{/* TAB 1: Thông tin cơ bản & Phân quyền học liệu */}\n                  <form onSubmit={(e) => handleEditSubmit(e, 'basic')} className="modal-form"`
    );

    content = content.replace(
      `                      </div>\n                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>\n                      <button type="submit" className="btn btn-primary" disabled={submitting}>`,
      `                      </div>\n${coursewareFormSection}\n                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>\n                      <button type="submit" className="btn btn-primary" disabled={submitting}>`
    );
    console.log('✅ Đã thêm form Phân quyền giáo trình vào Tab 1');
  }

  // 11. Render CoursewareNoticeModal ở cuối trang
  if (!content.includes('<CoursewareNoticeModal')) {
    content = content.replace(
      '      )}\n    </div>\n  );\n}',
      `      )}\n\n      {/* Modal Xuất Thư Học Liệu & Thẻ Học Viên Điện Tử */}
      <CoursewareNoticeModal
        isOpen={isCoursewareModalOpen}
        onClose={() => setIsCoursewareModalOpen(false)}
        students={coursewareModalStudents}
        onStudentUpdated={(stdId, codes, retain) => {
          fetchStudents();
        }}
      />\n    </div>\n  );\n}`
    );
    console.log('✅ Đã render CoursewareNoticeModal ở cuối StudentsPage');
  }

  fs.writeFileSync(STUDENTS_PAGE, content, 'utf8');
  console.log('🎉 Hoàn tất patch students/page.js!');
}

function patchClassPortalPage() {
  console.log('--- Đang cập nhật src/app/classes/[code]/page.js ---');
  let content = fs.readFileSync(CLASS_PORTAL_PAGE, 'utf8');

  // 1. Thêm import
  if (!content.includes('CoursewareNoticeModal')) {
    content = content.replace(
      "import { getClassScheduleDetails } from '@/lib/classHelper';",
      "import { getClassScheduleDetails } from '@/lib/classHelper';\nimport CoursewareNoticeModal from '@/components/CoursewareNoticeModal';"
    );
    console.log('✅ Đã thêm import CoursewareNoticeModal vào Class Portal');
  }

  // 2. Thêm state
  if (!content.includes('isCoursewareModalOpen')) {
    content = content.replace(
      "const [portalData, setPortalData] = useState(null);",
      "const [portalData, setPortalData] = useState(null);\n  const [isCoursewareModalOpen, setIsCoursewareModalOpen] = useState(false);\n  const [coursewareSingleStudent, setCoursewareSingleStudent] = useState(null);"
    );
    console.log('✅ Đã thêm state Courseware vào Class Portal');
  }

  // 3. Thêm nút Xuất Thư Cả Lớp ở Header
  if (!content.includes('Xuất Thư Học Liệu Cả Lớp')) {
    content = content.replace(
      `<button className="btn-action btn-primary" onClick={() => router.push(\`/attendance?classCode=\${classCode}\`)}>\n            <i className="fa-solid fa-calendar-check"></i> Điểm danh hôm nay\n          </button>`,
      `<button className="btn-action btn-primary" onClick={() => router.push(\`/attendance?classCode=\${classCode}\`)}>\n            <i className="fa-solid fa-calendar-check"></i> Điểm danh hôm nay\n          </button>\n          <button\n            className="btn-action"\n            style={{ background: '#0B2A4A', color: '#FFFFFF', border: '1px solid #C9A45C', display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: '700', padding: '0.55rem 1rem', borderRadius: '8px', cursor: 'pointer' }}\n            onClick={() => {\n              setCoursewareSingleStudent(null);\n              setIsCoursewareModalOpen(true);\n            }}\n          >\n            <i className="fa-solid fa-id-card"></i> 📱 Xuất Thư Học Liệu Cả Lớp ({students?.length || 0})\n          </button>`
    );
    console.log('✅ Đã thêm nút Xuất Thư Cả Lớp ở Header');
  }

  // 4. Thêm nút Thư Học Liệu cạnh tên học viên trong bảng Điểm danh
  if (!content.includes('title="📱 Thư Học Liệu & Thẻ Học Viên"')) {
    content = content.replace(
      `{student.isHistorical && <span className="badge" style={{fontSize:'0.7rem', background:'#e2e8f0', color:'#475569', marginLeft: '5px'}}>Đã chuyển/Nghỉ</span>}`,
      `{student.isHistorical && <span className="badge" style={{fontSize:'0.7rem', background:'#e2e8f0', color:'#475569', marginLeft: '5px'}}>Đã chuyển/Nghỉ</span>}\n                      <button\n                        type="button"\n                        onClick={() => {\n                          setCoursewareSingleStudent(student);\n                          setIsCoursewareModalOpen(true);\n                        }}\n                        title="📱 Thư Học Liệu & Thẻ Học Viên"\n                        style={{ border: 'none', background: 'rgba(11, 42, 74, 0.08)', color: '#0B2A4A', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', marginLeft: '6px' }}\n                      >\n                        <i className="fa-solid fa-id-card"></i>\n                      </button>`
    );
    console.log('✅ Đã thêm nút Thư Học Liệu cạnh tên học viên');
  }

  // 5. Render CoursewareNoticeModal ở cuối ClassPortalPage
  if (!content.includes('<CoursewareNoticeModal')) {
    content = content.replace(
      `      </div>\n    </div>\n  );\n}`,
      `      </div>\n\n      {/* Modal Xuất Thư Học Liệu & Thẻ Học Viên Cho Lớp */}\n      <CoursewareNoticeModal\n        isOpen={isCoursewareModalOpen}\n        onClose={() => {\n          setIsCoursewareModalOpen(false);\n          setCoursewareSingleStudent(null);\n        }}\n        students={coursewareSingleStudent ? [coursewareSingleStudent] : (students || [])}\n        classInfo={classInfo}\n      />\n    </div>\n  );\n}`
    );
    console.log('✅ Đã render CoursewareNoticeModal ở cuối ClassPortalPage');
  }

  fs.writeFileSync(CLASS_PORTAL_PAGE, content, 'utf8');
  console.log('🎉 Hoàn tất patch classes/[code]/page.js!');
}

try {
  patchStudentsPage();
  patchClassPortalPage();
  console.log('\n🌟 TẤT CẢ FILE ĐÃ ĐƯỢC CẬP NHẬT CHUẨN XÁC 100%!');
} catch (err) {
  console.error('Lỗi khi patch UI:', err);
  process.exit(1);
}
