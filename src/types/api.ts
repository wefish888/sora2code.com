// Basic type definitions
export type Platform = 'pc' | 'playstation' | 'xbox';
export type CodeStatus = 'active' | 'expired' | 'invalid' | 'pending';
export type GameVersion = 'bl3' | 'bl4' | 'wonderlands';

// Backend API types matching our Prisma schema
export interface BackendShiftCode {
  id: string;
  code: string;
  rewardDescription: string;
  status: 'active' | 'expired' | 'pending';
  expiresAt: string | null;
  sourceUrl: string;
  sourceId: string;
  notes: string | null;
  copyCount: number;
  upvoteCount: number;
  downvoteCount: number;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string | null;
  platforms: {
    id: string;
    codeId: string;
    platform: string;
    createdAt: string;
  }[];
  _count?: {
    copyEvents: number;
    favorites: number;
    reports: number;
  };
}

// Frontend Shift Code type (transformed from backend)
export interface ShiftCode {
  id: string;
  code: string;
  reward?: string;
  rewardType?: string;
  rewardQuantity?: number;
  platforms: Platform[];
  gameVersion: GameVersion;
  source: string;
  sourceUrl?: string;
  sourceAuthor?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  status: CodeStatus;
  verificationCount: number;
  invalidReports: number;
  copyCount: number;
  viewCount: number;
  upvoteCount: number;
  downvoteCount: number;
  isFeatured: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      cursor?: string;
      hasNext: boolean;
      count: number;
    };
    timestamp: string;
    version: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    traceId: string;
  };
}

// Filter types
export interface CodeFilters {
  platforms: Platform[];
  status: CodeStatus[];
  showExpired: boolean;
  search: string;
  gameVersion?: GameVersion;
}

// Pagination types
export interface PaginationParams {
  cursor?: string;
  limit?: number;
}

// User types
export interface User {
  id: string;
  email: string;
  username?: string;
  preferredPlatforms: Platform[];
  timezone: string;
  theme: 'light' | 'dark' | 'system';
  isVerified: boolean;
  isPremium: boolean;
  createdAt: string;
}

// User statistics
export interface UserStats {
  savedCodes: number;
  copiedCodes: number;
  reportedCodes: number;
  joinDate: string;
}

// Notification types
export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

// Code statistics
export interface CodeStats {
  viewCount: number;
  copyCount: number;
  reportCount: number;
  saveCount: number;
}