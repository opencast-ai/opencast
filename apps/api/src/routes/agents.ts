import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { generateApiKey, hashApiKey } from "../auth.js";
import { prisma } from "../db.js";
import { STARTING_BALANCE_MICROS, microsToCoinNumber } from "../constants.js";

export async function registerAgentRoutes(app: FastifyInstance) {
  app.post("/agents/register", async (req) => {
    const body = z
      .object({
        displayName: z.string().min(1).max(64).optional()
      })
      .optional()
      .parse(req.body);

    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);

    const agent = await prisma.agent.create({
      data: {
        displayName: body?.displayName,
        balanceMicros: STARTING_BALANCE_MICROS,
        apiKeys: {
          create: {
            keyHash
          }
        }
      },
      select: {
        id: true,
        balanceMicros: true
      }
    });

    return {
      agentId: agent.id,
      apiKey,
      balanceCoin: microsToCoinNumber(agent.balanceMicros)
    };
  });
}
