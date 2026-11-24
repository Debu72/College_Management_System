document.addEventListener('DOMContentLoaded', async () => {
  const $ = selector => document.querySelector(selector);
  const isProfilePage = window.location.pathname.includes('profile.html');

  // Sync profile from Supabase profiles table on load to ensure up-to-date role/dept/semester
  if (window.AppState && typeof window.AppState.syncProfile === 'function') {
    await window.AppState.syncProfile();
  }

  const session = window.AppState ? window.AppState.getSession() : {
    role: 'student', email: '', name: '', code: '', id: '', dept: '', semester: '4'
  };

  const NOW = Date.now(), DAY = 864e5;
  const dateFmt = { day: 'numeric', month: 'short', year: 'numeric' };
  const dateOf = d => new Date(d).toLocaleDateString('en-IN', dateFmt);

  // Footer date display
  const footerDate = $('#footerDate');
  if (footerDate) {
    footerDate.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // Mobile navigation drawer toggle
  const menuBtn = $('#menu');
  const navEl = $('#nav');
  if (menuBtn && navEl) {
    menuBtn.addEventListener('click', () => {
      const open = navEl.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
  }

  // ---------- 1. Role-Based Navigation Routing ----------
  const navPrefix = isProfilePage ? 'home.html' : '';
  const roleNavMap = {
    student: [
      { name: 'Notices', href: navPrefix + '#notices' },
      { name: 'Routine', href: navPrefix + '#timetable' },
      { name: 'Assignments', href: navPrefix + '#assignments' },
      { name: 'Profile', href: 'profile.html' }
    ],
    faculty: [
      { name: 'Notices', href: navPrefix + '#notices' },
      { name: 'Attendance', href: navPrefix + '#attendance' },
      { name: 'Assignments', href: navPrefix + '#assignments' },
      { name: 'Profile', href: 'profile.html' }
    ],
    admin: [
      { name: 'Notices', href: navPrefix + '#notices' },
      { name: 'Student & Faculty Directory', href: navPrefix + '#adminRecords' },
      { name: 'Profile', href: 'profile.html' }
    ]
  };

  if (navEl) {
    const links = roleNavMap[session.role] || roleNavMap.student;
    navEl.innerHTML = links.map(item => {
      const isActive = isProfilePage && item.name === 'Profile' ? ' class="active"' : '';
      return `<a href="${item.href}"${isActive}>${item.name}</a>`;
    }).join('');

    navEl.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navEl.classList.remove('open');
        if (menuBtn) menuBtn.setAttribute('aria-expanded', false);
      });
    });
  }

  // Toggle main sections visibility based on active role
  const ttSec = $('#timetable');
  const attSec = $('#attendance');
  const asgSec = $('#assignments');
  const adminRecordsSec = $('#adminRecords');
  const adminNoticeAction = $('#adminNoticeAction');

  if (session.role === 'student') {
    if (attSec) attSec.style.display = 'none';
    if (adminRecordsSec) adminRecordsSec.style.display = 'none';
  } else if (session.role === 'faculty') {
    if (ttSec) ttSec.style.display = 'none';
    if (adminRecordsSec) adminRecordsSec.style.display = 'none';
    if (adminNoticeAction) {
      adminNoticeAction.innerHTML = '<button type="button" class="btn" onclick="addNoticePrompt()">+ Post Class Notice</button>';
    }
  } else if (session.role === 'admin') {
    if (ttSec) ttSec.style.display = 'none';
    if (attSec) attSec.style.display = 'none';
    if (asgSec) asgSec.style.display = 'none';
    if (adminNoticeAction) {
      adminNoticeAction.innerHTML = '<button type="button" class="btn" onclick="addNoticePrompt()">+ Post Official Circular</button>';
    }
  }

  // ---------- 2. Live Notice Board (Supabase notices table) ----------
  let noticesList = [];
  let currentCategory = 'All';

  const renderNotices = () => {
    const container = $('#nlist');
    if (!container) return;
    const query = ($('#nq') ? $('#nq').value.trim().toLowerCase() : '');
    const filtered = noticesList.filter(n => 
      (currentCategory === 'All' || n.category === currentCategory) &&
      (n.title + ' ' + (n.content || '')).toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      container.innerHTML = '<li style="text-align:center;padding:24px;color:var(--text-muted);">No announcements found matching criteria.</li>';
      return;
    }

    container.innerHTML = filtered.map(n => {
      const created = new Date(n.created_at || Date.now());
      const isNew = (NOW - created.getTime()) <= (3 * DAY);
      return `
        <li>
          <div class="meta">
            <span>${dateOf(created)}</span>
            <span class="tag">${n.category || 'General'}</span>
            ${isNew ? '<span class="new">New</span>' : ''}
          </div>
          <h3>${n.title}</h3>
          <p style="color:var(--text-main);font-size:14px;margin-top:2px;">${n.content || ''}</p>
        </li>
      `;
    }).join('');
  };

  const catsBox = $('#cats');
  if (catsBox) {
    catsBox.innerHTML = '';
    ['All', 'Exam', 'Academic', 'Event', 'Holiday', 'General'].forEach(catName => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = catName;
      if (catName === 'All') b.classList.add('on');
      b.addEventListener('click', () => {
        currentCategory = catName;
        catsBox.querySelectorAll('button').forEach(btn => btn.classList.toggle('on', btn.textContent === catName));
        renderNotices();
      });
      catsBox.appendChild(b);
    });
  }

  if ($('#nq')) $('#nq').addEventListener('input', renderNotices);

  window.addNoticePrompt = async () => {
    const title = prompt('Enter Notice Title:');
    if (!title) return;
    const category = prompt('Category (Exam, Academic, Event, Holiday, General):', 'Academic') || 'Academic';
    const content = prompt('Enter Notice Content / Description:');
    if (!content) return;

    if (window.AppState && window.AppState.supabase) {
      const { data, error } = await window.AppState.supabase.from('notices').insert([{
        title, content, category, created_by: session.id || null
      }]).select();

      if (error) {
        alert('Could not post notice: ' + error.message);
        return;
      }
      if (data && data[0]) {
        noticesList.unshift(data[0]);
      } else {
        noticesList.unshift({ title, content, category, created_at: new Date().toISOString() });
      }
      renderNotices();
      alert('Announcement published successfully to Notice Board!');
    }
  };

  const loadNotices = async () => {
    if (!window.AppState) return;
    const { data } = await window.AppState.fetchTable('notices', '*', 'created_at');
    if (data && Array.isArray(data)) {
      noticesList = data;
      renderNotices();
    }
  };

  // ---------- 3. Live Routine / Timetable (Supabase courses table) ----------
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const times = ['10:00 am', '10:50 am', '11:40 am', '12:30 pm', '02:00 pm', '03:30 pm'];
  const tsem = $('#tsem');
  let dbCourses = [];

  const renderTimetable = () => {
    const table = $('#ttable');
    if (!table || !tsem) return;
    const sem = +tsem.value;
    const subs = dbCourses.filter(c => c.semester === sem).map(c => c.name);

    if (subs.length === 0) {
      table.innerHTML = `<tbody><tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">No registered courses found for Semester ${sem}.</td></tr></tbody>`;
      return;
    }

    const today = new Date().getDay() - 1;
    let h = '<thead><tr><th>Day</th>' + times.map(t => `<th>${t}</th>`).join('') + '</tr></thead><tbody>';
    days.forEach((d, i) => {
      h += `<tr${i === today ? ' class="today"' : ''}><th scope="row">${d}</th>`;
      times.forEach((t, p) => {
        h += `<td>${subs[(i + p) % subs.length]}</td>`;
      });
      h += '</tr>';
    });
    table.innerHTML = h + '</tbody>';
  };

  if (tsem) {
    tsem.innerHTML = '';
    const activeSem = parseInt(session.semester, 10) || 4;
    for (let s = 1; s <= 6; s++) {
      tsem.insertAdjacentHTML('beforeend', `<option value="${s}" ${s === activeSem ? 'selected' : ''}>Semester ${s}</option>`);
    }
    tsem.addEventListener('change', renderTimetable);
  }

  const loadCourses = async () => {
    if (!window.AppState) return;
    const { data } = await window.AppState.fetchTable('courses', '*');
    if (data && Array.isArray(data)) {
      dbCourses = data;
      renderTimetable();
    }
  };

  // ---------- 4. Live Attendance Management (Supabase attendance & courses tables) ----------
  const attBody = $('#attBody');
  const loadAttendance = async () => {
    if (!attBody || !window.AppState) return;
    const { data: courses } = await window.AppState.fetchTable('courses', '*');
    const { data: attRecords } = await window.AppState.fetchTable('attendance', '*');

    if (!courses || courses.length === 0) {
      attBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-muted);">No course records found.</td></tr>';
      return;
    }

    // Filter courses for faculty by department or show all
    const relevantCourses = session.dept
      ? courses.filter(c => !c.department || c.department.toLowerCase().includes(session.dept.toLowerCase()) || session.dept.toLowerCase().includes(c.department.toLowerCase()))
      : courses;

    const listToRender = relevantCourses.length > 0 ? relevantCourses : courses;
    attBody.innerHTML = listToRender.map(c => {
      const courseRecords = (attRecords || []).filter(a => String(a.course_id) === String(c.id));
      const held = courseRecords.length;
      const attended = courseRecords.filter(a => a.status === 'Present' || a.status === 'Late').length;
      const pct = held > 0 ? ((attended / held) * 100).toFixed(1) : '—';

      return `
        <tr>
          <td><b>${c.code}</b></td>
          <td>${c.name}</td>
          <td>${held}</td>
          <td>${attended}</td>
          <td><b style="color:var(--primary);">${pct}${pct !== '—' ? '%' : ''}</b></td>
          <td><button type="button" class="btn" style="padding:4px 12px;font-size:12px;" onclick="logAttendancePrompt(${c.id}, '${c.code}')">Mark Attendance</button></td>
        </tr>
      `;
    }).join('');
  };

  window.logAttendancePrompt = async (courseId, courseCode) => {
    const status = prompt(`Mark Attendance for ${courseCode} (Present / Absent / Late):`, 'Present');
    if (!status) return;
    const norm = status.trim().toLowerCase();
    const finalStatus = norm === 'absent' ? 'Absent' : (norm === 'late' ? 'Late' : 'Present');

    if (window.AppState && window.AppState.supabase) {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await window.AppState.supabase.from('attendance').insert([{
        course_id: courseId,
        date: todayStr,
        status: finalStatus
      }]);

      if (error) {
        alert('Could not record attendance: ' + error.message);
      } else {
        alert(`Attendance recorded as "${finalStatus}" for ${courseCode}.`);
        loadAttendance();
      }
    }
  };

  // ---------- 5. Live Assignments & Submissions (Supabase assignments & submissions) ----------
  let dbAssignments = [];
  let dbSubmissions = [];
  let asgFilter = 'all';

  const renderAssignments = () => {
    const listEl = $('#asgList');
    if (!listEl) return;
    const q = ($('#asgSearch') ? $('#asgSearch').value.trim().toLowerCase() : '');

    const filtered = dbAssignments.filter(a => {
      const sub = dbSubmissions.find(s => String(s.assignment_id) === String(a.id));
      const isSubmitted = !!sub;
      const isEvaluated = !!(sub && sub.grade);
      const isPending = !isSubmitted;

      if (asgFilter === 'pending' && !isPending) return false;
      if (asgFilter === 'submitted' && !isSubmitted) return false;
      if (asgFilter === 'evaluated' && !isEvaluated) return false;

      return (a.title + ' ' + (a.description || '')).toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      listEl.innerHTML = '<p class="count" style="text-align:center;padding:20px;color:var(--text-muted);">No assignments found matching criteria.</p>';
      return;
    }

    listEl.innerHTML = filtered.map(a => {
      const sub = dbSubmissions.find(s => String(s.assignment_id) === String(a.id));
      const isSubmitted = !!sub;
      const grade = sub && sub.grade ? sub.grade : null;

      let badge = '<span class="badge badge-warn">Pending</span>';
      if (isSubmitted) {
        badge = grade
          ? `<span class="badge badge-ok">Grade: ${grade}</span>`
          : '<span class="badge badge-info">Submitted</span>';
      }

      const dueStr = a.due_date ? dateOf(a.due_date) : 'No deadline';

      const action = session.role === 'faculty'
        ? `<button type="button" class="btn btn-outline" style="padding:4px 12px;font-size:13px;" onclick="viewSubmissionsForAsg(${a.id}, '${a.title.replace(/'/g, "\\'")}')">Review Submissions</button>`
        : (!isSubmitted
            ? `<a href="#submitBox" class="btn" style="padding:4px 14px;font-size:13px;" onclick="selectAsgInForm(${a.id})">Submit Solution</a>`
            : `<span style="font-size:13px;color:var(--text-muted);">Submitted (${sub.file_url || 'File'})</span>`
          );

      return `
        <div class="card-box" style="margin-bottom:12px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
            <div>
              <span style="font-size:12px;font-weight:700;color:var(--primary);">Assignment #${a.id}</span>
              <h3 style="margin:4px 0 6px;">${a.title}</h3>
              <p style="margin:0 0 8px;font-size:14px;color:var(--text-main);">${a.description || ''}</p>
              <div style="font-size:12px;color:var(--text-muted);">
                <span>Deadline: <b>${dueStr}</b></span>
              </div>
            </div>
            <div>${badge} &nbsp; ${action}</div>
          </div>
        </div>
      `;
    }).join('');
  };

  window.selectAsgInForm = asgId => {
    const sel = $('#subAsgSelect');
    if (sel) sel.value = String(asgId);
  };

  window.viewSubmissionsForAsg = (asgId, asgTitle) => {
    const subs = dbSubmissions.filter(s => String(s.assignment_id) === String(asgId));
    if (subs.length === 0) {
      alert(`No submissions recorded yet for: ${asgTitle}`);
    } else {
      const details = subs.map((s, idx) => `${idx + 1}. Student: ${s.student_id || 'Enrolled Student'} | File: ${s.file_url || 'Attached'} | Grade: ${s.grade || 'Pending'}`).join('\n');
      alert(`Submissions for "${asgTitle}":\n\n${details}`);
    }
  };

  document.querySelectorAll('.asg-filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.asg-filter-btn').forEach(b => b.classList.remove('on'));
      this.classList.add('on');
      asgFilter = this.getAttribute('data-filter');
      renderAssignments();
    });
  });

  if ($('#asgSearch')) $('#asgSearch').addEventListener('input', renderAssignments);

  const populateSubmitBox = () => {
    const submitBox = $('#submitBox');
    if (!submitBox) return;

    if (session.role === 'faculty') {
      submitBox.innerHTML = `
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
            <label style="display:block;margin:8px 0 2px;font-weight:600;">Problem Statement & Instructions</label>
            <textarea id="newAsgDesc" rows="2" style="width:100%;" placeholder="Enter problem statement..."></textarea>
            <button class="btn" type="submit" style="margin-top:12px;">Publish Assignment</button>
          </form>
        </div>
      `;

      const cForm = $('#asgCreateForm');
      if (cForm) {
        cForm.addEventListener('submit', async e => {
          e.preventDefault();
          const title = $('#newAsgTitle').value.trim();
          const due = $('#newAsgDue').value;
          const desc = $('#newAsgDesc').value.trim();

          if (window.AppState && window.AppState.supabase) {
            const { data, error } = await window.AppState.supabase.from('assignments').insert([{
              title,
              description: desc,
              due_date: new Date(due).toISOString(),
              created_by: session.id || null
            }]).select();

            if (error) {
              alert('Could not publish assignment: ' + error.message);
              return;
            }
            if (data && data[0]) dbAssignments.unshift(data[0]);
            renderAssignments();
            populateSubmitBox();
            alert('Assignment published successfully!');
            cForm.reset();
          }
        });
      }
    } else {
      // Student Submission Box: Populates options strictly from live assignments in Supabase
      const optionsHtml = dbAssignments.map(a => `<option value="${a.id}">${a.title}</option>`).join('');

      submitBox.innerHTML = `
        <div class="card-box">
          <h3 style="margin-top:0;">Submit Assignment Solution</h3>
          <form id="asgUploadForm">
            <label for="subAsgSelect" style="display:block;margin:8px 0 4px;font-weight:600;">Select Assignment</label>
            <select id="subAsgSelect" style="width:100%;" required>
              ${optionsHtml || '<option value="">No active assignments found</option>'}
            </select>
            <label for="asgFile" style="display:block;margin:12px 0 4px;font-weight:600;">Attach File (PDF, Notebook, or ZIP)</label>
            <input type="file" id="asgFile" style="width:100%;" required>
            <label for="subRemarks" style="display:block;margin:10px 0 4px;font-weight:600;">Remarks / Notes (Optional)</label>
            <textarea id="subRemarks" rows="2" style="width:100%;" placeholder="Notes for instructor..."></textarea>
            <p id="asgUploadMsg" class="fmsg" role="status"></p>
            <button class="btn" type="submit" style="margin-top:8px;">Submit Solution</button>
          </form>
        </div>
      `;

      const upForm = $('#asgUploadForm');
      if (upForm) {
        upForm.addEventListener('submit', async e => {
          e.preventDefault();
          const asgId = $('#subAsgSelect').value;
          const file = $('#asgFile').files[0];
          const msg = $('#asgUploadMsg');
          if (!file || !asgId) {
            msg.className = 'fmsg err';
            msg.textContent = 'Please choose both an assignment and a file to submit.';
            return;
          }

          if (window.AppState && window.AppState.supabase) {
            const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
            try {
              await window.AppState.supabase.storage.from('submissions').upload(fileName, file);
            } catch (storageErr) {
              console.warn('Storage bucket note:', storageErr);
            }

            const { data, error } = await window.AppState.supabase.from('submissions').insert([{
              assignment_id: parseInt(asgId, 10),
              student_id: session.id || null,
              file_url: fileName,
              remarks: ($('#subRemarks') ? $('#subRemarks').value.trim() : '')
            }]).select();

            if (error) {
              msg.className = 'fmsg err';
              msg.textContent = 'Submission failed: ' + error.message;
              return;
            }

            if (data && data[0]) dbSubmissions.push(data[0]);
            msg.className = 'fmsg ok';
            msg.textContent = `Solution "${file.name}" submitted successfully!`;
            renderAssignments();
            upForm.reset();
          }
        });
      }
    }
  };

  const loadAssignments = async () => {
    if (!window.AppState) return;
    const { data: asgs } = await window.AppState.fetchTable('assignments', '*', 'id');
    const { data: subs } = await window.AppState.fetchTable('submissions', '*');

    if (asgs && Array.isArray(asgs)) dbAssignments = asgs;
    if (subs && Array.isArray(subs)) dbSubmissions = subs;

    renderAssignments();
    populateSubmitBox();
  };

  // ---------- 6. Live Institutional Directory (Supabase profiles table) ----------
  const recordsThead = $('#recordsThead');
  const recordsTbody = $('#recordsTbody');
  const btnShowStudents = $('#btnShowStudents');
  const btnShowFaculty = $('#btnShowFaculty');

  let dbProfiles = [];

  const renderDirectory = viewType => {
    if (!recordsThead || !recordsTbody) return;

    if (viewType === 'students') {
      const students = dbProfiles.filter(u => u.role === 'student');
      recordsThead.innerHTML = `
        <tr>
          <th>Roll No</th>
          <th>Student Name</th>
          <th>Department</th>
          <th>Semester</th>
          <th>College Email</th>
        </tr>
      `;
      if (students.length === 0) {
        recordsTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">No student accounts found in database.</td></tr>';
        return;
      }
      recordsTbody.innerHTML = students.map(s => `
        <tr>
          <td><b>${s.roll_or_faculty_id || '—'}</b></td>
          <td>${s.full_name}</td>
          <td>${s.department || '—'}</td>
          <td>${s.semester ? `Semester ${s.semester}` : '—'}</td>
          <td>${s.email}</td>
        </tr>
      `).join('');
    } else {
      const faculty = dbProfiles.filter(u => u.role === 'faculty');
      recordsThead.innerHTML = `
        <tr>
          <th>Faculty ID</th>
          <th>Faculty Name</th>
          <th>Department</th>
          <th>College Email</th>
        </tr>
      `;
      if (faculty.length === 0) {
        recordsTbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No faculty accounts found in database.</td></tr>';
        return;
      }
      recordsTbody.innerHTML = faculty.map(f => `
        <tr>
          <td><b>${f.roll_or_faculty_id || '—'}</b></td>
          <td>${f.full_name}</td>
          <td>${f.department || '—'}</td>
          <td>${f.email}</td>
        </tr>
      `).join('');
    }
  };

  if (btnShowStudents && btnShowFaculty) {
    btnShowStudents.addEventListener('click', () => {
      btnShowStudents.classList.add('on');
      btnShowFaculty.classList.remove('on');
      renderDirectory('students');
    });

    btnShowFaculty.addEventListener('click', () => {
      btnShowFaculty.classList.add('on');
      btnShowStudents.classList.remove('on');
      renderDirectory('faculty');
    });
  }

  const loadDirectory = async () => {
    if (session.role === 'admin' && window.AppState) {
      const { data } = await window.AppState.fetchTable('profiles', '*');
      if (data && Array.isArray(data)) {
        dbProfiles = data;
        renderDirectory('students');
      }
    }
  };

  // Launch live dashboard data fetches
  await Promise.all([
    loadNotices(),
    loadCourses(),
    loadAttendance(),
    loadAssignments(),
    loadDirectory()
  ]);
});
