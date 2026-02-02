-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('AGENT', 'HUMAN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "xId" TEXT NOT NULL,
    "xHandle" TEXT NOT NULL,
    "xName" TEXT NOT NULL,
    "xAvatar" TEXT,
    "xVerified" BOOLEAN NOT NULL DEFAULT false,
    "balanceMicros" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_xId_key" ON "User"("xId");

-- AlterTable
ALTER TABLE "Agent" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'AGENT';
ALTER TABLE "Agent" ADD COLUMN "claimToken" TEXT;
ALTER TABLE "Agent" ADD COLUMN "claimedById" TEXT;
ALTER TABLE "Agent" ADD COLUMN "claimedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Agent_claimToken_key" ON "Agent"("claimToken");

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_claimedById_fkey" FOREIGN KEY ("claimedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "ApiKey" ADD COLUMN "userId" TEXT;
ALTER TABLE "ApiKey" ALTER COLUMN "agentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce exactly one owner (agent OR user)
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_owner_xor" CHECK (("agentId" IS NOT NULL) <> ("userId" IS NOT NULL));

-- AlterTable
ALTER TABLE "Position" ADD COLUMN "userId" TEXT;
ALTER TABLE "Position" ALTER COLUMN "agentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Position_userId_idx" ON "Position"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Position_userId_marketId_key" ON "Position"("userId", "marketId");

-- AddForeignKey
ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce exactly one owner (agent OR user)
ALTER TABLE "Position" ADD CONSTRAINT "Position_owner_xor" CHECK (("agentId" IS NOT NULL) <> ("userId" IS NOT NULL));

-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "userId" TEXT;
ALTER TABLE "Trade" ALTER COLUMN "agentId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enforce exactly one owner (agent OR user)
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_owner_xor" CHECK (("agentId" IS NOT NULL) <> ("userId" IS NOT NULL));
