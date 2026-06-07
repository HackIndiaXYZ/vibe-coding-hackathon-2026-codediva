import clientPromise from "./mongodb";
import { embedText } from "./embeddings";

export interface CandidateResult {
  _id: string;
  name: string;
  email: string;
  skills: string[];
  experience_years: number;
  summary: string;
  score: number;
}

const VECTOR_INDEX_NAME = "vector_index";
const DB_NAME = process.env.DB_NAME || "devhireai";

// ========================================
// FIND TOP CANDIDATES FOR JD
// ========================================

export async function findTopCandidates(
  jdText: string,
  limit: number = 10,
): Promise<CandidateResult[]> {
  if (!jdText || jdText.trim().length === 0) {
    throw new Error("Job description cannot be empty");
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Generate embedding for JD
  const queryVector = await embedText(jdText);

  // Validate embedding
  if (!Array.isArray(queryVector)) {
    throw new Error("Embedding is not an array");
  }

  if (queryVector.length === 0) {
    throw new Error("Embedding array is empty");
  }

  console.log(
    "[findTopCandidates] Query embedding dimensions:",
    queryVector.length,
  );

  try {
    const results = await db
      .collection("candidates")
      .aggregate([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: "embedding",
            queryVector,
            numCandidates: 100,
            limit,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            skills: 1,
            experience_years: 1,
            summary: 1,
            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ])
      .toArray();

    return results.map((candidate: any) => ({
      _id: candidate._id.toString(),
      name: candidate.name || "Unknown",
      email: candidate.email || "",
      skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      experience_years:
        typeof candidate.experience_years === "number"
          ? candidate.experience_years
          : 0,
      summary: candidate.summary || "",
      score: typeof candidate.score === "number" ? candidate.score : 0,
    }));
  } catch (err: any) {
    console.error("[findTopCandidates] Vector search error:", err);

    const isVectorSearchIssue =
      err?.message?.includes("$vectorSearch") ||
      err?.message?.includes("index") ||
      err?.message?.includes("embedding") ||
      err?.code === 40324 ||
      err?.codeName === "CommandNotSupportedOnView";

    // ========================================
    // FALLBACK IF VECTOR SEARCH FAILS
    // ========================================

    if (isVectorSearchIssue) {
      console.warn("[findTopCandidates] Falling back to regular MongoDB query");

      try {
        const fallback = await db
          .collection("candidates")
          .find({})
          .limit(limit)
          .toArray();

        return fallback.map((candidate: any) => ({
          _id: candidate._id.toString(),
          name: candidate.name || "Unknown",
          email: candidate.email || "",
          skills: Array.isArray(candidate.skills) ? candidate.skills : [],
          experience_years:
            typeof candidate.experience_years === "number"
              ? candidate.experience_years
              : 0,
          summary: candidate.summary || "",
          score: 0.5,
        }));
      } catch (fallbackErr) {
        console.error("[findTopCandidates] Fallback failed:", fallbackErr);

        throw new Error(
          `Vector search failed and fallback failed: ${fallbackErr instanceof Error
            ? fallbackErr.message
            : String(fallbackErr)
          }`,
        );
      }
    }

    throw new Error(
      `Vector search failed: ${err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

// ========================================
// SEARCH CANDIDATES BY QUERY
// ========================================

export async function searchCandidatesByQuery(
  query: string,
  limit: number = 5,
): Promise<CandidateResult[]> {
  if (!query || query.trim().length === 0) {
    throw new Error("Search query cannot be empty");
  }

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // Generate query embedding
  const queryVector = await embedText(query);

  // Validate embedding
  if (!Array.isArray(queryVector)) {
    throw new Error("Embedding is not an array");
  }

  if (queryVector.length === 0) {
    throw new Error("Embedding array is empty");
  }

  console.log(
    "[searchCandidatesByQuery] Query embedding dimensions:",
    queryVector.length,
  );

  try {
    const results = await db
      .collection("candidates")
      .aggregate([
        {
          $vectorSearch: {
            index: VECTOR_INDEX_NAME,
            path: "embedding",
            queryVector,
            numCandidates: 50,
            limit,
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            email: 1,
            skills: 1,
            experience_years: 1,
            summary: 1,
            score: {
              $meta: "vectorSearchScore",
            },
          },
        },
      ])
      .toArray();

    return results.map((candidate: any) => ({
      _id: candidate._id.toString(),
      name: candidate.name || "Unknown",
      email: candidate.email || "",
      skills: Array.isArray(candidate.skills) ? candidate.skills : [],
      experience_years:
        typeof candidate.experience_years === "number"
          ? candidate.experience_years
          : 0,
      summary: candidate.summary || "",
      score: typeof candidate.score === "number" ? candidate.score : 0,
    }));
  } catch (err: any) {
    console.error("[searchCandidatesByQuery] Vector search error:", err);

    const isVectorSearchIssue =
      err?.message?.includes("$vectorSearch") ||
      err?.message?.includes("index") ||
      err?.message?.includes("embedding") ||
      err?.code === 40324 ||
      err?.codeName === "CommandNotSupportedOnView";

    // ========================================
    // FALLBACK IF VECTOR SEARCH FAILS
    // ========================================

    if (isVectorSearchIssue) {
      console.warn(
        "[searchCandidatesByQuery] Falling back to regular MongoDB query",
      );

      try {
        const fallback = await db
          .collection("candidates")
          .find({})
          .limit(limit)
          .toArray();

        return fallback.map((candidate: any) => ({
          _id: candidate._id.toString(),
          name: candidate.name || "Unknown",
          email: candidate.email || "",
          skills: Array.isArray(candidate.skills) ? candidate.skills : [],
          experience_years:
            typeof candidate.experience_years === "number"
              ? candidate.experience_years
              : 0,
          summary: candidate.summary || "",
          score: 0.5,
        }));
      } catch (fallbackErr) {
        console.error(
          "[searchCandidatesByQuery] Fallback failed:",
          fallbackErr,
        );

        throw new Error(
          `Vector search failed and fallback failed: ${fallbackErr instanceof Error
            ? fallbackErr.message
            : String(fallbackErr)
          }`,
        );
      }
    }

    throw new Error(
      `Candidate search failed: ${err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
