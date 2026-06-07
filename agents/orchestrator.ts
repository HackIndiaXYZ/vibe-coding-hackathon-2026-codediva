import { runIntakeAgent, ParsedCandidate } from "./intakeAgent";
import { runEvaluationAgent, EvaluatedCandidate } from "./evaluationAgent";
import { generateOutreachEmails, OutreachEmail } from "./actionAgent";

export interface OrchestratorResult {
  ingested: Array<{ id: string } & ParsedCandidate>;
  evaluated: EvaluatedCandidate[];
  emails: OutreachEmail[];
}

export async function runFullPipeline(
  resumeBuffers: Array<{ buffer: Buffer; filename: string }>,
  jdText: string,
  jobId: string,
  jobTitle: string,
  companyName: string,
): Promise<OrchestratorResult> {
  console.log(
    `[Orchestrator] Step 1: Ingesting ${resumeBuffers.length} resumes...`,
  );
  const ingested = await Promise.all(
    resumeBuffers.map(({ buffer, filename }) =>
      runIntakeAgent(buffer, filename),
    ),
  );
  console.log(`[Orchestrator] ✓ ${ingested.length} candidates stored`);

  console.log(`[Orchestrator] Step 2: Evaluating against JD...`);
  const evaluated = await runEvaluationAgent(jdText, jobId);
  console.log(`[Orchestrator] ✓ ${evaluated.length} candidates ranked`);

  console.log(`[Orchestrator] Step 3: Generating outreach emails...`);
  const top10 = evaluated.slice(0, 10);
  const emails = await generateOutreachEmails(top10, jobTitle, companyName);
  console.log(`[Orchestrator] ✓ ${emails.length} emails drafted`);

  return { ingested, evaluated, emails };
}
