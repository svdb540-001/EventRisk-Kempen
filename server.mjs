import http from 'node:http';
import path from 'node:path';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { config, assertProductionConfiguration } from './src/config.mjs';
import { authenticateRequest, requireAnyRole, roleSets } from './src/auth.mjs';
import {
  addAuditLog, eventStats, getAllSyncStates, getEvent, listAuditLogs, listEvents,
  listSyncLogs, ready as databaseReady, saveAdvice, saveEvent
} from './src/db.mjs';
import { riskConfig, calculateRisk } from './src/risk-engine.mjs';
import { connectorStatus } from './src/integrations/index.mjs';
import { normalizeExternalEvent } from './src/integrations/mapping.mjs';
import { pullPlatform, pushEvent, pushPending, startAutomaticSync, testPlatform } from './src/sync.mjs';
import { initializeStorage, openDocument, storeDocument } from './src/storage.mjs';
import { matchRoute, readBody, readJson, sendJson, sendText, serveStatic, setSecurityHeaders } from './src/http.mjs';

assertProductionConfiguration();
const publicDir = path.join(config.rootDir, 'public');
const msalDir = path.join(config.rootDir, 'node_modules', '@azure', 'msal-browser', 'lib');

function publicConfig() {
  return {
    appName: 'EventRisk Kempen',
    authMode: config.auth.mode,
    entra: {
      tenantId: config.auth.tenantId,
      clientId: config.auth.spaClientId,
      apiScope: config.auth.apiScope,
      authority: config.auth.tenantId ? `https://login.microsoftonline.com/${config.auth.tenantId}` : null
    },
    development: config.auth.mode === 'development' && config.nodeEnv !== 'production',
    allowedRoles: config.auth.allowedRoles
  };
}

function canEditShared(user) {
  requireAnyRole(user, roleSets.sharedEditors);
}

async function authenticated(request) {
  const user = await authenticateRequest(request);
  requireAnyRole(user, roleSets.allEmergencyServices);
  return user;
}

function errorResponse(response, error) {
  if (response.headersSent) {
    response.destroy(error);
    return;
  }
  const statusCode = error.statusCode || (error.message?.includes('niet gevonden') ? 404 : 400);
  if (config.nodeEnv !== 'production') console.error(error);
  sendJson(response, statusCode, { error: error.message || 'Onverwachte fout.' });
}

