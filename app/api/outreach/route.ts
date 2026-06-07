import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateOutreachEmails } from "../../../agents/actionAgent";
import { checkAuth } from "../../../lib/auth";
import clientPromise from "../../../lib/mongodb";
import "../../../lib/config";

export const runtime = "nodejs";

const CandidateSchema = z.object({
  candidateId: z.string(),
  name: z.string(),
  email: z.string(),
  finalScore: z.number(),
  strengths: z.array(z.string()),
  reasoning: z.string(),
});

const OutreachSchema = z.object({
  candidates: z
    .array(CandidateSchema)
    .min(1, "At least one candidate required"),
  job_title: z.string().min(1, "job_title is required"),
  company_name: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const body = await req.json();
    const parsed = OutreachSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 },
      );
    }

    const { candidates, job_title, company_name } = parsed.data;
    const emails = await generateOutreachEmails(
      candidates,
      job_title,
      company_name || "Our Company",
    );

    return NextResponse.json({ success: true, emails });
  } catch (error) {
    console.error("[/api/outreach POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Outreach failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.DB_NAME || "devhireai");
    const emails = await db
      .collection("outreach")
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json({ success: true, emails });
  } catch (error) {
    console.error("[/api/outreach GET]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch emails" },
      { status: 500 },
    );
  }
}
