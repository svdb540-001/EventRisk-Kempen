import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  provider: 'entra';
  roles: string[];
}

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
  scope: string;
}

interface TokenResponse {
  token_type: string;
  scope: string;
  expires_in: number;
  ext_expires_in?: number;
  access_token: string;
  id_token?: string;
  refresh_token?: string;
}

@Injectable()
export class AuthService {
  private get tenantId() {
    return process.env.ENTRA_TENANT_ID || '';
  }

  private get clientId() {
    return process.env.ENTRA_CLIENT_ID || '';
  }

  private get clientSecret() {
    return process.env.ENTRA_CLIENT_SECRET || '';
  }

  private get redirectUri() {
    return process.env.ENTRA_REDIRECT_URI || 'http://localhost:4000/auth/callback';
  }

  private get scopes() {
    return (process.env.ENTRA_SCOPES || 'openid profile email User.Read offline_access').trim();
  }

  private get authorityBase() {
    return `https://login.microsoftonline.com/${this.tenantId}`;
  }

  getAdminRole() {
    return process.env.ENTRA_ADMIN_ROLE || 'EventRisk.Admin';
  }

  buildAuthorizationUrl(state: string) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: this.scopes,
      state
    });

    return `${this.authorityBase}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    const tokenEndpoint = `${this.authorityBase}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      scope: this.scopes
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<TokenResponse>;
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    const tokenEndpoint = `${this.authorityBase}/oauth2/v2.0/token`;

    const body = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: this.scopes
    });

    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<TokenResponse>;
  }

  mapUserFromIdToken(idToken: string): SessionUser {
    const decoded = jwt.decode(idToken) as jwt.JwtPayload | null;

    if (!decoded) {
      throw new Error('Invalid id_token');
    }

    const name = (decoded.name as string) || (decoded.preferred_username as string) || 'Unknown User';
    const email =
      (decoded.preferred_username as string) ||
      (decoded.email as string) ||
      (decoded.upn as string) ||
      'unknown@example.com';

    const id =
      (decoded.oid as string) ||
      (decoded.sub as string) ||
      (decoded.sid as string) ||
      `entra-${email}`;

    const rawRoles = (decoded.roles as string[] | string | undefined) || [];
    const roles = Array.isArray(rawRoles) ? rawRoles : [rawRoles];

    return {
      id,
      name,
      email,
      provider: 'entra',
      roles
    };
  }

  toSessionTokens(tokenResponse: TokenResponse): SessionTokens {
    const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      idToken: tokenResponse.id_token,
      expiresAt,
      scope: tokenResponse.scope
    };
  }

  isAccessTokenExpired(tokens?: SessionTokens, skewSeconds = 30): boolean {
    if (!tokens?.expiresAt) return true;
    return Date.now() >= tokens.expiresAt - skewSeconds * 1000;
  }

  hasRequiredConfig() {
    return Boolean(this.tenantId && this.clientId && this.clientSecret && this.redirectUri);
  }
}
