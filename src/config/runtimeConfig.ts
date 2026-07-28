export const APP_ENVIRONMENTS = [
  'development',
  'test',
  'staging',
  'production',
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export interface RuntimeConfig {
  readonly appEnvironment: AppEnvironment;
  readonly appVersion: string;
  readonly apiBaseUrl?: string;
  readonly azureAd?: {
    readonly clientId: string;
    readonly tenantId: string;
    readonly apiScope: string;
  };
}

export interface RuntimeConfigIssue {
  readonly key: string;
  readonly message: string;
}

export type RuntimeConfigValidationResult =
  | { readonly ok: true; readonly value: RuntimeConfig }
  | { readonly ok: false; readonly issues: readonly RuntimeConfigIssue[] };

const ALLOWED_PUBLIC_KEYS = new Set([
  'VITE_AZURE_AD_CLIENT_ID',
  'VITE_AZURE_AD_TENANT_ID',
  'VITE_AZURE_AD_API_SCOPE',
  'VITE_API_BASE_URL',
  'VITE_APP_ENV',
  'VITE_APP_VERSION',
]);

const SECRET_LIKE_KEY =
  /(SECRET|PASSWORD|PRIVATE[_-]?KEY|CONNECTION[_-]?STRING|STORAGE[_-]?KEY|ACCESS[_-]?KEY|API[_-]?KEY|TOKEN)/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function readOptionalString(
  source: Readonly<Record<string, unknown>>,
  key: string,
  issues: RuntimeConfigIssue[],
): string | undefined {
  const rawValue = source[key];

  if (rawValue === undefined || rawValue === '') {
    return undefined;
  }

  if (typeof rawValue !== 'string') {
    issues.push({ key, message: 'must be a string' });
    return undefined;
  }

  const value = rawValue.trim();
  if (value.length === 0) {
    return undefined;
  }

  return value;
}

function isAppEnvironment(value: string): value is AppEnvironment {
  return APP_ENVIRONMENTS.some((candidate) => candidate === value);
}

function isAllowedPublicUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const isLocalhost =
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1' ||
      url.hostname === '[::1]';

    return url.protocol === 'https:' || (isLocalhost && url.protocol === 'http:');
  } catch {
    return false;
  }
}

function validatePublicKeySurface(
  source: Readonly<Record<string, unknown>>,
  issues: RuntimeConfigIssue[],
): void {
  for (const key of Object.keys(source)) {
    if (!key.startsWith('VITE_')) {
      continue;
    }

    if (SECRET_LIKE_KEY.test(key)) {
      issues.push({
        key,
        message: 'secret-like configuration must never be exposed to browser code',
      });
      continue;
    }

    if (!ALLOWED_PUBLIC_KEYS.has(key)) {
      issues.push({ key, message: 'is not an approved public runtime configuration key' });
    }
  }
}

export function validateRuntimeConfig(
  source: Readonly<Record<string, unknown>>,
): RuntimeConfigValidationResult {
  const issues: RuntimeConfigIssue[] = [];
  validatePublicKeySurface(source, issues);

  const environmentValue =
    readOptionalString(source, 'VITE_APP_ENV', issues) ?? 'development';
  const appVersion =
    readOptionalString(source, 'VITE_APP_VERSION', issues) ?? '0.0.0-local';
  const apiBaseUrl = readOptionalString(source, 'VITE_API_BASE_URL', issues);
  const clientId = readOptionalString(source, 'VITE_AZURE_AD_CLIENT_ID', issues);
  const tenantId = readOptionalString(source, 'VITE_AZURE_AD_TENANT_ID', issues);
  const apiScope = readOptionalString(source, 'VITE_AZURE_AD_API_SCOPE', issues);

  if (!isAppEnvironment(environmentValue)) {
    issues.push({
      key: 'VITE_APP_ENV',
      message: `must be one of: ${APP_ENVIRONMENTS.join(', ')}`,
    });
  }

  if (!VERSION_PATTERN.test(appVersion)) {
    issues.push({
      key: 'VITE_APP_VERSION',
      message: 'must use a semantic version such as 1.2.3 or 1.2.3-beta.1',
    });
  }

  if (apiBaseUrl !== undefined && !isAllowedPublicUrl(apiBaseUrl)) {
    issues.push({
      key: 'VITE_API_BASE_URL',
      message: 'must be an HTTPS URL; HTTP is permitted only for localhost',
    });
  }

  const azureValues = [clientId, tenantId, apiScope];
  const configuredAzureValueCount = azureValues.filter(
    (value) => value !== undefined,
  ).length;

  if (configuredAzureValueCount !== 0 && configuredAzureValueCount !== 3) {
    issues.push({
      key: 'VITE_AZURE_AD_*',
      message: 'client ID, tenant ID, and API scope must be configured together',
    });
  }

  if (clientId !== undefined && !UUID_PATTERN.test(clientId)) {
    issues.push({
      key: 'VITE_AZURE_AD_CLIENT_ID',
      message: 'must be a valid UUID',
    });
  }

  if (tenantId !== undefined && !UUID_PATTERN.test(tenantId)) {
    issues.push({
      key: 'VITE_AZURE_AD_TENANT_ID',
      message: 'must be a valid UUID',
    });
  }

  if (apiScope !== undefined && !/^api:\/\/[0-9a-f-]+\/[A-Za-z0-9._-]+$/i.test(apiScope)) {
    issues.push({
      key: 'VITE_AZURE_AD_API_SCOPE',
      message: 'must use the api://<application-id>/<scope-name> format',
    });
  }

  if (issues.length > 0 || !isAppEnvironment(environmentValue)) {
    return { ok: false, issues };
  }

  const azureAd =
    clientId !== undefined && tenantId !== undefined && apiScope !== undefined
      ? { clientId, tenantId, apiScope }
      : undefined;

  return {
    ok: true,
    value: {
      appEnvironment: environmentValue,
      appVersion,
      ...(apiBaseUrl === undefined ? {} : { apiBaseUrl }),
      ...(azureAd === undefined ? {} : { azureAd }),
    },
  };
}
