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
        }
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

// Authentication Engine
(() => {
    const SUPABASE_URL = 'https://tqhlwtqwntvfsbhrafgx.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_eA_1uj0oxuIMZgFcV29UOw_mokbS2xF';

    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        console.error("Supabase client library not loaded.");
        return;
    }

    const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    // vercel.json cleanUrls serves this page at /auth/signup (no .html)
    const isSignUpPage = /\/signup(\.html)?\/?$/.test(window.location.pathname);

    const form = document.querySelector("form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const emailInput = document.getElementById("email") || document.getElementById("userId");
            const passwordInput = document.getElementById("password");
            const fullNameInput = document.getElementById("fullName");
            const roleCodeInput = document.getElementById("roleCode");
            const roleInput = document.getElementById("selectedRole");

            const email = emailInput ? emailInput.value.trim() : "";
            const password = passwordInput ? passwordInput.value : "";
            const fullName = fullNameInput ? fullNameInput.value.trim() : "";
            const roleCode = roleCodeInput ? roleCodeInput.value.trim() : "";
            const role = roleInput ? roleInput.value : "student";

            if (!email || !password) {
                alert("Please enter both email and password.");
                return;
            }

            const currentSubmitBtn = form.querySelector("button[type='submit']");
            const originalBtnText = currentSubmitBtn ? currentSubmitBtn.innerText : "";
            if (currentSubmitBtn) {
                currentSubmitBtn.disabled = true;
                currentSubmitBtn.innerText = isSignUpPage ? "Creating account..." : "Signing in...";
            }

            try {
                if (isSignUpPage) {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            data: {
                                full_name: fullName,
                                role: role,
                                role_code: roleCode
                            }
                        }
                    });

                    if (error) {
                        alert("Sign Up Error: " + error.message);
                    } else {
                        if (data.user) {
                            await supabaseClient
                                .from("profiles")
                                .upsert({
                                    id: data.user.id,
                                    role: role,
                                    full_name: fullName,
                                    email: email,
                                    roll_or_faculty_id: roleCode
                                });
                        }

                        alert(`Success! Account created as ${role.toUpperCase()}. You can now sign in.`);
                        window.location.href = "login.html";
                    }
                } else {
                    // Sign In logic: Supports both Email and Roll No / Faculty ID lookup
                    let loginEmail = email;
                    if (!loginEmail.includes('@')) {
                        try {
                            const { data: matchedProfile } = await supabaseClient
                                .from("profiles")
                                .select("email")
                                .eq("roll_or_faculty_id", loginEmail)
                                .maybeSingle();

                            if (matchedProfile && matchedProfile.email) {
                                loginEmail = matchedProfile.email;
                            }
                        } catch (lookupErr) {
                            console.warn("ID lookup notice:", lookupErr);
                        }
                    }

                    const { data, error } = await supabaseClient.auth.signInWithPassword({
                        email: loginEmail,
                        password: password,
                    });

                    if (error) {
                        alert("Login Error: " + error.message);
                    } else {
                        const user = data.user;
                        let userRole = 'student';
                        let userName = user.email ? user.email.split('@')[0] : "User";
                        let userCode = '';

                        let userDept = '';
                        let userSemester = '';

                        // Retrieve the role and profile from the database
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
