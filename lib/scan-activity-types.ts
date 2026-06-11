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
  readinessScore: number | null;
  grade: string | null;
  topGap: string | null;
  reportType?: "full" | "partial";
  reportId?: string;
  shareUrl?: string;
}

export interface ScanActivityResponse {
  totalScans: number;
  recentScans: RecentScanRecord[];
  platformStats: PlatformLeaderboardStat[];
}
