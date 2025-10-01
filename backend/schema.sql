-- sora2code D1 Database Schema
-- This file creates the database schema for Cloudflare D1

-- Drop tables if they exist (for fresh setup)
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS system_logs;
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS code_reports;
DROP TABLE IF EXISTS code_events;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS code_platforms;
DROP TABLE IF EXISTS shift_codes;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE,
    password TEXT NOT NULL,
    bio TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
    isVerified INTEGER DEFAULT 0,
    isActive INTEGER DEFAULT 1,
    isPremium INTEGER DEFAULT 0,
    premiumExpiresAt TEXT,
    preferences TEXT DEFAULT '{}',
    verificationToken TEXT,
    passwordResetToken TEXT,
    passwordResetExpires TEXT,
    emailVerifiedAt TEXT,
    registrationIp TEXT,
    lastLoginAt TEXT,
    lastLoginIp TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
);

-- Shift codes table
CREATE TABLE shift_codes (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    rewardDescription TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'pending')),
    platforms TEXT,
    expiresAt TEXT,
    sourceUrl TEXT,
    sourceId TEXT,
    notes TEXT,
    copyCount INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    createdById TEXT,
    updatedById TEXT,
    FOREIGN KEY (createdById) REFERENCES users(id),
    FOREIGN KEY (updatedById) REFERENCES users(id)
);

-- Code platforms table
CREATE TABLE code_platforms (
    id TEXT PRIMARY KEY,
    codeId TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('PC', 'PlayStation', 'Xbox')),
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (codeId) REFERENCES shift_codes(id) ON DELETE CASCADE,
    UNIQUE(codeId, platform)
);

-- Favorites table
CREATE TABLE favorites (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    codeId TEXT NOT NULL,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (codeId) REFERENCES shift_codes(id) ON DELETE CASCADE,
    UNIQUE(userId, codeId)
);

-- Code events table
CREATE TABLE code_events (
    id TEXT PRIMARY KEY,
    codeId TEXT NOT NULL,
    userId TEXT,
    eventType TEXT NOT NULL CHECK (eventType IN ('copy', 'view', 'favorite', 'unfavorite', 'report')),
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (codeId) REFERENCES shift_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
);

-- Code reports table
CREATE TABLE code_reports (
    id TEXT PRIMARY KEY,
    codeId TEXT NOT NULL,
    reportedBy TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('expired', 'invalid', 'duplicate', 'inappropriate', 'spam', 'other')),
    description TEXT,
    contactEmail TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (codeId) REFERENCES shift_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (reportedBy) REFERENCES users(id) ON DELETE CASCADE
);

-- User activities table
CREATE TABLE user_activities (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- System logs table
CREATE TABLE system_logs (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error')),
    message TEXT NOT NULL,
    source TEXT,
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Admin logs table
CREATE TABLE admin_logs (
    id TEXT PRIMARY KEY,
    adminId TEXT NOT NULL,
    action TEXT NOT NULL,
    resourceType TEXT,
    resourceId TEXT,
    metadata TEXT DEFAULT '{}',
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Indexes for better performance
CREATE INDEX idx_shift_codes_status ON shift_codes(status);
CREATE INDEX idx_shift_codes_created ON shift_codes(createdAt DESC);
CREATE INDEX idx_shift_codes_copy_count ON shift_codes(copyCount DESC);
CREATE INDEX idx_code_platforms_code ON code_platforms(codeId);
CREATE INDEX idx_code_platforms_platform ON code_platforms(platform);
CREATE INDEX idx_favorites_user ON favorites(userId);
CREATE INDEX idx_favorites_code ON favorites(codeId);
CREATE INDEX idx_code_events_code ON code_events(codeId);
CREATE INDEX idx_code_events_type ON code_events(eventType);
CREATE INDEX idx_code_events_created ON code_events(createdAt DESC);
CREATE INDEX idx_code_reports_status ON code_reports(status);
CREATE INDEX idx_code_reports_created ON code_reports(createdAt DESC);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_created ON system_logs(createdAt DESC);

-- Insert sample data
INSERT INTO shift_codes (id, code, rewardDescription, status, platforms) VALUES
('sample-1', 'BL4-SAMPLE-CODE1', 'Golden Keys x3', 'active', 'PC,PlayStation,Xbox'),
('sample-2', 'BL4-SAMPLE-CODE2', 'Weapon Skin Pack', 'active', 'PC,PlayStation'),
('sample-3', 'BL4-SAMPLE-CODE3', 'Character Head Pack', 'expired', 'PC');

INSERT INTO code_platforms (id, codeId, platform) VALUES
('platform-1', 'sample-1', 'PC'),
('platform-2', 'sample-1', 'PlayStation'),
('platform-3', 'sample-1', 'Xbox'),
('platform-4', 'sample-2', 'PC'),
('platform-5', 'sample-2', 'PlayStation'),
('platform-6', 'sample-3', 'PC');