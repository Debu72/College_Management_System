document.addEventListener('DOMContentLoaded', async () => {
  const $ = selector => document.querySelector(selector);

  // Sync profile from Supabase profiles table on load
  if (window.AppState && typeof window.AppState.syncProfile === 'function') {
    await window.AppState.syncProfile();
  }

  const session = window.AppState ? window.AppState.getSession() : {
    role: 'student', email: '', name: '', code: '', id: '', dept: '', semester: '4'
  };

  // 1. Mobile menu toggle
  const menuBtn = $('#menu');
  const navEl = $('#nav');
  if (menuBtn && navEl) {
    menuBtn.addEventListener('click', () => {
      const open = navEl.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
  }

  // 2. Role-Based Navigation Routing
  const roleNavMap = {
    student: [
      { name: 'Notices', href: 'home.html#notices' },
      { name: 'Routine', href: 'home.html#timetable' },
      { name: 'Assignments', href: 'home.html#assignments' },
      { name: 'Profile', href: 'profile.html' }
    ],
    faculty: [
      { name: 'Notices', href: 'home.html#notices' },
      { name: 'Attendance', href: 'home.html#attendance' },
      { name: 'Assignments', href: 'home.html#assignments' },
      { name: 'Profile', href: 'profile.html' }
    ],
    admin: [
      { name: 'Notices', href: 'home.html#notices' },
      { name: 'Student & Faculty Directory', href: 'home.html#adminRecords' },
      { name: 'Profile', href: 'profile.html' }
    ]
  };

  if (navEl) {
    const links = roleNavMap[session.role] || roleNavMap.student;
    navEl.innerHTML = links.map(item => {
      const isActive = item.name === 'Profile' ? ' class="active"' : '';
      return `<a href="${item.href}"${isActive}>${item.name}</a>`;
    }).join('');
  }

  // Footer date display
  const footerDate = $('#footerDate');
  if (footerDate) {
    footerDate.textContent = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  // 3. Populate Left Profile Card
  const initials = (session.name || 'User')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase() || 'U';

  const avatarEl = $('#pAvatar');
  if (avatarEl) avatarEl.textContent = initials.slice(0, 2);

  const nameEl = $('#pName');
  if (nameEl) nameEl.textContent = session.name;

  const rollEl = $('#pCode');
  if (rollEl) {
    const prefix = session.role === 'student' ? 'Roll No: ' : (session.role === 'faculty' ? 'Faculty ID: ' : 'Admin ID: ');
    rollEl.textContent = prefix + (session.code || '—');
  }

  const badgeSpan = $('#pBadge');
  if (badgeSpan) {
    badgeSpan.className = session.role === 'admin' ? 'badge badge-warn' : 'badge badge-ok';
    badgeSpan.textContent = session.role === 'student' ? 'Enrolled Student' : (session.role === 'faculty' ? 'Faculty Member' : 'System Administrator');
  }

  // 4. Populate Detailed Database Information Card (mapped to profiles table)
  const dName = $('#pDetailName'); if (dName) dName.textContent = session.name || '—';
  const dEmail = $('#pDetailEmail'); if (dEmail) dEmail.textContent = session.email || '—';
  const dRole = $('#pDetailRole'); if (dRole) dRole.textContent = session.role;
  const dCode = $('#pDetailCode'); if (dCode) dCode.textContent = session.code || '—';
  const dDept = $('#pDetailDept'); if (dDept) dDept.textContent = session.dept || '—';
  const dSemField = $('#pDetailSemField');
  const dSem = $('#pDetailSem');

  if (session.role === 'student') {
    if (dSemField) dSemField.style.display = 'block';
    if (dSem) dSem.textContent = session.semester ? `Semester ${session.semester}` : '—';
  } else {
    if (dSemField) dSemField.style.display = 'none';
  }

  // 5. Populate Role-Specific Summary and Data Cards
  const bannerTitle = $('#pBannerTitle');
  const summaryBlock = $('#pSummaryBlock');
  const roleMainCard = $('#pRoleMainCard');

  if (session.role === 'student') {
    if (bannerTitle) bannerTitle.textContent = 'Student Academic Profile';
    if (summaryBlock) {
      summaryBlock.innerHTML = `
        <p style="margin:4px 0;"><span style="color:var(--text-muted)">Department:</span> <b>${session.dept || '—'}</b></p>
        <p style="margin:4px 0;"><span style="color:var(--text-muted)">Semester:</span> <b>Semester ${session.semester || '—'}</b></p>
      `;
    }

    if (roleMainCard && window.AppState) {
      const studentSem = parseInt(session.semester, 10) || 4;
      const { data: courses } = await window.AppState.fetchTable('courses', '*');
      const enrolled = (courses || []).filter(c => c.semester === studentSem);

      const rowsHtml = enrolled.length > 0
        ? enrolled.map(c => `
            <tr>
              <td><b>${c.code}</b></td>
              <td>${c.name}</td>
              <td>${c.department}</td>
              <td>${c.faculty_name || 'Department Faculty'}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No courses listed for Semester ' + studentSem + '</td></tr>';

      roleMainCard.innerHTML = `
        <div class="card-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;">Currently Enrolled Courses (Semester ${studentSem})</h3>
            <a href="home.html#assignments" class="btn" style="padding:4px 14px;font-size:13px;">Assignments &rarr;</a>
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
        <p style="margin:4px 0;"><span style="color:var(--text-muted)">Department:</span> <b>${session.dept || '—'}</b></p>
        <p style="margin:4px 0;"><span style="color:var(--text-muted)">Faculty Code:</span> <b>${session.code || '—'}</b></p>
      `;
    }

    if (roleMainCard && window.AppState) {
      const { data: courses } = await window.AppState.fetchTable('courses', '*');
      const assigned = (courses || []).filter(c => {
        if (!session.dept) return true;
        return c.department.toLowerCase().includes(session.dept.toLowerCase()) ||
               session.dept.toLowerCase().includes(c.department.toLowerCase());
      });

      const rowsHtml = assigned.length > 0
        ? assigned.map(c => `
            <tr>
              <td><b>${c.code}</b></td>
              <td>${c.name}</td>
              <td>Semester ${c.semester}</td>
              <td>${c.faculty_name || session.name}</td>
            </tr>
          `).join('')
        : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">No courses found for department: ' + (session.dept || '—') + '</td></tr>';

      roleMainCard.innerHTML = `
        <div class="card-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;">Department Teaching Courses</h3>
            <a href="home.html#attendance" class="btn" style="padding:4px 14px;font-size:13px;">Mark Attendance &rarr;</a>
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
        <p style="margin:4px 0;"><span style="color:var(--text-muted)">Division:</span> <b>${session.dept || 'Administration'}</b></p>
        <p style="margin:4px 0;"><span style="color:var(--text-muted)">Admin ID:</span> <b>${session.code || '—'}</b></p>
      `;
    }

    if (roleMainCard && window.AppState) {
      const { data: profs } = await window.AppState.fetchTable('profiles', '*');
      const { data: courses } = await window.AppState.fetchTable('courses', '*');

      const totalStudents = (profs || []).filter(p => p.role === 'student').length;
      const totalFaculty = (profs || []).filter(p => p.role === 'faculty').length;
      const totalCourses = (courses || []).length;

      roleMainCard.innerHTML = `
        <div class="card-box">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
            <h3 style="margin:0;">Institutional Database Summary</h3>
            <a href="home.html#adminRecords" class="btn" style="padding:4px 14px;font-size:13px;">View Directory &rarr;</a>
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

  // 6. Working Log Out Button
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (confirm('Are you sure you want to log out?')) {
        if (window.AppState) window.AppState.clearSession();
        alert('You have been logged out.');
        window.location.href = '../index.html';
      }
    };
  }
});
