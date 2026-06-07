import { NextRequest, NextResponse } from "next/server";
import { runIntakeAgent } from "../../../agents/intakeAgent";
import { checkAuth } from "../../../lib/auth";
import { validateEnv } from "../../../lib/config";

export const runtime = "nodejs";

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

function validateFile(file: unknown): File {
  if (!(file instanceof File)) {
    throw new Error("Invalid upload");
  }

  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error(`"${file.name}" is not a PDF`);
  }

  if (file.size > MAX_SIZE) {
    throw new Error(`"${file.name}" exceeds 8MB limit`);
  }

  return file;
}

export async function POST(req: NextRequest) {
  // ✅ Environment validation
  try {
    validateEnv();
  } catch (envError) {
    return NextResponse.json(
      {
        success: false,
        error:
          envError instanceof Error
            ? envError.message
            : "Missing environment variables",
      },
      { status: 500 },
    );
  }

  // ✅ Auth check
  const authError = checkAuth(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const raw = formData.getAll("resumes");

    if (!raw.length) {
      return NextResponse.json(
        { success: false, error: "No files uploaded" },
        { status: 400 },
      );
    }

    const files = raw.map(validateFile);

    // ✅ One bad PDF won't kill the whole batch
    const settled = await Promise.allSettled(
      files.map(async (file) => {
        const buffer = Buffer.from(await file.arrayBuffer());
        return runIntakeAgent(buffer, file.name);
      }),
    );

    const successful = settled
      .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled")
      .map((r) => r.value);

    const failed = settled
      .map((r, i) => {
        if (r.status === "rejected") {
          return {
            filename: files[i].name,
            error: r.reason?.message || "Unknown error",
          };
        }
        return null;
      })
      .filter(Boolean);

    // ✅ If ALL uploads failed
    if (successful.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All uploads failed",
          failed,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      count: successful.length,
      candidates: successful,
      ...(failed.length > 0 && { failed }),
    });
  } catch (error) {
    console.error("[/api/ingest] Fatal Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
        stack:
          error instanceof Error ? error.stack?.split("\n").slice(0, 5) : [],
      },
      { status: 500 },
    );
  }
}
