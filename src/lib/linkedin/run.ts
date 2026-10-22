import { AI_TIMEOUT_MS } from "@/lib/limits";
import { buildLinkedInPrompt } from "./prompt";
import type { LinkedInInput, LinkedInModel, LinkedInModelResult, LinkedInOutcome, LinkedInPrompt } from "./types";
import { MAX_LINKEDIN_HEADLINE_CHARS, validateLinkedInDraft } from "./validate";

export type LinkedInRunOptions = {
  timeoutMs?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function callWithTimeout(
  model: LinkedInModel,
  prompt: LinkedInPrompt,
  input: LinkedInInput,
  timeoutMs: number,
): Promise<LinkedInModelResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error("timeout"));
    }, timeoutMs);
  });
  try {
    return await Promise.race([model.generate(prompt, controller.signal, input), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function runLinkedInDraft(
  input: LinkedInInput,
  model: LinkedInModel,
  options: LinkedInRunOptions = {},
): Promise<LinkedInOutcome> {
  const prompt = buildLinkedInPrompt(input);
  const sleep = options.sleep ?? defaultSleep;
  const timeoutMs = options.timeoutMs ?? AI_TIMEOUT_MS;

  for (let attempt = 0; attempt < 2; attempt++) {
    let result: LinkedInModelResult;
    try {
      result = await callWithTimeout(model, prompt, input, timeoutMs);
    } catch {
      if (attempt === 0) {
        await sleep(options.backoffMs ?? 2000);
        continue;
      }
      return {
        ok: false,
        error: { code: "ai_unavailable", message: "The LinkedIn draft service didn't respond. Please try again in a minute." },
      };
    }

    if (result.type === "refusal") {
      return { ok: false, error: { code: "refused", message: `The AI declined to write this LinkedIn draft: ${result.reason}` } };
    }

    const checked = validateLinkedInDraft(result.data);
    if (!checked.ok) {
      if (attempt === 0) continue;
      return {
        ok: false,
        error: { code: "invalid_output", message: "The LinkedIn draft didn't pass its quality checks. Please try again." },
      };
    }

    if (checked.draft.headline.length > MAX_LINKEDIN_HEADLINE_CHARS && attempt === 0) continue;
    return { ok: true, draft: checked.draft };
  }

  return {
    ok: false,
    error: { code: "invalid_output", message: "The LinkedIn draft didn't pass its quality checks. Please try again." },
  };
}
