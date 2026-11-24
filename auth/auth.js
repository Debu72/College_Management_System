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
    admin: { label: 'Admin Email', placeholder: 'admin@college.edu', btn: 'Sign in as Admin' }
};

const signupRoleConfig = {
    student: { label: 'Student Roll No', placeholder: 'e.g. 2024CS101', btn: 'Sign up as Student' },
    faculty: { label: 'Faculty ID / Department', placeholder: 'e.g. FAC-204 (CSE)', btn: 'Sign up as Faculty' },
    admin: { label: 'Admin Invite Code', placeholder: 'Enter institution secret code', btn: 'Sign up as Admin' }
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


// Authentication

// Wrap in an IIFE to prevent variable collisions in global scope
(() => {
    // 1. Initialize Supabase
    const SUPABASE_URL = 'https://tqhlwtqwntvfsbhrafgx.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_eA_1uj0oxuIMZgFcV29UOw_mokbS2xF';

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("Supabase client library is not loaded. Please ensure the Supabase CDN script is included before auth.js.");
        return;
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    // Determine if we are on signup or login page
    const isSignUpPage = window.location.pathname.includes("signup.html");

    // 2. Email & Password Form Handler
    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            // Retrieve email / user ID and password supporting both login and signup form markup
            const emailInput = document.getElementById("email") || document.getElementById("userId") || document.getElementById("exampleInputEmail1");
            const passwordInput = document.getElementById("password") || document.getElementById("exampleInputPassword1");

            const email = emailInput ? emailInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";

            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }

            const submitBtn = form.querySelector("button[type='submit']");
            const originalBtnText = submitBtn ? submitBtn.innerText : "";
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = isSignUpPage ? "Verifying..." : "Signing in...";
            }

            try {
                if (isSignUpPage) {
                    // Sign Up logic
                    const { data, error } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password,
                    });

                    if (error) {
                        alert("Sign Up Error: " + error.message);
                    } else {
                        alert("Success! You can now login.");
                        window.location.href = "login.html";
                    }
                } else {
                    // Sign In logic
                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: email,
                        password: password,
                    });

                    if (error) {
                        alert("Login Error: " + error.message);
                    } else {
                        // Store user session / profile details
                        if (data.user && data.user.email) {
                            localStorage.setItem("user_email", data.user.email);
                            localStorage.setItem("user_id", data.user.id);
                            localStorage.setItem("findit_user_email", data.user.email);
                            const userPart = data.user.email.split('@')[0];
                            localStorage.setItem("findit_user_name", userPart.charAt(0).toUpperCase() + userPart.slice(1));
                        }
                        alert("Logged in successfully! User: " + data.user.email);
                        window.location.href = "../frontend/index.html";
                    }
                }
            } catch (err) {
                alert("An unexpected error occurred: " + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            }
        });
    }
})();