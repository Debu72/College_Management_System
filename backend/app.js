// Author: Debajyoti Ghosh                     Last Edited: 25-11-2026
 
// Dark mode
if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

const AppState = (() => {
  const SUPABASE_URL = 'https://tqhlwtqwntvfsbhrafgx.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_eA_1uj0oxuIMZgFcV29UOw_mokbS2xF';

  const supabase = (window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
    : null;

  const esc = str => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const getSession = () => ({
    role: (localStorage.getItem('user_role') || 'student').toLowerCase(),
    email: localStorage.getItem('user_email') || 'student@college.edu',
    name: localStorage.getItem('user_name') || 'Aarav Sharma',
    code: localStorage.getItem('user_role_code') || '2024CS101',
    id: localStorage.getItem('user_id') || '',
    dept: localStorage.getItem('user_dept') || 'Computer Science & Engineering',
    semester: localStorage.getItem('user_semester') || '4'
  });

  const clearSession = () => {
    ['user_email', 'user_id', 'user_role', 'user_name', 'user_role_code', 'user_dept', 'user_semester']
      .forEach(k => localStorage.removeItem(k));
  };

  // Sync active profile directly from Supabase profiles table
  const syncProfile = async () => {
    const s = getSession();
    if (!supabase) return s;
    try {
      let query = supabase.from('profiles').select('id, role, full_name, email, roll_or_faculty_id, department, semester');
      if (s.id) query = query.eq('id', s.id);
      else if (s.email) query = query.eq('email', s.email);

      const { data } = await query.single();
      if (data) {
        if (data.id) localStorage.setItem('user_id', data.id);
        if (data.role) localStorage.setItem('user_role', data.role);
        if (data.full_name) localStorage.setItem('user_name', data.full_name);
        if (data.email) localStorage.setItem('user_email', data.email);
        if (data.roll_or_faculty_id) localStorage.setItem('user_role_code', data.roll_or_faculty_id);
        if (data.department) localStorage.setItem('user_dept', data.department);
        if (data.semester !== null && data.semester !== undefined) {
          localStorage.setItem('user_semester', String(data.semester));
        }
        return getSession();
      }
    } catch (e) {
      console.warn('Sync profile notice:', e);
    }
    return s;
  };

  // Query helper for Supabase tables
  const fetchTable = async (table, select = '*', orderCol = null) => {
    if (!supabase) return { data: null, error: 'No client' };
    try {
      let q = supabase.from(table).select(select);
      if (orderCol) q = q.order(orderCol, { ascending: false });
      return await q;
    } catch (e) {
      console.warn(`Query ${table} notice:`, e);
      return { data: null, error: e };
    }
  };

  // Shared header navigation, mobile menu toggle, and footer date
  const initShell = (role, isProfilePage = false) => {
    const footerDate = document.querySelector('#footerDate');
    if (footerDate) {
      footerDate.textContent = new Date().toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    const menuBtn = document.querySelector('#menu');
    const navEl = document.querySelector('#nav');
    if (menuBtn && navEl) {
      menuBtn.addEventListener('click', () => {
        const open = navEl.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', open);
      });
    }

    const prefix = isProfilePage ? 'home.html' : '';
    const roleNavMap = {
      student: [
        { name: 'Notices', href: prefix + '#notices' },
        { name: 'Routine', href: prefix + '#timetable' },
        { name: 'Attendance', href: prefix + '#attendance' },
        { name: 'Assignments', href: prefix + '#assignments' },
        { name: 'Profile', href: 'profile.html' }
      ],
      faculty: [
        { name: 'Notices', href: prefix + '#notices' },
        { name: 'Routine', href: prefix + '#timetable' },
        { name: 'Attendance', href: prefix + '#attendance' },
        { name: 'Assignments', href: prefix + '#assignments' },
        { name: 'Profile', href: 'profile.html' }
      ],
      admin: [
        { name: 'Notices', href: prefix + '#notices' },
        { name: 'Institutional Directory', href: prefix + '#adminRecords' },
        { name: 'Profile', href: 'profile.html' }
      ]
    };

    if (navEl) {
      const links = roleNavMap[role] || roleNavMap.student;
      const sun = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
      const moon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
      const isDarkNow = document.body.classList.contains('dark');

      navEl.innerHTML = links.map(item => {
        const isActive = isProfilePage && item.name === 'Profile' ? ' class="active"' : '';
        return `<a href="${item.href}"${isActive}>${item.name}</a>`;
      }).join('') + `
        <button type="button" id="portalThemeBtn" class="theme-toggle" aria-label="Toggle dark mode" title="Toggle dark mode">
          <svg id="portalThemeIcon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${isDarkNow ? sun : moon}</svg>
        </button>
      `;

      const pThemeBtn = document.querySelector('#portalThemeBtn');
      const pThemeIcon = document.querySelector('#portalThemeIcon');
      if (pThemeBtn) {
        pThemeBtn.addEventListener('click', () => {
          const dark = document.body.classList.toggle('dark');
          localStorage.setItem('theme', dark ? 'dark' : 'light');
          if (pThemeIcon) pThemeIcon.innerHTML = dark ? sun : moon;
        });
      }

      navEl.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          navEl.classList.remove('open');
          if (menuBtn) menuBtn.setAttribute('aria-expanded', false);
        });
      });
    }
  };

  return {
    supabase,
    esc,
    getSession,
    clearSession,
    syncProfile,
    fetchTable,
    initShell
  };
})();

window.AppState = AppState;
