import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
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

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server" },
        { status: 500 }
      );
    }

    const prompt = `
You are an expert resume and cover letter writer for software engineering and product roles.

Given the candidate's base resume and a specific job description, write a tailored cover letter that:
- Is 3–5 short paragraphs
- Uses a professional but friendly tone
- References 2–3 concrete skills/experiences from the resume that match the job
- Avoids buzzword fluff and keeps sentences clear and direct

Return ONLY the cover letter text. No extra commentary.

BASE RESUME:
${resume}

JOB DESCRIPTION:
${jobDescription}
    `.trim();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const coverLetter =
      completion.choices[0]?.message?.content?.trim() ??
      "Could not generate cover letter.";

    return NextResponse.json({ coverLetter });
  } catch (error) {
    console.error("[POST /api/ai/cover-letter] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate cover letter" },
      { status: 500 }
    );
  }
}
