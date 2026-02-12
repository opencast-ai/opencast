-- AlterTable: Make xId, xHandle, xName optional (legacy OAuth)
ALTER TABLE "User" ALTER COLUMN "xId" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "xHandle" DROP NOT NULL;
ALTER TABLE "User" ALTER COLUMN "xName" DROP NOT NULL;

-- AlterTable: Add walletAddress for Web3 auth
ALTER TABLE "User" ADD COLUMN "walletAddress" TEXT;

-- CreateIndex: Unique constraint on walletAddress
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