function verifyWebhook(rawBody, signature, secret) {
  if (!secret) throw new Error('FLOWLAB_WEBHOOK_SECRET ontbreekt.');
  const received = String(signature || '').replace(/^sha256=/, '');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const receivedBuffer = Buffer.from(received, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

async function handleApi(request, response, url) {
  const { pathname, searchParams } = url;
  const method = request.method || 'GET';

  if (method === 'GET' && pathname === '/api/health') {
    await databaseReady;
    return sendJson(response, 200, {
      ok: true,
      app: 'EventRisk Kempen',
      database: config.databaseProvider,
      storage: config.storage.provider,
      time: new Date().toISOString()
    });
  }
  if (method === 'GET' && pathname === '/api/public-config') return sendJson(response, 200, publicConfig());

  if (method === 'POST' && pathname === '/api/webhooks/flowlab') {
    const raw = await readBody(request, 10 * 1024 * 1024);
    if (!verifyWebhook(raw, request.headers['x-flowlab-signature'], config.flowlab.webhookSecret)) {
      return sendJson(response, 401, { error: 'Ongeldige webhookhandtekening.' });
    }
    const payload = JSON.parse(raw.toString('utf8'));
    const items = Array.isArray(payload) ? payload : [payload];
    const saved = [];
    for (const item of items) {
      saved.push(await saveEvent({ ...normalizeExternalEvent('flowlab', item), feedbackPending: false }, { markFeedback: false }));
    }
    return sendJson(response, 202, { accepted: saved.length, eventIds: saved.map((item) => item.id) });
  }

  const user = await authenticated(request);

  if (method === 'GET' && pathname === '/api/me') return sendJson(response, 200, { user });
  if (method === 'GET' && pathname === '/api/risk-config') return sendJson(response, 200, riskConfig);
  if (method === 'GET' && pathname === '/api/stats') return sendJson(response, 200, await eventStats());

  if (method === 'GET' && pathname === '/api/events') {
    return sendJson(response, 200, {
      events: await listEvents({
        search: searchParams.get('search') || '', source: searchParams.get('source') || '',
        municipality: searchParams.get('municipality') || '', status: searchParams.get('status') || '',
        rn: searchParams.get('rn') ?? ''
      })
    });
  }

  if (method === 'POST' && pathname === '/api/events') {
    canEditShared(user);
    const body = await readJson(request);
    const event = await saveEvent({ ...body, source: body.source || 'manual' }, { markFeedback: body.source !== 'manual' });
    await addAuditLog(user, 'event.create', 'event', event.id, { name: event.name });
    return sendJson(response, 201, { event });
  }

  let params = matchRoute(pathname, '/api/events/:id');
  if (params && method === 'GET') {
    const event = await getEvent(params.id);
    if (!event) return sendJson(response, 404, { error: 'Evenement niet gevonden.' });
    return sendJson(response, 200, { event });
  }
  if (params && method === 'PUT') {
    canEditShared(user);
    const existing = await getEvent(params.id);
    if (!existing) return sendJson(response, 404, { error: 'Evenement niet gevonden.' });
    const body = await readJson(request);
    if (body.version !== undefined && Number(body.version) !== existing.version) {
      return sendJson(response, 409, { error: 'Dit dossier werd intussen gewijzigd. Herlaad het dossier.' });
    }
    const event = await saveEvent({ ...existing, ...body, id: existing.id });
    await addAuditLog(user, 'event.update', 'event', event.id, { changedFields: Object.keys(body) });
    return sendJson(response, 200, { event });
  }

  params = matchRoute(pathname, '/api/events/:id/calculate');
  if (params && method === 'POST') {
    const event = await getEvent(params.id);
    if (!event) return sendJson(response, 404, { error: 'Evenement niet gevonden.' });
    return sendJson(response, 200, { risk: calculateRisk(event) });
  }

  params = matchRoute(pathname, '/api/events/:id/advice/:discipline');
  if (params && method === 'PUT') {
    const discipline = params.discipline.toLowerCase();
    if (!roleSets.discipline[discipline]) return sendJson(response, 400, { error: 'Ongeldige discipline.' });
    requireAnyRole(user, roleSets.discipline[discipline]);
    const body = await readJson(request);
    const event = await saveAdvice(params.id, discipline, String(body.text || ''), user);
    if (!event) return sendJson(response, 404, { error: 'Evenement niet gevonden.' });
    await addAuditLog(user, `advice.${discipline}.save`, 'event', event.id, { status: event.advice[discipline].status });
    return sendJson(response, 200, { event });
  }

  params = matchRoute(pathname, '/api/events/:id/documents');
  if (params && method === 'POST') {
    canEditShared(user);
    const event = await getEvent(params.id);
    if (!event) return sendJson(response, 404, { error: 'Evenement niet gevonden.' });
    const maxBytes = config.maxUploadMb * 1024 * 1024;
    const buffer = await readBody(request, maxBytes);
    const originalName = decodeURIComponent(String(request.headers['x-file-name'] || 'bijlage.bin'));
    const documentType = decodeURIComponent(String(request.headers['x-document-type'] || 'Bijlage'));
    const safeExtension = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
    const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png']);
    const allowedContentTypes = new Set([
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg', 'image/png', 'application/octet-stream'
    ]);
    const contentType = String(request.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    if (!allowedExtensions.has(safeExtension) || !allowedContentTypes.has(contentType)) {
      const error = new Error('Alleen PDF, Word, Excel, JPG en PNG zijn toegestaan.');
      error.statusCode = 415;
      throw error;
    }
    const storageKey = `${event.id}/${randomUUID()}${safeExtension}`;
    await storeDocument({
      storageKey,
      buffer,
      contentType,
      metadata: { eventId: event.id, uploadedBy: user.email || user.id, originalName }
    });
    const document = {
      id: randomUUID(), name: originalName, type: documentType, storageKey,
      storageProvider: config.storage.provider, contentType, size: buffer.length,
      uploadedAt: new Date().toISOString(), uploadedBy: user.email
    };
    event.documents.push(document);
    const saved = await saveEvent({ ...event, documents: event.documents });
    await addAuditLog(user, 'document.upload', 'event', event.id, { documentId: document.id, name: originalName });
    return sendJson(response, 201, { event: saved, document });
  }

  params = matchRoute(pathname, '/api/events/:id/documents/:documentId');
  if (params && method === 'GET') {
    const event = await getEvent(params.id);
    const document = event?.documents.find((item) => item.id === params.documentId);
    const storageKey = document?.storageKey || document?.storedName;
    if (!storageKey) return sendJson(response, 404, { error: 'Document niet gevonden.' });
    const download = await openDocument(storageKey);
    if (!download) return sendJson(response, 404, { error: 'Bestand ontbreekt in de documentopslag.' });
    response.writeHead(200, {
      'Content-Type': document.contentType || download.contentType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`,
      ...(download.contentLength ? { 'Content-Length': download.contentLength } : {}),
      'Cache-Control': 'private, no-store'
    });
    download.stream.on('error', (error) => response.destroy(error));
    return download.stream.pipe(response);
  }

  if (method === 'GET' && pathname === '/api/integrations') {
    requireAnyRole(user, roleSets.administrators);
    const [states, logs, events] = await Promise.all([getAllSyncStates(), listSyncLogs(100), listEvents()]);
    return sendJson(response, 200, {
      connectors: connectorStatus(), states, logs,
      pending: events.filter((event) => event.feedbackPending && event.source !== 'manual')
    });
  }

  params = matchRoute(pathname, '/api/integrations/:platform/test');
  if (params && method === 'POST') {
    requireAnyRole(user, roleSets.administrators);
    const result = await testPlatform(params.platform);
    await addAuditLog(user, 'integration.test', 'integration', params.platform, result);
    return sendJson(response, 200, { result });
  }

  params = matchRoute(pathname, '/api/integrations/:platform/pull');
  if (params && method === 'POST') {
    requireAnyRole(user, roleSets.administrators);
    const result = await pullPlatform(params.platform);
    await addAuditLog(user, 'integration.pull', 'integration', params.platform, { imported: result.imported });
    return sendJson(response, 200, { result });
  }

  params = matchRoute(pathname, '/api/integrations/:platform/push-pending');
  if (params && method === 'POST') {
    requireAnyRole(user, roleSets.administrators);
    const results = await pushPending(params.platform);
    await addAuditLog(user, 'integration.pushPending', 'integration', params.platform, { count: results.length });
    return sendJson(response, 200, { results });
  }

  params = matchRoute(pathname, '/api/integrations/:platform/push/:eventId');
  if (params && method === 'POST') {
    requireAnyRole(user, roleSets.administrators);
    const result = await pushEvent(params.platform, params.eventId);
    await addAuditLog(user, 'integration.push', 'event', params.eventId, { platform: params.platform });
    return sendJson(response, 200, { result });
  }

  if (method === 'GET' && pathname === '/api/audit') {
    requireAnyRole(user, roleSets.administrators);
    return sendJson(response, 200, { logs: await listAuditLogs(Number(searchParams.get('limit') || 200)) });
  }

  return sendJson(response, 404, { error: 'API-route niet gevonden.' });
}

const server = http.createServer(async (request, response) => {
  setSecurityHeaders(response);
  const url = new URL(request.url || '/', config.appBaseUrl);
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
    if (url.pathname === '/vendor/msal-browser.min.js' && serveStatic(response, msalDir, '/msal-browser.min.js')) return;
    if (serveStatic(response, publicDir, url.pathname)) return;
    if (!path.extname(url.pathname) && serveStatic(response, publicDir, '/index.html')) return;
    sendText(response, 404, 'Niet gevonden');
  } catch (error) {
    errorResponse(response, error);
  }
});

async function start() {
  await databaseReady;
  await initializeStorage();
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`EventRisk Kempen luistert op http://0.0.0.0:${config.port}`);
    console.log(`Authenticatiemodus: ${config.auth.mode}`);
    console.log(`Database: ${config.databaseProvider}`);
    console.log(`Documentopslag: ${config.storage.provider}`);
    console.log(`Connectormodus: ${config.sync.mockConnectors ? 'mock' : 'live'}`);
    startAutomaticSync();
  });
}

start().catch((error) => {
  console.error('EventRisk Kempen kon niet starten:', error);
  process.exit(1);
});
