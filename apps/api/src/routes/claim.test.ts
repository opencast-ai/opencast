import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildServer } from "../server.js";

const mockPrisma = vi.hoisted(() => ({
  agent: {
    findUnique: vi.fn(),
    update: vi.fn()
  },
  user: {
    findFirst: vi.fn(),
    create: vi.fn()
  }
}));

vi.mock("../db.js", () => ({
  prisma: mockPrisma
}));

describe("claim routes", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("rejects invalid tweet urls", async () => {
    mockPrisma.agent.findUnique.mockResolvedValue({
      id: "agent_1",
      displayName: "Agent One",
      balanceMicros: 100_000n,
      claimedById: null
    });

    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: "/claim/token_123",
      payload: { tweetUrl: "https://example.com/status/123" }
    });
    await app.close();

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload) as { error: { message: string } };
    expect(body.error.message).toBe("Tweet URL must be a valid x.com/twitter.com status link.");
  });

  it("claims agent when tweet proof is valid", async () => {
    const token = "token_456";
    mockPrisma.agent.findUnique.mockResolvedValue({
      id: "agent_2",
      displayName: "Agent Two",
      balanceMicros: 200_000n,
      claimedById: null
    });
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user_1",
      xHandle: "testhandle",
      xName: "Test Handle"
    });
    mockPrisma.agent.update.mockResolvedValue({
      id: "agent_2",
      displayName: "Agent Two",
      balanceMicros: 200_000n,
      claimedBy: {
        id: "user_1",
        xHandle: "testhandle",
        xName: "Test Handle"
      }
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        author_name: "Test Handle",
        author_url: "https://twitter.com/TestHandle",
        html: `Claiming: https://molt-predict.vercel.app/#/claim/${token}`
      })
    });

    const app = buildServer();
    const response = await app.inject({
      method: "POST",
      url: `/claim/${token}`,
      payload: { tweetUrl: "https://x.com/TestHandle/status/123" }
    });
    await app.close();

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload) as { success: boolean; claimedBy: { xHandle: string } };
    expect(body.success).toBe(true);
    expect(body.claimedBy.xHandle).toBe("testhandle");
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        xHandle: "testhandle",
        xId: "x_testhandle"
      })
    });
  });
});
