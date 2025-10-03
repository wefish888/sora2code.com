import { atom, map, computed } from 'nanostores';
import type { ShiftCode, CodeFilters, BackendShiftCode, Platform } from '../../types/api';
import { apiGet, apiPost } from '../utils/api';

// Code list state
export const $codes = atom<ShiftCode[]>([]);
export const $loading = atom<boolean>(false);
export const $error = atom<string | null>(null);
export const $lastUpdated = atom<Date | null>(null);

// Pagination state
export const $pagination = map({
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 0
});

// Filter state
export const $filters = map<CodeFilters>({
  platforms: [],
  status: ['active'],
  showExpired: false,
  search: '',
  gameVersion: 'bl4'
});

// Computed property: filtered codes (Reddit codes prioritized)
export const $filteredCodes = computed([$codes, $filters], (codes, filters) => {
  const filtered = codes.filter(code => {
    // Check if code is expired (based on time, not just status field)
    const isExpired = code.expiresAt && new Date(code.expiresAt) < new Date();
    const actualStatus = isExpired ? 'expired' : code.status;

    // Platform filtering
    if (filters.platforms.length > 0) {
      const hasMatchingPlatform = code.platforms.some(platform =>
        filters.platforms.includes(platform)
      );
      if (!hasMatchingPlatform) return false;
    }

    // Status filtering - based on actual status (including time-calculated expired status)
    if (filters.status.length > 0 && !filters.status.includes(actualStatus)) {
      return false;
    }

    // Expired code filtering - if user hasn't selected "expired" status and doesn't show expired codes, filter out expired ones
    // But if user explicitly selected "expired" status, should show expired codes
    const userWantsExpired = filters.status.includes('expired');
    if (!filters.showExpired && !userWantsExpired && isExpired) {
      return false;
    }

    // Game version filtering
    if (filters.gameVersion && code.gameVersion !== filters.gameVersion) {
      return false;
    }

    // Search filtering
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        code.code.toLowerCase().includes(searchLower) ||
        code.reward?.toLowerCase().includes(searchLower) ||
        code.sourceAuthor?.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  // Sorting: Reddit codes prioritized
  return filtered.sort((a, b) => {
    // Check if collected from Reddit
    const aIsReddit = (a.sourceUrl && a.sourceUrl.includes('reddit')) || a.source === 'reddit';
    const bIsReddit = (b.sourceUrl && b.sourceUrl.includes('reddit')) || b.source === 'reddit';

    if (aIsReddit && !bIsReddit) return -1; // a (Reddit) first
    if (!aIsReddit && bIsReddit) return 1;  // b (Reddit) first

    // If both are or both aren't Reddit codes, sort by creation time in descending order
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

// Transform backend code data to frontend format
function transformBackendCode(backendCode: BackendShiftCode): ShiftCode {
  // Map platform strings to our frontend Platform type
  const platforms: Platform[] = backendCode.platforms.map(p => {
    const platform = p.platform.toLowerCase();
    switch (platform) {
      case 'pc': return 'pc';
      case 'playstation': return 'playstation';
      case 'xbox': return 'xbox';
      default: return 'pc'; // fallback
    }
  });

  // Determine source based on sourceUrl
  const isRedditSource = backendCode.sourceUrl && backendCode.sourceUrl.includes('reddit');
  const source = isRedditSource ? 'reddit' : 'official';
  const sourceAuthor = isRedditSource ? 'Reddit Community' : 'Official Source';

  return {
    id: backendCode.id,
    code: backendCode.code,
    reward: backendCode.rewardDescription,
    rewardType: 'unknown',
    rewardQuantity: 1,
    platforms,
    gameVersion: 'bl4',
    source,
    sourceUrl: backendCode.sourceUrl,
    sourceAuthor,
    expiresAt: backendCode.expiresAt || undefined,
    createdAt: backendCode.createdAt,
    updatedAt: backendCode.updatedAt,
    status: backendCode.status as any,
    verificationCount: backendCode._count?.favorites || 0,
    invalidReports: backendCode._count?.reports || 0,
    copyCount: backendCode.copyCount,
    viewCount: backendCode._count?.copyEvents || 0,
    upvoteCount: backendCode.upvoteCount || 0,
    downvoteCount: backendCode.downvoteCount || 0,
    isFeatured: backendCode.status === 'active'
  };
}

// Actions
export async function fetchCodes(page?: number): Promise<void> {
  $loading.set(true);
  $error.set(null);

  try {
    const currentPagination = $pagination.get();
    const requestPage = page || currentPagination.page || 1;
    const limit = currentPagination.limit;

    // Calculate offset from page number
    const offset = (requestPage - 1) * limit;

    // Use encrypted API request (encryption is automatic)
    const data: { success: boolean; data: { codes: BackendShiftCode[]; pagination: any }; count: number } = await apiGet(
      `/api/v1/codes?offset=${offset}&limit=${limit}`
    );

    if (!data.success) {
      throw new Error('Failed to fetch codes');
    }

    // Transform backend codes to frontend format
    const transformedCodes = data.data.codes.map(transformBackendCode);
    $codes.set(transformedCodes);

    // Update pagination state
    if (data.data.pagination) {
      console.log('[Pagination] API response:', data.data.pagination);

      // Calculate page and totalPages from offset
      const currentPage = Math.floor(data.data.pagination.offset / data.data.pagination.limit) + 1;
      const totalPages = Math.ceil(data.data.pagination.total / data.data.pagination.limit);

      $pagination.set({
        page: currentPage,
        limit: data.data.pagination.limit,
        total: data.data.pagination.total,
        totalPages: totalPages
      });

      console.log('[Pagination] Calculated:', { currentPage, totalPages });
    } else {
      console.warn('[Pagination] No pagination data in API response');
    }

    $lastUpdated.set(new Date());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    $error.set(message);
    console.error('Failed to fetch codes:', error);
  } finally {
    $loading.set(false);
  }
}

export function setPage(page: number): void {
  const currentPagination = $pagination.get();
  if (page >= 1 && page <= currentPagination.totalPages) {
    fetchCodes(page);
  }
}

export function nextPage(): void {
  const currentPagination = $pagination.get();
  if (currentPagination.page < currentPagination.totalPages) {
    setPage(currentPagination.page + 1);
  }
}

export function prevPage(): void {
  const currentPagination = $pagination.get();
  if (currentPagination.page > 1) {
    setPage(currentPagination.page - 1);
  }
}

export function updateFilters(newFilters: Partial<CodeFilters>): void {
  const currentFilters = $filters.get();
  $filters.set({ ...currentFilters, ...newFilters });
}

export function clearFilters(): void {
  $filters.set({
    platforms: [],
    status: ['active'],
    showExpired: false,
    search: '',
    gameVersion: 'bl4'
  });
}

export async function reportCode(codeId: string, reason: string): Promise<void> {
  try {
    // Use encrypted API request (encryption is automatic)
    await apiPost(`/api/v1/codes/${codeId}/report`, { reason });

    // Refresh code list
    await fetchCodes();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to report code';
    $error.set(message);
    throw error;
  }
}

export async function copyCode(codeId: string): Promise<void> {
  try {
    // Record copy event (encryption is automatic)
    await apiPost(`/api/v1/codes/${codeId}/copy`, {});
  } catch (error) {
    console.warn('Failed to record copy event:', error);
    // Don't block copy operation
  }
}