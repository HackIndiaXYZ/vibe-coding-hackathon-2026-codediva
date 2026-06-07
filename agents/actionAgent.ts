import { GoogleGenerativeAI } from "@google/generative-ai";
import { searchCandidatesByQuery } from "../lib/vectorSearch";
import clientPromise from "../lib/mongodb";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");
const genAI = new GoogleGenerativeAI(apiKey);

export interface OutreachEmail {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  subject: string;
  body: string;
  type: "interview_invite" | "rejection";
}

export async function generateOutreachEmails(
  candidates: Array<{
    candidateId: string;
    name: string;
    email: string;
    finalScore: number;
    strengths: string[];
    reasoning: string;
  }>,
  jobTitle: string,
  companyName: string = "Our Company",
): Promise<OutreachEmail[]> {
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
  });

  const emails = await Promise.all(
    candidates.map(async (candidate) => {
      const isSelected = candidate.finalScore >= 65;
      const type = isSelected ? "interview_invite" : "rejection";

      const prompt = isSelected
        ? `Write a warm professional interview invitation email.
Candidate name: ${candidate.name}
Role: ${jobTitle} at ${companyName}
Their strengths: ${(candidate.strengths || []).join(", ")}

Return ONLY JSON, no markdown:
{
  "subject": "subject line here",
  "body": "full email body here with \\n for line breaks"
}`
        : `Write a kind professional rejection email.
Candidate name: ${candidate.name}
Role: ${jobTitle} at ${companyName}

Return ONLY JSON, no markdown:
{
  "subject": "subject line here",
  "body": "full email body here with \\n for line breaks"
}`;

      try {
        const result = await model.generateContent(prompt);
        const rawText =
          typeof result.response.text === "function"
            ? await result.response.text()
            : String(result.response.text);
        const raw = rawText.replace(/```json|```/g, "").trim();
        const email = JSON.parse(raw);

        return {
          candidateId: candidate.candidateId,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          subject: email.subject,
          body: email.body,
          type,
        } as OutreachEmail;
      } catch {
        // Fallback email if Gemini fails
        return {
          candidateId: candidate.candidateId,
          candidateName: candidate.name,
          candidateEmail: candidate.email,
          subject: isSelected
            ? `Interview Invitation — ${jobTitle}`
            : `Your application for ${jobTitle}`,
          body: isSelected
            ? `Dear ${candidate.name},\n\nWe were impressed by your profile and would like to invite you to interview for the ${jobTitle} role at ${companyName}.\n\nPlease reply with your availability.\n\nBest regards,\n${companyName} Team`
            : `Dear ${candidate.name},\n\nThank you for your interest in the ${jobTitle} role at ${companyName}. After careful review, we have decided to move forward with other candidates.\n\nWe appreciate your time and wish you well.\n\nBest regards,\n${companyName} Team`,
          type,
        } as OutreachEmail;
      }
    }),
  );

  // Save to MongoDB
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "devhireai");
  if (emails.length > 0) {
    await db
      .collection("outreach")
      .insertMany(
        emails.map((e) => ({ ...e, status: "draft", createdAt: new Date() })),
      );
  }

  return emails;
}

export async function answerRecruiterQuestion(
  question: string,
  jobId?: string,
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
    });

    // RAG: vector search for relevant candidates
    const relevant = await searchCandidatesByQuery(question, 5);

    // Also pull evaluation scores if jobId provided
    let evalContext = "";
    if (jobId) {
      const client = await clientPromise;
      const db = client.db(process.env.DB_NAME || "devhireai");
      const evals = await db
        .collection("evaluations")
        .find({ jobId })
        .sort({ finalScore: -1 })
        .limit(10)
        .toArray();

      if (evals.length > 0) {
        evalContext =
          "\n\nEvaluation scores:\n" +
          evals
            .map(
              (e) =>
                `- ${e.name}: ${e.finalScore}/100 (${e.recommendation}) — ${e.reasoning}`,
            )
            .join("\n");
      }
    }

    const candidateContext =
      relevant.length > 0
        ? relevant
            .map(
              (c) =>
                `- ${c.name}: ${c.experience_years} yrs exp, Skills: ${(c.skills || []).join(", ")}`,
            )
            .join("\n")
        : "No matching candidates found.";

    const prompt = `You are an AI recruitment assistant. Answer using only the data below.
Be specific and concise.

Candidate data:
${candidateContext}
${evalContext}

Question: ${question}

Answer:`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("[answerRecruiterQuestion] Error answering question:", error);
    return "Error: Unable to answer the question at this time. Please check your query or try again later.";
  }
}
