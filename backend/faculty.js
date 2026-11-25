// Author: Debajyoti Ghosh                     Last Edited: 25-11-2026

window.FacultyModule = (() => {
  const $ = sel => document.querySelector(sel);
  const dateOf = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  let state = {
    session: null,
    courses: [],
    profiles: [],
    attendance: [],
    assignments: [],
    submissions: [],
    onAssignmentsChange: null
  };

  let activeCourseId = null;
  let activeDate = new Date().toISOString().split('T')[0];
  let showAllStudents = false;
  let activeReviewAsgId = null;

  const esc = s => (window.AppState ? window.AppState.esc(s) : String(s ?? ''));

  // Attendance Summary & Interactive Roster
  const renderAttendanceTable = () => {
    const tbody = $('#attBody');
    if (!tbody) return;
    if (!state.courses.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No course records found.</td></tr>';
      return;
    }

    const dept = (state.session.dept || '').toLowerCase();
    const filtered = dept
      ? state.courses.filter(c => !c.department || c.department.toLowerCase().includes(dept) || dept.includes(c.department.toLowerCase()))
      : state.courses;
    const list = filtered.length ? filtered : state.courses;

    tbody.innerHTML = list.map(c => {
      const recs = state.attendance.filter(a => String(a.course_id) === String(c.id));
      const held = recs.length;
      const attended = recs.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const pct = held > 0 ? ((attended / held) * 100).toFixed(1) + '%' : '—';

      return `
        <tr>
          <td><b>${esc(c.code)}</b></td>
          <td>${esc(c.name)} <small style="color:var(--text-muted)">(Sem ${c.semester})</small></td>
          <td>${held}</td>
          <td>${attended}</td>
          <td><b style="color:var(--primary);">${pct}</b></td>
          <td><button type="button" class="btn btn-sm" onclick="FacultyModule.openAtt(${c.id})">Mark Attendance</button></td>
        </tr>
      `;
    }).join('');
  };

  const renderAttendancePanel = () => {
    const panel = $('#attCoursePanel');
    if (!panel) return;
    if (!activeCourseId) { panel.innerHTML = ''; return; }

    const course = state.courses.find(c => String(c.id) === String(activeCourseId));
    if (!course) return;

    const recs = state.attendance.filter(a => String(a.course_id) === String(course.id));
    const students = state.profiles.filter(p => p.role === 'student');
    const roster = showAllStudents
      ? students
      : students.filter(s => s.semester === course.semester || recs.some(r => r.student_id === s.id));

    const rows = roster.length
      ? roster.map(s => {
          const sRecs = recs.filter(r => r.student_id === s.id);
          const sHeld = sRecs.length;
          const sAtt = sRecs.filter(r => r.status === 'Present' || r.status === 'Late').length;
          const cur = (sRecs.find(r => r.date === activeDate) || {}).status || '';

          return `
            <tr>
              <td><b>${esc(s.roll_or_faculty_id || '—')}</b></td>
              <td>${esc(s.full_name)}</td>
              <td>${esc(s.email)}</td>
              <td>${sHeld}</td>
              <td>${sAtt}</td>
              <td>
                <div class="att-actions">
                  ${['Present', 'Absent', 'Late'].map(st => `
                    <button type="button" class="att-btn ${cur === st ? 'active-' + st : ''}"
                      onclick="FacultyModule.markAtt('${s.id}', ${course.id}, '${st}')">${st}</button>
                  `).join('')}
                </div>
              </td>
            </tr>
          `;
        }).join('')
      : `<tr><td colspan="6" style="text-align:center;padding:18px;color:var(--text-muted);">No students enrolled in Semester ${course.semester}.</td></tr>`;

    panel.innerHTML = `
      <div class="card-box">
        <div class="panel-header">
          <div>
            <h3 style="margin:0;">${esc(course.code)} — ${esc(course.name)} (Semester ${course.semester})</h3>
            <small style="color:var(--text-muted);">Select date and mark attendance for enrolled students</small>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <input type="date" id="attDatePicker" value="${activeDate}">
            <button type="button" class="btn btn-outline btn-sm" onclick="FacultyModule.toggleAllStudents()">
              ${showAllStudents ? 'Enrolled Only' : 'Show All Students'}
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="FacultyModule.closeAtt()">Close</button>
          </div>
        </div>
        <div class="scroll">
          <table>
            <thead><tr><th>Roll No</th><th>Student Name</th><th>Email</th><th>Held</th><th>Attended</th><th>Status (${activeDate})</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;

    const dp = $('#attDatePicker');
    if (dp) dp.addEventListener('change', e => { activeDate = e.target.value || activeDate; renderAttendancePanel(); });
  };

  const markAtt = async (studentId, courseId, status) => {
    const sb = window.AppState && window.AppState.supabase;
    if (!sb) return;

    const existing = state.attendance.find(a =>
      a.student_id === studentId && String(a.course_id) === String(courseId) && a.date === activeDate
    );

    if (existing) {
      const { data, error } = await sb.from('attendance').update({ status }).eq('id', existing.id).select();
      if (error) return alert('Could not update attendance: ' + error.message);
      if (data && data[0]) existing.status = data[0].status;
    } else {
      const { data, error } = await sb.from('attendance').insert([{ student_id: studentId, course_id: courseId, date: activeDate, status }]).select();
      if (error) return alert('Could not record attendance: ' + error.message);
      if (data && data[0]) state.attendance.push(data[0]);
    }

    renderAttendanceTable();
    renderAttendancePanel();
  };

  // Submissions Review & Grading
  const renderReviewPanel = () => {
    const panel = $('#subReviewPanel');
    if (!panel) return;
    if (!activeReviewAsgId) { panel.innerHTML = ''; return; }

    const asg = state.assignments.find(a => String(a.id) === String(activeReviewAsgId));
    if (!asg) return;

    const subs = state.submissions.filter(s => String(s.assignment_id) === String(asg.id));
    const sb = window.AppState && window.AppState.supabase;

    const rows = subs.length
      ? subs.map(s => {
          const stu = state.profiles.find(p => p.id === s.student_id);
          const email = stu ? stu.email : 'Unknown Email';
          const name = stu ? stu.full_name : 'Enrolled Student';
          const roll = stu && stu.roll_or_faculty_id ? ' &bull; ' + esc(stu.roll_or_faculty_id) : '';
          const file = s.file_url || 'Attached File';
          let fileCell = `<span>${esc(file)}</span>`;

          if (sb && s.file_url) {
            const { data } = sb.storage.from('submissions').getPublicUrl(s.file_url);
            if (data && data.publicUrl) fileCell = `<a href="${esc(data.publicUrl)}" target="_blank" rel="noopener">${esc(file)}</a>`;
          }

          return `
            <tr>
              <td><b>${esc(email)}</b><br><small style="color:var(--text-muted);">${esc(name)}${roll}</small></td>
              <td>${fileCell}</td>
              <td>${esc(s.remarks || '—')}</td>
              <td>${s.submitted_at ? dateOf(s.submitted_at) : '—'}</td>
              <td>
                <div style="display:flex;gap:6px;align-items:center;">
                  <input type="text" id="gradeInput_${s.id}" value="${esc(s.grade || '')}" placeholder="e.g. 18 / 20" style="width:95px;padding:4px 8px;font-size:13px;">
                  <button type="button" class="btn btn-sm" onclick="FacultyModule.saveGrade(${s.id})">Save</button>
                </div>
              </td>
            </tr>
          `;
        }).join('')
      : '<tr><td colspan="5" style="text-align:center;padding:18px;color:var(--text-muted);">No submissions recorded yet for this assignment.</td></tr>';

    panel.innerHTML = `
      <div class="card-box">
        <div class="panel-header">
          <div>
            <h3 style="margin:0;">Submissions: ${esc(asg.title)}</h3>
            <small style="color:var(--text-muted);">${subs.length} submission${subs.length === 1 ? '' : 's'} received</small>
          </div>
          <button type="button" class="btn btn-outline btn-sm" onclick="FacultyModule.closeReview()">Close</button>
        </div>
        <div class="scroll">
          <table>
            <thead><tr><th>Student Email &amp; Name</th><th>Submitted File</th><th>Remarks</th><th>Submitted On</th><th>Grade</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    `;
  };

  const saveGrade = async subId => {
    const sb = window.AppState && window.AppState.supabase;
    const input = $(`#gradeInput_${subId}`);
    if (!sb || !input) return;

    const grade = input.value.trim();
    const { data, error } = await sb.from('submissions').update({ grade: grade || null }).eq('id', subId).select();
    if (error) return alert('Failed to update grade: ' + error.message);

    const sub = state.submissions.find(s => s.id === subId);
    if (sub && data && data[0]) sub.grade = data[0].grade;
    if (state.onAssignmentsChange) state.onAssignmentsChange();
    renderReviewPanel();
  };

  // Create Assignment Form
  const renderCreateForm = () => {
    const box = $('#submitBox');
    if (!box) return;
    box.innerHTML = `
      <div class="card-box">
        <h3 style="margin-top:0;">Create New Assignment</h3>
        <form id="asgCreateForm">
          <div class="info-grid">
            <div>
              <label style="display:block;margin:6px 0 2px;font-weight:600;">Assignment Title</label>
              <input id="newAsgTitle" style="width:100%;" placeholder="e.g. Mechanics Problem Set 1" required>
            </div>
            <div>
              <label style="display:block;margin:6px 0 2px;font-weight:600;">Submission Deadline</label>
              <input type="date" id="newAsgDue" style="width:100%;" required>
            </div>
          </div>
          <label style="display:block;margin:8px 0 2px;font-weight:600;">Problem Statement &amp; Instructions</label>
          <textarea id="newAsgDesc" rows="2" style="width:100%;" placeholder="Enter problem statement..."></textarea>
          <button class="btn" type="submit" style="margin-top:12px;">Publish Assignment</button>
        </form>
      </div>
    `;

    const form = $('#asgCreateForm');
    if (form) {
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const sb = window.AppState && window.AppState.supabase;
        if (!sb) return;
        const { data, error } = await sb.from('assignments').insert([{
          title: $('#newAsgTitle').value.trim(),
          description: $('#newAsgDesc').value.trim(),
          due_date: new Date($('#newAsgDue').value).toISOString(),
          created_by: state.session.id || null
        }]).select();

        if (error) return alert('Could not publish assignment: ' + error.message);
        if (data && data[0]) state.assignments.unshift(data[0]);
        if (state.onAssignmentsChange) state.onAssignmentsChange();
        form.reset();
      });
    }
  };

  return {
    init: ctx => {
      state = { ...state, ...ctx };
      renderAttendanceTable();
      renderCreateForm();
    },
    openAtt: id => { activeCourseId = id; showAllStudents = false; renderAttendancePanel(); $('#attCoursePanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    closeAtt: () => { activeCourseId = null; renderAttendancePanel(); },
    toggleAllStudents: () => { showAllStudents = !showAllStudents; renderAttendancePanel(); },
    markAtt,
    openReview: id => { activeReviewAsgId = id; renderReviewPanel(); $('#subReviewPanel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    closeReview: () => { activeReviewAsgId = null; renderReviewPanel(); },
    saveGrade
  };
})();
