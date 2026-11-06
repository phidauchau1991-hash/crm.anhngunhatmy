const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'app', 'students', 'page.js');
let content = fs.readFileSync(file, 'utf8');

// 1. Chuẩn hóa CRLF về LF để replace chuẩn xác 100%
content = content.replace(/\r\n/g, '\n');

// 2. Thêm Checkbox cột tiêu đề <th>
const oldThead = `                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã HV</th>`;

const newThead = `                <table className="custom-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={displayedStudents.length > 0 && selectedStudentIds.length === displayedStudents.length}
                          onChange={() => toggleSelectAllDisplayed(displayedStudents)}
                          title="Chọn tất cả để xuất thẻ hàng loạt"
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </th>
                      <th>Mã HV</th>`;

if (!content.includes('Chọn tất cả để xuất thẻ hàng loạt')) {
  if (content.includes(oldThead)) {
    content = content.replace(oldThead, newThead);
    console.log('✅ Đã thêm Checkbox trong thead');
  } else {
    console.error('❌ Không tìm thấy oldThead!');
  }
}

// 3. Thêm Checkbox trong từng dòng <td>
const oldTbody = `{displayedStudents.map((student) => (
                      <tr key={student.id} className="table-row">
                        <td className="std-id">{student.id}</td>`;

const newTbody = `{displayedStudents.map((student) => (
                      <tr key={student.id} className="table-row">
                        <td style={{ textAlign: 'center' }}>
                          <input
                            type="checkbox"
                            checked={selectedStudentIds.includes(student.id)}
                            onChange={() => toggleSelectStudent(student.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                        </td>
                        <td className="std-id">{student.id}</td>`;

if (!content.includes('toggleSelectStudent(student.id)')) {
  if (content.includes(oldTbody)) {
    content = content.replace(oldTbody, newTbody);
    console.log('✅ Đã thêm Checkbox trong tbody');
  } else {
    console.error('❌ Không tìm thấy oldTbody!');
  }
}

// 4. Thêm Nút Thư Học Liệu trong action-buttons
const oldActions = `<div className="action-buttons">
                            <Link href={\`/students/\${student.id}\`}`;

const newActions = `<div className="action-buttons">
                            <button 
                              className="action-btn" 
                              style={{ color: '#0B2A4A', background: 'rgba(11, 42, 74, 0.08)' }} 
                              title="📱 Thư Học Liệu & Thẻ Học Viên" 
                              onClick={() => handleOpenSingleCourseware(student)}
                            >
                              <i className="fa-solid fa-id-card"></i>
                            </button>
                            <Link href={\`/students/\${student.id}\`}`;

if (!content.includes('📱 Thư Học Liệu & Thẻ Học Viên')) {
  if (content.includes(oldActions)) {
    content = content.replace(oldActions, newActions);
    console.log('✅ Đã thêm Nút Thư Học Liệu trong action-buttons');
  } else {
    console.error('❌ Không tìm thấy oldActions!');
  }
}

// 5. Thêm CoursewareNoticeModal ở cuối trang
const oldEnd = `      )}
    </div>
  );
}`;

const newEnd = `      )}

      {/* Modal Xuất Thư Học Liệu & Thẻ Học Viên Điện Tử */}
      <CoursewareNoticeModal
        isOpen={isCoursewareModalOpen}
        onClose={() => setIsCoursewareModalOpen(false)}
        students={coursewareModalStudents}
        onStudentUpdated={(stdId, codes, retain) => {
          fetchStudents();
        }}
      />
    </div>
  );
}`;

if (!content.includes('<CoursewareNoticeModal')) {
  if (content.includes(oldEnd)) {
    content = content.replace(oldEnd, newEnd);
    console.log('✅ Đã thêm CoursewareNoticeModal ở cuối trang students/page.js');
  } else {
    console.error('❌ Không tìm thấy oldEnd!');
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('🎉 Hoàn tất kiểm tra và patch students/page.js!');
