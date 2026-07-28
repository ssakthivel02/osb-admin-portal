import { describe, expect, it } from 'vitest';
import {
  APPROVED_PUBLIC_KEYS,
  inspectPublicEnvironmentPolicy,
} from './check-public-env-policy.mjs';

const validExample = `${APPROVED_PUBLIC_KEYS.map((key) => `${key}=`).join('\n')}\n`;

describe('public environment policy scanner', () => {
  it('accepts the approved key surface and complete example', () => {
    const result = inspectPublicEnvironmentPolicy([
      { path: '.env.example', content: validExample },
      {
        path: 'src/config/example.ts',
        content: "const key = 'VITE_API_BASE_URL';",
      },
    ]);

    expect(result.ok).toBe(true);
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
