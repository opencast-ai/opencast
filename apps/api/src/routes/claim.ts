import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { hashApiKey } from "../auth.js";
import { microsToCoinNumber } from "../constants.js";

export async function registerClaimRoutes(app: FastifyInstance) {
  app.get("/claim/:token", async (req, reply) => {
    const params = z.object({ token: z.string().min(1) }).parse(req.params);

    const agent = await prisma.agent.findUnique({
      where: { claimToken: params.token },
      select: {
        id: true,
        displayName: true,
        balanceMicros: true,
        claimedById: true,
        claimedBy: {
          select: {
            xHandle: true,
            xName: true
          }
        }
      }
    });

    if (!agent) {
      return reply.status(404).send({ error: { message: "Invalid claim token" } });
    }

    return {
      agentId: agent.id,
      displayName: agent.displayName,
      balanceCoin: microsToCoinNumber(agent.balanceMicros),
      claimed: agent.claimedById !== null,
      claimedBy: agent.claimedBy
        ? {
            xHandle: agent.claimedBy.xHandle,
            xName: agent.claimedBy.xName
          }
        : null
    };
  });

  app.post("/claim/:token", async (req, reply) => {
    const params = z.object({ token: z.string().min(1) }).parse(req.params);

    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey !== "string" || apiKey.length < 10) {
      return reply.status(401).send({ error: { message: "Missing or invalid x-api-key. Login with X first." } });
    }

    const keyHash = hashApiKey(apiKey);
    const keyMatch = await prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null, userId: { not: null } },
      select: { userId: true }
    });

    if (!keyMatch || !keyMatch.userId) {
      return reply.status(401).send({ error: { message: "API key must belong to a human account. Login with X first." } });
    }

    const agent = await prisma.agent.findUnique({
      where: { claimToken: params.token },
      select: {
        id: true,
        displayName: true,
        balanceMicros: true,
        claimedById: true
      }
    });

    if (!agent) {
      return reply.status(404).send({ error: { message: "Invalid claim token" } });
    }

    if (agent.claimedById) {
      return reply.status(409).send({ error: { message: "Agent has already been claimed" } });
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        claimedById: keyMatch.userId,
        claimedAt: new Date()
      },
      select: {
        id: true,
        displayName: true,
        balanceMicros: true,
        claimedBy: {
          select: {
            id: true,
            xHandle: true,
            xName: true
          }
        }
      }
    });

    return {
      success: true,
      agentId: updatedAgent.id,
      displayName: updatedAgent.displayName,
      balanceCoin: microsToCoinNumber(updatedAgent.balanceMicros),
      claimedBy: updatedAgent.claimedBy
        ? {
            userId: updatedAgent.claimedBy.id,
            xHandle: updatedAgent.claimedBy.xHandle,
            xName: updatedAgent.claimedBy.xName
          }
        : null
    };
  });

  app.get("/users/:id", async (req, reply) => {
    const params = z.object({ id: z.string().uuid() }).parse(req.params);

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        createdAt: true,
        xHandle: true,
        xName: true,
        xAvatar: true,
        xVerified: true,
        balanceMicros: true,
        claimedAgents: {
          select: {
            id: true,
            displayName: true,
            balanceMicros: true
          }
        }
      }
    });

    if (!user) {
      return reply.status(404).send({ error: { message: "User not found" } });
    }

    return {
      userId: user.id,
      createdAt: user.createdAt,
      xHandle: user.xHandle,
      xName: user.xName,
      xAvatar: user.xAvatar,
      xVerified: user.xVerified,
      balanceCoin: microsToCoinNumber(user.balanceMicros),
      claimedAgents: user.claimedAgents.map((a) => ({
        agentId: a.id,
        displayName: a.displayName,
        balanceCoin: microsToCoinNumber(a.balanceMicros)
      }))
    };
  });
}
