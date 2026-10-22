import { describe, expect, it, vi } from "vitest";
import { runLinkedInDraft } from "@/lib/linkedin/run";
import { validateLinkedInDraft } from "@/lib/linkedin/validate";
import type { LinkedInModel } from "@/lib/linkedin/types";

const validDraft = {
  headline: "Senior Operations Analyst | Forecasting / Supply Chain | Improving operations through data",
  about: [
    "I am an operations analyst with experience supporting supply chain teams.",
    "My background includes reporting, vendor coordination, and process improvement.",
    "I welcome the opportunity to connect.",
  ].join("\n\n"),
};

describe("LinkedIn draft validation", () => {
  it("test_headline_max_220_and_pipe_format", () => {
    const prefix = "Target Title | Core Skill / Specialization | ";
    const atLimit = `${prefix}${"x".repeat(220 - prefix.length)}`;
    expect(atLimit).toHaveLength(220);
    expect(validateLinkedInDraft({ ...validDraft, headline: atLimit }).ok).toBe(true);
    expect(validateLinkedInDraft({ ...validDraft, headline: "A headline without the required sections" }).ok).toBe(false);
  });

  it("test_overlong_headline_regenerates_then_flags_never_truncates", async () => {
    const overlongHeadline = `${validDraft.headline}${"x".repeat(221)}`;
    const model: LinkedInModel = {
      mode: "ai",
      generate: vi.fn().mockResolvedValue({ type: "output", data: { ...validDraft, headline: overlongHeadline } }),
    };

    const outcome = await runLinkedInDraft({ resumeText: "Operations analyst.", jobDescription: "Senior Operations Analyst" }, model, {
      sleep: async () => {},
    });

    expect(model.generate).toHaveBeenCalledTimes(2);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.draft.headline).toBe(overlongHeadline);
      expect(outcome.draft.headlineError).toMatch(/220/);
      expect(outcome.draft.unresolved).toBe(true);
    }
  });

  it("test_linkedin_model_refusal_is_reported_without_retry", async () => {
    const model: LinkedInModel = {
      mode: "ai",
      generate: vi.fn().mockResolvedValue({ type: "refusal", reason: "The request cannot be completed." }),
    };
    const outcome = await runLinkedInDraft({ resumeText: "Resume", jobDescription: "Job" }, model, { sleep: async () => {} });

    expect(outcome).toEqual({
      ok: false,
      error: { code: "refused", message: "The AI declined to write this LinkedIn draft: The request cannot be completed." },
    });
    expect(model.generate).toHaveBeenCalledTimes(1);
  });

  it("test_about_three_paragraphs_validator", () => {
    expect(validateLinkedInDraft(validDraft).ok).toBe(true);
    expect(validateLinkedInDraft({ ...validDraft, about: "I work in operations.\n\nI support teams." }).ok).toBe(false);
  });

  it("eval_about_first_person_and_cta", () => {
    const thirdPerson = validDraft.about
      .replace("I am an operations analyst", "An operations analyst")
      .replace("My background", "The background")
      .replace("I welcome the opportunity", "The opportunity");
    expect(validateLinkedInDraft({ ...validDraft, about: thirdPerson }).ok).toBe(false);
    expect(validateLinkedInDraft({ ...validDraft, about: validDraft.about.replace("I welcome the opportunity to connect.", "I hope to contribute to your team.") }).ok).toBe(false);
    expect(validateLinkedInDraft({
      ...validDraft,
      about: validDraft.about.replace("My background", "The background"),
    }).ok).toBe(false);
  });

  it("test_about_max_2600_chars", () => {
    const paragraphs = validDraft.about.split("\n\n");
    const prefix = `${paragraphs[0]}\n\n${paragraphs[1]}\n\n`;
    const finalCallToAction = "I welcome the opportunity to connect.";
    const exactLimit = `${prefix}${"x".repeat(2600 - prefix.length - finalCallToAction.length - 1)} ${finalCallToAction}`;
    expect(exactLimit).toHaveLength(2600);
    expect(validateLinkedInDraft({ ...validDraft, about: exactLimit }).ok).toBe(true);
    expect(validateLinkedInDraft({ ...validDraft, about: `${exactLimit.slice(0, -finalCallToAction.length)}x${finalCallToAction}` }).ok).toBe(false);
  });
});
