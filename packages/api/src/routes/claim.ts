import { z } from "zod";

import type { FastifyInstance } from "fastify";

import { prisma } from "../db.js";
import { microsToCoinNumber, STARTING_BALANCE_MICROS } from "../constants.js";

const TWEET_HOSTS = new Set(["twitter.com", "www.twitter.com", "x.com", "www.x.com"]);

type TweetProof = {
  handle: string;
  displayName: string;
  url: string;
};

function parseTweetUrl(rawUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  if (!TWEET_HOSTS.has(parsed.hostname)) return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  const statusIndex = parts.indexOf("status");
  if (statusIndex <= 0 || statusIndex + 1 >= parts.length) return null;

  const handle: string = parts[statusIndex - 1] ?? "";
  const tweetId: string = parts[statusIndex + 1] ?? "";
  if (!handle || !/^[A-Za-z0-9_]+$/.test(handle)) return null;
  if (!tweetId || !/^[0-9]+$/.test(tweetId)) return null;

  return {
    handle,
    tweetId,
    canonicalUrl: `https://twitter.com/${handle}/status/${tweetId}`
  };
}

async function verifyTweetProof(tweetUrl: string, claimToken: string): Promise<TweetProof> {
  const parsed = parseTweetUrl(tweetUrl);
  if (!parsed) {
    throw Object.assign(new Error("Tweet URL must be a valid x.com/twitter.com status link."), { statusCode: 400 });
  }

  const oembedUrl = new URL("https://publish.twitter.com/oembed");
  oembedUrl.searchParams.set("url", parsed.canonicalUrl);
  oembedUrl.searchParams.set("omit_script", "1");

  const response = await fetch(oembedUrl.toString());
  if (!response.ok) {
    throw Object.assign(new Error("Unable to verify tweet. Please check the link and try again."), { statusCode: 400 });
  }

  const data = z
    .object({
      author_name: z.string(),
      author_url: z.string(),
      html: z.string()
    })
    .parse(await response.json());

  const authorUrl = new URL(data.author_url);
  const authorHandle = authorUrl.pathname.replace("/", "").split("/")[0] ?? "";
  if (!authorHandle || authorHandle.toLowerCase() !== parsed.handle.toLowerCase()) {
    throw Object.assign(new Error("Tweet author does not match the provided URL."), { statusCode: 400 });
  }

  const htmlLower = data.html.toLowerCase();
  const tokenLower = claimToken.toLowerCase();
  const claimMarker = `/claim/${tokenLower}`;
  if (!htmlLower.includes(tokenLower) && !htmlLower.includes(claimMarker)) {
    throw Object.assign(new Error("Tweet must include your claim link or token."), { statusCode: 400 });
  }

  return {
    handle: parsed.handle,
    displayName: data.author_name,
    url: parsed.canonicalUrl
  };
}

export async function registerClaimRoutes(app: FastifyInstance) {
  app.get("/claim/:token", {
    schema: {
      tags: ["Claim"],
      summary: "Get agent claim info",
      description: "Get information about an agent by its claim token",
      params: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", description: "Claim token" }
        }
      }
    }
  }, async (req, reply) => {
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

  app.post("/claim/:token", {
    schema: {
      tags: ["Claim"],
      summary: "Claim agent with tweet proof",
      description: "Legacy endpoint: Claim an agent using a tweet as proof",
      params: {
        type: "object",
        required: ["token"],
        properties: {
          token: { type: "string", description: "Claim token from agent registration" }
        }
      },
      body: {
        type: "object",
        required: ["tweetUrl"],
        properties: {
          tweetUrl: { type: "string", description: "URL of the claiming tweet" }
        }
      }
    }
  }, async (req, reply) => {
    const params = z.object({ token: z.string().min(1) }).parse(req.params);

    const body = z
      .object({
        tweetUrl: z.string()
      })
      .parse(req.body);

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

    const proof = await verifyTweetProof(body.tweetUrl, params.token);

    const normalizedHandle = proof.handle.toLowerCase();

    let user = await prisma.user.findFirst({
      where: { xHandle: normalizedHandle }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          xId: `x_${normalizedHandle}`,
          xHandle: normalizedHandle,
          xName: proof.displayName || normalizedHandle,
          xAvatar: null,
          xVerified: false,
          balanceMicros: STARTING_BALANCE_MICROS
        }
      });
    }

    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        claimedById: user.id,
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
