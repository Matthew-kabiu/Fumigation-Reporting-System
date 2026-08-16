import { describe, expect, it } from "vitest";
import { canTransition, validSchedule } from "./jobPolicy";

describe("job lifecycle policy", () => {
  it("allows only reviewable jobs to be approved or rejected", () => {
    expect(canTransition("approve", "under_review")).toBe(true);
    expect(canTransition("reject", "under_review")).toBe(true);
    expect(canTransition("approve", "assigned")).toBe(false);
  });

  it("does not reopen terminal work", () => {
    expect(canTransition("assign", "cancelled")).toBe(false);
    expect(canTransition("reschedule", "closed")).toBe(false);
    expect(canTransition("close", "accepted")).toBe(true);
  });

  it("requires finite increasing schedule bounds", () => {
    expect(validSchedule(100, 200)).toBe(true);
    expect(validSchedule(200, 100)).toBe(false);
    expect(validSchedule(Number.NaN, 100)).toBe(false);
  });
});
