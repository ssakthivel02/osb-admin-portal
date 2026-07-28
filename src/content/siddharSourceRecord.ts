export const SIDDHAR_EDITORIAL_STATUSES = [
  'CANONICAL_TEXT_VERIFIED',
  'MANUSCRIPT_CATALOGUE_VERIFIED',
  'MANUSCRIPT_IMAGE_VERIFIED',
  'PRINT_EDITION_VERIFIED',
  'OFFICIAL_TEMPLE_TRADITION_VERIFIED',
  'LINEAGE_TRADITION_REPORTED',
  'MODERN_DEVOTIONAL',
  'INFERRED',
  'UNRESOLVED',
  'CONTRADICTED_DO_NOT_PUBLISH',
] as const;

export type SiddharEditorialStatus = (typeof SIDDHAR_EDITORIAL_STATUSES)[number];

export interface SiddharSourceReference {
  repository: string;
  recordId: string;
  title: string;
  locator: string;
  evidenceUrl: string;
  accessedOn: string;
}

export interface SiddharReviewMetadata {
  transcriptionReviewer: string;
  transliterationStandard: string;
  transliterationReviewer: string;
  translationReviewer: string;
  editorialReviewer: string;
  reviewedOn: string;
}

export interface SiddharRightsMetadata {
  rightsBasis: string;
  reusePermissionReference: string;
}

export interface SiddharSourceRecord {
  id: string;
  siddharNameTamil: string;
  siddharNameRomanized: string;
  itemTitle: string;
  tamilText: string;
  transliteration: string;
  englishMeaning: string;
  status: SiddharEditorialStatus;
  sourceReferences: readonly SiddharSourceReference[];
  review: SiddharReviewMetadata;
  rights: SiddharRightsMetadata;
  productionEligible: false;
}

export type SiddharSourceRecordValidation =
  | { readonly success: true; readonly data: SiddharSourceRecord }
  | { readonly success: false; readonly errors: readonly string[] };

const requiredRecordFields = [
  'id',
  'siddharNameTamil',
  'siddharNameRomanized',
  'itemTitle',
  'tamilText',
  'transliteration',
  'englishMeaning',
] as const;

const requiredReferenceFields = [
  'repository',
  'recordId',
  'title',
  'locator',
  'evidenceUrl',
  'accessedOn',
] as const;

const requiredReviewFields = [
  'transcriptionReviewer',
  'transliterationStandard',
  'transliterationReviewer',
  'translationReviewer',
  'editorialReviewer',
  'reviewedOn',
] as const;

const requiredRightsFields = ['rightsBasis', 'reusePermissionReference'] as const;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isHttpUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function validateRequiredStrings(
  value: Record<string, unknown>,
  fields: readonly string[],
  prefix: string,
  errors: string[],
): void {
  for (const field of fields) {
    if (!isNonEmptyString(value[field])) {
      errors.push(`${prefix}.${field} must be a non-empty string`);
    }
  }
}

export function validateSiddharSourceRecord(value: unknown): SiddharSourceRecordValidation {
  const errors: string[] = [];

  if (!isObject(value)) {
    return { success: false, errors: ['record must be an object'] };
  }

  validateRequiredStrings(value, requiredRecordFields, 'record', errors);

  if (
    !isNonEmptyString(value['status']) ||
    !SIDDHAR_EDITORIAL_STATUSES.includes(value['status'] as SiddharEditorialStatus)
  ) {
    errors.push('record.status must use the approved editorial taxonomy');
  }

  if (value['productionEligible'] !== false) {
    errors.push('record.productionEligible must be false during intake');
  }

  const sourceReferences = value['sourceReferences'];
  if (!Array.isArray(sourceReferences) || sourceReferences.length === 0) {
    errors.push('record.sourceReferences must contain at least one evidence reference');
  } else {
    sourceReferences.forEach((reference, index) => {
      const prefix = `record.sourceReferences[${index}]`;
      if (!isObject(reference)) {
        errors.push(`${prefix} must be an object`);
        return;
      }

      validateRequiredStrings(reference, requiredReferenceFields, prefix, errors);
      if (!isHttpUrl(reference['evidenceUrl'])) {
        errors.push(`${prefix}.evidenceUrl must be an HTTP(S) URL`);
      }
      if (!isIsoDate(reference['accessedOn'])) {
        errors.push(`${prefix}.accessedOn must use YYYY-MM-DD`);
      }
    });
  }

  const review = value['review'];
  if (!isObject(review)) {
    errors.push('record.review must be an object');
  } else {
    validateRequiredStrings(review, requiredReviewFields, 'record.review', errors);
    if (!isIsoDate(review['reviewedOn'])) {
      errors.push('record.review.reviewedOn must use YYYY-MM-DD');
    }
  }

  const rights = value['rights'];
  if (!isObject(rights)) {
    errors.push('record.rights must be an object');
  } else {
    validateRequiredStrings(rights, requiredRightsFields, 'record.rights', errors);
  }

  if (
    value['status'] === 'CONTRADICTED_DO_NOT_PUBLISH' &&
    value['productionEligible'] !== false
  ) {
    errors.push('contradicted records can never be production eligible');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return { success: true, data: value as unknown as SiddharSourceRecord };
}
