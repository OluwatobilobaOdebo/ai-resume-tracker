import { NextResponse } from "next/server";
import { ApplicationStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

// PATCH /api/jobs/:id - update job (status)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ await the Promise

  if (!id) {
    return NextResponse.json({ error: "Job id is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { status } = body as { status?: ApplicationStatus };

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    const validStatuses = Object.values(ApplicationStatus);
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    const updated = await prisma.jobApplication.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/jobs/:id] Error:", error);
    return NextResponse.json(
      { error: "Failed to update job application" },
      { status: 500 }
    );
  }
}
