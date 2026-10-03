import { analyticsRepository } from '@/repositories/analyticsRepository';

export const analyticsService = {
  async getOverviewStats() {
    return await analyticsRepository.getOverviewStats();
  }
};
