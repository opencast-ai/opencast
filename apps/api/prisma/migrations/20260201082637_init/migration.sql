-- CreateEnum
CREATE TYPE "MarketStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "MarketOutcome" AS ENUM ('UNRESOLVED', 'YES', 'NO');

-- CreateEnum
CREATE TYPE "TradeSide" AS ENUM ('YES', 'NO');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "displayName" TEXT,
    "balanceMicros" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "House" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "treasuryMicros" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "House_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "agentId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Market" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "closesAt" TIMESTAMP(3),
    "status" "MarketStatus" NOT NULL DEFAULT 'OPEN',
    "outcome" "MarketOutcome" NOT NULL DEFAULT 'UNRESOLVED',

    CONSTRAINT "Market_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketPool" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "marketId" TEXT NOT NULL,
    "collateralMicros" BIGINT NOT NULL,
    "yesSharesMicros" BIGINT NOT NULL,
    "noSharesMicros" BIGINT NOT NULL,
    "feeBps" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "MarketPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "agentId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "yesSharesMicros" BIGINT NOT NULL DEFAULT 0,
    "noSharesMicros" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agentId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "side" "TradeSide" NOT NULL,
    "collateralInMicros" BIGINT NOT NULL,
    "feeMicros" BIGINT NOT NULL,
    "sharesOutMicros" BIGINT NOT NULL,
    "poolCollateralMicros" BIGINT NOT NULL,
    "poolYesSharesMicros" BIGINT NOT NULL,
    "poolNoSharesMicros" BIGINT NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_agentId_idx" ON "ApiKey"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketPool_marketId_key" ON "MarketPool"("marketId");

-- CreateIndex
CREATE INDEX "Position_marketId_idx" ON "Position"("marketId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_agentId_marketId_key" ON "Position"("agentId", "marketId");

-- CreateIndex
CREATE INDEX "Trade_agentId_idx" ON "Trade"("agentId");

-- CreateIndex
CREATE INDEX "Trade_marketId_idx" ON "Trade"("marketId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketPool" ADD CONSTRAINT "MarketPool_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE CASCADE ON UPDATE CASCADE;
