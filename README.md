# Employee Management System (EMS)

A full-stack Employee Management System built with Next.js and Firebase. Focused on functionality over design — minimal UI, maximum feature coverage.

---

## Tech Stack

| Layer           | Technology                                        |
|-----------------|---------------------------------------------------|
| Framework       | Next.js 14 (App Router)                           |
| Styling         | TailwindCSS                                       |
| Auth            | Firebase Authentication + Next.js Middleware      |
| Database        | Cloud Firestore                                   |
| Server Logic    | Next.js API Routes + Firebase Admin SDK           |
| File Storage    | Firebase Storage                                  |
| Email           | API Route + Nodemailer / SendGrid                 |
| Hosting         | Vercel (or Firebase Hosting + Cloud Run)          |
| RBAC            | Firebase Custom Claims (verified server-side)     |

---

## Features Overview

- **Authentication & Role-Based Access Control** — Admin, HR, Manager, Employee roles
- **Employee Profiles** — Full CRUD with personal, contact, and job details
- **Department & Position Management** — Organize the org structure
- **Attendance Tracking** — Clock-in / clock-out with daily records
- **Leave Management** — Apply, approve/reject, balance tracking
- **Payroll Management** — Salary records, deductions, net pay calculation
- **Performance Reviews** — Goal setting, quarterly/annual reviews
- **Document Management** — Upload and manage employee documents
- **Announcements** — Company-wide and targeted broadcasts
- **Reports & Analytics** — Headcount, attendance, payroll, and leave summaries
- **Notifications** — In-app alerts for key events

---

## Project Structure

```
EMS/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Auth group — login, reset-password
│   ├── (dashboard)/             # Protected layout group
│   │   ├── layout.tsx           # Sidebar + Navbar shell
│   │   ├── page.tsx             # Dashboard home
│   │   ├── employees/
│   │   ├── departments/
│   │   ├── attendance/
│   │   ├── leave/
│   │   ├── payroll/
│   │   ├── performance/
│   │   ├── documents/
│   │   ├── announcements/
│   │   ├── notifications/
│   │   └── reports/
│   └── api/                     # Next.js API Routes (Firebase Admin SDK)
│       ├── auth/
│       ├── employees/
│       ├── departments/
│       ├── attendance/
│       ├── leave/
│       ├── payroll/
│       ├── performance/
│       ├── documents/
│       ├── announcements/
│       ├── notifications/
│       └── reports/
│
├── components/                  # Reusable UI components
├── context/                     # AuthContext (client-side Firebase Auth)
├── hooks/                       # useAuth, useFirestore, useStorage
├── lib/
│   ├── firebase/                # Client SDK init (config.ts)
│   └── firebase-admin/          # Admin SDK init (admin.ts)
├── services/                    # Firestore + Storage helpers
├── middleware.ts                 # Edge middleware — verify Firebase ID token
├── firestore.rules
├── storage.rules
├── firebase.json
├── .firebaserc
├── .env.local.example
├── plan.md
└── README.md
```

---

## Getting Started

### Prerequisites
- Node.js >= 18
- Firebase CLI — `npm install -g firebase-tools`
- A Firebase project (Blaze plan recommended)

### Installation

```bash
npm install
```

### Firebase Setup

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Enable **Firestore** (production mode)
4. Enable **Storage**
5. Generate a **service account key** for Admin SDK (keep secret, never commit)
6. Run `firebase login` then `firebase use --add`

### Environment Variables

Copy `.env.local.example` to `.env.local`:

```env
# Firebase client SDK (public — safe to expose)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin SDK (server-only — never expose to client)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Email
EMAIL_USER=your@email.com
EMAIL_PASS=yourpassword
```

### Run

```bash
# Next.js dev server
npm run dev

# Firebase emulators (Auth, Firestore, Storage) — run in parallel
firebase emulators:start --only auth,firestore,storage
```

---

## Roles & Permissions

| Feature               | Admin | HR  | Manager | Employee |
|-----------------------|-------|-----|---------|----------|
| Manage Employees      | ✅    | ✅  | 🔍      | ❌       |
| Manage Departments    | ✅    | ✅  | ❌      | ❌       |
| Approve Leave         | ✅    | ✅  | ✅      | ❌       |
| Run Payroll           | ✅    | ✅  | ❌      | ❌       |
| View Own Profile      | ✅    | ✅  | ✅      | ✅       |
| Submit Attendance     | ✅    | ✅  | ✅      | ✅       |
| Submit Leave Request  | ✅    | ✅  | ✅      | ✅       |
| View Reports          | ✅    | ✅  | 🔍      | ❌       |
| Post Announcements    | ✅    | ✅  | ❌      | ❌       |
| Upload Documents      | ✅    | ✅  | ✅      | ✅       |

> 🔍 = read-only / limited scope

---

## License

MIT
