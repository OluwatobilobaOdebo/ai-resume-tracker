import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // 1) Basic config check
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    // 2) Parse body
    const body = await request.json();
    const { resume, jobDescription } = body as {
      resume?: string;
      jobDescription?: string;
    };

    if (!resume || !jobDescription) {
      return NextResponse.json(
        { error: "resume and jobDescription are required" },
        { status: 400 }
      );
    }

    // 3) Build prompt
    const prompt = `
You are an expert resume writer for software engineering and product roles.

Given the candidate's base resume and a specific job description, rewrite the resume content to be tailored to that job.

Rules:
- Keep it truthful to the candidate's experience.
- Emphasize skills, technologies, and accomplishments relevant to the job description.
- Use strong, concise bullet points.
- Keep formatting simple: headers with ALL CAPS and bullet lists using "- ".
- Do NOT invent jobs or degrees.

BASE RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}

Now output ONLY the tailored resume text:
`;

    // 4) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    });

    const tailoredResume =
      completion.choices[0]?.message?.content?.trim() ??
      "No content generated.";

    return NextResponse.json({ tailoredResume });
  } catch (error: any) {
    console.error("[POST /api/ai/tailor-resume] Error:", error);

    // Temporary: surface some detail to help debug
    return NextResponse.json(
      {
        error: "Failed to generate tailored resume",
        details: error?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
