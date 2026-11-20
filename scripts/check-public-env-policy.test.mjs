import { describe, expect, it } from 'vitest';
import {
  APPROVED_PUBLIC_KEYS,
  inspectPublicEnvironmentPolicy,
  parsePublicEnvContract,
} from './check-public-env-policy.mjs';

const validExample = `${APPROVED_PUBLIC_KEYS.map((key) => `${key}=`).join('\n')}\n`;

describe('public environment policy scanner', () => {
  it('loads one sorted canonical contract for all approved public keys', () => {
    expect(APPROVED_PUBLIC_KEYS).toEqual([
      'VITE_API_BASE_URL',
      'VITE_APP_ENV',
      'VITE_APP_VERSION',
      'VITE_AZURE_AD_API_SCOPE',
      'VITE_AZURE_AD_CLIENT_ID',
      'VITE_AZURE_AD_TENANT_ID',
    ]);
    expect(Object.isFrozen(APPROVED_PUBLIC_KEYS)).toBe(true);
  });

  it('fails closed for malformed, duplicate, or unsorted contracts', () => {
    expect(() => parsePublicEnvContract(null)).toThrow(/must be an object/i);
    expect(() =>
      parsePublicEnvContract({ schemaVersion: 2, approvedPublicKeys: [] }),
    ).toThrow(/schemaVersion must be 1/i);
    expect(() =>
      parsePublicEnvContract({
        schemaVersion: 1,
        approvedPublicKeys: ['VITE_APP_ENV', 'VITE_APP_ENV'],
      }),
    ).toThrow(/must be unique/i);
    expect(() =>
      parsePublicEnvContract({
        schemaVersion: 1,
        approvedPublicKeys: ['VITE_APP_VERSION', 'VITE_APP_ENV'],
      }),
    ).toThrow(/must be sorted/i);
  });

  it('accepts the approved key surface and complete example', () => {
    const result = inspectPublicEnvironmentPolicy([
      { path: '.env.example', content: validExample },
      {
        path: 'src/config/example.ts',
        content: "const key = 'VITE_API_BASE_URL';",
      },
    ]);

    expect(result.ok).toBe(true);
    expect(result.contractPath).toBe('config/public-env-contract.json');
    expect(result.contractSchemaVersion).toBe(1);
    expect(result.issues).toEqual([]);
  });

  it('rejects secret-like and unknown browser-visible keys', () => {
    const result = inspectPublicEnvironmentPolicy([
      { path: '.env.example', content: validExample },
      {
        path: 'src/config/unsafe.ts',
        content: "const keys = ['VITE_CLIENT_SECRET', 'VITE_UNAPPROVED_FLAG'];",
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'VITE_CLIENT_SECRET' }),
        expect.objectContaining({ key: 'VITE_UNAPPROVED_FLAG' }),
      ]),
    );
  });

  it('fails when the committed example is incomplete', () => {
    const result = inspectPublicEnvironmentPolicy([
      {
        path: '.env.example',
        content: 'VITE_APP_ENV=development\n',
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '.env.example',
          key: 'VITE_APP_VERSION',
        }),
      ]),
    );
  });

  it('fails closed when the public example file is absent', () => {
    const result = inspectPublicEnvironmentPolicy([
      {
        path: 'src/config/example.ts',
        content: "const key = 'VITE_APP_ENV';",
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.issues).toContainEqual({
      path: '.env.example',
      key: '(file)',
      message: 'required public configuration example is missing',
    });
  });
});
