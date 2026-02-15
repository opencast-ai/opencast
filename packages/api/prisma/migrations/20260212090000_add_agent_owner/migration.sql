-- AlterTable: Add ownerUserId for shared trader account (demo)
ALTER TABLE "Agent" ADD COLUMN "ownerUserId" TEXT;

-- CreateIndex: Index for looking up agents by owner
CREATE INDEX "Agent_ownerUserId_idx" ON "Agent"("ownerUserId");

-- AddForeignKey: Link owner to User
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_ownerUserId_fkey" 
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
