import { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { $filters, updateFilters, clearFilters, fetchCodes } from '../../lib/stores/codes';
import type { Platform, CodeStatus, GameVersion } from '../../types/api';

export default function CodeFilters() {
  const filters = useStore($filters);
  const [searchInput, setSearchInput] = useState(filters.search);

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      updateFilters({ search: searchInput });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const handlePlatformChange = (platform: Platform) => {
    const newPlatforms = filters.platforms.includes(platform)
      ? filters.platforms.filter(p => p !== platform)
      : [...filters.platforms, platform];

    updateFilters({ platforms: newPlatforms });
  };

  const handleStatusChange = (status: CodeStatus) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];

    updateFilters({ status: newStatus });
  };

  const handleGameVersionChange = (version: GameVersion) => {
    updateFilters({ gameVersion: version });
  };

  const handleShowExpiredChange = (show: boolean) => {
    updateFilters({ showExpired: show });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    clearFilters();
  };

  const handleRefresh = async () => {
    try {
      await fetchCodes();
    } catch (error) {
      console.error('Failed to refresh codes:', error);
    }
  };

  const platforms: { value: Platform; label: string; icon: string }[] = [
    { value: 'pc', label: 'PC', icon: '🖥️' },
    { value: 'playstation', label: 'PlayStation', icon: '🎮' },
    { value: 'xbox', label: 'Xbox', icon: '🎯' }
  ];

  const statuses: { value: CodeStatus; label: string; color: string }[] = [
    { value: 'active', label: 'Active', color: 'text-green-600' },
    { value: 'expired', label: 'Expired', color: 'text-red-600' },
    { value: 'invalid', label: 'Invalid', color: 'text-gray-600' },
    { value: 'pending', label: 'Pending', color: 'text-yellow-600' }
  ];

  const gameVersions: { value: GameVersion; label: string }[] = [
    { value: 'bl4', label: 'Sora 2' },
    { value: 'bl3', label: 'Sora' },
    { value: 'wonderlands', label: 'Sora Legacy' }
  ];

  return (
    <div className="space-y-6">
      {/* Search bar and quick actions */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search codes, rewards or authors..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            🔄 Refresh
          </button>
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Filter options */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Platform filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Platform
          </label>
          <div className="space-y-2">
            {platforms.map((platform) => (
              <label key={platform.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.platforms.includes(platform.value)}
                  onChange={() => handlePlatformChange(platform.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                  {platform.icon} {platform.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Status
          </label>
          <div className="space-y-2">
            {statuses.map((status) => (
              <label key={status.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.status.includes(status.value)}
                  onChange={() => handleStatusChange(status.value)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
                />
                <span className={`ml-3 text-sm ${status.color}`}>
                  {status.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Game version */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Game Version
          </label>
          <select
            value={filters.gameVersion || 'bl4'}
            onChange={(e) => handleGameVersionChange(e.target.value as GameVersion)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {gameVersions.map((version) => (
              <option key={version.value} value={version.value}>
                {version.label}
              </option>
            ))}
          </select>
        </div>

        {/* Other options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Other Options
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.showExpired}
                onChange={(e) => handleShowExpiredChange(e.target.checked)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-600 rounded"
              />
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                Show Expired Codes
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Current filter summary */}
      <div className="flex flex-wrap gap-2">
        {filters.platforms.length > 0 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            Platform: {filters.platforms.join(', ')}
          </span>
        )}

        {filters.status.length > 0 && filters.status.length < 4 && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            Status: {filters.status.join(', ')}
          </span>
        )}

        {filters.search && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
            Search: "{filters.search}"
          </span>
        )}

        {filters.showExpired && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            Including expired codes
          </span>
        )}
      </div>
    </div>
  );
}