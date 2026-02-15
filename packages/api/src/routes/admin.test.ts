import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import Fastify from "fastify";
import { ZodError } from "zod";
import { registerAdminRoutes } from "./admin.js";
import { prisma } from "../db.js";
import { microsToCoinNumber } from "../constants.js";
import { settleMarket } from "../services/settlement.js";
import * as polymarket from "../services/polymarket.js";

// Set admin token for testing
process.env.ADMIN_TOKEN = "test_admin_token";

const ADMIN_TOKEN = "test_admin_token";

describe("Admin Routes", () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    app.setErrorHandler((err: unknown, _req: unknown, reply: { status: (code: number) => { send: (body: unknown) => void } }) => {
      if (err instanceof ZodError) {
        const message = (err as ZodError).errors.map((e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`).join(', ');
        reply.status(400).send({
          error: { message: `Validation error: ${message}` }
        });
        return;
      }
      throw err;
    });
    await registerAdminRoutes(app);
  });

  beforeEach(async () => {
    // Clean up test data in correct order
    await prisma.trade.deleteMany({
      where: {
        OR: [
          { user: { walletAddress: { startsWith: "test_" } } },
          { agent: { owner: { walletAddress: { startsWith: "test_" } } } }
        ]
      }
    });
    await prisma.position.deleteMany({
      where: {
        OR: [
          { user: { walletAddress: { startsWith: "test_" } } },
          { agent: { owner: { walletAddress: { startsWith: "test_" } } } }
        ]
      }
    });
    await prisma.apiKey.deleteMany({
      where: {
        OR: [
          { user: { walletAddress: { startsWith: "test_" } } },
          { agent: { owner: { walletAddress: { startsWith: "test_" } } } }
        ]
      }
    });
    await prisma.agent.deleteMany({
      where: { owner: { walletAddress: { startsWith: "test_" } } }
    });
    await prisma.marketPool.deleteMany({
      where: { market: { sourceSlug: { startsWith: "test-" } } }
    });
    await prisma.market.deleteMany({
      where: { sourceSlug: { startsWith: "test-" } }
    });
    await prisma.user.deleteMany({
      where: { walletAddress: { startsWith: "test_" } } 
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /admin/markets/forward", () => {
    it("should reject request without admin token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/forward",
        payload: { slugs: ["will-bitcoin-hit-100k"] }
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject invalid admin token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/forward",
        headers: { "x-admin-token": "wrong_token" },
        payload: { slugs: ["will-bitcoin-hit-100k"] }
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject empty slugs array", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/forward",
        headers: { "x-admin-token": ADMIN_TOKEN },
        payload: { slugs: [] }
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject too many slugs", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/forward",
        headers: { "x-admin-token": ADMIN_TOKEN },
        payload: { slugs: Array(11).fill("slug") }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /admin/markets/sync-status", () => {
    it("should reject request without admin token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/sync-status"
      });

      expect(response.statusCode).toBe(401);
    });

    it("should return sync results with admin token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/sync-status",
        headers: { "x-admin-token": ADMIN_TOKEN }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.checked).toBeDefined();
      expect(body.updated).toBeDefined();
      expect(body.resolved).toBeDefined();
      expect(body.errors).toBeDefined();
      expect(body.settlements).toBeDefined();
    });
  });

  describe("POST /admin/markets/settle", () => {
    it("should reject request without admin token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/settle",
        payload: { marketId: "123e4567-e89b-12d3-a456-426614174000", outcome: "YES" }
      });

      expect(response.statusCode).toBe(401);
    });

    it("should reject invalid market ID", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/settle",
        headers: { "x-admin-token": ADMIN_TOKEN },
        payload: { marketId: "invalid-uuid", outcome: "YES" }
      });

      expect(response.statusCode).toBe(400);
    });

    it("should reject invalid outcome", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/settle",
        headers: { "x-admin-token": ADMIN_TOKEN },
        payload: { marketId: "123e4567-e89b-12d3-a456-426614174000", outcome: "MAYBE" }
      });

      expect(response.statusCode).toBe(400);
    });

    it("should return error for non-existent market", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/markets/settle",
        headers: { "x-admin-token": ADMIN_TOKEN },
        payload: { marketId: "123e4567-e89b-12d3-a456-426614174000", outcome: "YES" }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /admin/resolve", () => {
    it("should reject request without admin token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/admin/resolve",
        payload: { marketId: "123e4567-e89b-12d3-a456-426614174000", outcome: "YES" }
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

describe.sequential("Settlement Service", () => {
  beforeEach(async () => {
    // Clean up only test data created by this describe block
    // Use specific wallet prefix to avoid interfering with other test files
    await prisma.trade.deleteMany({
      where: {
        OR: [
          { user: { walletAddress: { startsWith: "test_" } } },
          { agent: { owner: { walletAddress: { startsWith: "test_" } } } }
        ]
      }
    });
    await prisma.position.deleteMany({
      where: {
        OR: [
          { user: { walletAddress: { startsWith: "test_" } } },
          { agent: { owner: { walletAddress: { startsWith: "test_" } } } }
        ]
      }
    });
    await prisma.marketPool.deleteMany({
      where: { market: { sourceSlug: { startsWith: "test-" } } }
    });
    await prisma.market.deleteMany({
      where: { sourceSlug: { startsWith: "test-" } }
    });
    await prisma.apiKey.deleteMany({
      where: { 
        OR: [
          { user: { walletAddress: { startsWith: "test_" } } },
          { agent: { owner: { walletAddress: { startsWith: "test_" } } } }
        ]
      }
    });
    await prisma.agent.deleteMany({
      where: { owner: { walletAddress: { startsWith: "test_" } } }
    });
    await prisma.user.deleteMany({
      where: { walletAddress: { startsWith: "test_" } } 
    });
  });

  it("should settle market and pay winners", async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        walletAddress: "test_user_settle_1",
        xId: "test_settle_1",
        xHandle: "test",
        xName: "Test",
        balanceMicros: 100_000_000n // 100 coins
      }
    });

    // Create market
    const market = await prisma.market.create({
      data: {
        title: "Test Market",
        sourceSlug: "test-market-settle-1",
        status: "OPEN",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    // Create position (user has YES shares)
    await prisma.position.create({
      data: {
        userId: user.id,
        marketId: market.id,
        yesSharesMicros: 100_000_000n, // 100 YES shares
        noSharesMicros: 0n
      }
    });

    // Settle market YES
    const result = await settleMarket(market.id, "YES");

    expect(result.success).toBe(true);
    expect(result.outcome).toBe("YES");
    expect(result.payouts.length).toBe(1);
    expect(result.payouts[0]!.userId).toBe(user.id);
    expect(result.payouts[0]!.amountMicros).toBe(100_000_000n);

    // Verify user balance increased
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    expect(updatedUser?.balanceMicros).toBe(200_000_000n); // 100 + 100 payout

    // Verify market resolved
    const updatedMarket = await prisma.market.findUnique({
      where: { id: market.id }
    });
    expect(updatedMarket?.status).toBe("RESOLVED");
    expect(updatedMarket?.outcome).toBe("YES");
  });

  it("should be idempotent - calling twice does not double-pay", async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        walletAddress: "test_user_settle_2",
        xId: "test_settle_2",
        xHandle: "test",
        xName: "Test",
        balanceMicros: 100_000_000n
      }
    });

    // Create market
    const market = await prisma.market.create({
      data: {
        title: "Test Market",
        sourceSlug: "test-market-settle-2",
        status: "OPEN",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    // Create position
    await prisma.position.create({
      data: {
        userId: user.id,
        marketId: market.id,
        yesSharesMicros: 100_000_000n,
        noSharesMicros: 0n
      }
    });

    // First settlement
    const result1 = await settleMarket(market.id, "YES");
    expect(result1.success).toBe(true);
    expect(result1.payouts.length).toBe(1);

    // Second settlement (should be idempotent)
    const result2 = await settleMarket(market.id, "YES");
    expect(result2.success).toBe(true);
    expect(result2.payouts.length).toBe(0); // No payouts on second call
    expect(result2.error).toContain("already resolved");

    // Verify user balance only increased once
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    expect(updatedUser?.balanceMicros).toBe(200_000_000n); // Still just 100 + 100
  });

  it("should pay agent owner (shared trader account)", async () => {
    // Create owner user
    const owner = await prisma.user.create({
      data: {
        walletAddress: "test_owner_settle",
        xId: "test_owner_settle",
        xHandle: "test",
        xName: "Test Owner",
        balanceMicros: 100_000_000n
      }
    });

    // Create agent linked to owner
    const agent = await prisma.agent.create({
      data: {
        displayName: "Test Agent",
        ownerUserId: owner.id,
        balanceMicros: 0n
      }
    });

    // Create market
    const market = await prisma.market.create({
      data: {
        title: "Test Market",
        sourceSlug: "test-market-agent-settle",
        status: "OPEN",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    // Create position for agent
    await prisma.position.create({
      data: {
        agentId: agent.id,
        marketId: market.id,
        yesSharesMicros: 50_000_000n, // 50 YES shares
        noSharesMicros: 0n
      }
    });

    // Settle market YES
    const result = await settleMarket(market.id, "YES");

    expect(result.success).toBe(true);
    expect(result.payouts.length).toBe(1);
    expect(result.payouts[0]!.userId).toBe(owner.id); // Paid to owner, not agent
    expect(result.payouts[0]!.amountMicros).toBe(50_000_000n);

    // Verify owner balance increased
    const updatedOwner = await prisma.user.findUnique({
      where: { id: owner.id }
    });
    expect(updatedOwner?.balanceMicros).toBe(150_000_000n); // 100 + 50 payout
  });

  it("should not pay losers", async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        walletAddress: "test_user_settle_3",
        xId: "test_settle_3",
        xHandle: "test",
        xName: "Test",
        balanceMicros: 100_000_000n
      }
    });

    // Create market
    const market = await prisma.market.create({
      data: {
        title: "Test Market",
        sourceSlug: "test-market-settle-3",
        status: "OPEN",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    // Create position (user has YES shares, market resolves NO)
    await prisma.position.create({
      data: {
        userId: user.id,
        marketId: market.id,
        yesSharesMicros: 100_000_000n, // 100 YES shares
        noSharesMicros: 0n
      }
    });

    // Settle market NO
    const result = await settleMarket(market.id, "NO");

    expect(result.success).toBe(true);
    expect(result.payouts.length).toBe(0); // No payouts - user had YES, market resolved NO

    // Verify user balance unchanged
    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    expect(updatedUser?.balanceMicros).toBe(100_000_000n); // No change
  });

  it("should zero out positions after settlement", async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        walletAddress: "test_user_settle_4",
        xId: "test_settle_4",
        xHandle: "test",
        xName: "Test",
        balanceMicros: 100_000_000n
      }
    });

    // Create market
    const market = await prisma.market.create({
      data: {
        title: "Test Market",
        sourceSlug: "test-market-settle-4",
        status: "OPEN",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    // Create position
    await prisma.position.create({
      data: {
        userId: user.id,
        marketId: market.id,
        yesSharesMicros: 100_000_000n,
        noSharesMicros: 0n
      }
    });

    // Settle market
    await settleMarket(market.id, "YES");

    // Verify position zeroed out
    const position = await prisma.position.findFirst({
      where: { userId: user.id, marketId: market.id }
    });
    expect(position?.yesSharesMicros).toBe(0n);
    expect(position?.noSharesMicros).toBe(0n);
  });

  it("should reject settlement with different outcome if already resolved", async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        walletAddress: "test_user_settle_5",
        xId: "test_settle_5",
        xHandle: "test",
        xName: "Test",
        balanceMicros: 100_000_000n
      }
    });

    // Create market
    const market = await prisma.market.create({
      data: {
        title: "Test Market",
        sourceSlug: "test-market-settle-5",
        status: "OPEN",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    // Create position
    await prisma.position.create({
      data: {
        userId: user.id,
        marketId: market.id,
        yesSharesMicros: 100_000_000n,
        noSharesMicros: 0n
      }
    });

    // Settle market YES
    await settleMarket(market.id, "YES");

    // Try to settle with different outcome
    const result = await settleMarket(market.id, "NO");

    expect(result.success).toBe(false);
    expect(result.error).toContain("already resolved with different outcome");
  });

  it("should return error for non-existent market", async () => {
    const result = await settleMarket("123e4567-e89b-12d3-a456-426614174000", "YES");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Market not found");
  });
});

describe("isMarketOpen", () => {
  it("should return true for open market", async () => {
    const { isMarketOpen } = await import("../services/settlement.js");
    
    const market = await prisma.market.create({
      data: {
        title: "Open Market",
        sourceSlug: "test-open-market",
        status: "OPEN",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    const isOpen = await isMarketOpen(market.id);
    expect(isOpen).toBe(true);
  });

  it("should return false for resolved market", async () => {
    const { isMarketOpen } = await import("../services/settlement.js");
    
    const market = await prisma.market.create({
      data: {
        title: "Resolved Market",
        sourceSlug: "test-resolved-market",
        status: "RESOLVED",
        outcome: "YES",
        pool: {
          create: {
            collateralMicros: 0n,
            yesSharesMicros: 500_000_000n,
            noSharesMicros: 500_000_000n,
            feeBps: 100
          }
        }
      }
    });

    const isOpen = await isMarketOpen(market.id);
    expect(isOpen).toBe(false);
  });
});
