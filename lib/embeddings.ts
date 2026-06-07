import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) throw new Error("Missing GOOGLE_API_KEY in .env.local");

const genAI = new GoogleGenerativeAI(apiKey);

export async function embedText(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Cannot generate embedding for empty text");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-embedding-001",
  });

  try {
    const result = await model.embedContent(text.slice(0, 8000));

    if (!result.embedding?.values) {
      throw new Error("Embedding API returned no values");
    }

    if (!Array.isArray(result.embedding.values)) {
      throw new Error("Embedding values is not an array");
    }

    if (result.embedding.values.length === 0) {
      throw new Error("Embedding API returned empty array");
    }

    console.log("=== EMBEDDING DIMENSIONS:", result.embedding.values.length);

    return result.embedding.values;
  } catch (err) {
    throw new Error(
      `Embedding failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}