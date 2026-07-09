import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';

function decodeBase64Url(value) {
  return Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function parseJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('invalid_token_format');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64Url(encodedHeader).toString('utf8'));
    payload = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8'));
  } catch {
    throw new Error('invalid_token_json');
  }
  return {
    header,
    payload,
    signingInput: Buffer.from(`${encodedHeader}.${encodedPayload}`),
    signature: decodeBase64Url(encodedSignature),
  };
}

function audienceMatches(actual, expected) {
  const values = Array.isArray(actual) ? actual : [actual];
  return values.includes(expected);
}

function normalizeEmail(value) {
  if (typeof value !== 'string' || !value.includes('@')) return null;
  return value.trim().toLowerCase();
}

function claimsFingerprint(payload) {
  const stable = JSON.stringify({
    iss: payload.iss,
    sub: payload.sub,
    aud: payload.aud,
    role: payload.role,
    aal: payload.aal,
    session_id: payload.session_id,
    is_anonymous: payload.is_anonymous,
  });
  return createHash('sha256').update(stable).digest('hex');
}

export class SupabaseIdentityProvider {
  constructor({ projectUrl, publishableKey, expectedAudience = 'authenticated', fetchImpl = fetch, clock = () => Date.now() }) {
    if (!projectUrl) throw new Error('project_url_required');
    if (!publishableKey) throw new Error('publishable_key_required');
    this.projectUrl = projectUrl.replace(/\/$/, '');
    this.publishableKey = publishableKey;
    this.expectedIssuer = `${this.projectUrl}/auth/v1`;
    this.expectedAudience = expectedAudience;
    this.fetchImpl = fetchImpl;
    this.clock = clock;
    this.jwks = null;
    this.jwksExpiresAt = 0;
  }

  async #loadJwks() {
    if (this.jwks && this.clock() < this.jwksExpiresAt) return this.jwks;
    const response = await this.fetchImpl(`${this.projectUrl}/auth/v1/.well-known/jwks.json`, {
      headers: { apikey: this.publishableKey },
    });
    if (!response.ok) throw new Error(`jwks_unavailable:${response.status}`);
    const document = await response.json();
    if (!Array.isArray(document.keys)) throw new Error('invalid_jwks');
    this.jwks = document.keys;
    this.jwksExpiresAt = this.clock() + 10 * 60 * 1000;
    return this.jwks;
  }

  #validateClaims(payload) {
    const now = Math.floor(this.clock() / 1000);
    if (payload.iss !== this.expectedIssuer) throw new Error('invalid_issuer');
    if (!audienceMatches(payload.aud, this.expectedAudience)) throw new Error('invalid_audience');
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) throw new Error('missing_subject');
    if (typeof payload.exp !== 'number' || payload.exp <= now) throw new Error('token_expired');
    if (typeof payload.nbf === 'number' && payload.nbf > now + 30) throw new Error('token_not_yet_valid');
  }

  #normalizeFromClaims(payload) {
    const email = normalizeEmail(payload.email);
    const metadata = payload.user_metadata ?? {};
    const emailVerified = Boolean(
      email && (payload.email_confirmed_at || metadata.email_verified || metadata.email_verified_at)
    );
    return {
      provider: 'supabase',
      issuer: payload.iss,
      subject: payload.sub,
      email,
      emailVerified,
      claimsFingerprint: claimsFingerprint(payload),
      claims: {
        audience: payload.aud,
        role: payload.role ?? null,
        aal: payload.aal ?? null,
        sessionId: payload.session_id ?? null,
        anonymous: Boolean(payload.is_anonymous),
      },
    };
  }

  async #verifyAsymmetric(parsed) {
    if (!['RS256', 'ES256'].includes(parsed.header.alg)) throw new Error('unsupported_asymmetric_alg');
    if (typeof parsed.header.kid !== 'string' || parsed.header.kid.length === 0) throw new Error('missing_kid');
    const keys = await this.#loadJwks();
    const jwk = keys.find((item) => item.kid === parsed.header.kid && item.alg === parsed.header.alg);
    if (!jwk) throw new Error('signing_key_not_found');
    const key = createPublicKey({ key: jwk, format: 'jwk' });
    const algorithm = parsed.header.alg === 'RS256' ? 'RSA-SHA256' : 'SHA256';
    const keyOptions = parsed.header.alg === 'ES256' ? { key, dsaEncoding: 'ieee-p1363' } : key;
    const valid = verifySignature(algorithm, parsed.signingInput, keyOptions, parsed.signature);
    if (!valid) throw new Error('invalid_signature');
    this.#validateClaims(parsed.payload);
    return this.#normalizeFromClaims(parsed.payload);
  }

  async #verifyViaAuthServer(token) {
    const response = await this.fetchImpl(`${this.projectUrl}/auth/v1/user`, {
      headers: {
        apikey: this.publishableKey,
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error(`token_rejected:${response.status}`);
    const user = await response.json();
    const email = normalizeEmail(user.email);
    return {
      provider: 'supabase',
      issuer: this.expectedIssuer,
      subject: user.id,
      email,
      emailVerified: Boolean(email && user.email_confirmed_at),
      claimsFingerprint: createHash('sha256').update(JSON.stringify({
        id: user.id,
        email,
        role: user.role ?? null,
        is_anonymous: user.is_anonymous ?? false,
      })).digest('hex'),
      claims: {
        audience: this.expectedAudience,
        role: user.role ?? null,
        aal: null,
        sessionId: null,
        anonymous: Boolean(user.is_anonymous),
      },
    };
  }

  async verifyAccessToken(token) {
    const parsed = parseJwt(token);
    if (parsed.header.alg === 'HS256') return this.#verifyViaAuthServer(token);
    return this.#verifyAsymmetric(parsed);
  }
}
