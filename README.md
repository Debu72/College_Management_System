# College Management System

A lightweight, role-based **College Management System**(named ABC College) web application built with vanilla HTML, CSS, and JavaScript, backed by **Supabase** (Authentication, PostgreSQL database, and Storage) and deployed on **Netlify**.

---

## Features

### Authentication & Global UI
* **Unified Sign-In (`index.html`, `auth/login.html`)**: Supports signing in with either **College Email** or **Roll No / Faculty ID / Admin ID**.
* **Role-Based Registration (`auth/signup.html`)**: Allows registering as a **Student**, **Faculty**, or **Admin**.
* **Forgot Password & Recovery**: Integrated with Supabase `resetPasswordForEmail()` and `updateUser()` for email-based password recovery.
* **Persistent Dark Mode**: Theme toggle available on the login, registration, dashboard, and profile pages, synced across all views via `localStorage`.
* **Responsive Design**: Mobile-friendly navigation drawer and responsive grids/tables across desktop, tablet, and mobile screens.

### Role-Based Capabilities

| Role | Capabilities |
| :--- | :--- |
| **Student** | • View and search **Notice Board** circulars with category filters (`Exam`, `Academic`, `Event`, `Holiday`, `General`).<br>• View semester-wise **Class Routine & Timetable** (read-only, synced with faculty edits).<br>• View **My Attendance Summary** (only their own `Held`, `Attended`, `%`, and recent lecture log).<br>• View **Assignments**, filter by status (`Pending`, `Submitted`, `Evaluated`), submit solutions, and view grades.<br>• View enrolled courses for their semester and **Edit Profile**. |
| **Faculty** | • Post new **Class Notices** directly to the Notice Board.<br>• View and **directly edit Class Routine** slots inline (synced to `public.timetable` in Supabase with course autocomplete).<br>• **Attendance Management**: View course attendance summaries and open an inline student roster panel to mark `Present`, `Absent`, or `Late` by date.<br>• **Assignments**: Publish new assignments, open an inline **Submissions Review** panel showing student emails, names, submitted files, and save grades.<br>• View department teaching courses and **Edit Profile**. |
| **Administrator** | • Post **Official Circulars** to the Notice Board.<br>• View the **College Institutional Directory** with live tabs for **Students**, **Faculty Members**, and **Courses**.<br>• View live **Institutional Database Summary** counts (Total Students, Faculty, Courses) and **Edit Profile**. |

---

## Tech Stack

* **Frontend**: HTML5, CSS3 (Custom Properties / Dark Theme), Vanilla JavaScript (ES6+)
* **Backend & Database**: [Supabase](https://supabase.com/) (Auth, PostgREST PostgreSQL API, Row-Level Security, Storage)
* **Hosting**: [Netlify](https://netlify.com/)

---

## Project Structure

```text
College_Management_System/
├── index.html               # Root landing & sign-in page
├── README.md                # Project documentation
├── auth/
│   ├── auth.css             # Styling for sign-in, sign-up, and password recovery
│   ├── auth.js              # Theme persistence, ID/email login, signup, and recovery logic
│   ├── login.html           # Standalone sign-in page
│   └── signup.html          # Role-tabbed account registration page
├── backend/
│   ├── app.js               # Supabase client, session sync, theme loader, and shared navbar shell
│   ├── faculty.js           # Faculty attendance roster, submission review/grading, assignment creation
│   └── profile.js           # Profile display, inline profile editing, and role-specific summaries
└── frontend/
    ├── home.css             # Main responsive & dark-mode stylesheet for dashboard and profile
    ├── home.html            # Unified role-based portal dashboard
    ├── home.js              # Dashboard controller (Notices, Routine, Student Attendance, Assignments, Admin Directory)
    └── profile.html         # User profile page
```

---

## Supabase Database Schema

The application connects to the following PostgreSQL tables in `public`:

* **`profiles`**: `id` (UUID, FK to `auth.users`), `role` (`student` | `faculty` | `admin`), `full_name`, `email`, `roll_or_faculty_id`, `department`, `semester`
* **`notices`**: `id`, `title`, `content`, `category`, `created_by`, `created_at`
* **`courses`**: `id`, `code`, `name`, `department`, `semester`, `faculty_id`, `faculty_name`
* **`timetable`**: `id`, `semester`, `day`, `period_index`, `subject`, `updated_by` *(unique on `semester, day, period_index`)*
* **`attendance`**: `id`, `student_id`, `course_id`, `date`, `status` (`Present` | `Absent` | `Late`)
* **`assignments`**: `id`, `course_id`, `title`, `description`, `due_date`, `created_by`
* **`submissions`**: `id`, `assignment_id`, `student_id`, `file_url`, `remarks`, `submitted_at`, `grade`

> **Note on File Uploads**: To store and download actual uploaded assignment files, create a public Storage bucket named **`submissions`** in your Supabase project with `SELECT` and `INSERT` policies for authenticated users.

---

## Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/Debu72/College_Management_System.git
   cd College_Management_System
   ```
2. **Run locally**
   Open with any static server (e.g., VS Code **Live Server**, `npx serve .`, or `python -m http.server`) and visit `http://localhost:8000` (or your server's port).
3. **Deploy on Netlify**
   * Import the repository into Netlify.
   * Keep the **Root Directory** as `./` (project root), **Framework Preset** as `Other`, and leave Build/Output commands blank.
   * Add your deployed domain under **Supabase Dashboard &rarr; Authentication &rarr; URL Configuration &rarr; Redirect URLs** for password recovery links.

   **Deployed website to view**
   https://collegemanagementsystem-two.netlify.app/

---

## Creating an Account

To explore the portal, click **Activate account** on the sign-in page (or open `auth/signup.html`), select your role (**Student**, **Faculty**, or **Admin**), and register with your email and ID. Once registered, sign in using your email or ID.

---

## Authors

* [**Debajyoti Ghosh**](https://github.com/Debu72)
* [**Bikram Panja**](https://github.com/panjabikram188-bot)
