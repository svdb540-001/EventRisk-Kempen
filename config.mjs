import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function bool(value, fallback = false) {
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function list(value) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = Object.freeze({
  rootDir,
  port: number(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  trustProxy: bool(process.env.TRUST_PROXY, false),
  maxUploadMb: number(process.env.MAX_UPLOAD_MB, 20),
  databaseProvider: (process.env.DATABASE_PROVIDER || 'sqlite').toLowerCase(),
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH || './data/eventrisk.db'),
  databaseUrl: process.env.DATABASE_URL || '',
  databaseHost: process.env.DATABASE_HOST || '',
  databasePort: number(process.env.DATABASE_PORT, 5432),
  databaseName: process.env.DATABASE_NAME || 'eventrisk',
  databaseUser: process.env.DATABASE_USER || '',
  databasePassword: process.env.DATABASE_PASSWORD || '',
  databasePoolMax: number(process.env.DATABASE_POOL_MAX, 10),
  databaseSsl: bool(process.env.DATABASE_SSL, false),
  databaseSslRejectUnauthorized: bool(process.env.DATABASE_SSL_REJECT_UNAUTHORIZED, true),
  uploadDir: path.resolve(rootDir, process.env.UPLOAD_DIR || './data/uploads'),
  storage: {
    provider: (process.env.STORAGE_PROVIDER || 'local').toLowerCase(),
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING || '',
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || '',
    accountUrl: process.env.AZURE_STORAGE_ACCOUNT_URL || '',
    containerName: process.env.AZURE_STORAGE_CONTAINER || 'eventrisk-documents'
  },
  auth: {
    mode: process.env.AUTH_MODE || 'development',
    tenantId: process.env.ENTRA_TENANT_ID || '',
    spaClientId: process.env.ENTRA_SPA_CLIENT_ID || '',
    apiClientId: process.env.ENTRA_API_CLIENT_ID || '',
    apiScope: process.env.ENTRA_API_SCOPE || '',
    allowedTenantId: process.env.ENTRA_ALLOWED_TENANT_ID || process.env.ENTRA_TENANT_ID || '',
    allowedRoles: list(process.env.ENTRA_ALLOWED_ROLES || 'EventRisk.Admin,EventRisk.Coordinator,EventRisk.D1,EventRisk.D2,EventRisk.D3'),
    allowedGroupIds: list(process.env.ENTRA_ALLOWED_GROUP_IDS),
    developmentUser: {
      name: process.env.DEV_USER_NAME || 'Lokale testgebruiker',
      email: process.env.DEV_USER_EMAIL || 'test@example.invalid',
      role: process.env.DEV_USER_ROLE || 'EventRisk.Admin'
    }
  },
  sync: {
    automatic: bool(process.env.SYNC_AUTOMATIC, false),
    intervalMinutes: number(process.env.SYNC_INTERVAL_MINUTES, 15),
    mockConnectors: bool(process.env.MOCK_CONNECTORS, true)
  },
  eaglebe: {
    enabled: bool(process.env.EAGLEBE_ENABLED, false),
    baseUrl: process.env.EAGLEBE_BASE_URL || '',
    tokenUrl: process.env.EAGLEBE_TOKEN_URL || '',
    clientId: process.env.EAGLEBE_CLIENT_ID || '',
    clientSecret: process.env.EAGLEBE_CLIENT_SECRET || '',
    scope: process.env.EAGLEBE_SCOPE || '',
    eventsPath: process.env.EAGLEBE_EVENTS_PATH || '/api/events',
    eventPathTemplate: process.env.EAGLEBE_EVENT_PATH_TEMPLATE || '/api/events/{externalId}',
    feedbackPathTemplate: process.env.EAGLEBE_FEEDBACK_PATH_TEMPLATE || '/api/events/{externalId}/advice',
    changedSinceParam: process.env.EAGLEBE_CHANGED_SINCE_PARAM || 'changedSince',
    feedbackMethod: process.env.EAGLEBE_FEEDBACK_METHOD || 'POST'
  },
  flowlab: {
    enabled: bool(process.env.FLOWLAB_ENABLED, false),
    baseUrl: process.env.FLOWLAB_BASE_URL || '',
    apiKey: process.env.FLOWLAB_API_KEY || '',
    authHeader: process.env.FLOWLAB_AUTH_HEADER || 'X-Api-Key',
    eventsPath: process.env.FLOWLAB_EVENTS_PATH || '/api/events',
    eventPathTemplate: process.env.FLOWLAB_EVENT_PATH_TEMPLATE || '/api/events/{externalId}',
    feedbackPathTemplate: process.env.FLOWLAB_FEEDBACK_PATH_TEMPLATE || '/api/events/{externalId}/advice',
    changedSinceParam: process.env.FLOWLAB_CHANGED_SINCE_PARAM || 'changedSince',
    feedbackMethod: process.env.FLOWLAB_FEEDBACK_METHOD || 'POST',
    webhookSecret: process.env.FLOWLAB_WEBHOOK_SECRET || ''
  }
});

export function assertProductionConfiguration() {
  if (config.nodeEnv !== 'production') return;
  const errors = [];
  if (config.auth.mode !== 'entra') errors.push('AUTH_MODE moet entra zijn');
  const missingAuth = ['tenantId', 'spaClientId', 'apiClientId', 'apiScope'].filter((key) => !config.auth[key]);
  if (missingAuth.length) errors.push(`Microsoft Entra ontbreekt: ${missingAuth.join(', ')}`);
  if (config.databaseProvider !== 'postgres') errors.push('DATABASE_PROVIDER moet postgres zijn');
  if (!config.databaseUrl && !(config.databaseHost && config.databaseUser && config.databasePassword)) {
    errors.push('DATABASE_URL of DATABASE_HOST/DATABASE_USER/DATABASE_PASSWORD ontbreekt');
  }
  if (!config.databaseSsl) errors.push('DATABASE_SSL moet true zijn');
  if (config.storage.provider !== 'azure') errors.push('STORAGE_PROVIDER moet azure zijn');
  if (!config.storage.connectionString && !config.storage.accountName && !config.storage.accountUrl) {
    errors.push('Azure Storage-configuratie ontbreekt');
  }
  if (config.sync.mockConnectors) errors.push('MOCK_CONNECTORS moet false zijn');
  if (errors.length) throw new Error(`Ongeldige productieconfiguratie: ${errors.join('; ')}.`);
}
