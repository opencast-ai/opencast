-- AlterTable: Add traceability fields for forwarded markets (Slide 3)
ALTER TABLE "Market" ADD COLUMN "sourceSlug" TEXT;
ALTER TABLE "Market" ADD COLUMN "forwardedAt" TIMESTAMP(3);

-- CreateIndex: Index for looking up markets by source slug
CREATE INDEX "Market_sourceSlug_idx" ON "Market"("sourceSlug");
