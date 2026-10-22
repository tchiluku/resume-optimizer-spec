// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import Analyzer from "@/components/Analyzer";
import { JOB_DESCRIPTION, RESUME_TEXT } from "../helpers/fixtures";

const LINKEDIN_DRAFT = {
  headline: "Senior Operations Analyst | Forecasting / Supply Chain | Improving operations through data",
  about: [
    "I am an operations analyst with experience supporting supply chain teams.",
    "My background includes reporting, vendor coordination, and process improvement.",
    "I welcome the opportunity to connect.",
  ].join("\n\n"),
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("LinkedIn draft UI", () => {
  it("test_linkedin_draft_requires_confirmed_resume_and_valid_job_description", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
      fileType: "pdf",
      text: RESUME_TEXT,
      hiddenText: [],
      pageCount: 1,
    }))));
    render(<Analyzer demoMode={true} />);

    const button = screen.getByRole("button", { name: /create linkedin profile draft/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await user.upload(
      screen.getByLabelText(/resume file/i),
      new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" }),
    );
    await user.click(await screen.findByLabelText(/i've checked this text/i));
    expect(button.disabled).toBe(true);
    await user.click(screen.getByLabelText(/^job description/i));
    await user.paste(JOB_DESCRIPTION);
    expect(button.disabled).toBe(false);
  });

  it("test_linkedin_draft_displays_three_paragraphs_and_demo_label", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async (_url: string, options?: RequestInit) => {
      if (
        options?.headers &&
        (options.headers as Record<string, string>)["content-type"] === "application/json" &&
        options.body &&
        JSON.parse(String(options.body)).task === "linkedin"
      ) {
        return new Response(JSON.stringify({ draft: { ...LINKEDIN_DRAFT, unresolved: false }, mode: "demo" }));
      }
      return new Response(JSON.stringify({
        fileType: "pdf",
        text: RESUME_TEXT,
        hiddenText: [],
        pageCount: 1,
      }));
    }));
    render(<Analyzer demoMode={true} />);
    await user.upload(
      screen.getByLabelText(/resume file/i),
      new File(["%PDF-1.7"], "resume.pdf", { type: "application/pdf" }),
    );
    await user.click(await screen.findByLabelText(/i've checked this text/i));
    await user.click(screen.getByLabelText(/^job description/i));
    await user.paste(JOB_DESCRIPTION);
    await user.click(screen.getByRole("button", { name: /create linkedin profile draft/i }));

    expect(await screen.findByRole("heading", { name: /linkedin profile draft/i })).toBeTruthy();
    expect(screen.getByText(/simulated linkedin draft/i)).toBeTruthy();
    expect(screen.getByText(LINKEDIN_DRAFT.headline)).toBeTruthy();
    expect(screen.getByText(/I am an operations analyst/).textContent?.split("\n\n")).toHaveLength(3);
    expect(screen.getByText(/I welcome the opportunity to connect/)).toBeTruthy();
  });
});
