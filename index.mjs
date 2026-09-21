import { config } from '../config.mjs';
import { EaglebeConnector } from './eaglebe.mjs';
import { FlowlabConnector } from './flowlab.mjs';
import { MockConnector } from './mock.mjs';

export function getConnector(platform) {
  if (!['eaglebe', 'flowlab'].includes(platform)) throw new Error(`Onbekend platform: ${platform}`);
  if (config.sync.mockConnectors) return new MockConnector(platform);
  if (platform === 'eaglebe') {
    if (!config.eaglebe.enabled) throw new Error('Eaglebe-connector is uitgeschakeld.');
    return new EaglebeConnector();
  }
  if (!config.flowlab.enabled) throw new Error('Flowlab-connector is uitgeschakeld.');
  return new FlowlabConnector();
}

export function connectorStatus() {
  return {
    eaglebe: {
      enabled: config.sync.mockConnectors || config.eaglebe.enabled,
      mode: config.sync.mockConnectors ? 'mock' : 'live',
      authentication: 'OAuth 2.0 client credentials',
      configured: config.sync.mockConnectors || Boolean(config.eaglebe.baseUrl && config.eaglebe.tokenUrl && config.eaglebe.clientId && config.eaglebe.clientSecret)
    },
    flowlab: {
      enabled: config.sync.mockConnectors || config.flowlab.enabled,
      mode: config.sync.mockConnectors ? 'mock' : 'live',
      authentication: `API-key via ${config.flowlab.authHeader}`,
      configured: config.sync.mockConnectors || Boolean(config.flowlab.baseUrl && config.flowlab.apiKey)
    }
  };
}
