import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runEvaluationAgent } from "../../../agents/evaluationAgent";
import { checkAuth } from "../../../lib/auth";
import "../../../lib/config";

export const runtime = "nodejs";

const EvaluateSchema = z.object({
  jd_text: z.string().min(10, "Job description too short"),
  job_id: z.string().min(1, "job_id is required"),
});

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = EvaluateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { jd_text, job_id } = parsed.data;
    const evaluated = await runEvaluationAgent(jd_text, job_id);

    return NextResponse.json({
      success: true,
      count: evaluated.length,
      candidates: evaluated,
    });
  } catch (error) {
    console.error("[/api/evaluate]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Evaluation failed",
      },
      { status: 500 },
    );
  }
}
