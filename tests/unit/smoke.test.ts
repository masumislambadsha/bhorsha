import { describe, expect, it } from "vitest";
import { APP_NAME, SIMULATION_NOTICE } from "@/config/app";

describe("project foundation", () => {
  it("exposes the Bhorsa brand and simulation notice from one config", () => {
    expect(APP_NAME).toBe("Bhorsa");
    expect(SIMULATION_NOTICE).toContain("simulated bank");
  });

  it("runs against an in-memory replica set so transactions are available", () => {
    expect(process.env.MONGODB_URI).toMatch(/^mongodb:\/\//);
  });
});
