import { Milestone, ProfileStatistics } from '@/types';
import { authService } from './authService';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

class StatsService {
  async getStats(): Promise<{ statistics: ProfileStatistics; milestones: Milestone[] }> {
    const response = await authService.authenticatedFetch(`${API_URL}/users/me/stats`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user stats');
    }

    return (await response.json()) as { statistics: ProfileStatistics; milestones: Milestone[] };
  }
}

export default new StatsService();
