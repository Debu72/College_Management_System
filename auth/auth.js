// Shared theme toggle logic
const sun = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
const moon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

const themeBtn = document.getElementById('themeBtn');
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) {
      themeIcon.innerHTML = isDark ? sun : moon;
    } else {
      themeBtn.innerHTML = `
        <svg id="themeIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${isDark ? sun : moon}
        </svg>
      `;
    }
  });
}

// Role tab switcher configuration and logic
const tabs = document.querySelectorAll('.role-tab');
const roleInput = document.getElementById('selectedRole');
const idLabel = document.getElementById('idLabel');
const userIdInput = document.getElementById('userId');
const codeLabel = document.getElementById('codeLabel');
const roleCodeInput = document.getElementById('roleCode');
const submitBtn = document.getElementById('submitBtn');

const loginRoleConfig = {
  student: { label: 'Student Roll No / Email', placeholder: 'e.g. 2024CS101', btn: 'Sign in as Student' },
  faculty: { label: 'Faculty ID / Email', placeholder: 'e.g. FAC-204', btn: 'Sign in as Faculty' },
  admin:   { label: 'Admin Email', placeholder: 'admin@college.edu', btn: 'Sign in as Admin' }
};

const signupRoleConfig = {
  student: { label: 'Student Roll No', placeholder: 'e.g. 2024CS101', btn: 'Sign up as Student' },
  faculty: { label: 'Faculty ID / Department', placeholder: 'e.g. FAC-204 (CSE)', btn: 'Sign up as Faculty' },
  admin:   { label: 'Admin Invite Code', placeholder: 'Enter institution secret code', btn: 'Sign up as Admin' }
};

if (tabs.length > 0) {
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const role = tab.dataset.role;
      if (roleInput) roleInput.value = role;

      // Handle login page fields if present
      if (idLabel && userIdInput && loginRoleConfig[role]) {
        idLabel.textContent = loginRoleConfig[role].label;
        userIdInput.placeholder = loginRoleConfig[role].placeholder;
        if (submitBtn) submitBtn.textContent = loginRoleConfig[role].btn;
      }

      // Handle signup page fields if present
      if (codeLabel && roleCodeInput && signupRoleConfig[role]) {
        codeLabel.textContent = signupRoleConfig[role].label;
        roleCodeInput.placeholder = signupRoleConfig[role].placeholder;
        if (submitBtn) submitBtn.textContent = signupRoleConfig[role].btn;
      }
    });
  });
}
