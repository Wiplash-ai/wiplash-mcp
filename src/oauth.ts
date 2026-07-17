import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jose';

import type { AppConfig } from './config.js';

const MAX_BEARER_TOKEN_CHARS = 16_384;

function stringList(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  return [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function tokenClientId(payload: JWTPayload): string {
  const azp = typeof payload.azp === 'string' ? payload.azp.trim() : '';
  const clientId = typeof payload.client_id === 'string' ? payload.client_id.trim() : '';
  return azp || clientId;
}

function tokenScopes(payload: JWTPayload): string[] {
  const scopes = new Set<string>(stringList(payload.scope));
  for (const role of stringList(payload.roles)) {
    scopes.add(role);
  }
  for (const role of stringList(objectValue(payload.realm_access).roles)) {
    scopes.add(role);
  }
  for (const resource of Object.values(objectValue(payload.resource_access))) {
    for (const role of stringList(objectValue(resource).roles)) {
      scopes.add(role);
    }
  }
  return [...scopes].sort();
}

export class KeycloakAccessTokenVerifier implements OAuthTokenVerifier {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly allowedClientIds: Set<string>;
  private readonly publicMcpUrl: URL;
  private readonly keyResolver: JWTVerifyGetKey;

  constructor(config: AppConfig, keyResolver?: JWTVerifyGetKey) {
    this.issuer = config.oauthIssuer.toString();
    this.audience = config.oauthAudience;
    this.allowedClientIds = new Set(config.oauthAllowedClientIds);
    this.publicMcpUrl = new URL(config.publicMcpUrl);
    this.keyResolver = keyResolver ?? createRemoteJWKSet(config.oauthJwksUrl, {
      timeoutDuration: Math.min(config.requestTimeoutMs, 10_000),
      cooldownDuration: 30_000,
      cacheMaxAge: 10 * 60_000,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const cleanToken = token.trim();
    if (!cleanToken || cleanToken.length > MAX_BEARER_TOKEN_CHARS || cleanToken.split('.').length !== 3) {
      throw new Error('Invalid bearer token.');
    }

    const { payload } = await jwtVerify(cleanToken, this.keyResolver, {
      issuer: this.issuer,
      audience: this.audience,
      algorithms: ['RS256'],
      clockTolerance: 5,
    });
    const clientId = tokenClientId(payload);
    if (!clientId || !this.allowedClientIds.has(clientId)) {
      throw new Error('The bearer token was not issued to an allowed Wiplash MCP client.');
    }
    if (!payload.sub || typeof payload.exp !== 'number') {
      throw new Error('The bearer token is missing required identity claims.');
    }

    return {
      token: cleanToken,
      clientId,
      scopes: tokenScopes(payload),
      expiresAt: payload.exp,
      resource: new URL(this.publicMcpUrl),
      extra: {
        subject: payload.sub,
        issuer: payload.iss,
        token_id: typeof payload.jti === 'string' ? payload.jti : undefined,
      },
    };
  }
}

export function authorizationServerMetadata(config: AppConfig) {
  const issuer = config.oauthIssuer.toString();
  const issuerEndpoint = (pathname: string) => `${issuer}${pathname}`;
  const connectorEndpoint = (pathname: string) =>
    new URL(`/oauth/${pathname.replace(/^\/+/, '')}`, config.publicMcpUrl.origin).toString();

  return {
    issuer,
    authorization_endpoint: issuerEndpoint('/protocol/openid-connect/auth'),
    token_endpoint: connectorEndpoint('token'),
    userinfo_endpoint: connectorEndpoint('userinfo'),
    jwks_uri: connectorEndpoint('jwks'),
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: config.oauthScopes,
  };
}

export function protectedResourceMetadataUrl(publicMcpUrl: URL): URL {
  const url = new URL(publicMcpUrl.origin);
  const resourcePath = publicMcpUrl.pathname === '/' ? '' : publicMcpUrl.pathname.replace(/\/$/, '');
  url.pathname = `/.well-known/oauth-protected-resource${resourcePath}`;
  return url;
}

function quoteChallengeValue(value: string): string {
  return value.replace(/["\\\r\n]/g, (character) => `\\${character}`);
}

export function bearerChallenge(
  resourceMetadataUrl: URL,
  options: { error?: string; description?: string; scopes?: string[] } = {},
): string {
  const fields = [`resource_metadata="${quoteChallengeValue(resourceMetadataUrl.toString())}"`];
  if (options.error) {
    fields.push(`error="${quoteChallengeValue(options.error)}"`);
  }
  if (options.description) {
    fields.push(`error_description="${quoteChallengeValue(options.description)}"`);
  }
  if (options.scopes?.length) {
    fields.push(`scope="${quoteChallengeValue(options.scopes.join(' '))}"`);
  }
  return `Bearer ${fields.join(', ')}`;
}
