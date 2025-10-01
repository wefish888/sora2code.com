-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password" TEXT NOT NULL,
    "bio" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "premiumExpiresAt" DATETIME,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "verificationToken" TEXT,
    "passwordResetToken" TEXT,
    "passwordResetExpires" DATETIME,
    "emailVerifiedAt" DATETIME,
    "registrationIp" TEXT,
    "lastLoginAt" DATETIME,
    "lastLoginIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "shift_codes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "rewardDescription" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "expiresAt" DATETIME,
    "sourceUrl" TEXT,
    "sourceId" TEXT,
    "notes" TEXT,
    "copyCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    CONSTRAINT "shift_codes_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shift_codes_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "code_platforms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "code_platforms_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "shift_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "codeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "favorites_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "shift_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "code_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeId" TEXT NOT NULL,
    "userId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "code_events_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "shift_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "code_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "code_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "codeId" TEXT NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "description" TEXT,
    "contactEmail" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "code_reports_codeId_fkey" FOREIGN KEY ("codeId") REFERENCES "shift_codes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "code_reports_reportedBy_fkey" FOREIGN KEY ("reportedBy") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "shift_codes_code_key" ON "shift_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "code_platforms_codeId_platform_key" ON "code_platforms"("codeId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_codeId_key" ON "favorites"("userId", "codeId");
