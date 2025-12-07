import { NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

// GET /api/jobs - list job applications
export async function GET() {
  try {
    const jobs = await prisma.jobApplication.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("[GET /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch job applications" },
      { status: 500 }
    );
  }
}

// POST /api/jobs - create a new job application
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      companyName,
      jobTitle,
      jobLink,
      location,
      salaryRange,
      status,
      jobDescription,
      notes,
    } = body;

    // Basic validation
    if (!companyName || !jobTitle || !jobDescription) {
      return NextResponse.json(
        { error: "companyName, jobTitle, and jobDescription are required" },
        { status: 400 }
      );
    }

    const validStatusValues = Object.values(ApplicationStatus);
    const normalizedStatus =
      status && validStatusValues.includes(status)
        ? status
        : ApplicationStatus.SAVED;

    const job = await prisma.jobApplication.create({
      data: {
        companyName,
        jobTitle,
        jobLink: jobLink || null,
        location: location || null,
        salaryRange: salaryRange || null,
        status: normalizedStatus,
        jobDescription,
        notes: notes || null,
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("[POST /api/jobs] Error:", error);
    return NextResponse.json(
      { error: "Failed to create job application" },
      { status: 500 }
    );
  }
}
