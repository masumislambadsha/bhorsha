import { beforeEach, describe, expect, it, vi } from "vitest";

const getRequestSession = vi.hoisted(() => vi.fn());
vi.mock("@/server/auth/session", () => ({ getRequestSession }));

import { withHandler } from "@/server/http/handler";

const route = withHandler({ roles: ["customer"] as const }, async ({ actor }) => {
  return Response.json({ id: actor?.id ?? null });
});

function request() {
  return new Request("http://localhost:3000/api/test");
}

async function bodyOf(response: Response) {
  return (await response.json()) as { error?: { code?: string } };
}

describe("withHandler 401/403 behavior", () => {
  beforeEach(() => getRequestSession.mockReset());

  it("returns 401 when there is no session", async () => {
    getRequestSession.mockResolvedValue(null);
    const response = await route(request(), { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
    expect((await bodyOf(response)).error?.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when the role is not allowed", async () => {
    getRequestSession.mockResolvedValue({ user: { id: "a1", role: "admin" } } as never);
    const response = await route(request(), { params: Promise.resolve({}) });
    expect(response.status).toBe(403);
    expect((await bodyOf(response)).error?.code).toBe("FORBIDDEN");
  });

  it("runs the handler for the allowed role", async () => {
    getRequestSession.mockResolvedValue({ user: { id: "c1", role: "customer" } } as never);
    const response = await route(request(), { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "c1" });
  });
});
