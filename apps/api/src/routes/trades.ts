import type { FastifyInstance } from "fastify";

import { requireAccount } from "../auth.js";
import { executeTrade } from "../services/executeTrade.js";

export async function registerTradeRoutes(app: FastifyInstance) {
  app.post("/trades", async (req) => {
    const account = await requireAccount(req);

    return executeTrade({
      account,
      body: req.body
    });
  });
}
