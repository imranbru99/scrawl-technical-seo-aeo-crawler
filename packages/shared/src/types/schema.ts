export type SchemaFormat = 'json-ld' | 'microdata' | 'rdfa';

export interface SchemaValidationIssue {
  type: 'error' | 'warning';
  entityType: string;
  property?: string;
  message: string;
  fix: string;
  googleRequired?: boolean;
  googleRecommended?: boolean;
}

export interface StructuredDataItem {
  id?: string;
  format: SchemaFormat;
  type: string;
  raw: Record<string, unknown>;
  isValid: boolean;
  validationIssues: SchemaValidationIssue[];
  missingRequiredGoogleProps: string[];
  missingRecommendedGoogleProps: string[];
}

export interface RichResultEligibility {
  feature:
    | 'Article'
    | 'Product'
    | 'FAQPage'
    | 'HowTo'
    | 'BreadcrumbList'
    | 'Organization'
    | 'LocalBusiness'
    | 'VideoObject'
    | 'Recipe'
    | 'JobPosting'
    | 'Event'
    | 'Course';
  status: 'eligible' | 'eligible_with_warnings' | 'not_eligible' | 'not_detected';
  missingRequirements: string[];
  warnings: string[];
}

export interface SchemaPageReport {
  url: string;
  items: StructuredDataItem[];
  totalItems: number;
  validItems: number;
  richResultEligibility: RichResultEligibility[];
  missingOpportunities: Array<{
    schemaType: string;
    detectedPageSignals: string[];
    generatedJsonLd: string;
    reason: string;
  }>;
}
