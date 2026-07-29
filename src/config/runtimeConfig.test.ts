import { describe, expect, it } from 'vitest';
import { validateRuntimeConfig } from './runtimeConfig';

const validAzureConfig = {
  VITE_AZURE_AD_CLIENT_ID: '12345678-1234-4234-8234-1234567890ab',
  VITE_AZURE_AD_TENANT_ID: 'abcdefab-cdef-4abc-8def-abcdefabcdef',
  VITE_AZURE_AD_API_SCOPE:
    'api://12345678-1234-4234-8234-1234567890ab/Admin.Read',
} as const;

describe('validateRuntimeConfig', () => {
  it('applies safe local defaults when optional public values are absent', () => {
    const result = validateRuntimeConfig({});

    expect(result).toEqual({
      ok: true,
      value: {
        appEnvironment: 'development',
        appVersion: '0.0.0-local',
      },
    });
  });

  it('accepts a complete HTTPS configuration and trims values', () => {
    const result = validateRuntimeConfig({
      ...validAzureConfig,
      VITE_API_BASE_URL: ' https://api.example.test/v1 ',
      VITE_APP_ENV: 'staging',
      VITE_APP_VERSION: '1.4.0-rc.1',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        appEnvironment: 'staging',
        appVersion: '1.4.0-rc.1',
        apiBaseUrl: 'https://api.example.test/v1',
        azureAd: {
          clientId: validAzureConfig.VITE_AZURE_AD_CLIENT_ID,
          tenantId: validAzureConfig.VITE_AZURE_AD_TENANT_ID,
          apiScope: validAzureConfig.VITE_AZURE_AD_API_SCOPE,
        },
      },
    });
  });

  it('permits HTTP only for local development hosts', () => {
    expect(
      validateRuntimeConfig({ VITE_API_BASE_URL: 'http://localhost:7071' }).ok,
    ).toBe(true);
    expect(
      validateRuntimeConfig({ VITE_API_BASE_URL: 'http://127.0.0.1:7071' }).ok,
    ).toBe(true);

    const insecureResult = validateRuntimeConfig({
      VITE_API_BASE_URL: 'http://api.example.test',
    });

    expect(insecureResult.ok).toBe(false);
    if (!insecureResult.ok) {
      expect(insecureResult.issues).toContainEqual({
        key: 'VITE_API_BASE_URL',
        message: 'must be an HTTPS URL; HTTP is permitted only for localhost',
      });
    }
  });

  it('rejects secret-like and unapproved browser configuration keys', () => {
    const result = validateRuntimeConfig({
      VITE_CLIENT_SECRET: 'not-a-real-secret',
      VITE_FEATURE_FLAG: 'enabled',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          {
            key: 'VITE_CLIENT_SECRET',
            message:
              'secret-like configuration must never be exposed to browser code',
          },
          {
            key: 'VITE_FEATURE_FLAG',
            message: 'is not an approved public runtime configuration key',
          },
        ]),
      );
    }
  });

  it('rejects partial or malformed Azure AD configuration', () => {
    const result = validateRuntimeConfig({
      VITE_AZURE_AD_CLIENT_ID: 'not-a-uuid',
      VITE_AZURE_AD_API_SCOPE: 'Admin.Read',
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          {
            key: 'VITE_AZURE_AD_*',
            message:
              'client ID, tenant ID, and API scope must be configured together',
          },
          {
            key: 'VITE_AZURE_AD_CLIENT_ID',
            message: 'must be a valid UUID',
          },
          {
            key: 'VITE_AZURE_AD_API_SCOPE',
            message:
              'must use the api://<application-id>/<scope-name> format',
          },
        ]),
      );
    }
  });

  it('rejects invalid environments, versions, and non-string values', () => {
    const result = validateRuntimeConfig({
      VITE_APP_ENV: 'live',
      VITE_APP_VERSION: 'version-one',
      VITE_API_BASE_URL: 42,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          {
            key: 'VITE_APP_ENV',
            message: 'must be one of: development, test, staging, production',
          },
          {
            key: 'VITE_APP_VERSION',
            message:
              'must use a semantic version such as 1.2.3 or 1.2.3-beta.1',
          },
          { key: 'VITE_API_BASE_URL', message: 'must be a string' },
        ]),
      );
    }
  });
});
