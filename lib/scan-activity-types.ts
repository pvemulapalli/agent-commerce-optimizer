import type { PlatformLeaderboardStat } from "./platform-leaderboard";

export interface RecentScanRecord {
  id: string;
  url: string;
  hostname: string;
  merchant: string;
  platform: string;
  confidence: string;
  scannedAt: string;
  cacheStatus: string;
  summary: string;
  readinessScore: number;
  grade: string;
  topGap: string;
}

export interface ScanActivityResponse {
  totalScans: number;
  recentScans: RecentScanRecord[];
  platformStats: PlatformLeaderboardStat[];
}
