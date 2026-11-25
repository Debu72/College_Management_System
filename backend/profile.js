// Author: Debajyoti Ghosh                     Last Edited: 25-11-2026

document.addEventListener('DOMContentLoaded', async () => {
  const $ = selector => document.querySelector(selector);
  const App = window.AppState;
  const esc = App ? App.esc : (s => String(s ?? ''));

  if (App && typeof App.syncProfile === 'function') {
    await App.syncProfile();
  }

  let session = App ? App.getSession() : {
    role: 'student', email: '', name: '', code: '', id: '', dept: '', semester: '4'
  };

  if (App) App.initShell(session.role, true);

  const idLabels = { student: 'Roll No', faculty: 'Faculty ID', admin: 'Admin ID' };

  const renderProfileDetails = async () => {
    const initials = (session.name || 'U')
      .split(' ')
      .filter(Boolean)
      .map(n => n[0])
      .join('')
      .toUpperCase() || 'U';

    const idLabel = idLabels[session.role] || 'ID';
    if ($('#pAvatar')) $('#pAvatar').textContent = initials.slice(0, 2);
    if ($('#pName')) $('#pName').textContent = session.name || 'User';
    if ($('#pCode')) $('#pCode').textContent = `${idLabel}: ${session.code || '—'}`;
    if ($('#pDetailCodeLabel')) $('#pDetailCodeLabel').textContent = idLabel;
    if ($('#editCodeLabel')) $('#editCodeLabel').textContent = idLabel;

    const badgeSpan = $('#pBadge');
    if (badgeSpan) {
      badgeSpan.className = session.role === 'admin' ? 'badge badge-warn' : 'badge badge-ok';
      badgeSpan.textContent = session.role === 'student'
        ? 'Enrolled Student'
        : (session.role === 'faculty' ? 'Faculty Member' : 'System Administrator');
    }

    if ($('#pDetailName')) $('#pDetailName').textContent = session.name || '—';
    if ($('#pDetailEmail')) $('#pDetailEmail').textContent = session.email || '—';
    if ($('#pDetailRole')) $('#pDetailRole').textContent = session.role;
    if ($('#pDetailCode')) $('#pDetailCode').textContent = session.code || '—';
    if ($('#pDetailDept')) $('#pDetailDept').textContent = session.dept || '—';

    const semField = $('#pDetailSemField');
    if (session.role === 'student') {
      if (semField) semField.style.display = 'block';
      if ($('#pDetailSem')) $('#pDetailSem').textContent = session.semester ? `Semester ${session.semester}` : '—';
    } else if (semField) {
      semField.style.display = 'none';
    }

    const bannerTitle = $('#pBannerTitle');
    const summaryBlock = $('#pSummaryBlock');
    const roleMainCard = $('#pRoleMainCard');

    if (session.role === 'student') {
      if (bannerTitle) bannerTitle.textContent = 'Student Academic Profile';
      if (summaryBlock) {
        summaryBlock.innerHTML = `
          <p style="margin:4px 0;"><span style="color:var(--text-muted)">Department:</span> <b>${esc(session.dept || '—')}</b></p>
          <p style="margin:4px 0;"><span style="color:var(--text-muted)">Semester:</span> <b>Semester ${esc(session.semester || '—')}</b></p>
        `;
      }

      if (roleMainCard && App) {
        const studentSem = parseInt(session.semester, 10) || 4;
        const { data: courses } = await App.fetchTable('courses', '*');
        const enrolled = (courses || []).filter(c => c.semester === studentSem);
        const rowsHtml = enrolled.length > 0
          ? enrolled.map(c => `
              <tr>
                <td><b>${esc(c.code)}</b></td>
                <td>${esc(c.name)}</td>
                <td>${esc(c.department)}</td>
                <td>${esc(c.faculty_name || 'Department Faculty')}</td>
              </tr>
            `).join('')
          : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No courses listed for Semester ${studentSem}</td></tr>`;

        roleMainCard.innerHTML = `
          <div class="card-box">
            <div class="panel-header">
              <h3 style="margin:0;">Currently Enrolled Courses (Semester ${studentSem})</h3>
              <a href="home.html#assignments" class="btn btn-sm">Assignments &rarr;</a>
            </div>
            <div class="scroll">
              <table>
                <thead><tr><th>Course Code</th><th>Course Name</th><th>Department</th><th>Faculty Instructor</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>
        `;
      }
    } else if (session.role === 'faculty') {
      if (bannerTitle) bannerTitle.textContent = 'Faculty Staff Profile';
      if (summaryBlock) {
        summaryBlock.innerHTML = `
          <p style="margin:4px 0;"><span style="color:var(--text-muted)">Department:</span> <b>${esc(session.dept || '—')}</b></p>
          <p style="margin:4px 0;"><span style="color:var(--text-muted)">Faculty Code:</span> <b>${esc(session.code || '—')}</b></p>
        `;
      }

      if (roleMainCard && App) {
        const { data: courses } = await App.fetchTable('courses', '*');
        const deptLower = (session.dept || '').toLowerCase();
        const assigned = (courses || []).filter(c =>
          !deptLower || c.department.toLowerCase().includes(deptLower) || deptLower.includes(c.department.toLowerCase())
        );

        const rowsHtml = assigned.length > 0
          ? assigned.map(c => `
              <tr>
                <td><b>${esc(c.code)}</b></td>
                <td>${esc(c.name)}</td>
                <td>Semester ${esc(c.semester)}</td>
                <td>${esc(c.faculty_name || session.name)}</td>
              </tr>
            `).join('')
          : `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No courses found for department: ${esc(session.dept || '—')}</td></tr>`;

        roleMainCard.innerHTML = `
          <div class="card-box">
            <div class="panel-header">
              <h3 style="margin:0;">Department Teaching Courses</h3>
              <a href="home.html#attendance" class="btn btn-sm">Mark Attendance &rarr;</a>
            </div>
            <div class="scroll">
              <table>
                <thead><tr><th>Course Code</th><th>Subject Name</th><th>Semester</th><th>Faculty</th></tr></thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
          </div>
        `;
      }
    } else if (session.role === 'admin') {
      if (bannerTitle) bannerTitle.textContent = 'Administrator Profile';
      if (summaryBlock) {
        summaryBlock.innerHTML = `
          <p style="margin:4px 0;"><span style="color:var(--text-muted)">Division:</span> <b>${esc(session.dept || 'Administration')}</b></p>
          <p style="margin:4px 0;"><span style="color:var(--text-muted)">Admin ID:</span> <b>${esc(session.code || '—')}</b></p>
        `;
      }

      if (roleMainCard && App) {
        const [{ data: profs }, { data: courses }] = await Promise.all([
          App.fetchTable('profiles', 'role'),
          App.fetchTable('courses', 'id')
        ]);

        const totalStudents = (profs || []).filter(p => p.role === 'student').length;
        const totalFaculty = (profs || []).filter(p => p.role === 'faculty').length;
        const totalCourses = (courses || []).length;

        roleMainCard.innerHTML = `
          <div class="card-box">
            <div class="panel-header">
              <h3 style="margin:0;">Institutional Database Summary</h3>
              <a href="home.html#adminRecords" class="btn btn-sm">View Directory &rarr;</a>
            </div>
            <div class="info-grid" style="margin-bottom:14px;">
              <div class="info-field">
                <label>Enrolled Students in Database</label>
                <span style="font-size:18px;font-weight:700;color:var(--primary);">${totalStudents}</span>
              </div>
              <div class="info-field">
                <label>Faculty Staff in Database</label>
                <span style="font-size:18px;font-weight:700;color:var(--primary);">${totalFaculty}</span>
              </div>
              <div class="info-field">
                <label>Total Courses Offered</label>
                <span style="font-size:18px;font-weight:700;color:var(--primary);">${totalCourses}</span>
              </div>
            </div>
            <button type="button" class="btn" onclick="window.location.href='home.html#notices'">Go to Notice Board</button>
          </div>
        `;
      }
    }
  };

  await renderProfileDetails();

  // Edit Profile Toggle & Save Handler (all roles; email stays read-only)
  const viewGrid = $('#profileViewGrid');
  const editForm = $('#profileEditForm');
  const editBtn = $('#editProfileBtn');
  const cancelBtn = $('#cancelEditBtn');
  const msgEl = $('#profileMsg');

  const toggleEditMode = editing => {
    if (!viewGrid || !editForm) return;
    viewGrid.style.display = editing ? 'none' : 'grid';
    editForm.style.display = editing ? 'block' : 'none';
    if (editBtn) editBtn.style.display = editing ? 'none' : 'inline-flex';
    if (msgEl) { msgEl.textContent = ''; msgEl.className = 'fmsg'; }
  };

  if (editBtn) {
    editBtn.addEventListener('click', () => {
      if ($('#editName')) $('#editName').value = session.name || '';
      if ($('#editEmail')) $('#editEmail').value = session.email || '';
      if ($('#editRole')) $('#editRole').value = session.role || '';
      if ($('#editCode')) $('#editCode').value = session.code || '';
      if ($('#editDept')) $('#editDept').value = session.dept || '';
      const editSemField = $('#editSemField');
      if (session.role === 'student') {
        if (editSemField) editSemField.style.display = 'block';
        if ($('#editSem')) $('#editSem').value = String(session.semester || '4');
      } else if (editSemField) {
        editSemField.style.display = 'none';
      }
      toggleEditMode(true);
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => toggleEditMode(false));
  }

  if (editForm) {
    editForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!App?.supabase || !session.id) {
        if (msgEl) { msgEl.className = 'fmsg err'; msgEl.textContent = 'Please sign in again to edit your profile.'; }
        return;
      }

      const saveBtn = $('#saveProfileBtn');
      if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving...'; }

      const updates = {
        full_name: $('#editName').value.trim(),
        roll_or_faculty_id: $('#editCode').value.trim(),
        department: $('#editDept').value.trim()
      };
      if (session.role === 'student' && $('#editSem')) {
        updates.semester = parseInt($('#editSem').value, 10) || 4;
      }

      const { data, error } = await App.supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.id)
        .select()
        .single();

      if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Changes'; }

      if (error) {
        if (msgEl) { msgEl.className = 'fmsg err'; msgEl.textContent = 'Update failed: ' + error.message; }
        return;
      }

      if (data) {
        localStorage.setItem('user_name', data.full_name);
        localStorage.setItem('user_role_code', data.roll_or_faculty_id || '');
        localStorage.setItem('user_dept', data.department || '');
        if (data.semester !== null && data.semester !== undefined) {
          localStorage.setItem('user_semester', String(data.semester));
        }
        session = App.getSession();
      }

      await renderProfileDetails();
      toggleEditMode(false);
    });
  }

  // Working Log Out Button
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm('Are you sure you want to log out?')) {
        if (App) App.clearSession();
        alert('You have been logged out.');
        window.location.href = '../index.html';
      }
    };
  }
});
