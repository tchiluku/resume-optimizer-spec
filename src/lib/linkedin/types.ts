export type LinkedInInput = { resumeText: string; jobDescription: string };

export type LinkedInPrompt = { system: string; user: string };

export type LinkedInRawDraft = { headline: string; about: string };

export type LinkedInDraft = LinkedInRawDraft & {
  headlineError?: string;
  unresolved: boolean;
};

export type LinkedInModelResult =
  | { type: "output"; data: unknown }
  | { type: "refusal"; reason: string };

export interface LinkedInModel {
  readonly mode: "ai" | "demo";
  generate(prompt: LinkedInPrompt, signal: AbortSignal, input: LinkedInInput): Promise<LinkedInModelResult>;
}

export type LinkedInErrorCode = "ai_unavailable" | "invalid_output" | "refused";

export type LinkedInOutcome =
  | { ok: true; draft: LinkedInDraft }
  | { ok: false; error: { code: LinkedInErrorCode; message: string } };
