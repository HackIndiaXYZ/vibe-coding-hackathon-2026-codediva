import { GoogleGenerativeAI } from "@google/generative-ai";
import { embedText } from "../lib/embeddings";
import clientPromise from "../lib/mongodb";

export interface ParsedCandidate {
  id: string;
  name: string;
  email: string;
  skills: string[];
  experience_years: number;
  summary: string;
  resume_text: string;
  embedding: number[];
  filename: string;
  createdAt: Date;
}

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error("Missing GOOGLE_API_KEY in .env.local");
const genAI = new GoogleGenerativeAI(apiKey);

// ✅ Cache pdf-parse module — imports once, reused on every upload
let pdfParseModule: ((buffer: Buffer) => Promise<{ text: string }>) | null =
  null;

async function getPdfParse() {
  if (!pdfParseModule) {
    pdfParseModule = (await import("pdf-parse")).default;
  }
  return pdfParseModule;
}

export async function runIntakeAgent(fileBuffer: Buffer, filename: string) {
  if (!Buffer.isBuffer(fileBuffer)) {
    throw new TypeError("fileBuffer must be a Buffer");
  }

  const pdfParse = await getPdfParse();

  let text = "";
  try {
    const parsed = await pdfParse(fileBuffer);
    text = (parsed.text || "").trim();
  } catch (err) {
    throw new Error(`PDF parse failed for "${filename}": ${String(err)}`);
  }

  if (!text) {
    throw new Error(`No extractable text found in "${filename}"`);
  }

  // Gemini structured extraction
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
  });

  const prompt = `Extract resume info. Return ONLY valid JSON, no markdown, no extra text.

{
  "name": "",
  "email": "",
  "skills": [],
  "experience_years": 0,
  "summary": ""
}

Resume:
${text}`;

  const result = await model.generateContent(prompt);

  if (!result?.response) {
    throw new Error("Gemini returned an empty response object");
  }

  const rawText =
    typeof result.response.text === "function"
      ? await result.response.text()
      : String(result.response.text);

  if (!rawText || typeof rawText !== "string") {
    throw new Error("Gemini response text is invalid or missing");
  }

  const cleaned = rawText.replace(/```json|```/g, "").trim();

  let structured;
  try {
    structured = JSON.parse(cleaned);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown JSON parse error";
    throw new Error(
      `Gemini returned invalid JSON: ${message}\nRaw: ${cleaned.slice(0, 500)}`,
    );
  }

  // Embedding
  const embedding = await embedText(text);

  // ✅ Array check first, then dimension check
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error("Embedding generation failed — empty response");
  }

  const EXPECTED_EMBEDDING_DIM = parseInt(process.env.EMBEDDING_DIM || "3072");
  if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
    throw new Error(
      `Unexpected embedding dimension: got ${embedding.length}, expected ${EXPECTED_EMBEDDING_DIM}`,
    );
  }

  // Store to MongoDB
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "devhireai");

  const candidate = {
    name: structured.name || "Unknown",
    email: structured.email || "",
    skills: Array.isArray(structured.skills) ? structured.skills : [],
    experience_years: Number(structured.experience_years) || 0,
    summary: structured.summary || "",
    resume_text: text,
    embedding,
    filename,
    createdAt: new Date(),
  };

  let candidateId: string;
  if (candidate.email) {
    const existing = await db.collection("candidates").findOne({ email: candidate.email });
    if (existing) {
      candidateId = existing._id.toString();
      await db.collection("candidates").updateOne(
        { _id: existing._id },
        {
          $set: {
            name: candidate.name,
            skills: candidate.skills,
            experience_years: candidate.experience_years,
            summary: candidate.summary,
            resume_text: candidate.resume_text,
            embedding: candidate.embedding,
            filename: candidate.filename,
            updatedAt: new Date(),
          },
        }
      );
    } else {
      const inserted = await db.collection("candidates").insertOne(candidate);
      candidateId = inserted.insertedId.toString();
    }
  } else {
    const inserted = await db.collection("candidates").insertOne(candidate);
    candidateId = inserted.insertedId.toString();
  }

  return { id: candidateId, ...candidate };
}
