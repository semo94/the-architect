import { DiscoveryMethod } from '@/types';

/**
 * Converts an ISO date string to a relative time string
 * (e.g., "2 days ago", "3h ago", "Just now")
 */
export const getRelativeTime = (isoDate: string): string => {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
};

/**
 * Returns an icon emoji for a discovery method
 */
export const getDiscoveryMethodIcon = (method: DiscoveryMethod): string => {
  return method === 'surprise' ? '🎲' : '🎯';
};

/**
 * Returns a human-readable label for a discovery method
 */
export const getDiscoveryMethodLabel = (method: DiscoveryMethod): string => {
  return method === 'surprise' ? 'Surprise Me' : 'Guide Me';
};
