import { WeeklyReportItem } from '../types';

export const HISTORICAL_WEEKLY_REPORTS: WeeklyReportItem[] = [];

export const getHistoricalReportById = (id: string): WeeklyReportItem | undefined => {
  return HISTORICAL_WEEKLY_REPORTS.find(r => r.id === id);
};
