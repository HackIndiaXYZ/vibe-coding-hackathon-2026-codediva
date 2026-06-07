import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { answerRecruiterQuestion } from "../../../agents/actionAgent";
import { checkAuth } from "../../../lib/auth";
import "../../../lib/config";

export const runtime = "nodejs";

const AskSchema = z.object({
  question: z.string().min(3, "Question too short"),
  job_id: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = AskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { question, job_id } = parsed.data;
    const answer = await answerRecruiterQuestion(question, job_id);

    return NextResponse.json({ success: true, answer });
  } catch (error) {
    console.error("[/api/ask]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Q&A failed",
      },
      { status: 500 }
    );
  }
}