import { GoogleGenerativeAI } from "@google/generative-ai";
import { findTopCandidates } from "../lib/vectorSearch";
import clientPromise from "../lib/mongodb";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
const genAI = new GoogleGenerativeAI(apiKey);

export interface EvaluatedCandidate {
  candidateId: string;
  name: string;
  email: string;
  skills: string[];
  experience_years: number;
  vectorScore: number;
  aiScore: number;
  finalScore: number;
  strengths: string[];
  gaps: string[];
  reasoning: string;
  recommendation: "Strong Yes" | "Yes" | "Maybe" | "No";
}

export async function runEvaluationAgent(
  jdText: string,
  jobId: string,
): Promise<EvaluatedCandidate[]> {
  // Step 1: Vector search — find semantically closest candidates
  const candidates = await findTopCandidates(jdText, 15);

  if (candidates.length === 0) {
    console.warn("[EvaluationAgent] No candidates found in DB");
    return [];
  }

  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
  });
  
  // Step 2: Gemini reasoning for each candidate
  const evaluated = await Promise.all(
    candidates.map(async (candidate) => {
      const prompt = `You are a senior technical recruiter. Evaluate this candidate against the job description.
Return ONLY valid JSON, no markdown, no backticks.

Job Description:
${jdText}

Candidate:
Name: ${candidate.name}
Skills: ${(candidate.skills || []).join(", ")}
Experience: ${candidate.experience_years} years
Summary: ${candidate.summary || "N/A"}

Return exactly:
{
  "aiScore": 0,
  "strengths": ["strength 1", "strength 2"],
  "gaps": ["gap 1"],
  "reasoning": "2-3 sentence explanation",
  "recommendation": "Strong Yes"
}

aiScore is 0-100. recommendation must be one of: "Strong Yes", "Yes", "Maybe", "No"`;

      try {
        const result = await model.generateContent(prompt);
        const rawText =
          typeof result.response.text === "function"
            ? await result.response.text()
            : String(result.response.text);
        const raw = rawText.replace(/```json|```/g, "").trim();
        const evaluation = JSON.parse(raw);

        const vectorNormalized = Math.round((candidate.score || 0) * 100);
        const aiScore = Number(evaluation.aiScore) || 50;
        const finalScore = Math.round(vectorNormalized * 0.4 + aiScore * 0.6);

        return {
          candidateId: candidate._id?.toString() || "",
          name: candidate.name,
          email: candidate.email,
          skills: candidate.skills || [],
          experience_years: candidate.experience_years || 0,
          vectorScore: vectorNormalized,
          aiScore,
          finalScore,
          strengths: evaluation.strengths || [],
          gaps: evaluation.gaps || [],
          reasoning: evaluation.reasoning || "",
          recommendation: evaluation.recommendation || "Maybe",
        } as EvaluatedCandidate;
      } catch (err) {
        console.error(`[EvaluationAgent] Failed for ${candidate.name}:`, err);
        const vectorNormalized = Math.round((candidate.score || 0) * 100);
        return {
          candidateId: candidate._id?.toString() || "",
          name: candidate.name,
          email: candidate.email,
          skills: candidate.skills || [],
          experience_years: candidate.experience_years || 0,
          vectorScore: vectorNormalized,
          aiScore: 50,
          finalScore: vectorNormalized,
          strengths: [],
          gaps: [],
          reasoning: "Evaluation unavailable",
          recommendation: "Maybe" as const,
        };
      }
    }),
  );

  // Step 3: Sort by final score
  const sorted = evaluated.sort((a, b) => b.finalScore - a.finalScore);

  // Step 4: Persist to MongoDB
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "devhireai");

  await db
    .collection("evaluations")
    .insertMany(
      sorted.map((e) => ({ ...e, jobId, jdText, createdAt: new Date() })),
    );

  await db
    .collection("jobs")
    .updateOne(
      { jobId },
      { $set: { jobId, jd_text: jdText, updatedAt: new Date() } },
      { upsert: true },
    );

  return sorted;
}
