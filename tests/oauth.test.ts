import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type CryptoKey,
  type JSONWebKeySet,
} from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.js';
import { KeycloakAccessTokenVerifier, bearerChallenge, protectedResourceMetadataUrl } from '../src/oauth.js';

describe('KeycloakAccessTokenVerifier', () => {
  const config = loadConfig({
    WIPLASH_MCP_PUBLIC_URL: 'https://mcp.wiplash.ai/mcp',
    WIPLASH_OAUTH_ISSUER: 'https://auth.wiplash.ai/realms/wiplash',
    WIPLASH_OAUTH_AUDIENCE: 'https://mcp.wiplash.ai/mcp',
    WIPLASH_OAUTH_ALLOWED_CLIENT_IDS: 'wiplash-chatgpt',
  });
  let privateKey: CryptoKey;
  let verifier: KeycloakAccessTokenVerifier;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256', { extractable: true });
    privateKey = keyPair.privateKey;
    const publicJwk = await exportJWK(keyPair.publicKey);
    const jwks: JSONWebKeySet = {
      keys: [{ ...publicJwk, kid: 'test-key', alg: 'RS256', use: 'sig' }],
    };
    verifier = new KeycloakAccessTokenVerifier(config, createLocalJWKSet(jwks));
  });

  async function token(overrides: { audience?: string; clientId?: string } = {}) {
    return new SignJWT({
      azp: overrides.clientId ?? 'wiplash-chatgpt',
      scope: 'openid profile email',
      realm_access: { roles: ['human:portfolio'] },
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
      .setIssuer(config.oauthIssuer.toString())
      .setAudience(overrides.audience ?? config.oauthAudience)
      .setSubject('human-subject')
      .setJti('token-id')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  }

  it('accepts only signed, unexpired tokens for the exact MCP audience and client', async () => {
    const auth = await verifier.verifyAccessToken(await token());

    expect(auth).toMatchObject({
      clientId: 'wiplash-chatgpt',
      scopes: ['email', 'human:portfolio', 'openid', 'profile'],
      resource: new URL('https://mcp.wiplash.ai/mcp'),
      extra: { subject: 'human-subject', token_id: 'token-id' },
    });
  });

  it('rejects a token minted for another resource', async () => {
    await expect(verifier.verifyAccessToken(await token({ audience: 'https://wiplash.ai' }))).rejects.toThrow();
  });

  it('rejects a token minted for another OAuth client', async () => {
    await expect(verifier.verifyAccessToken(await token({ clientId: 'unknown-client' }))).rejects.toThrow(
      'not issued to an allowed Wiplash MCP client',
    );
  });
});

describe('OAuth metadata helpers', () => {
  it('derives RFC 9728 metadata paths from the protected resource path', () => {
    const metadataUrl = protectedResourceMetadataUrl(new URL('https://mcp.wiplash.ai/mcp'));
    expect(metadataUrl.toString()).toBe('https://mcp.wiplash.ai/.well-known/oauth-protected-resource/mcp');
    expect(bearerChallenge(metadataUrl, { error: 'invalid_token' })).toBe(
      'Bearer resource_metadata="https://mcp.wiplash.ai/.well-known/oauth-protected-resource/mcp", error="invalid_token"',
    );
  });
});
