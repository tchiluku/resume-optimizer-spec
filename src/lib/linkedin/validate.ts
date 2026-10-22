import { z } from "zod";
import type { LinkedInDraft, LinkedInRawDraft } from "./types";

export const MAX_LINKEDIN_HEADLINE_CHARS = 220;
export const MAX_LINKEDIN_ABOUT_CHARS = 2600;

export const LinkedInOutputSchema = z.object({
  headline: z.string(),
  about: z.string(),
});

type Validation = { ok: true; draft: LinkedInDraft } | { ok: false; problems: string[] };

const HEADLINE_FORMAT = /^[^|]+\s\|\s[^|/]+\s\/\s[^|]+\s\|\s.+$/;
const FIRST_PERSON = /\b(i|me|my|mine|we|us|our|ours)\b/i;
const CALL_TO_ACTION_END = /\b(connect|reach out|contact me|let's connect|lets connect|discuss opportunities|discuss this further|discuss the role)[.!?]*$/i;

export function validateLinkedInDraft(raw: unknown): Validation {
  const parsed = LinkedInOutputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, problems: ["output does not match the expected shape"] };

  const value: LinkedInRawDraft = {
    headline: parsed.data.headline.trim(),
    about: parsed.data.about.trim(),
  };
  const paragraphs = value.about.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const problems: string[] = [];

  if (!HEADLINE_FORMAT.test(value.headline)) problems.push("headline does not use the required pipe-separated format");
  if (paragraphs.length !== 3) problems.push("About section must contain exactly three paragraphs");
  if (paragraphs.some((paragraph) => !FIRST_PERSON.test(paragraph))) {
    problems.push("each About paragraph must be written in first person");
  }
  if (value.about.length > MAX_LINKEDIN_ABOUT_CHARS) problems.push("About section exceeds 2,600 characters");
  if (!CALL_TO_ACTION_END.test(paragraphs[2] ?? "")) problems.push("final About paragraph must end with a call to action");

  if (problems.length > 0) return { ok: false, problems };

  const headlineError =
    value.headline.length > MAX_LINKEDIN_HEADLINE_CHARS
      ? `Headline is ${value.headline.length} characters; the maximum is 220. Review this unresolved item.`
      : undefined;

  return {
    ok: true,
    draft: {
      ...value,
      ...(headlineError ? { headlineError } : {}),
      unresolved: Boolean(headlineError),
    },
  };
}
