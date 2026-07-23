import { SERVER_VERSION } from './version.js';

export interface AppConfig {
  host: string;
  port: number;
  apiBaseUrl: URL;
  publicMcpUrl: URL;
  buildSha: string;
  requestTimeoutMs: number;
  allowedHosts: string[];
  oauthIssuer: URL;
  oauthJwksUrl: URL;
  oauthAudience: string;
  oauthAllowedClientIds: string[];
  oauthScopes: string[];
  openAiAppsChallengeToken: string | null;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function parseUrl(value: string, name: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }

  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && LOCAL_HOSTNAMES.has(parsed.hostname))) {
    throw new Error(`${name} must use HTTPS outside local development.`);
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed;
}

function parsePositiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return parsed;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function parseList(value: string | undefined, fallback: string[]): string[] {
  return unique(
    (value === undefined ? fallback : value.split(','))
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function parseOptionalChallengeToken(value: string | undefined): string | null {
  const token = value?.trim();
  if (!token) {
    return null;
  }
  if (token.length > 512 || /[\u0000-\u001f\u007f]/.test(token)) {
    throw new Error('WIPLASH_OPENAI_APPS_CHALLENGE_TOKEN must be a single-line token no longer than 512 characters.');
  }
  return token;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const host = env.HOST?.trim() || '127.0.0.1';
  const apiBaseUrl = parseUrl(env.WIPLASH_API_BASE_URL?.trim() || 'https://wiplash.ai', 'WIPLASH_API_BASE_URL');
  const publicMcpUrl = parseUrl(
    env.WIPLASH_MCP_PUBLIC_URL?.trim() || 'https://mcp.wiplash.ai/mcp',
    'WIPLASH_MCP_PUBLIC_URL',
  );
  const oauthIssuer = parseUrl(
    env.WIPLASH_OAUTH_ISSUER?.trim() || 'https://auth.wiplash.ai/realms/wiplash',
    'WIPLASH_OAUTH_ISSUER',
  );
  const oauthJwksUrl = parseUrl(
    env.WIPLASH_OAUTH_JWKS_URL?.trim() || `${oauthIssuer.toString()}/protocol/openid-connect/certs`,
    'WIPLASH_OAUTH_JWKS_URL',
  );
  const configuredHosts = (env.ALLOWED_HOSTS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    host,
    port: parsePositiveInteger(env.PORT, 8787, 'PORT'),
    apiBaseUrl,
    publicMcpUrl,
    buildSha: env.WIPLASH_MCP_BUILD_SHA?.trim() || 'dev',
    requestTimeoutMs: parsePositiveInteger(env.WIPLASH_API_TIMEOUT_MS, 10_000, 'WIPLASH_API_TIMEOUT_MS'),
    allowedHosts: unique([
      publicMcpUrl.hostname,
      'localhost',
      '127.0.0.1',
      ...(host === '::1' ? ['[::1]'] : []),
      ...configuredHosts,
    ]),
    oauthIssuer,
    oauthJwksUrl,
    oauthAudience: env.WIPLASH_OAUTH_AUDIENCE?.trim() || publicMcpUrl.toString(),
    oauthAllowedClientIds: parseList(env.WIPLASH_OAUTH_ALLOWED_CLIENT_IDS, ['wiplash-chatgpt']),
    oauthScopes: parseList(env.WIPLASH_OAUTH_SCOPES, ['openid', 'profile', 'email', 'roles']),
    openAiAppsChallengeToken: parseOptionalChallengeToken(env.WIPLASH_OPENAI_APPS_CHALLENGE_TOKEN),
  };
}

export function buildIdentifier(config: AppConfig): string {
  return `${SERVER_VERSION}+${config.buildSha.slice(0, 12)}`;
}
