import { describe, expect, it, vi } from "vitest";
import { createAnalyzeHandler } from "@/lib/api/analyze";
import { RateLimiter } from "@/lib/rateLimit";
import type { Step1Model } from "@/lib/step1/types";
import type { LinkedInModel } from "@/lib/linkedin/types";

const draft = {
  headline: "Senior Analyst | SQL / Reporting | Turning data into clear decisions",
  about: "I am an analyst.\n\nMy experience includes reporting.\n\nI welcome the opportunity to connect.",
};

function createHandler(linkedinModel: LinkedInModel) {
  const step1Model: Step1Model = {
    mode: "ai",
    generate: vi.fn(),
  };
  return {
    step1Model,
    handler: createAnalyzeHandler({
      model: step1Model,
      linkedinModel,
      hourlyLimiter: new RateLimiter({ limit: 10, windowMs: 60_000 }),
      dailyCap: new RateLimiter({ limit: 10, windowMs: 60_000 }),
      runOptions: { sleep: async () => {} },
    }),
  };
}

function request(body: unknown) {
  return new Request("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "x-forwarded-for": "203.0.113.15",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/analyze LinkedIn story", () => {
  it("test_linkedin_story_returns_a_valid_draft_without_running_step1", async () => {
    const linkedinModel: LinkedInModel = {
      mode: "ai",
      generate: vi.fn().mockResolvedValue({ type: "output", data: draft }),
    };
    const { handler, step1Model } = createHandler(linkedinModel);
    const response = await handler(request({
      task: "linkedin",
      confirmed: true,
      resumeText: "Operations analyst with SQL reporting experience.",
      jobDescription: "Senior Operations Analyst " + "x".repeat(300),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ draft: { ...draft, unresolved: false }, mode: "ai" });
    expect(linkedinModel.generate).toHaveBeenCalledTimes(1);
    expect(step1Model.generate).not.toHaveBeenCalled();
  });
});
