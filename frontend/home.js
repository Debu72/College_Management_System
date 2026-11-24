/**
 * CampusConnect — Dashboard UI Controller (home.js)
 * Coordinates Notices, Student Routine, Assignments, Admin Directory, and FacultyModule.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const $ = sel => document.querySelector(sel);
  const App = window.AppState;
  const esc = App ? App.esc : (s => String(s ?? ''));

  if (App && typeof App.syncProfile === 'function') await App.syncProfile();
  const session = App ? App.getSession() : { role: 'student', email: '', name: '', code: '', id: '', dept: '', semester: '4' };
  if (App) App.initShell(session.role, false);

  const NOW = Date.now(), DAY = 864e5;
  const dateOf = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // ---------- 1. Role-Based Section Visibility ----------
  const hide = sel => { const el = $(sel); if (el) el.style.display = 'none'; };
  if (session.role === 'student') {
    hide('#attendance');
    hide('#adminRecords');
  } else if (session.role === 'faculty') {
    hide('#timetable');
    hide('#adminRecords');
    if ($('#adminNoticeAction')) $('#adminNoticeAction').innerHTML = '<button type="button" class="btn" onclick="addNoticePrompt()">+ Post Class Notice</button>';
  } else if (session.role === 'admin') {
    hide('#timetable');
    hide('#attendance');
    hide('#assignments');
    if ($('#adminNoticeAction')) $('#adminNoticeAction').innerHTML = '<button type="button" class="btn" onclick="addNoticePrompt()">+ Post Official Circular</button>';
  }

  let noticesList = [], dbCourses = [], dbProfiles = [], dbAssignments = [], dbSubmissions = [];
  let currentCategory = 'All', asgFilter = 'all';

  // ---------- 2. Notice Board ----------
  const renderNotices = () => {
    const container = $('#nlist');
    if (!container) return;
    const q = ($('#nq') ? $('#nq').value.trim().toLowerCase() : '');
    const filtered = noticesList.filter(n =>
      (currentCategory === 'All' || n.category === currentCategory) &&
      (n.title + ' ' + (n.content || '')).toLowerCase().includes(q)
    );

    container.innerHTML = filtered.length
      ? filtered.map(n => {
          const created = new Date(n.created_at || Date.now());
          const isNew = (NOW - created.getTime()) <= (3 * DAY);
          return `
            <li>
              <div class="meta"><span>${dateOf(created)}</span><span class="tag">${esc(n.category || 'General')}</span>${isNew ? '<span class="new">New</span>' : ''}</div>
              <h3>${esc(n.title)}</h3>
              <p style="color:var(--text-main);font-size:14px;margin-top:2px;">${esc(n.content || '')}</p>
            </li>
          `;
        }).join('')
      : '<li style="text-align:center;padding:24px;color:var(--text-muted);">No announcements found matching criteria.</li>';
  };

  const catsBox = $('#cats');
  if (catsBox) {
    catsBox.innerHTML = ['All', 'Exam', 'Academic', 'Event', 'Holiday', 'General']
      .map(c => `<button type="button" class="${c === 'All' ? 'on' : ''}">${c}</button>`).join('');
    catsBox.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCategory = btn.textContent;
        catsBox.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
        renderNotices();
      });
    });
  }
  if ($('#nq')) $('#nq').addEventListener('input', renderNotices);

  window.addNoticePrompt = async () => {
    const title = prompt('Enter Notice Title:');
    if (!title) return;
    const category = prompt('Category (Exam, Academic, Event, Holiday, General):', 'Academic') || 'Academic';
    const content = prompt('Enter Notice Content / Description:');
    if (!content || !App?.supabase) return;

    const { data, error } = await App.supabase.from('notices').insert([{ title, content, category, created_by: session.id || null }]).select();
    if (error) return alert('Could not post notice: ' + error.message);
    if (data && data[0]) noticesList.unshift(data[0]);
    renderNotices();
  };

  // ---------- 3. Student Timetable ----------
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['10:00 am', '10:50 am', '11:40 am', '12:30 pm', '02:00 pm', '03:30 pm'];
  const tsem = $('#tsem');

  const renderTimetable = () => {
    const table = $('#ttable');
    if (!table || !tsem) return;
    const sem = +tsem.value;
    const subs = dbCourses.filter(c => c.semester === sem).map(c => c.name);
    if (!subs.length) {
      table.innerHTML = `<tbody><tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No registered courses found for Semester ${sem}.</td></tr></tbody>`;
      return;
    }
    const today = new Date().getDay() - 1;
    let html = '<thead><tr><th>Day</th>' + times.map(t => `<th>${t}</th>`).join('') + '</tr></thead><tbody>';
    days.forEach((d, i) => {
      html += `<tr${i === today ? ' class="today"' : ''}><th scope="row">${d}</th>` +
        times.map((_, p) => `<td>${esc(subs[(i + p) % subs.length])}</td>`).join('') + '</tr>';
    });
    table.innerHTML = html + '</tbody>';
  };

  if (tsem) {
    const activeSem = parseInt(session.semester, 10) || 4;
    tsem.innerHTML = [1, 2, 3, 4, 5, 6].map(s => `<option value="${s}" ${s === activeSem ? 'selected' : ''}>Semester ${s}</option>`).join('');
    tsem.addEventListener('change', renderTimetable);
  }

  // ---------- 4. Assignments (Shared List + Student Submit) ----------
  const renderAssignments = () => {
    const listEl = $('#asgList');
    if (!listEl) return;
    const q = ($('#asgSearch') ? $('#asgSearch').value.trim().toLowerCase() : '');

    const filtered = dbAssignments.filter(a => {
      const sub = session.role === 'student'
        ? dbSubmissions.find(s => String(s.assignment_id) === String(a.id) && s.student_id === session.id)
        : dbSubmissions.find(s => String(s.assignment_id) === String(a.id));

      if (asgFilter === 'pending' && sub) return false;
      if (asgFilter === 'submitted' && !sub) return false;
      if (asgFilter === 'evaluated' && !(sub && sub.grade)) return false;
      return (a.title + ' ' + (a.description || '')).toLowerCase().includes(q);
    });

    listEl.innerHTML = filtered.length
      ? filtered.map(a => {
          const mySub = session.role === 'student'
            ? dbSubmissions.find(s => String(s.assignment_id) === String(a.id) && s.student_id === session.id)
            : null;
          const subCount = dbSubmissions.filter(s => String(s.assignment_id) === String(a.id)).length;

          let badge = session.role === 'faculty'
            ? `<span class="badge badge-info">${subCount} Submission${subCount === 1 ? '' : 's'}</span>`
            : '<span class="badge badge-warn">Pending</span>';
          if (mySub) {
            badge = mySub.grade ? `<span class="badge badge-ok">Grade: ${esc(mySub.grade)}</span>` : '<span class="badge badge-info">Submitted</span>';
          }

          const action = session.role === 'faculty'
            ? `<button type="button" class="btn btn-outline btn-sm" onclick="FacultyModule.openReview(${a.id})">Review Submissions</button>`
            : (!mySub
                ? `<a href="#submitBox" class="btn btn-sm" onclick="selectAsgInForm(${a.id})">Submit Solution</a>`
                : `<span style="font-size:13px;color:var(--text-muted);">Submitted (${esc(mySub.file_url || 'File')})</span>`);

          return `
            <div class="card-box" style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
                <div>
                  <span style="font-size:12px;font-weight:700;color:var(--primary);">Assignment #${a.id}</span>
                  <h3 style="margin:4px 0 6px;">${esc(a.title)}</h3>
                  <p style="margin:0 0 8px;font-size:14px;">${esc(a.description || '')}</p>
                  <div style="font-size:12px;color:var(--text-muted);">Deadline: <b>${a.due_date ? dateOf(a.due_date) : 'No deadline'}</b></div>
                </div>
                <div>${badge} &nbsp; ${action}</div>
              </div>
            </div>
          `;
        }).join('')
      : '<p style="text-align:center;padding:20px;color:var(--text-muted);">No assignments found matching criteria.</p>';
  };

  window.selectAsgInForm = id => { const sel = $('#subAsgSelect'); if (sel) sel.value = String(id); };
  document.querySelectorAll('.asg-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.asg-filter-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      asgFilter = btn.getAttribute('data-filter');
      renderAssignments();
    });
  });
  if ($('#asgSearch')) $('#asgSearch').addEventListener('input', renderAssignments);

  const renderStudentSubmitBox = () => {
    const box = $('#submitBox');
    if (!box) return;
    const opts = dbAssignments.map(a => `<option value="${a.id}">${esc(a.title)}</option>`).join('');
    box.innerHTML = `
      <div class="card-box">
        <h3 style="margin-top:0;">Submit Assignment Solution</h3>
        <form id="asgUploadForm">
          <label for="subAsgSelect" style="display:block;margin:8px 0 4px;font-weight:600;">Select Assignment</label>
          <select id="subAsgSelect" style="width:100%;" required>${opts || '<option value="">No active assignments found</option>'}</select>
          <label for="asgFile" style="display:block;margin:12px 0 4px;font-weight:600;">Attach File (PDF, Notebook, or ZIP)</label>
          <input type="file" id="asgFile" style="width:100%;" required>
          <label for="subRemarks" style="display:block;margin:10px 0 4px;font-weight:600;">Remarks / Notes (Optional)</label>
          <textarea id="subRemarks" rows="2" style="width:100%;" placeholder="Notes for instructor..."></textarea>
          <p id="asgUploadMsg" class="fmsg" role="status"></p>
          <button class="btn" type="submit" style="margin-top:8px;">Submit Solution</button>
        </form>
      </div>
    `;

    $('#asgUploadForm')?.addEventListener('submit', async e => {
      e.preventDefault();
      const asgId = $('#subAsgSelect').value, file = $('#asgFile').files[0], msg = $('#asgUploadMsg');
      if (!file || !asgId) { msg.className = 'fmsg err'; msg.textContent = 'Please choose both an assignment and a file.'; return; }
      if (!App?.supabase) return;

      const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
      try { await App.supabase.storage.from('submissions').upload(fileName, file); } catch (err) { console.warn('Storage note:', err); }

      const { data, error } = await App.supabase.from('submissions').insert([{
        assignment_id: parseInt(asgId, 10), student_id: session.id || null, file_url: fileName, remarks: $('#subRemarks').value.trim()
      }]).select();

      if (error) { msg.className = 'fmsg err'; msg.textContent = 'Submission failed: ' + error.message; return; }
      if (data && data[0]) dbSubmissions.push(data[0]);
      msg.className = 'fmsg ok';
      msg.textContent = `Solution "${file.name}" submitted successfully!`;
      renderAssignments();
      e.target.reset();
    });
  };

  // ---------- 5. Admin Directory (Students, Faculty & Courses) ----------
  const renderDirectory = viewType => {
    const thead = $('#recordsThead'), tbody = $('#recordsTbody');
    if (!thead || !tbody) return;

    if (viewType === 'students') {
      const rows = dbProfiles.filter(u => u.role === 'student');
      thead.innerHTML = '<tr><th>Roll No</th><th>Student Name</th><th>Department</th><th>Semester</th><th>College Email</th></tr>';
      tbody.innerHTML = rows.length
        ? rows.map(s => `<tr><td><b>${esc(s.roll_or_faculty_id || '—')}</b></td><td>${esc(s.full_name)}</td><td>${esc(s.department || '—')}</td><td>${s.semester ? 'Semester ' + s.semester : '—'}</td><td>${esc(s.email)}</td></tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No student accounts found.</td></tr>';
    } else if (viewType === 'faculty') {
      const rows = dbProfiles.filter(u => u.role === 'faculty');
      thead.innerHTML = '<tr><th>Faculty ID</th><th>Faculty Name</th><th>Department</th><th>College Email</th></tr>';
      tbody.innerHTML = rows.length
        ? rows.map(f => `<tr><td><b>${esc(f.roll_or_faculty_id || '—')}</b></td><td>${esc(f.full_name)}</td><td>${esc(f.department || '—')}</td><td>${esc(f.email)}</td></tr>`).join('')
        : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No faculty accounts found.</td></tr>';
    } else if (viewType === 'courses') {
      thead.innerHTML = '<tr><th>Code</th><th>Course Name</th><th>Department</th><th>Semester</th><th>Faculty</th></tr>';
      tbody.innerHTML = dbCourses.length
        ? dbCourses.map(c => `<tr><td><b>${esc(c.code)}</b></td><td>${esc(c.name)}</td><td>${esc(c.department)}</td><td>Semester ${esc(c.semester)}</td><td>${esc(c.faculty_name || 'Department Faculty')}</td></tr>`).join('')
        : '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No courses found.</td></tr>';
    }
  };

  const dirTabs = [
    { btn: $('#btnShowStudents'), type: 'students' },
    { btn: $('#btnShowFaculty'), type: 'faculty' },
    { btn: $('#btnShowCourses'), type: 'courses' }
  ];
  dirTabs.forEach(t => t.btn?.addEventListener('click', () => {
    dirTabs.forEach(x => x.btn?.classList.remove('on'));
    t.btn.classList.add('on');
    renderDirectory(t.type);
  }));

  // ---------- 6. Parallel Data Bootstrap ----------
  if (App) {
    const [noticesRes, coursesRes, profilesRes, attRes, asgRes, subRes] = await Promise.all([
      App.fetchTable('notices', '*', 'created_at'),
      App.fetchTable('courses', '*'),
      (session.role === 'admin' || session.role === 'faculty') ? App.fetchTable('profiles', '*') : Promise.resolve({ data: [] }),
      session.role === 'faculty' ? App.fetchTable('attendance', '*') : Promise.resolve({ data: [] }),
      session.role !== 'admin' ? App.fetchTable('assignments', '*', 'id') : Promise.resolve({ data: [] }),
      session.role !== 'admin' ? App.fetchTable('submissions', '*') : Promise.resolve({ data: [] })
    ]);

    noticesList = noticesRes.data || [];
    dbCourses = coursesRes.data || [];
    dbProfiles = profilesRes.data || [];
    dbAssignments = asgRes.data || [];
    dbSubmissions = subRes.data || [];

    renderNotices();
    if (session.role === 'student') {
      renderTimetable();
      renderAssignments();
      renderStudentSubmitBox();
    } else if (session.role === 'faculty') {
      renderAssignments();
      window.FacultyModule?.init({
        session,
        courses: dbCourses,
        profiles: dbProfiles,
        attendance: attRes.data || [],
        assignments: dbAssignments,
        submissions: dbSubmissions,
        onAssignmentsChange: renderAssignments
      });
    } else if (session.role === 'admin') {
      renderDirectory('students');
    }
  }
});
