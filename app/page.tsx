"use client";

import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";

type ApplicationStatus =
  | "SAVED"
  | "APPLIED"
  | "PHONE_SCREEN"
  | "INTERVIEW"
  | "OFFER"
  | "REJECTED";

type TailoredVersion = {
  id: string;
  label: string;
  resumeContent: string;
  coverLetterContent?: string;
  createdAt: string;
};

type JobApplication = {
  id: string;
  companyName: string;
  jobTitle: string;
  jobLink?: string | null;
  location?: string | null;
  salaryRange?: string | null;
  status: ApplicationStatus;
  jobDescription: string;
  notes?: string | null;
  createdAt: string;
};

const STATUS_OPTIONS: ApplicationStatus[] = [
  "SAVED",
  "APPLIED",
  "PHONE_SCREEN",
  "INTERVIEW",
  "OFFER",
  "REJECTED",
];

export default function Home() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [location, setLocation] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [status, setStatus] = useState<ApplicationStatus>("SAVED");
  const [jobDescription, setJobDescription] = useState("");
  const [notes, setNotes] = useState("");

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">(
    "ALL"
  );

  // AI resume tailoring state
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [baseResume, setBaseResume] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [tailoredCoverLetter, setTailoredCoverLetter] = useState("");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Saved tailored resumes per job (history)
  const [savedTailoredByJob, setSavedTailoredByJob] = useState<
    Record<string, TailoredVersion[]>
  >({});

  // Version selection / naming UI state
  const [versionLabel, setVersionLabel] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null
  );

  const [copyStatus, setCopyStatus] = useState<"" | "copied" | "error">("");

  // Fetch jobs on mount
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/jobs");
        if (!res.ok) {
          throw new Error("Failed to fetch job applications");
        }

        const data = await res.json();
        setJobs(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Load saved tailored resumes from localStorage on mount
  // Load saved tailored resumes from localStorage on mount (handle old formats)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("savedTailoredResumes");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      const anyObj = parsed as Record<string, any>;
      const firstVal = Object.values(anyObj)[0];

      // Case 1: newest format – map<string, TailoredVersion[]>
      if (
        Array.isArray(firstVal) &&
        firstVal[0] &&
        typeof firstVal[0] === "object" &&
        "resumeContent" in firstVal[0]
      ) {
        setSavedTailoredByJob(anyObj as Record<string, TailoredVersion[]>);
        return;
      }

      // Case 2: previous "content" format – map<string, { id, label, content, createdAt }[]>
      if (
        Array.isArray(firstVal) &&
        firstVal[0] &&
        typeof firstVal[0] === "object" &&
        "content" in firstVal[0]
      ) {
        const migrated: Record<string, TailoredVersion[]> = {};

        Object.entries(anyObj).forEach(([jobId, versions]) => {
          migrated[jobId] = (versions as any[]).map((v, idx) => ({
            id: v.id ?? `legacy-${jobId}-${idx}`,
            label: v.label ?? `Version ${idx + 1}`,
            resumeContent: v.content ?? "",
            coverLetterContent: v.coverLetterContent ?? "",
            createdAt: v.createdAt ?? new Date().toISOString(),
          }));
        });

        setSavedTailoredByJob(migrated);
        return;
      }

      // Case 3: very old format – map<string, string>
      const migrated: Record<string, TailoredVersion[]> = {};
      Object.entries(anyObj as Record<string, string>).forEach(
        ([jobId, content]) => {
          migrated[jobId] = [
            {
              id: `legacy-${jobId}`,
              label: "Imported version",
              resumeContent: content ?? "",
              coverLetterContent: "",
              createdAt: new Date().toISOString(),
            },
          ];
        }
      );
      setSavedTailoredByJob(migrated);
    } catch (err) {
      console.error("Failed to load savedTailoredResumes:", err);
    }
  }, []);

  // Whenever savedTailoredByJob changes, persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "savedTailoredResumes",
      JSON.stringify(savedTailoredByJob)
    );
  }, [savedTailoredByJob]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          companyName,
          jobTitle,
          jobLink: jobLink || null,
          location: location || null,
          salaryRange: salaryRange || null,
          status,
          jobDescription,
          notes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to create job application");
      }

      const createdJob: JobApplication = await res.json();

      setJobs((prev) => [createdJob, ...prev]);

      // Reset form
      setCompanyName("");
      setJobTitle("");
      setJobLink("");
      setLocation("");
      setSalaryRange("");
      setStatus("SAVED");
      setJobDescription("");
      setNotes("");
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---- New: status counts & filtered list ----
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of STATUS_OPTIONS) counts[s] = 0;
    for (const job of jobs) {
      counts[job.status] = (counts[job.status] ?? 0) + 1;
    }
    return counts;
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    if (statusFilter === "ALL") return jobs;
    return jobs.filter((job) => job.status === statusFilter);
  }, [jobs, statusFilter]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId]
  );

  // ---- Step 9 will plug into this: update status handler ----
  const handleStatusChange = async (
    jobId: string,
    newStatus: ApplicationStatus
  ) => {
    try {
      setError(null);
      // Optimistic update
      setJobs((prev) =>
        prev.map((job) =>
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }
    } catch (err) {
      console.error(err);
      setError("Could not update status. Please try again.");
      // (You could refetch here if you want strict consistency)
    }
  };

  const handleGenerateTailoredResume = async (e: React.FormEvent) => {
    e.preventDefault();
    setAiError(null);
    setCopyStatus("");

    if (!selectedJob) {
      setAiError("Please select a job to tailor your resume for.");
      return;
    }

    if (!baseResume.trim()) {
      setAiError("Please paste your base resume first.");
      return;
    }

    try {
      setIsGenerating(true);

      const res = await fetch("/api/ai/tailor-resume", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resume: baseResume,
          jobDescription: selectedJob.jobDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to generate tailored resume");
      }

      const output = (data.tailoredResume as string) ?? "";
      setTailoredResume(output);
      // draft only, not yet saved
      setSelectedVersionId(null);
    } catch (err: any) {
      console.error(err);
      setAiError(
        err?.message ?? "Something went wrong while generating your resume."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCoverLetter = async (e: React.MouseEvent) => {
    e.preventDefault();
    setAiError(null);

    if (!selectedJob) {
      setAiError("Please select a job first.");
      return;
    }

    if (!baseResume.trim()) {
      setAiError("Please paste your base resume first.");
      return;
    }

    try {
      setIsGeneratingCover(true);

      const res = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume: baseResume,
          jobDescription: selectedJob.jobDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error ?? "Failed to generate cover letter");
      }

      setTailoredCoverLetter(data.coverLetter ?? "");
      // This is draft; user can tweak, then Save Version to persist
    } catch (err: any) {
      console.error(err);
      setAiError(
        err?.message ??
          "Something went wrong while generating your cover letter."
      );
    } finally {
      setIsGeneratingCover(false);
    }
  };

  useEffect(() => {
    if (!selectedJobId) {
      setTailoredResume("");
      setTailoredCoverLetter("");
      setSelectedVersionId(null);
      setCopyStatus("");
      return;
    }

    const history = savedTailoredByJob[selectedJobId] ?? [];
    if (history.length > 0) {
      const latest = history[history.length - 1];
      setSelectedVersionId(latest.id);
      setTailoredResume(latest.resumeContent);
      setTailoredCoverLetter(latest.coverLetterContent ?? "");
    } else {
      setSelectedVersionId(null);
      setTailoredResume("");
      setTailoredCoverLetter("");
    }
    setCopyStatus("");
  }, [selectedJobId, savedTailoredByJob]);

  const handleCopyTailoredResume = async () => {
    if (!tailoredResume) return;
    try {
      await navigator.clipboard.writeText(tailoredResume);
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus(""), 2000);
    } catch (err) {
      console.error(err);
      setCopyStatus("error");
      setTimeout(() => setCopyStatus(""), 2000);
    }
  };

  const handleDownload = (format: "txt" | "md" | "pdf") => {
    if (!tailoredResume) return;

    const baseName =
      (selectedJob
        ? `${selectedJob.companyName}-${selectedJob.jobTitle}`
        : "tailored-resume"
      )
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "") || "tailored-resume";

    const filename = `${baseName}.${format}`;

    if (format === "pdf") {
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const maxWidth = pageWidth - margin * 2;

      const lines = doc.splitTextToSize(tailoredResume, maxWidth);
      doc.text(lines, margin, 60);
      doc.save(filename);
      return;
    }

    const mime =
      format === "txt"
        ? "text/plain;charset=utf-8"
        : "text/markdown;charset=utf-8";

    const blob = new Blob([tailoredResume], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCoverLetter = (format: "txt" | "md" | "pdf") => {
    if (!tailoredCoverLetter) return;

    const baseName =
      (selectedJob
        ? `${selectedJob.companyName}-${selectedJob.jobTitle}-cover-letter`
        : "tailored-cover-letter"
      )
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "") || "tailored-cover-letter";

    const filename = `${baseName}.${format}`;

    if (format === "pdf") {
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
      });

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(11);

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const maxWidth = pageWidth - margin * 2;

      const lines = doc.splitTextToSize(tailoredCoverLetter, maxWidth);
      doc.text(lines, margin, 60);
      doc.save(filename);
      return;
    }

    const mime =
      format === "txt"
        ? "text/plain;charset=utf-8"
        : "text/markdown;charset=utf-8";

    const blob = new Blob([tailoredCoverLetter], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSaveVersion = () => {
    if (!selectedJob) {
      setAiError("Select a job before saving a version.");
      return;
    }
    if (!tailoredResume.trim() && !tailoredCoverLetter.trim()) {
      setAiError("There is nothing to save yet (resume or cover letter).");
      return;
    }

    const history = savedTailoredByJob[selectedJob.id] ?? [];

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const label = versionLabel.trim() || `Version ${history.length + 1}`;

    const newVersion: TailoredVersion = {
      id,
      label,
      resumeContent: tailoredResume,
      coverLetterContent: tailoredCoverLetter,
      createdAt: new Date().toISOString(),
    };

    setSavedTailoredByJob((prev) => ({
      ...prev,
      [selectedJob.id]: [...history, newVersion],
    }));
    setSelectedVersionId(id);
    setVersionLabel("");
    setCopyStatus("");
  };

  const handleSelectVersion = (jobId: string, versionId: string) => {
    const history = savedTailoredByJob[jobId] ?? [];
    const version = history.find((v) => v.id === versionId);
    if (!version) return;
    setSelectedJobId(jobId);
    setSelectedVersionId(versionId);
    setTailoredResume(version.resumeContent);
    setTailoredCoverLetter(version.coverLetterContent ?? "");
    setCopyStatus("");
  };

  const handleDeleteVersion = (jobId: string, versionId: string) => {
    setSavedTailoredByJob((prev) => {
      const history = prev[jobId] ?? [];
      const nextHistory = history.filter((v) => v.id !== versionId);

      const updated: Record<string, TailoredVersion[]> = {
        ...prev,
        [jobId]: nextHistory,
      };

      // Clean up selection if we deleted the active one
      if (jobId === selectedJobId && versionId === selectedVersionId) {
        if (nextHistory.length > 0) {
          const latest = nextHistory[nextHistory.length - 1];
          setSelectedVersionId(latest.id);
          setTailoredResume(latest.resumeContent);
          setTailoredCoverLetter(latest.coverLetterContent ?? "");
        } else {
          setSelectedVersionId(null);
          setTailoredResume("");
          setTailoredCoverLetter("");
        }
      }

      return updated;
    });
  };

  const handleDuplicateVersion = (jobId: string, versionId: string) => {
    const history = savedTailoredByJob[jobId] ?? [];
    const original = history.find((v) => v.id === versionId);
    if (!original) return;

    const newId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const duplicated: TailoredVersion = {
      id: newId,
      label: original.label + " (copy)",
      resumeContent: original.resumeContent,
      coverLetterContent: original.coverLetterContent,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = [...history, duplicated];

    setSavedTailoredByJob((prev) => ({
      ...prev,
      [jobId]: nextHistory,
    }));
    setSelectedJobId(jobId);
    setSelectedVersionId(newId);
    setTailoredResume(duplicated.resumeContent);
    setTailoredCoverLetter(duplicated.coverLetterContent ?? "");
    setCopyStatus("");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              AI Resume Tailor &amp; Job Tracker
            </h1>
            <p className="text-sm text-slate-400">
              Track your applications and generate tailored resumes &amp; cover
              letters (AI features coming next).
            </p>
          </div>

          {/* Stats + filter */}
          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex gap-4 text-sm text-slate-300">
              <div>
                <span className="block text-xs uppercase text-slate-500">
                  Total
                </span>
                <span className="text-lg font-medium">{jobs.length}</span>
              </div>
              <div>
                <span className="block text-xs uppercase text-slate-500">
                  Interviewing
                </span>
                <span className="text-lg font-medium">
                  {statusCounts.INTERVIEW +
                    statusCounts.PHONE_SCREEN +
                    statusCounts.OFFER}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-full px-3 py-1 ${
                  statusFilter === "ALL"
                    ? "bg-cyan-500 text-slate-950"
                    : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
              >
                All ({jobs.length})
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full px-3 py-1 ${
                    statusFilter === s
                      ? "bg-cyan-500 text-slate-950"
                      : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                  }`}
                >
                  {s.replace("_", " ")} ({statusCounts[s] ?? 0})
                </button>
              ))}
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* New job form */}
        <section className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold">New Job Application</h2>

          <form
            onSubmit={handleCreateJob}
            className="grid gap-4 md:grid-cols-2"
          >
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Company Name *</label>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Job Title *</label>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Job Link</label>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={jobLink}
                onChange={(e) => setJobLink(e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Location</label>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Remote, NYC, etc."
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Salary Range</label>
              <input
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={salaryRange}
                onChange={(e) => setSalaryRange(e.target.value)}
                placeholder="$120k – $150k"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">Status</label>
              <select
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={status}
                onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm text-slate-300">
                Job Description *
              </label>
              <textarea
                className="h-28 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                required
                placeholder="Paste the job description here..."
              />
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-sm text-slate-300">Notes</label>
              <textarea
                className="h-20 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Recruiter name, interview dates, reminders..."
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving..." : "Add Job"}
              </button>
            </div>
          </form>
        </section>

        {/* Job list / table */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Applications</h2>
          </div>

          {isLoading ? (
            <p className="text-sm text-slate-400">Loading applications...</p>
          ) : filteredJobs.length === 0 ? (
            <p className="text-sm text-slate-400">
              No applications for this filter. Try adding one or switching the
              filter above.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase text-slate-400">
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="hidden px-3 py-2 md:table-cell">Location</th>
                    <th className="hidden px-3 py-2 md:table-cell">Salary</th>
                    <th className="hidden px-3 py-2 md:table-cell">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr
                      key={job.id}
                      className="border-b border-slate-800/60 last:border-none hover:bg-slate-900/80"
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-100">
                            {job.companyName}
                          </span>
                          {job.jobLink && (
                            <a
                              href={job.jobLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-cyan-400 hover:underline"
                            >
                              Job posting
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">{job.jobTitle}</td>
                      <td className="px-3 py-2">
                        <select
                          value={job.status}
                          onChange={(e) =>
                            handleStatusChange(
                              job.id,
                              e.target.value as ApplicationStatus
                            )
                          }
                          className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-100 outline-none hover:bg-slate-700"
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s.replace("_", " ")}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        {job.location || "-"}
                      </td>
                      <td className="hidden px-3 py-2 md:table-cell">
                        {job.salaryRange || "-"}
                      </td>
                      <td className="hidden px-3 py-2 text-xs text-slate-400 md:table-cell">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* AI Resume Tailor */}
        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow-lg">
          <h2 className="mb-2 text-lg font-semibold">Tailor Resume with AI</h2>
          <p className="mb-4 text-sm text-slate-400">
            Choose a job application, paste your base resume, and let AI tailor
            it to that specific role.
          </p>

          {aiError && (
            <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
              {aiError}
            </div>
          )}

          <form onSubmit={handleGenerateTailoredResume} className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">
                Target Job Application
              </label>
              <select
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
              >
                <option value="">Select a job…</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.companyName} — {job.jobTitle}
                  </option>
                ))}
              </select>
              {selectedJob && (
                <p className="text-xs text-slate-500">
                  Using job description for{" "}
                  <span className="font-medium">
                    {selectedJob.companyName} — {selectedJob.jobTitle}
                  </span>
                  .
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-300">
                Your Base Resume (paste text)
              </label>
              <textarea
                className="h-40 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                value={baseResume}
                onChange={(e) => setBaseResume(e.target.value)}
                placeholder="Paste your current resume text here..."
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? "Generating…" : "Generate Tailored Resume"}
              </button>

              <button
                type="button"
                onClick={handleGenerateCoverLetter}
                disabled={isGeneratingCover}
                className="inline-flex items-center rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingCover
                  ? "Generating Cover Letter…"
                  : "Generate Cover Letter"}
              </button>
            </div>
          </form>

          {/* Save version controls */}
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <label className="mb-1 block text-sm text-slate-300">
                Save this tailored resume as a version
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  placeholder='e.g. "Phone Screen", "Final Resume", "Internal Referral"'
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleSaveVersion}
                  disabled={!tailoredResume}
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save Version
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Versions are saved per job locally in your browser.
              </p>
            </div>
          </div>

          {(tailoredResume ||
            (selectedJobId &&
              (savedTailoredByJob[selectedJobId] ?? []).length > 0)) && (
            <div className="mt-6 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {/* Output + actions */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-100">
                    Tailored Resume (AI Output)
                  </h3>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={handleCopyTailoredResume}
                      disabled={!tailoredResume}
                      className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload("txt")}
                      disabled={!tailoredResume}
                      className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Download .txt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload("md")}
                      disabled={!tailoredResume}
                      className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Download .md
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload("pdf")}
                      disabled={!tailoredResume}
                      className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Download PDF
                    </button>

                    {copyStatus === "copied" && (
                      <span className="text-[11px] text-emerald-300">
                        Copied!
                      </span>
                    )}
                    {copyStatus === "error" && (
                      <span className="text-[11px] text-red-300">
                        Failed to copy
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Tailored Resume (editable)
                    </label>
                    <textarea
                      className="h-40 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={tailoredResume}
                      onChange={(e) => setTailoredResume(e.target.value)}
                      placeholder="Generate a tailored resume or paste/edit your own version here..."
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Tailored Cover Letter (optional, editable)
                    </label>
                    <textarea
                      className="h-32 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      value={tailoredCoverLetter}
                      onChange={(e) => setTailoredCoverLetter(e.target.value)}
                      placeholder="Write or paste a tailored cover letter for this job..."
                    />

                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleDownloadCoverLetter("txt")}
                        disabled={!tailoredCoverLetter}
                        className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Download cover letter .txt
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCoverLetter("md")}
                        disabled={!tailoredCoverLetter}
                        className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Download cover letter .md
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadCoverLetter("pdf")}
                        disabled={!tailoredCoverLetter}
                        className="rounded-full border border-slate-600 bg-slate-900 px-3 py-1 hover:border-cyan-400 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Download cover letter PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* History sidebar */}
              <aside className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Saved versions for this job
                </h4>
                {selectedJobId &&
                (savedTailoredByJob[selectedJobId] ?? []).length > 0 ? (
                  <ul className="space-y-2 text-xs">
                    {(savedTailoredByJob[selectedJobId] ?? []).map((v) => (
                      <li key={v.id}>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectVersion(selectedJobId, v.id)
                            }
                            className={`w-full rounded-md px-3 py-2 text-left transition ${
                              selectedVersionId === v.id
                                ? "bg-cyan-500/20 text-cyan-100 border border-cyan-500/60"
                                : "bg-slate-900 text-slate-200 border border-slate-700 hover:border-cyan-400/60 hover:text-cyan-100"
                            }`}
                          >
                            <div className="flex justify-between gap-2">
                              <span className="font-medium truncate">
                                {v.label}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(v.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[11px] text-slate-400">
                              {v.resumeContent.slice(0, 160)}...
                            </p>
                          </button>

                          <div className="flex gap-2 text-[10px]">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateVersion(selectedJobId, v.id);
                              }}
                              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-slate-300 hover:border-cyan-400 hover:text-cyan-200"
                            >
                              Duplicate & tweak
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVersion(selectedJobId, v.id);
                              }}
                              className="rounded-md border border-red-700/70 bg-red-900/30 px-2 py-1 text-red-200 hover:border-red-400"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    No saved versions yet for this job. Generate a tailored
                    resume and click{" "}
                    <span className="font-semibold">Save Version</span>.
                  </p>
                )}
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
