import { webcrypto } from 'node:crypto';
import { config } from './config.mjs';

const { subtle } = webcrypto;
let oidcCache = null;
let jwksCache = { expiresAt: 0, keys: [] };

function authenticationError(message, statusCode = 401) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function decodePart(value) {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function getOidcConfiguration() {
  if (oidcCache) return oidcCache;
  const tenant = config.auth.tenantId;
  const response = await fetch(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/v2.0/.well-known/openid-configuration`);
  if (!response.ok) throw new Error(`Microsoft OIDC-configuratie ophalen mislukt (${response.status}).`);
  oidcCache = await response.json();
  return oidcCache;
}

async function getJwks(force = false) {
  if (!force && jwksCache.expiresAt > Date.now() && jwksCache.keys.length) return jwksCache.keys;
  const oidc = await getOidcConfiguration();
  const response = await fetch(oidc.jwks_uri);
  if (!response.ok) throw new Error(`Microsoft JWKS ophalen mislukt (${response.status}).`);
  const body = await response.json();
  jwksCache = { keys: body.keys || [], expiresAt: Date.now() + 60 * 60 * 1000 };
  return jwksCache.keys;
}

async function verifySignature(token, header) {
  let keys = await getJwks();
  let jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  if (!jwk) {
    keys = await getJwks(true);
    jwk = keys.find((key) => key.kid === header.kid && key.kty === 'RSA');
  }
  if (!jwk) throw authenticationError('De ondertekeningssleutel van het Microsoft-token is niet gevonden.');
  const key = await subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const [encodedHeader, encodedPayload, encodedSignature] = token.split('.');
  const valid = await subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    Buffer.from(encodedSignature, 'base64url'),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );
  if (!valid) throw authenticationError('Ongeldige handtekening op het Microsoft-token.');
}

function validateClaims(claims) {
  const now = Math.floor(Date.now() / 1000);
  if (!claims.exp || claims.exp < now - 30) throw authenticationError('Het Microsoft-token is verlopen.');
  if (claims.nbf && claims.nbf > now + 30) throw authenticationError('Het Microsoft-token is nog niet geldig.');
  if (config.auth.allowedTenantId && claims.tid !== config.auth.allowedTenantId) {
    throw authenticationError('Dit Microsoft-account behoort niet tot de toegelaten tenant.', 403);
  }

  const acceptedAudiences = new Set([
    config.auth.apiClientId,
    `api://${config.auth.apiClientId}`,
    String(config.auth.apiScope || '').split('/').slice(0, -1).join('/')
  ].filter(Boolean));
  if (acceptedAudiences.size && !acceptedAudiences.has(claims.aud)) {
    throw authenticationError('Het Microsoft-token is niet bestemd voor de EventRisk-API.');
  }

  const issuerTenant = config.auth.allowedTenantId || config.auth.tenantId;
  const acceptedIssuers = new Set([
    `https://login.microsoftonline.com/${issuerTenant}/v2.0`,
    `https://sts.windows.net/${issuerTenant}/`
  ]);
  if (claims.iss && issuerTenant && !acceptedIssuers.has(claims.iss)) {
    throw authenticationError('Ongeldige tokenuitgever.');
  }
}

function normalizeRoles(claims) {
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  const groups = Array.isArray(claims.groups) ? claims.groups : [];
  const allowedRoles = roles.filter((role) => config.auth.allowedRoles.includes(role));
  const allowedGroups = groups.filter((group) => config.auth.allowedGroupIds.includes(group));
  if (!allowedRoles.length && !allowedGroups.length) {
    throw authenticationError('Uw Microsoft-account heeft geen EventRisk-rol. Vraag een beheerder om toegang.', 403);
  }
  return allowedRoles.length ? allowedRoles : ['EventRisk.GroupMember'];
}

export async function authenticateRequest(request) {
  if (config.auth.mode === 'development') {
    if (config.nodeEnv === 'production') throw authenticationError('Development-authenticatie is verboden in productie.', 403);
    const requestedRole = request.headers['x-dev-role'];
    const role = config.auth.allowedRoles.includes(requestedRole) ? requestedRole : config.auth.developmentUser.role;
    return {
      id: 'development-user',
      name: request.headers['x-dev-user'] || config.auth.developmentUser.name,
      email: request.headers['x-dev-email'] || config.auth.developmentUser.email,
      roles: [role],
      tenantId: 'development',
      claims: { development: true }
    };
  }

  const authorization = request.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) throw authenticationError('Geen Microsoft-toegangstoken ontvangen.');
  const token = authorization.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) throw authenticationError('Ongeldig JWT-formaat.');
  const header = decodePart(parts[0]);
  const claims = decodePart(parts[1]);
  if (header.alg !== 'RS256') throw authenticationError('Alleen RS256-tokens worden aanvaard.');
  await verifySignature(token, header);
  validateClaims(claims);
  const roles = normalizeRoles(claims);
  return {
    id: claims.oid || claims.sub,
    name: claims.name || claims.preferred_username || 'Microsoft-gebruiker',
    email: claims.preferred_username || claims.email || null,
    roles,
    tenantId: claims.tid,
    claims
  };
}

export function hasAnyRole(user, roles) {
  return roles.some((role) => user.roles.includes(role));
}

export function requireAnyRole(user, roles) {
  if (!hasAnyRole(user, roles)) {
    const error = new Error('U hebt onvoldoende rechten voor deze actie.');
    error.statusCode = 403;
    throw error;
  }
}

export const roleSets = Object.freeze({
  allEmergencyServices: ['EventRisk.Admin', 'EventRisk.Coordinator', 'EventRisk.D1', 'EventRisk.D2', 'EventRisk.D3'],
  sharedEditors: ['EventRisk.Admin', 'EventRisk.Coordinator'],
  administrators: ['EventRisk.Admin'],
  discipline: {
    d1: ['EventRisk.Admin', 'EventRisk.Coordinator', 'EventRisk.D1'],
    d2: ['EventRisk.Admin', 'EventRisk.Coordinator', 'EventRisk.D2'],
    d3: ['EventRisk.Admin', 'EventRisk.Coordinator', 'EventRisk.D3']
  }
});
