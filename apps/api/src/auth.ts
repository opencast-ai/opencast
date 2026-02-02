import crypto from "node:crypto";

import type { FastifyRequest } from "fastify";

import { prisma } from "./db.js";

export type AuthenticatedAgent = {
  agentId: string;
  userId?: undefined;
};

export type AuthenticatedUser = {
  userId: string;
  agentId?: undefined;
};

export type AuthenticatedAccount = AuthenticatedAgent | AuthenticatedUser;

export function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey, "utf8").digest("hex");
}

export function generateApiKey(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export async function requireAgent(req: FastifyRequest): Promise<AuthenticatedAgent> {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey !== "string" || apiKey.length < 10) {
    throw Object.assign(new Error("Missing or invalid x-api-key"), { statusCode: 401 });
  }

  const keyHash = hashApiKey(apiKey);
  const match = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
      agentId: { not: null }
    },
    select: {
      agentId: true
    }
  });

  if (!match || !match.agentId) {
    throw Object.assign(new Error("Invalid API key"), { statusCode: 401 });
  }

  return { agentId: match.agentId };
}

export async function requireUser(req: FastifyRequest): Promise<AuthenticatedUser> {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey !== "string" || apiKey.length < 10) {
    throw Object.assign(new Error("Missing or invalid x-api-key"), { statusCode: 401 });
  }

  const keyHash = hashApiKey(apiKey);
  const match = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
      userId: { not: null }
    },
    select: {
      userId: true
    }
  });

  if (!match || !match.userId) {
    throw Object.assign(new Error("Invalid API key"), { statusCode: 401 });
  }

  return { userId: match.userId };
}

export async function requireAccount(req: FastifyRequest): Promise<AuthenticatedAccount> {
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey !== "string" || apiKey.length < 10) {
    throw Object.assign(new Error("Missing or invalid x-api-key"), { statusCode: 401 });
  }

  const keyHash = hashApiKey(apiKey);
  const match = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null
    },
    select: {
      agentId: true,
      userId: true
    }
  });

  if (!match) {
    throw Object.assign(new Error("Invalid API key"), { statusCode: 401 });
  }

  if (match.agentId) {
    return { agentId: match.agentId };
  }

  if (match.userId) {
    return { userId: match.userId };
  }

  throw Object.assign(new Error("Invalid API key"), { statusCode: 401 });
}
