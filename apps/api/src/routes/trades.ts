import type { FastifyInstance } from "fastify";

import { requireAccount } from "../auth.js";
import { executeTrade } from "../services/executeTrade.js";

export async function registerTradeRoutes(app: FastifyInstance) {
  app.post("/trades", {
    schema: {
      tags: ["Trading"],
      summary: "Execute a trade",
      description: "Buy YES or NO shares in a market using your balance",
      security: [{ apiKey: [] }]
    }
  }, async (req) => {
    const account = await requireAccount(req);

    return executeTrade({
      account,
      body: req.body
    });
  });
}
