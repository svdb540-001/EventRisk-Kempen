import { config } from '../config.mjs';
import { fetchJson, joinUrl, applyTemplate } from './http-client.mjs';
import { extractCollection } from './mapping.mjs';

export class EaglebeConnector {
  #accessToken = null;
  #expiresAt = 0;

  async getAccessToken() {
    if (this.#accessToken && this.#expiresAt > Date.now() + 60_000) return this.#accessToken;
    if (!config.eaglebe.tokenUrl || !config.eaglebe.clientId || !config.eaglebe.clientSecret) {
      throw new Error('Eaglebe OAuth2-configuratie ontbreekt. Vul token-URL, client-id en client-secret in.');
    }
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.eaglebe.clientId,
      client_secret: config.eaglebe.clientSecret,
      ...(config.eaglebe.scope ? { scope: config.eaglebe.scope } : {})
    });
    const response = await fetch(config.eaglebe.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body
    });
    if (!response.ok) throw new Error(`Eaglebe-token ophalen mislukt (${response.status}).`);
    const token = await response.json();
    this.#accessToken = token.access_token;
    this.#expiresAt = Date.now() + Number(token.expires_in || 3600) * 1000;
    return this.#accessToken;
  }

  async headers() {
    return { Authorization: `Bearer ${await this.getAccessToken()}` };
  }

  async pullEvents(since = null) {
    if (!config.eaglebe.baseUrl) throw new Error('EAGLEBE_BASE_URL ontbreekt.');
    const url = new URL(joinUrl(config.eaglebe.baseUrl, config.eaglebe.eventsPath));
    if (since) url.searchParams.set(config.eaglebe.changedSinceParam, since);
    return extractCollection(await fetchJson(url, { headers: await this.headers() }));
  }

  async pushFeedback(externalId, payload) {
    const path = applyTemplate(config.eaglebe.feedbackPathTemplate, { externalId });
    return fetchJson(joinUrl(config.eaglebe.baseUrl, path), {
      method: config.eaglebe.feedbackMethod,
      headers: await this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async testConnection() {
    await this.getAccessToken();
    return { ok: true, mode: 'live', platform: 'eaglebe' };
  }
}
