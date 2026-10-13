export interface CoreWebVitalsMetrics {
  lcpMs: number; // Largest Contentful Paint
  clsScore: number; // Cumulative Layout Shift
  inpMs?: number; // Interaction to Next Paint
  tbtMs?: number; // Total Blocking Time (lab proxy for INP)
  fcpMs: number; // First Contentful Paint
  ttfbMs: number; // Time to First Byte
  speedIndexMs?: number;
  score: number; // Lighthouse performance score 0 - 100
}

export type VitalStatus = 'good' | 'needs-improvement' | 'poor' | 'not-available';

export interface VitalFieldBucket {
  metric: 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';
  p75Value: number;
  status: VitalStatus;
  goodPercent: number;
  needsImprovementPercent: number;
  poorPercent: number;
}

export interface CruxFieldData {
  url: string;
  origin: string;
  isAvailable: boolean;
  collectionPeriod?: string;
  metrics: VitalFieldBucket[];
  notice?: string;
}

export interface PerformanceDiagnostics {
  renderBlockingResources: Array<{ url: string; wastedMs: number; sizeBytes: number }>;
  unusedCssBytes: number;
  unusedJsBytes: number;
  oversizedImages: Array<{ url: string; wastedBytes: number }>;
  unoptimizedFormats: Array<{ url: string; potentialSavingsBytes: number }>;
  missingDimensionsImages: string[];
  lazyLoadedAboveFoldImages: string[];
  longTasksCount: number;
  totalPageWeightBytes: number;
  totalRequests: number;
  lcpElementSelector?: string;
  clsCulprits: string[];
}

export interface PagePerformanceReport {
  url: string;
  device: 'mobile' | 'desktop';
  labMetrics?: CoreWebVitalsMetrics;
  fieldData?: CruxFieldData;
  diagnostics?: PerformanceDiagnostics;
  templateGroup?: string;
}
