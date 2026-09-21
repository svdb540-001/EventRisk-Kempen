import { config } from '../config.mjs';
import { fetchJson, joinUrl, applyTemplate } from './http-client.mjs';
import { extractCollection } from './mapping.mjs';

export class FlowlabConnector {
  headers() {
    if (!config.flowlab.apiKey) throw new Error('FLOWLAB_API_KEY ontbreekt. Stem de authenticatiemethode af met Flowlab/Pixeo.');
    return { [config.flowlab.authHeader]: config.flowlab.apiKey };
  }

  async pullEvents(since = null) {
    if (!config.flowlab.baseUrl) throw new Error('FLOWLAB_BASE_URL ontbreekt.');
    const url = new URL(joinUrl(config.flowlab.baseUrl, config.flowlab.eventsPath));
    if (since) url.searchParams.set(config.flowlab.changedSinceParam, since);
    return extractCollection(await fetchJson(url, { headers: this.headers() }));
  }

  async pushFeedback(externalId, payload) {
    const path = applyTemplate(config.flowlab.feedbackPathTemplate, { externalId });
    return fetchJson(joinUrl(config.flowlab.baseUrl, path), {
      method: config.flowlab.feedbackMethod,
      headers: this.headers(),
      body: JSON.stringify(payload)
    });
  }

  async testConnection() {
    await this.pullEvents(new Date(Date.now() - 1000).toISOString());
    return { ok: true, mode: 'live', platform: 'flowlab' };
  }
}
