import { useEffect, useState } from 'react';
import { apiGet } from '../../lib/utils/api';

interface Stats {
  totalCodes: number;
  activeCodes: number;
  totalCopies: number;
  newToday: number;
}

export default function StatsDisplay() {
  const [stats, setStats] = useState<Stats>({
    totalCodes: 0,
    activeCodes: 0,
    totalCopies: 0,
    newToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await apiGet<{ success: boolean; data: Stats }>('/api/v1/codes/stats');
        if (response.success) {
          setStats(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
        <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
          {loading ? (
            <span className="animate-pulse">...</span>
          ) : (
            stats.activeCodes || 0
          )}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Active Codes</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
          {loading ? (
            <span className="animate-pulse">...</span>
          ) : (
            stats.totalCopies || 0
          )}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Total Copies</div>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700">
        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">24/7</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Auto Monitoring</div>
      </div>
    </div>
  );
}
