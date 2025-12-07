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

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  SAVED: { label: "Saved", color: "status-saved" },
  APPLIED: { label: "Applied", color: "status-applied" },
  PHONE_SCREEN: { label: "Phone Screen", color: "status-phone_screen" },
  INTERVIEW: { label: "Interview", color: "status-interview" },
  OFFER: { label: "Offer", color: "status-offer" },
  REJECTED: { label: "Rejected", color: "status-rejected" },
};

// Icons as SVG components
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const ChevronDownIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

const ExternalLinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
    <polyline points="15 3 21 3 21 9"></polyline>
    <line x1="10" y1="14" x2="21" y2="3"></line>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
  </svg>
);

const DuplicateIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="8" width="12" height="12" rx="2"></rect>
    <path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"></path>
  </svg>
);


const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

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
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "ALL">("ALL");

  // Form visibility state
  const [isFormOpen, setIsFormOpen] = useState(false);

  // AI resume tailoring state
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [baseResume, setBaseResume] = useState("");
  const [tailoredResume, setTailoredResume] = useState("");
  const [tailoredCoverLetter, setTailoredCoverLetter] = useState("");
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Saved tailored resumes per job (history)
  const [savedTailoredByJob, setSavedTailoredByJob] = useState<Record<string, TailoredVersion[]>>({});

  // Version selection / naming UI state
  const [versionLabel, setVersionLabel] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

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
      } catch (err: unknown) {
        console.error(err);
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchJobs();
  }, []);

  // Load saved tailored resumes from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("savedTailoredResumes");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;

      const anyObj = parsed as Record<string, unknown>;
      const firstVal = Object.values(anyObj)[0];

      // Case 1: newest format – map<string, TailoredVersion[]>
      if (
        Array.isArray(firstVal) &&
        firstVal[0] &&
        typeof firstVal[0] === "object" &&
        "resumeContent" in (firstVal[0] as object)
      ) {
        setSavedTailoredByJob(anyObj as Record<string, TailoredVersion[]>);
        return;
      }

      // Case 2: previous "content" format
      if (
        Array.isArray(firstVal) &&
        firstVal[0] &&
        typeof firstVal[0] === "object" &&
        "content" in (firstVal[0] as object)
      ) {
        const migrated: Record<string, TailoredVersion[]> = {};

        Object.entries(anyObj).forEach(([jobId, versions]) => {
          migrated[jobId] = (versions as { id?: string; label?: string; content?: string; coverLetterContent?: string; createdAt?: string }[]).map((v, idx) => ({
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
      Object.entries(anyObj as Record<string, string>).forEach(([jobId, content]) => {
        migrated[jobId] = [
          {
            id: `legacy-${jobId}`,
            label: "Imported version",
            resumeContent: content ?? "",
            coverLetterContent: "",
            createdAt: new Date().toISOString(),
          },
        ];
      });
      setSavedTailoredByJob(migrated);
    } catch (err) {
      console.error("Failed to load savedTailoredResumes:", err);
    }
  }, []);

  // Whenever savedTailoredByJob changes, persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("savedTailoredResumes", JSON.stringify(savedTailoredByJob));
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
      setIsFormOpen(false);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status counts & filtered list
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

  const handleStatusChange = async (jobId: string, newStatus: ApplicationStatus) => {
    try {
      setError(null);
      // Optimistic update
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status: newStatus } : job))
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
      setSelectedVersionId(null);
    } catch (err: unknown) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : "Something went wrong while generating your resume.");
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
    } catch (err: unknown) {
      console.error(err);
      setAiError(err instanceof Error ? err.message : "Something went wrong while generating your cover letter.");
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

    const mime = format === "txt" ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8";

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

    const mime = format === "txt" ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8";

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

  const interviewingCount = statusCounts.INTERVIEW + statusCounts.PHONE_SCREEN + statusCounts.OFFER;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Hero Header */}
      <header className="border-b" style={{ borderColor: "var(--border-light)", background: "var(--background-elevated)" }}>
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <h1 
                  className="text-3xl font-bold tracking-tight"
                  style={{ 
                    background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 50%, #EC4899 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Resume<span style={{ fontWeight: 800 }}>AI</span>
                </h1>
                <div 
                  className="absolute -right-2 -top-1 h-2 w-2 rounded-full animate-pulse"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)" }}
                />
              </div>
              <div 
                className="ml-3 h-8 w-px"
                style={{ background: "var(--border-light)" }}
              />
              <p className="text-sm max-w-[200px]" style={{ color: "var(--foreground-muted)" }}>
                Smart job tracking & AI-powered resume tailoring
              </p>
            </div>

            {/* Stats Cards */}
            <div className="flex gap-4">
              <div className="stat-card min-w-[120px]">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-subtle)" }}>
                  Total Jobs
                </p>
                <p className="mt-1 text-3xl font-semibold" style={{ color: "var(--foreground)" }}>
                  {jobs.length}
                </p>
              </div>
              <div className="stat-card min-w-[120px]">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-subtle)" }}>
                  Interviewing
                </p>
                <p className="mt-1 text-3xl font-semibold" style={{ color: "var(--status-interview)" }}>
                  {interviewingCount}
                </p>
              </div>
              <div className="stat-card min-w-[120px]">
                <p className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--foreground-subtle)" }}>
                  Offers
                </p>
                <p className="mt-1 text-3xl font-semibold" style={{ color: "var(--status-offer)" }}>
                  {statusCounts.OFFER}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 flex-1">
        {/* Error Banner */}
        {error && (
          <div 
            className="mb-6 animate-fade-in rounded-lg border px-4 py-3 text-sm"
            style={{ 
              background: "rgba(239, 68, 68, 0.08)", 
              borderColor: "rgba(239, 68, 68, 0.2)",
              color: "#DC2626"
            }}
          >
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid gap-8 xl:grid-cols-[1fr_400px]">
          {/* Left Column - Jobs Section */}
          <div className="space-y-6">
            {/* Actions Bar */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
                Your Applications
              </h2>
              <button
                type="button"
                onClick={() => setIsFormOpen(!isFormOpen)}
                className="btn-primary"
              >
                <PlusIcon />
                Add New Job
              </button>
            </div>

            {/* Collapsible Add Job Form */}
            {isFormOpen && (
              <div className="card-elevated animate-scale-in p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                    New Job Application
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="btn-ghost"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleCreateJob} className="grid gap-5 md:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Company Name <span style={{ color: "var(--status-rejected)" }}>*</span>
                    </label>
                    <input
                      className="input-field"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                      placeholder="e.g., Google, Apple, Microsoft"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Job Title <span style={{ color: "var(--status-rejected)" }}>*</span>
                    </label>
                    <input
                      className="input-field"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      required
                      placeholder="e.g., Senior Software Engineer"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Job Link
                    </label>
                    <input
                      className="input-field"
                      value={jobLink}
                      onChange={(e) => setJobLink(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Location
                    </label>
                    <input
                      className="input-field"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Remote, San Francisco, NYC..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Salary Range
                    </label>
                    <input
                      className="input-field"
                      value={salaryRange}
                      onChange={(e) => setSalaryRange(e.target.value)}
                      placeholder="$120k – $180k"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Status
                    </label>
                    <select
                      className="select-field"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_CONFIG[s].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Job Description <span style={{ color: "var(--status-rejected)" }}>*</span>
                    </label>
                    <textarea
                      className="textarea-field h-32"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      required
                      placeholder="Paste the full job description here for AI tailoring..."
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      Notes
                    </label>
                    <textarea
                      className="textarea-field h-20"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Recruiter contacts, interview notes, reminders..."
                    />
                  </div>

                  <div className="flex justify-end gap-3 md:col-span-2">
                    <button
                      type="button"
                      onClick={() => setIsFormOpen(false)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary">
                      {isSubmitting ? (
                        <>
                          <span className="spinner"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon />
                          Save Job
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Filter Tabs */}
            <div 
              className="flex flex-wrap gap-2 rounded-xl p-2"
              style={{ background: "var(--background-secondary)" }}
            >
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`tab-item ${statusFilter === "ALL" ? "active" : ""}`}
              >
                All ({jobs.length})
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatusFilter(s)}
                  className={`tab-item ${statusFilter === s ? "active" : ""}`}
                >
                  {STATUS_CONFIG[s].label} ({statusCounts[s] ?? 0})
                </button>
              ))}
            </div>

            {/* Job List */}
            <div className="card-elevated overflow-hidden">
              {isLoading ? (
                <div className="p-8">
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-shimmer h-16 rounded-lg"></div>
                    ))}
                  </div>
                </div>
              ) : filteredJobs.length === 0 ? (
                <div className="empty-state">
                  <div 
                    className="empty-state-icon"
                    style={{ 
                      background: "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(124, 58, 237, 0.1) 100%)",
                      border: "1px dashed var(--border-medium)"
                    }}
                  >
                    <PlusIcon />
                  </div>
                  <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                    No applications yet
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--foreground-muted)" }}>
                    {statusFilter === "ALL"
                      ? "Click 'Add New Job' to start tracking your applications"
                      : `No jobs with "${STATUS_CONFIG[statusFilter as ApplicationStatus].label}" status`}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr style={{ background: "var(--background-secondary)" }}>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--foreground-subtle)" }}>
                          Company
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--foreground-subtle)" }}>
                          Role
                        </th>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--foreground-subtle)" }}>
                          Status
                        </th>
                        <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide md:table-cell" style={{ color: "var(--foreground-subtle)" }}>
                          Location
                        </th>
                        <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide lg:table-cell" style={{ color: "var(--foreground-subtle)" }}>
                          Salary
                        </th>
                        <th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide lg:table-cell" style={{ color: "var(--foreground-subtle)" }}>
                          Added
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredJobs.map((job, index) => (
                        <tr
                          key={job.id}
                          className={`table-row animate-fade-in stagger-${Math.min(index + 1, 5)}`}
                        >
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium" style={{ color: "var(--foreground)" }}>
                                {job.companyName}
                              </span>
                              {job.jobLink && (
                                <a
                                  href={job.jobLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs transition-colors hover:underline"
                                  style={{ color: "var(--accent-primary)" }}
                                >
                                  View posting <ExternalLinkIcon />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm" style={{ color: "var(--foreground)" }}>
                              {job.jobTitle}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <select
                              value={job.status}
                              onChange={(e) => handleStatusChange(job.id, e.target.value as ApplicationStatus)}
                              className={`status-badge cursor-pointer border-none outline-none ${STATUS_CONFIG[job.status].color}`}
                              style={{ background: "transparent" }}
                            >
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {STATUS_CONFIG[s].label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="hidden px-5 py-4 md:table-cell">
                            <span className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                              {job.location || "—"}
                            </span>
                          </td>
                          <td className="hidden px-5 py-4 lg:table-cell">
                            <span className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                              {job.salaryRange || "—"}
                            </span>
                          </td>
                          <td className="hidden px-5 py-4 lg:table-cell">
                            <span className="text-xs" style={{ color: "var(--foreground-subtle)" }}>
                              {new Date(job.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - AI Section */}
          <div className="space-y-6">
            <div className="card-elevated p-6">
              <div className="mb-4 flex items-center gap-3">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%)" }}
                >
                  <SparklesIcon />
                </div>
                <div>
                  <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
                    AI Resume Tailor
                  </h2>
                  <p className="text-xs" style={{ color: "var(--foreground-muted)" }}>
                    Generate job-specific resumes & cover letters
                  </p>
                </div>
              </div>

              {aiError && (
                <div 
                  className="mb-4 animate-fade-in rounded-lg border px-4 py-3 text-sm"
                  style={{ 
                    background: "rgba(239, 68, 68, 0.08)", 
                    borderColor: "rgba(239, 68, 68, 0.2)",
                    color: "#DC2626"
                  }}
                >
                  {aiError}
                </div>
              )}

              <form onSubmit={handleGenerateTailoredResume} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    Target Job
                  </label>
                  <select
                    className="select-field"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                  >
                    <option value="">Select a job application...</option>
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.companyName} — {job.jobTitle}
                      </option>
                    ))}
                  </select>
                  {selectedJob && (
                    <p className="text-xs" style={{ color: "var(--foreground-subtle)" }}>
                      Will use job description from {selectedJob.companyName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    Your Base Resume
                  </label>
                  <textarea
                    className="textarea-field h-36 font-mono text-xs"
                    value={baseResume}
                    onChange={(e) => setBaseResume(e.target.value)}
                    placeholder="Paste your current resume text here..."
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={isGenerating || !selectedJob || !baseResume.trim()}
                    className="btn-primary w-full justify-center"
                  >
                    {isGenerating ? (
                      <>
                        <span className="spinner"></span>
                        Generating Resume...
                      </>
                    ) : (
                      <>
                        <SparklesIcon />
                        Generate Tailored Resume
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateCoverLetter}
                    disabled={isGeneratingCover || !selectedJob || !baseResume.trim()}
                    className="btn-secondary w-full justify-center"
                  >
                    {isGeneratingCover ? (
                      <>
                        <span className="spinner"></span>
                        Generating Cover Letter...
                      </>
                    ) : (
                      "Generate Cover Letter"
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Output Section */}
            {(tailoredResume || (selectedJobId && (savedTailoredByJob[selectedJobId] ?? []).length > 0)) && (
              <div className="space-y-4 animate-fade-in">
                {/* Version Save Controls */}
                <div className="card p-4">
                  <label className="mb-2 block text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    Save as Version
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="input-field flex-1"
                      placeholder="e.g., Final Version, Phone Screen"
                      value={versionLabel}
                      onChange={(e) => setVersionLabel(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={handleSaveVersion}
                      disabled={!tailoredResume && !tailoredCoverLetter}
                      className="btn-primary"
                    >
                      Save
                    </button>
                  </div>
                  <p className="mt-2 text-xs" style={{ color: "var(--foreground-subtle)" }}>
                    Versions are stored locally in your browser
                  </p>
                </div>

                {/* Tailored Resume Output */}
                <div className="card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      Tailored Resume
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyTailoredResume}
                        disabled={!tailoredResume}
                        className="btn-ghost flex items-center gap-1.5 text-xs"
                      >
                        <CopyIcon />
                        {copyStatus === "copied" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <textarea
                    className="textarea-field h-48 w-full font-mono text-xs"
                    value={tailoredResume}
                    onChange={(e) => setTailoredResume(e.target.value)}
                    placeholder="Your AI-tailored resume will appear here..."
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownload("txt")}
                      disabled={!tailoredResume}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <DownloadIcon /> .txt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload("md")}
                      disabled={!tailoredResume}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <DownloadIcon /> .md
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload("pdf")}
                      disabled={!tailoredResume}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <DownloadIcon /> .pdf
                    </button>
                  </div>
                </div>

                {/* Cover Letter Output */}
                <div className="card p-4">
                  <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    Cover Letter
                  </h3>
                  <textarea
                    className="textarea-field h-32 w-full font-mono text-xs"
                    value={tailoredCoverLetter}
                    onChange={(e) => setTailoredCoverLetter(e.target.value)}
                    placeholder="Your AI-generated cover letter will appear here..."
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadCoverLetter("txt")}
                      disabled={!tailoredCoverLetter}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <DownloadIcon /> .txt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCoverLetter("md")}
                      disabled={!tailoredCoverLetter}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <DownloadIcon /> .md
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadCoverLetter("pdf")}
                      disabled={!tailoredCoverLetter}
                      className="btn-ghost flex items-center gap-1.5 text-xs"
                    >
                      <DownloadIcon /> .pdf
                    </button>
                  </div>
                </div>

                {/* Saved Versions */}
                {selectedJobId && (savedTailoredByJob[selectedJobId] ?? []).length > 0 && (
                  <div className="card p-4">
                    <h3 className="mb-3 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                      Saved Versions
                    </h3>
                    <div className="space-y-2">
                      {(savedTailoredByJob[selectedJobId] ?? []).map((v) => (
                        <div
                          key={v.id}
                          className={`rounded-lg border p-3 transition-all cursor-pointer ${
                            selectedVersionId === v.id
                              ? "border-blue-300 bg-blue-50"
                              : "hover:border-gray-300"
                          }`}
                          style={{
                            borderColor: selectedVersionId === v.id ? "var(--accent-primary)" : "var(--border-light)",
                            background: selectedVersionId === v.id ? "rgba(37, 99, 235, 0.05)" : "transparent",
                          }}
                          onClick={() => handleSelectVersion(selectedJobId, v.id)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                              {v.label}
                            </span>
                            <span className="text-xs" style={{ color: "var(--foreground-subtle)" }}>
                              {new Date(v.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs" style={{ color: "var(--foreground-muted)" }}>
                            {v.resumeContent.slice(0, 100)}...
                          </p>
                          <div className="mt-2 flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDuplicateVersion(selectedJobId, v.id);
                              }}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
                              style={{ 
                                background: "var(--background-secondary)", 
                                color: "var(--foreground-muted)" 
                              }}
                            >
                              <DuplicateIcon /> Duplicate
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVersion(selectedJobId, v.id);
                              }}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
                              style={{ 
                                background: "rgba(239, 68, 68, 0.1)", 
                                color: "#DC2626" 
                              }}
                            >
                              <TrashIcon /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer 
        className="border-t py-3 mt-auto"
        style={{ borderColor: "var(--border-light)" }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--foreground-muted)" }}>
            <div className="flex items-center gap-1">
              <span>Built with</span>
              <span className="font-medium" style={{ color: "var(--foreground)" }}>Next.js · React · TypeScript · Tailwind · OpenAI API</span>
            </div>
            <div className="flex items-center gap-1">
              <span>by</span>
              <span 
                className="font-semibold"
                style={{ 
                  background: "linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Oluwatobiloba Odebo
              </span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
