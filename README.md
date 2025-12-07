# AI Resume Tailor & Job Tracker

Track your job applications, generate tailored resumes & cover letters with AI, and keep a versioned history of every change.

Live demo: https://ai-resume-tracker-six.vercel.app/

---

## Features

### Job Tracker
- Create job applications with:
  - Company, Job Title, Location
  - Job Link, Salary Range
  - Status (`SAVED`, `APPLIED`, `PHONE_SCREEN`, `INTERVIEW`, `OFFER`, `REJECTED`)
  - Full Job Description & Notes
- Inline status updates directly from the table.
- Status filters (All / by status) + small stats (total + interviewing).

### AI Resume Tailoring
- Pick a job from your list.
- Paste your base resume once.
- Generate a tailored resume for that specific job using OpenAI.
- Edit the AI output inline before saving/exporting.

### AI Cover Letter Generation
- Using the same base resume + job description:
  - Generate a tailored cover letter with OpenAI.
  - 3–5 short paragraphs, concrete + role-specific.
  - Fully editable in the UI.

### Version History per Job
- Save multiple **versions** per job (resume + optional cover letter):
  - Name them like `"Phone Screen"`, `"Final Resume"`, `"Referral Version"`, etc.
- Side-panel history for the selected job:
  - Click a version to load it into the editor.
  - Duplicate & tweak existing versions.
  - Delete versions you no longer need.
- Version data is stored locally in the browser (`localStorage`) so you can experiment freely.

### Export & Convenience Tools
- **Copy to clipboard** for quick pasting into ATS / docs.
- **Download resume** as:
  - `.txt`
  - `.md`
  - `.pdf` (generated via `jsPDF`)
- **Download cover letter** as:
  - `.txt`
  - `.md`
  - `.pdf`
- Clean filenames such as  
  `apple-data-scientist-tailored-resume.pdf`  
  `openai-full-stack-engineer-cover-letter.md`

---

## Tech Stack

- **Frontend:** Next.js (App Router) + React + TypeScript
- **Styling:** Tailwind CSS
- **Backend:** Next.js API routes
- **Database:** PostgreSQL/Neon
- **ORM:** Prisma
- **AI:** OpenAI API (Node SDK)
- **PDF Export:** `jspdf`
- **State & Storage:**
  - React hooks (`useState`, `useEffect`, `useMemo`)
  - `localStorage` for version history per job
