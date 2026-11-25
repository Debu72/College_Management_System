// Author: Debajyoti Ghosh                     Last Edited: 25-11-2026

// Theme toggle
const sun = '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';
const moon = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

const themeBtn = document.getElementById('themeBtn');
const themeIcon = document.getElementById('themeIcon');

if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark');
    if (themeIcon) themeIcon.innerHTML = sun;
}

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        if (themeIcon) themeIcon.innerHTML = isDark ? sun : moon;
    });
}

// Signup role tabs (active only on signup.html)
const tabs = document.querySelectorAll('.role-tab');
const roleInput = document.getElementById('selectedRole');
const codeLabel = document.getElementById('codeLabel');
const roleCodeInput = document.getElementById('roleCode');
const submitBtn = document.getElementById('submitBtn');

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
            if (codeLabel && roleCodeInput && signupRoleConfig[role]) {
                codeLabel.textContent = signupRoleConfig[role].label;
                roleCodeInput.placeholder = signupRoleConfig[role].placeholder;
                if (submitBtn) submitBtn.textContent = signupRoleConfig[role].btn;
            }
        });
    });
}

// Authentication & Password Recovery
(() => {
    const SUPABASE_URL = 'https://tqhlwtqwntvfsbhrafgx.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_eA_1uj0oxuIMZgFcV29UOw_mokbS2xF';

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("Supabase client library not loaded.");
        return;
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    const signupForm = document.getElementById("signupForm");
    const isSignUpPage = Boolean(signupForm) || window.location.pathname.includes("signup");

    const resolveEmail = async input => {
        if (!input || input.includes('@')) return input;
        try {
            const { data } = await supabaseClient
                .from("profiles")
                .select("email")
                .eq("roll_or_faculty_id", input)
                .maybeSingle();
            if (data && data.email) return data.email;
        } catch (err) {
            console.warn("ID lookup notice:", err);
        }
        return input;
    };

    // UI mode switcher on login page (Sign in / Forgot password / Recovery)
    const loginForm = document.getElementById("loginForm");
    const forgotForm = document.getElementById("forgotForm");
    const recoveryForm = document.getElementById("recoveryForm");
    const authHeading = document.getElementById("authHeading");
    const authSubtitle = document.getElementById("authSubtitle");
    const signupFooter = document.getElementById("signupFooterLink");

    const showAuthMode = mode => {
        if (!loginForm || !forgotForm || !recoveryForm) return;
        loginForm.style.display = mode === 'login' ? 'block' : 'none';
        forgotForm.style.display = mode === 'forgot' ? 'block' : 'none';
        recoveryForm.style.display = mode === 'recovery' ? 'block' : 'none';
        if (signupFooter) signupFooter.style.display = mode === 'login' ? 'block' : 'none';

        if (authHeading && authSubtitle) {
            if (mode === 'forgot') {
                authHeading.textContent = 'Reset password';
                authSubtitle.textContent = 'We will send a password reset link to your registered email';
            } else if (mode === 'recovery') {
                authHeading.textContent = 'Set new password';
                authSubtitle.textContent = 'Choose a new password for your account';
            } else {
                authHeading.textContent = 'Sign in';
                authSubtitle.textContent = 'Enter your college email or roll number to access the portal';
            }
        }
    };

    document.getElementById("forgotPassLink")?.addEventListener("click", e => {
        e.preventDefault();
        showAuthMode('forgot');
    });

    document.getElementById("backToLogin")?.addEventListener("click", e => {
        e.preventDefault();
        showAuthMode('login');
    });

    // Listen for Supabase PASSWORD_RECOVERY event when user clicks reset email link
    supabaseClient.auth.onAuthStateChange(event => {
        if (event === 'PASSWORD_RECOVERY') showAuthMode('recovery');
    });
    if (window.location.hash.includes('type=recovery')) showAuthMode('recovery');

    // Forgot Password submission
    if (forgotForm) {
        forgotForm.addEventListener("submit", async e => {
            e.preventDefault();
            const rawInput = document.getElementById("resetEmail").value.trim();
            const msg = document.getElementById("resetMsg");
            const btn = document.getElementById("resetBtn");
            btn.disabled = true;
            btn.innerText = "Sending...";
            msg.textContent = "";

            try {
                const email = await resolveEmail(rawInput);
                const redirectTo = window.location.origin + window.location.pathname;
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
                if (error) {
                    msg.style.color = "#cc1016";
                    msg.textContent = error.message;
                } else {
                    msg.style.color = "#057642";
                    msg.textContent = `Password reset link sent to ${email}. Check your inbox.`;
                }
            } catch (err) {
                msg.style.color = "#cc1016";
                msg.textContent = err.message;
            } finally {
                btn.disabled = false;
                btn.innerText = "Send Reset Link";
            }
        });
    }

    // Set New Password submission
    if (recoveryForm) {
        recoveryForm.addEventListener("submit", async e => {
            e.preventDefault();
            const newPass = document.getElementById("newPassword").value;
            const msg = document.getElementById("recoveryMsg");
            const btn = document.getElementById("recoveryBtn");
            btn.disabled = true;
            btn.innerText = "Updating...";

            try {
                const { error } = await supabaseClient.auth.updateUser({ password: newPass });
                if (error) {
                    msg.style.color = "#cc1016";
                    msg.textContent = error.message;
                } else {
                    alert("Password updated successfully! Please sign in with your new password.");
                    window.location.hash = "";
                    showAuthMode('login');
                    recoveryForm.reset();
                }
            } catch (err) {
                msg.style.color = "#cc1016";
                msg.textContent = err.message;
            } finally {
                btn.disabled = false;
                btn.innerText = "Update Password";
            }
        });
    }

    // Login / Signup Form submission
    const authForm = isSignUpPage ? signupForm : loginForm;
    if (authForm) {
        authForm.addEventListener("submit", async e => {
            e.preventDefault();

            const emailInput = document.getElementById("email") || document.getElementById("userId");
            const password = (document.getElementById("password") || {}).value || "";
            const email = emailInput ? emailInput.value.trim() : "";

            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }

            const currentSubmitBtn = authForm.querySelector("button[type='submit']");
            const originalBtnText = currentSubmitBtn ? currentSubmitBtn.innerText : "";
            if (currentSubmitBtn) {
                currentSubmitBtn.disabled = true;
                currentSubmitBtn.innerText = isSignUpPage ? "Creating account..." : "Signing in...";
            }

            try {
                if (isSignUpPage) {
                    const fullName = (document.getElementById("fullName") || {}).value?.trim() || "";
                    const roleCode = (document.getElementById("roleCode") || {}).value?.trim() || "";
                    const role = (document.getElementById("selectedRole") || {}).value || "student";

                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: { data: { full_name: fullName, role, role_code: roleCode } }
                    });

                    if (error) {
                        alert("Sign Up Error: " + error.message);
                    } else if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
                        alert("An account with this email already exists. Please sign in instead.");
                    } else {
                        if (data.user) {
                            const { error: profileError } = await supabaseClient.from("profiles").upsert({
                                id: data.user.id, role, full_name: fullName, email, roll_or_faculty_id: roleCode
                            });
                            if (profileError) {
                                console.warn("Profile creation notice:", profileError.message);
                            }
                        }
                        if (data.user && !data.session) {
                            alert(`Account created as ${role.toUpperCase()}! Please check ${email} to confirm your email before signing in.`);
                        } else {
                            alert(`Success! Account created as ${role.toUpperCase()}. You can now sign in.`);
                        }
                        window.location.href = window.location.pathname.endsWith('/signup/') ? "../login.html" : "login.html";
                    }
                } else {
                    const loginEmail = await resolveEmail(email);
                    const { data, error } = await supabaseClient.auth.signInWithPassword({ email: loginEmail, password });

                    if (error) {
                        alert("Login Error: " + error.message);
                    } else {
                        const user = data.user;
                        let userRole = 'student', userName = user.email ? user.email.split('@')[0] : "User";
                        let userCode = '', userDept = '', userSemester = '';

                        try {
                            const { data: profile } = await supabaseClient
                                .from("profiles")
                                .select("role, full_name, roll_or_faculty_id, department, semester")
                                .eq("id", user.id)
                                .single();

                            if (profile) {
                                userRole = profile.role || userRole;
                                userName = profile.full_name || userName;
                                userCode = profile.roll_or_faculty_id || '';
                                userDept = profile.department || '';
                                userSemester = profile.semester ? String(profile.semester) : '';
                            } else if (user.user_metadata) {
                                userRole = user.user_metadata.role || userRole;
                                userName = user.user_metadata.full_name || userName;
                                userCode = user.user_metadata.role_code || '';
                            }
                        } catch (pErr) {
                            console.warn("Profile fetch notice:", pErr);
                        }

                        localStorage.setItem("user_email", user.email);
                        localStorage.setItem("user_id", user.id);
                        localStorage.setItem("user_role", userRole);
                        localStorage.setItem("user_name", userName);
                        localStorage.setItem("user_role_code", userCode);
                        localStorage.setItem("user_dept", userDept);
                        localStorage.setItem("user_semester", userSemester);

                        alert(`Logged in successfully as ${userRole.toUpperCase()}!`);
                        const inAuthDir = window.location.pathname.includes('/auth/');
                        window.location.href = inAuthDir ? "../frontend/home.html" : "frontend/home.html";
                    }
                }
            } catch (err) {
                alert("An unexpected error occurred: " + err.message);
            } finally {
                if (currentSubmitBtn) {
                    currentSubmitBtn.disabled = false;
                    currentSubmitBtn.innerText = originalBtnText;
                }
            }
        });
    }
})();
