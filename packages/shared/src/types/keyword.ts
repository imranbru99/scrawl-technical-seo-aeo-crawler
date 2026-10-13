export type IntentType =
  | 'informational'
  | 'navigational'
  | 'commercial'
  | 'transactional'
  | 'local';

export type PageType =
  | 'blog'
  | 'product'
  | 'category'
  | 'home'
  | 'landing'
  | 'docs'
  | 'comparison'
  | 'review'
  | 'faq'
  | 'contact'
  | 'about'
  | 'unknown';

export interface ExtractedTerm {
  term: string;
  ngram: 1 | 2 | 3;
  frequency: number;
  density: number; // percentage
  tfIdfScore: number;
  isInTitle: boolean;
  isInH1: boolean;
  isInH2: boolean;
  isInMetaDescription: boolean;
  isInUrl: boolean;
  isInFirst100Words: boolean;
  prominenceScore: number;
}

export interface TargetKeywordMapping {
  keyword: string;
  targetUrl: string;
  intent: IntentType;
  priority?: 'high' | 'medium' | 'low';
  foundOnPage: boolean;
  isExactMatch: boolean;
  locations: {
    title: boolean;
    h1: boolean;
    metaDescription: boolean;
    url: boolean;
    firstParagraph: boolean;
    h2: boolean;
    imageAlt: boolean;
    internalAnchors: boolean;
    schema: boolean;
  };
  coveragePercentage: number;
}

export interface CannibalizationIssue {
  keyword: string;
  competingUrls: string[];
  severity: 'high' | 'medium';
  overlapReason: string;
  suggestedAction: 'canonicalize' | 'merge' | 'redirect' | 'differentiate';
  primaryUrlCandidate: string;
}

export interface TopicCluster {
  topic: string;
  pillarUrl: string;
  supportingUrls: string[];
  cohesionScore: number; // 0 - 100
  missingSubtopics: string[];
  linkingRecommendations: Array<{
    sourceUrl: string;
    targetUrl: string;
    suggestedAnchorText: string;
  }>;
}

export interface QuestionOpportunity {
  question: string;
  sourceUrl: string;
  type: 'who' | 'what' | 'why' | 'how' | 'when' | 'where' | 'vs' | 'best' | 'cost' | 'other';
  hasDirectAnswer: boolean;
  schemaOpportunity: 'FAQPage' | 'QAPage' | 'HowTo' | 'None';
}

export interface SerpFeatureOpportunity {
  url: string;
  keyword: string;
  feature: 'featured_snippet' | 'people_also_ask' | 'faq' | 'video' | 'image_pack' | 'local_pack' | 'ai_overview';
  eligibilityStatus: 'ready' | 'needs_schema' | 'needs_formatting' | 'missing_answer';
  actionNeeded: string;
}

export interface RankSnapshot {
  keyword: string;
  url: string;
  engine: 'google' | 'bing' | 'ai_overview';
  device: 'desktop' | 'mobile';
  country: string;
  position: number | null; // null if unranked or not configured
  serpFeatures?: string[];
  recordedAt: string;
  isSimulatedOrNotAvailable?: boolean;
}
