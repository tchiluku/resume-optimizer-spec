import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { AI_MAX_OUTPUT_TOKENS, AI_TIMEOUT_MS } from "@/lib/limits";
import { MODEL_ID } from "@/lib/step1/anthropic";
import type { LinkedInModel, LinkedInModelResult, LinkedInPrompt } from "./types";
import { LinkedInOutputSchema } from "./validate";

export function anthropicLinkedInModel(apiKey: string): LinkedInModel {
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: AI_TIMEOUT_MS });
  return {
    mode: "ai",
    async generate(prompt: LinkedInPrompt, signal: AbortSignal): Promise<LinkedInModelResult> {
      const response = await client.beta.messages.parse(
        {
          model: MODEL_ID,
          max_tokens: AI_MAX_OUTPUT_TOKENS,
          system: prompt.system,
          messages: [{ role: "user", content: prompt.user }],
          output_config: { effort: "low", format: betaZodOutputFormat(LinkedInOutputSchema) },
          fallbacks: "default",
          betas: ["server-side-fallback-2026-07-01"],
        },
        { signal },
      );
      if (response.stop_reason === "refusal") {
        return { type: "refusal", reason: response.stop_details?.explanation || "The AI declined to write a LinkedIn draft." };
      }
      return { type: "output", data: response.parsed_output ?? null };
    },
  };
}

export const demoLinkedInModel: LinkedInModel = {
  mode: "demo",
  async generate(_prompt, _signal, input) {
    const title = input.jobDescription.split(/\r?\n/, 1)[0].trim().slice(0, 80) || "Target Role";
    return {
      type: "output",
      data: {
        headline: `${title} | Skills from resume / Relevant experience | Focused on practical contributions`,
        about: [
          `I am exploring the ${title} opportunity, with experience described in my resume.`,
          "My background reflects the skills and work history included in my resume, with no additional claims added in this simulated draft.",
          "I welcome the opportunity to connect.",
        ].join("\n\n"),
      },
    };
  },
};
