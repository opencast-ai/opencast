import Fastify from "fastify";
import cors from "@fastify/cors";
import { ZodError } from "zod";

import { registerAgentRoutes } from "./routes/agents.js";
import { registerAdminRoutes } from "./routes/admin.js";
import { registerChartRoutes } from "./routes/chart.js";
import { registerClaimRoutes } from "./routes/claim.js";
import { registerAgentClaimRoutes } from "./routes/agentClaim.js";
import { registerLeaderboardRoutes } from "./routes/leaderboard.js";
import { registerMarketRoutes } from "./routes/markets.js";
import { registerOAuthRoutes } from "./routes/oauth.js";
import { registerWeb3AuthRoutes } from "./routes/web3auth.js";
import { registerPortfolioRoutes } from "./routes/portfolio.js";
import { registerQuoteRoutes } from "./routes/quote.js";
import { registerSkillRoutes } from "./routes/skill.js";
import { registerTradeRoutes } from "./routes/trades.js";

export function buildServer() {
  const app = Fastify({
    logger: true
  });

  app.setErrorHandler((err, _req, reply) => {
    // Handle Zod validation errors as 400 Bad Request
    if (err instanceof ZodError) {
      const message = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      reply.status(400).send({
        error: { message: `Validation error: ${message}` }
      });
      return;
    }

    const e = err as { statusCode?: number; message: string };
    const statusCode = typeof e.statusCode === "number" && e.statusCode >= 400 ? e.statusCode : 500;
    reply.status(statusCode).send({
      error: {
        message: statusCode === 500 ? "Internal Server Error" : e.message
      }
    });
  });

  app.register(cors, {
    origin: (() => {
      const origins: Array<string | RegExp> = [
        /^http:\/\/localhost:3000$/,
        /^https:\/\/.*\.vercel\.app$/
      ];

      const extra = (process.env.CORS_ORIGIN ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      for (const o of extra) origins.push(o);
      return origins;
    })(),
    credentials: true
  });

  app.get("/health", async () => {
    return { ok: true };
  });

  registerAgentRoutes(app);
  registerMarketRoutes(app);
  registerChartRoutes(app);
  registerQuoteRoutes(app);
  registerTradeRoutes(app);
  registerPortfolioRoutes(app);
  registerLeaderboardRoutes(app);
  registerAdminRoutes(app);
  registerWeb3AuthRoutes(app);
  registerOAuthRoutes(app);
  registerClaimRoutes(app);
  registerAgentClaimRoutes(app);
  registerSkillRoutes(app);

  return app;
}
