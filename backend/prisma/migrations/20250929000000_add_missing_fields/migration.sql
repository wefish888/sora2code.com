-- Add missing fields to shift_codes table
ALTER TABLE "shift_codes" ADD COLUMN "sourceType" TEXT DEFAULT 'reddit';
ALTER TABLE "shift_codes" ADD COLUMN "upvoteCount" INTEGER DEFAULT 0;
ALTER TABLE "shift_codes" ADD COLUMN "downvoteCount" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "code_votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeId" TEXT NOT NULL,
    "userId" TEXT,
    "voteType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "code_votes_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "shift_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "code_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "code_votes_codeId_userId_key" ON "code_votes"("codeId", "userId");

-- CreateIndex
CREATE INDEX "code_votes_codeId_idx" ON "code_votes"("codeId");

-- CreateIndex
CREATE INDEX "code_votes_ipAddress_idx" ON "code_votes"("ipAddress");
