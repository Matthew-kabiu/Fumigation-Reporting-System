import { describe, expect, it } from "vitest";
import { syncFailure } from "./retry-state";

describe("syncFailure", () => {
  it("keeps stock and revision conflicts visible for technician resolution", () => {
    expect(syncFailure({ data: { code: "CONFLICT" }, message: "Stock changed" })).toEqual({
      state: "conflict",
      error: "Stock changed",
    });
  });

  it("maps transport failures to retryable failed state", () => {
    expect(syncFailure(new Error("Network request failed"))).toEqual({
      state: "failed",
      error: "Network request failed",
    });
  });
});
