import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.mjs';

export class MockConnector {
  constructor(platform) { this.platform = platform; }

  async pullEvents() {
    const filePath = path.join(config.rootDir, 'fixtures', `${this.platform}-events.json`);
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  }

  async pushFeedback(externalId, payload) {
    return { accepted: true, mock: true, externalId, receivedAt: new Date().toISOString(), payload };
  }

  async testConnection() {
    return { ok: true, mode: 'mock', platform: this.platform };
  }
}
