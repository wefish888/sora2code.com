-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_code_votes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeId" TEXT NOT NULL,
    "userId" TEXT,
    "voteType" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "code_votes_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "shift_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_code_votes" ("codeId", "createdAt", "id", "ipAddress", "updatedAt", "userId", "voteType") SELECT "codeId", "createdAt", "id", "ipAddress", "updatedAt", "userId", "voteType" FROM "code_votes";
DROP TABLE "code_votes";
ALTER TABLE "new_code_votes" RENAME TO "code_votes";
CREATE INDEX "code_votes_codeId_ipAddress_idx" ON "code_votes"("codeId", "ipAddress");
CREATE TABLE "new_shift_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "rewardDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'reddit',
    "notes" TEXT,
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "downvoteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    CONSTRAINT "shift_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shift_codes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_shift_codes" ("code", "copyCount", "createdAt", "createdById", "downvoteCount", "expiresAt", "id", "notes", "rewardDescription", "sourceId", "sourceType", "sourceUrl", "status", "updatedAt", "updatedById", "upvoteCount") SELECT "code", "copyCount", "createdAt", "createdById", coalesce("downvoteCount", 0) AS "downvoteCount", "expiresAt", "id", "notes", "rewardDescription", "sourceId", coalesce("sourceType", 'reddit') AS "sourceType", "sourceUrl", "status", "updatedAt", "updatedById", coalesce("upvoteCount", 0) AS "upvoteCount" FROM "shift_codes";
DROP TABLE "shift_codes";
ALTER TABLE "new_shift_codes" RENAME TO "shift_codes";
CREATE UNIQUE INDEX "shift_codes_code_key" ON "shift_codes"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
