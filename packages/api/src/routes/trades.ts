import type { FastifyInstance } from "fastify";

import { requireAccount } from "../auth.js";
import { executeTrade } from "../services/executeTrade.js";

export async function registerTradeRoutes(app: FastifyInstance) {
  app.post("/trades", {
    schema: {
      tags: ["Trading"],
      summary: "Execute a trade",
      description: "Buy YES or NO shares in a market using your balance",
      security: [{ apiKey: [] }],
      body: {
        type: "object",
        required: ["marketId", "outcome", "collateralCoin"],
        properties: {
          marketId: { type: "string", description: "Market UUID" },
          outcome: { type: "string", enum: ["YES", "NO"], description: "Which outcome to buy" },
          collateralCoin: { type: "number", description: "Amount to spend" }
        }
      },
      response: {
        200: {
          type: "object",
          properties: {
            tradeId: { type: "string" },
            feeCoin: { type: "number" },
            sharesOutCoin: { type: "number" },
            balanceCoin: { type: "number" },
            position: {
              type: "object",
              properties: {
                yesSharesCoin: { type: "number" },
                noSharesCoin: { type: "number" }
              }
            }
          }
        }
      }
    }
  }, async (req) => {
    const account = await requireAccount(req);

    return executeTrade({
      account,
      body: req.body
    });
  });
}
