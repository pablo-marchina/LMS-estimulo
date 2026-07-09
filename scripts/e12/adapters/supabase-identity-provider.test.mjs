import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { SupabaseIdentityProvider } from './supabase-identity-provider.mjs';

const nowMs = 1_800_000_000_000;
const issuer = 'https://example.supabase.co/auth/v1';

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function jwt({ alg, kid, payload, privateKey }) {
  const header = b64url(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const input = Buffer.from(`${header}.${body}`);
  const signature = alg === 'RS256'
    ? sign('RSA-SHA256', input, privateKey)
    : sign('SHA256', input, { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${header}.${body}.${signature.toString('base64url')}`;
}

function fetchForJwk(jwk) {
  return async (url) => {
    assert.match(String(url), /jwks\.json$/);
    return new Response(JSON.stringify({ keys: [jwk] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
}

for (const alg of ['RS256', 'ES256']) {
  test(`verifies ${alg}, validates claims and returns a normalized identity`, async () => {
    const pair = alg === 'RS256'
      ? generateKeyPairSync('rsa', { modulusLength: 2048 })
      : generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const kid = `${alg}-key`;
    const jwk = pair.publicKey.export({ format: 'jwk' });
    Object.assign(jwk, { kid, alg, use: 'sig' });
    const token = jwt({
      alg,
      kid,
      privateKey: pair.privateKey,
      payload: {
        iss: issuer,
        sub: 'user-123',
        aud: 'authenticated',
        exp: Math.floor(nowMs / 1000) + 600,
        email: 'USER@EXAMPLE.COM',
        user_metadata: { email_verified: true },
        role: 'authenticated',
        aal: 'aal1',
      },
    });
    const provider = new SupabaseIdentityProvider({
      projectUrl: 'https://example.supabase.co',
      publishableKey: 'public-test-key',
      fetchImpl: fetchForJwk(jwk),
      clock: () => nowMs,
    });
    const identity = await provider.verifyAccessToken(token);
    assert.equal(identity.subject, 'user-123');
    assert.equal(identity.issuer, issuer);
    assert.equal(identity.email, 'user@example.com');
    assert.equal(identity.emailVerified, true);
    assert.match(identity.claimsFingerprint, /^[a-f0-9]{64}$/);
    assert.ok(!('accessToken' in identity));
  });
}

test('rejects expired asymmetric token', async () => {
  const pair = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = pair.publicKey.export({ format: 'jwk' });
  Object.assign(jwk, { kid: 'expired', alg: 'RS256', use: 'sig' });
  const token = jwt({
    alg: 'RS256', kid: 'expired', privateKey: pair.privateKey,
    payload: { iss: issuer, sub: 'u', aud: 'authenticated', exp: Math.floor(nowMs / 1000) - 1 },
  });
  const provider = new SupabaseIdentityProvider({
    projectUrl: 'https://example.supabase.co', publishableKey: 'k',
    fetchImpl: fetchForJwk(jwk), clock: () => nowMs,
  });
  await assert.rejects(() => provider.verifyAccessToken(token), /token_expired/);
});

test('uses the Auth server for legacy HS256 tokens', async () => {
  const token = `${b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ sub: 'legacy' }))}.sig`;
  const calls = [];
  const provider = new SupabaseIdentityProvider({
    projectUrl: 'https://example.supabase.co', publishableKey: 'k', clock: () => nowMs,
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return new Response(JSON.stringify({
        id: 'legacy-user', email: 'legacy@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', role: 'authenticated',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    },
  });
  const identity = await provider.verifyAccessToken(token);
  assert.equal(identity.subject, 'legacy-user');
  assert.equal(identity.emailVerified, true);
  assert.match(calls[0].url, /\/auth\/v1\/user$/);
  assert.equal(calls[0].options.headers.apikey, 'k');
});
