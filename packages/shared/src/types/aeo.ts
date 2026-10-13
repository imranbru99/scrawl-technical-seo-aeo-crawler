export type BotPurpose = 'training' | 'search' | 'user-agent';

export interface AiBotDefinition {
  id: string;
  name: string;
  userAgentSnippet: string;
  vendor: string;
  purpose: BotPurpose;
  operatorUrl: string;
  defaultRecommendation: 'allow' | 'block-training' | 'allow-search';
}

export interface BotAccessStatus {
  botId: string;
  botName: string;
  vendor: string;
  purpose: BotPurpose;
  isAllowedRobotsTxt: boolean;
  httpStatus?: number;
  wafBlocked?: boolean;
  notes: string;
}

export interface LlmsTxtSection {
  title: string;
  links: Array<{ title: string; url: string; description?: string }>;
}

export interface LlmsTxtResult {
  exists: boolean;
  url: string;
  rawContent?: string;
  isValid: boolean;
  summaryBlock?: string;
  sections: LlmsTxtSection[];
  errors: string[];
  warnings: string[];
  generatedLlmsTxt?: string;
  generatedLlmsFullTxt?: string;
}

export interface PassageChunk {
  heading: string;
  level: number;
  tokensEstimate: number;
  text: string;
  isSelfContained: boolean;
  hasDirectAnswer: boolean;
  startsCleanly: boolean; // no dangling pronouns
}

export interface AnswerReadinessDetail {
  score: number; // 0 - 100
  hasDirectAnswerFirst50Words: boolean;
  firstParagraphWordCount: number;
  questionHeadingsCount: number;
  questionHeadings: string[];
  passages: PassageChunk[];
  hasFaqOrHowTo: boolean;
  hasDefinitionSentences: boolean;
  hasOrderedLists: boolean;
  hasComparisonTables: boolean;
  readabilityScore: number;
  isServerRendered: boolean;
  jsDependentContentFlag: boolean;
}

export interface EntityDetail {
  name: string;
  type: string;
  count: number;
  inSchema: boolean;
  hasSameAs: boolean;
  sameAsUrls: string[];
}

export interface EeatSignals {
  hasAuthorByline: boolean;
  authorName?: string;
  hasAuthorBio: boolean;
  hasAuthorPageLink: boolean;
  hasPersonSchema: boolean;
  hasPublishedDate: boolean;
  hasUpdatedDate: boolean;
  hasReviewer: boolean;
  hasAboutPageLink: boolean;
  hasContactPageLink: boolean;
  hasEditorialPolicy: boolean;
  hasPhysicalAddressOrPhone: boolean;
  outboundAuthoritativeCitationsCount: number;
  experienceSignalsScore: number; // 0 - 100
  overallEeatScore: number; // 0 - 100
}

export interface CitationWorthiness {
  statisticCount: number;
  quotableStatementsCount: number;
  originalResearchSignals: boolean;
  outboundCitationsCount: number;
  outboundDomains: string[];
  unsupportedClaimsCount: number;
  score: number; // 0 - 100
}

export interface AeoPageMetrics {
  url: string;
  compositeAeoScore: number; // 0 - 100
  geoGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  aiCrawlabilityScore: number;
  answerReadiness: AnswerReadinessDetail;
  entities: EntityDetail[];
  eeat: EeatSignals;
  citation: CitationWorthiness;
  voiceReadinessScore: number;
  snippetEligibility: {
    paragraph: boolean;
    list: boolean;
    table: boolean;
    aiOverview: boolean;
  };
}

export interface AeoSiteReport {
  overallAeoScore: number; // 0 - 100
  overallGeoGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  botMatrix: BotAccessStatus[];
  llmsTxt: LlmsTxtResult;
  averageAnswerReadiness: number;
  averageEeatScore: number;
  averageCitationScore: number;
  aiBotAccessScore: number;
  pagesScored: number;
  recommendations: Array<{
    title: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'trivial' | 'easy' | 'moderate' | 'hard';
    summary: string;
  }>;
}
