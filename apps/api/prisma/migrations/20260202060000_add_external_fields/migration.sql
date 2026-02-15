-- AlterTable
ALTER TABLE "Market" ADD COLUMN "externalId" TEXT;

-- AlterTable  
ALTER TABLE "Market" ADD COLUMN "category" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Market_externalId_key" ON "Market"("externalId");
