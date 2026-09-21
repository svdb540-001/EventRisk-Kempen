import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.mjs';
import { calculateRisk } from './risk-engine.mjs';

let sqlite = null;
let pool = null;

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normalizeTimestamp(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapStoredEvent(row) {
  if (!row) return null;
  const payload = parseJson(row.payload_json ?? row.payload, {});
  const event = {
    ...payload,
    id: row.id,
    source: row.source,
    externalId: row.external_id,
    externalReference: row.external_reference,
    municipality: row.municipality,
    name: row.name,
    startAt: normalizeTimestamp(row.start_at),
    status: row.status,
    feedbackPending: Boolean(row.feedback_pending),
    sourceUpdatedAt: normalizeTimestamp(row.source_updated_at),
    createdAt: normalizeTimestamp(row.created_at),
    updatedAt: normalizeTimestamp(row.updated_at),
    version: Number(row.version || 1)
  };
  event.organizer ||= { name: null, contact: null, email: null, phone: null };
  event.riskAnswers ||= {};
  event.factors ||= {};
  event.advice ||= {};
  event.documents ||= [];
  event.risk = calculateRisk(event);
  return event;
}

function normalizeEvent(input, existing = null) {
  const now = new Date().toISOString();
  const attendance = input.attendance === '' || input.attendance === undefined
    ? existing?.attendance ?? null
    : Number(input.attendance);
  return {
    id: existing?.id || input.id || `ERK-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`,
    source: input.source || existing?.source || 'manual',
    externalId: input.externalId ?? existing?.externalId ?? null,
    externalReference: input.externalReference ?? existing?.externalReference ?? null,
    municipality: input.municipality ?? existing?.municipality ?? '',
    name: input.name ?? existing?.name ?? '',
    startAt: input.startAt ?? existing?.startAt ?? now,
    endAt: input.endAt ?? existing?.endAt ?? null,
    address: input.address ?? existing?.address ?? null,
    attendance: Number.isFinite(attendance) ? attendance : null,
    organizer: {
      name: input.organizer?.name ?? existing?.organizer?.name ?? null,
      contact: input.organizer?.contact ?? existing?.organizer?.contact ?? null,
      email: input.organizer?.email ?? existing?.organizer?.email ?? null,
      phone: input.organizer?.phone ?? existing?.organizer?.phone ?? null
    },
    status: input.status ?? existing?.status ?? 'imported',
    riskAnswers: input.riskAnswers ?? existing?.riskAnswers ?? {},
    factors: input.factors ?? existing?.factors ?? {},
    notes: input.notes ?? existing?.notes ?? null,
    manualRn: input.manualRn === '' ? null : input.manualRn ?? existing?.manualRn ?? null,
    manualRnReason: input.manualRnReason ?? existing?.manualRnReason ?? null,
    advice: input.advice ?? existing?.advice ?? {},
    documents: input.documents ?? existing?.documents ?? [],
    feedbackPending: input.feedbackPending ?? existing?.feedbackPending ?? false,
    sourceUpdatedAt: input.sourceUpdatedAt ?? existing?.sourceUpdatedAt ?? null,
    createdAt: existing?.createdAt || input.createdAt || now,
    updatedAt: now,
    version: existing ? existing.version + 1 : Number(input.version || 1)
  };
}

function eventPayload(event) {
  const {
    id, source, externalId, externalReference, municipality, name, startAt, status,
    feedbackPending, sourceUpdatedAt, createdAt, updatedAt, version, risk, ...payload
  } = event;
  return payload;
}

async function initializeSqlite() {
  fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
  sqlite = new DatabaseSync(config.databasePath);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      external_reference TEXT,
      municipality TEXT NOT NULL,
      name TEXT NOT NULL,
      start_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'imported',
      payload_json TEXT NOT NULL DEFAULT '{}',
      feedback_pending INTEGER NOT NULL DEFAULT 0,
      source_updated_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      UNIQUE(source, external_id)
    );
    CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at);
    CREATE INDEX IF NOT EXISTS idx_events_municipality ON events(municipality);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, direction TEXT NOT NULL,
      event_id TEXT, external_id TEXT, status TEXT NOT NULL, message TEXT NOT NULL,
      payload_json TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, actor_id TEXT, actor_name TEXT, actor_email TEXT,
      actor_roles_json TEXT NOT NULL DEFAULT '[]', action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT, details_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_state (
      platform TEXT PRIMARY KEY, last_pull_at TEXT, last_push_at TEXT,
      last_success_at TEXT, last_error TEXT, updated_at TEXT NOT NULL
    );
  `);
}

async function initializePostgres() {
  const { Pool } = await import('pg');
  pool = new Pool({
    ...(config.databaseUrl ? { connectionString: config.databaseUrl } : {
      host: config.databaseHost,
      port: config.databasePort,
      database: config.databaseName,
      user: config.databaseUser,
      password: config.databasePassword
    }),
    max: config.databasePoolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: config.databaseSsl ? { rejectUnauthorized: config.databaseSslRejectUnauthorized } : false
  });
  await pool.query('SELECT 1');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL DEFAULT 'manual',
      external_id TEXT,
      external_reference TEXT,
      municipality TEXT NOT NULL,
      name TEXT NOT NULL,
      start_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'imported',
      payload JSONB NOT NULL DEFAULT '{}'::jsonb,
      feedback_pending BOOLEAN NOT NULL DEFAULT FALSE,
      source_updated_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      UNIQUE(source, external_id)
    );
    CREATE INDEX IF NOT EXISTS idx_events_start ON events(start_at);
    CREATE INDEX IF NOT EXISTS idx_events_municipality ON events(municipality);
    CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY, platform TEXT NOT NULL, direction TEXT NOT NULL,
      event_id TEXT, external_id TEXT, status TEXT NOT NULL, message TEXT NOT NULL,
      payload JSONB, created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY, actor_id TEXT, actor_name TEXT, actor_email TEXT,
      actor_roles JSONB NOT NULL DEFAULT '[]'::jsonb, action TEXT NOT NULL,
      entity_type TEXT NOT NULL, entity_id TEXT, details JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_state (
      platform TEXT PRIMARY KEY, last_pull_at TIMESTAMPTZ, last_push_at TIMESTAMPTZ,
      last_success_at TIMESTAMPTZ, last_error TEXT, updated_at TIMESTAMPTZ NOT NULL
    );
  `);
}

export const ready = (async () => {
  if (config.databaseProvider === 'postgres') await initializePostgres();
  else await initializeSqlite();
})();

async function allEventRows() {
  await ready;
  if (pool) return (await pool.query('SELECT * FROM events ORDER BY start_at ASC')).rows;
  return sqlite.prepare('SELECT * FROM events ORDER BY start_at ASC').all();
}

export async function listEvents(filters = {}) {
  let events = (await allEventRows()).map(mapStoredEvent);
  const search = String(filters.search || '').trim().toLowerCase();
  if (search) {
    events = events.filter((event) => [event.name, event.municipality, event.externalReference, event.organizer?.name]
      .some((value) => String(value || '').toLowerCase().includes(search)));
  }
  if (filters.source) events = events.filter((event) => event.source === filters.source);
  if (filters.municipality) events = events.filter((event) => event.municipality === filters.municipality);
  if (filters.status) events = events.filter((event) => event.status === filters.status);
  if (filters.rn !== undefined && filters.rn !== '') events = events.filter((event) => event.risk.finalRn === Number(filters.rn));
  return events;
}

export async function getEvent(id) {
  await ready;
  if (pool) return mapStoredEvent((await pool.query('SELECT * FROM events WHERE id = $1', [id])).rows[0]);
  return mapStoredEvent(sqlite.prepare('SELECT * FROM events WHERE id = ?').get(id));
}

export async function getEventByExternal(source, externalId) {
  await ready;
  if (pool) return mapStoredEvent((await pool.query('SELECT * FROM events WHERE source = $1 AND external_id = $2', [source, externalId])).rows[0]);
  return mapStoredEvent(sqlite.prepare('SELECT * FROM events WHERE source = ? AND external_id = ?').get(source, externalId));
}

export async function saveEvent(input, { markFeedback = true } = {}) {
  const existing = input.id
    ? await getEvent(input.id)
    : (input.source && input.externalId ? await getEventByExternal(input.source, input.externalId) : null);
  const event = normalizeEvent({ ...input, feedbackPending: markFeedback ? true : input.feedbackPending }, existing);
  if (!event.name || !event.municipality || !event.startAt) throw new Error('Naam, gemeente en startdatum zijn verplicht.');
  const payload = eventPayload(event);
  await ready;
  if (pool) {
    await pool.query(`
      INSERT INTO events (id, source, external_id, external_reference, municipality, name, start_at, status, payload,
        feedback_pending, source_updated_at, created_at, updated_at, version)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14)
      ON CONFLICT (id) DO UPDATE SET source=EXCLUDED.source, external_id=EXCLUDED.external_id,
        external_reference=EXCLUDED.external_reference, municipality=EXCLUDED.municipality, name=EXCLUDED.name,
        start_at=EXCLUDED.start_at, status=EXCLUDED.status, payload=EXCLUDED.payload,
        feedback_pending=EXCLUDED.feedback_pending, source_updated_at=EXCLUDED.source_updated_at,
        updated_at=EXCLUDED.updated_at, version=EXCLUDED.version
    `, [event.id, event.source, event.externalId, event.externalReference, event.municipality, event.name,
      event.startAt, event.status, JSON.stringify(payload), event.feedbackPending, event.sourceUpdatedAt,
      event.createdAt, event.updatedAt, event.version]);
  } else {
    sqlite.prepare(`
      INSERT INTO events (id, source, external_id, external_reference, municipality, name, start_at, status, payload_json,
        feedback_pending, source_updated_at, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET source=excluded.source, external_id=excluded.external_id,
        external_reference=excluded.external_reference, municipality=excluded.municipality, name=excluded.name,
        start_at=excluded.start_at, status=excluded.status, payload_json=excluded.payload_json,
        feedback_pending=excluded.feedback_pending, source_updated_at=excluded.source_updated_at,
        updated_at=excluded.updated_at, version=excluded.version
    `).run(event.id, event.source, event.externalId, event.externalReference, event.municipality, event.name,
      event.startAt, event.status, JSON.stringify(payload), event.feedbackPending ? 1 : 0, event.sourceUpdatedAt,
      event.createdAt, event.updatedAt, event.version);
  }
  return getEvent(event.id);
}

export async function saveAdvice(eventId, discipline, text, actor) {
  const event = await getEvent(eventId);
  if (!event) return null;
  event.advice[discipline] = {
    text,
    status: text?.trim() ? 'approved' : 'draft',
    authorName: actor.name,
    authorEmail: actor.email,
    updatedAt: new Date().toISOString()
  };
  return saveEvent({ ...event, advice: event.advice }, { markFeedback: true });
}

export async function markFeedbackSent(eventId) {
  const event = await getEvent(eventId);
  if (!event) return null;
  return saveEvent({ ...event, feedbackPending: false }, { markFeedback: false });
}

export async function addSyncLog({ platform, direction, eventId = null, externalId = null, status, message, payload = null }) {
  const entry = { id: randomUUID(), platform, direction, eventId, externalId, status, message, payload, createdAt: new Date().toISOString() };
  await ready;
  if (pool) {
    await pool.query('INSERT INTO sync_logs (id, platform, direction, event_id, external_id, status, message, payload, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)',
      [entry.id, platform, direction, eventId, externalId, status, message, payload ? JSON.stringify(payload) : null, entry.createdAt]);
  } else {
    sqlite.prepare('INSERT INTO sync_logs (id, platform, direction, event_id, external_id, status, message, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(entry.id, platform, direction, eventId, externalId, status, message, payload ? JSON.stringify(payload) : null, entry.createdAt);
  }
  return entry;
}

export async function listSyncLogs(limit = 100) {
  await ready;
  const rows = pool
    ? (await pool.query('SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT $1', [Number(limit)])).rows
    : sqlite.prepare('SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT ?').all(Number(limit));
  return rows.map((row) => ({
    id: row.id, platform: row.platform, direction: row.direction, eventId: row.event_id,
    externalId: row.external_id, status: row.status, message: row.message,
    payload: parseJson(row.payload_json ?? row.payload, null), createdAt: normalizeTimestamp(row.created_at)
  }));
}

export async function addAuditLog(actor, action, entityType, entityId = null, details = {}) {
  const createdAt = new Date().toISOString();
  await ready;
  if (pool) {
    await pool.query('INSERT INTO audit_logs (id, actor_id, actor_name, actor_email, actor_roles, action, entity_type, entity_id, details, created_at) VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,$9::jsonb,$10)',
      [randomUUID(), actor?.id || null, actor?.name || null, actor?.email || null, JSON.stringify(actor?.roles || []), action, entityType, entityId, JSON.stringify(details), createdAt]);
  } else {
    sqlite.prepare('INSERT INTO audit_logs (id, actor_id, actor_name, actor_email, actor_roles_json, action, entity_type, entity_id, details_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), actor?.id || null, actor?.name || null, actor?.email || null, JSON.stringify(actor?.roles || []), action, entityType, entityId, JSON.stringify(details), createdAt);
  }
}

export async function listAuditLogs(limit = 200) {
  await ready;
  const rows = pool
    ? (await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [Number(limit)])).rows
    : sqlite.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?').all(Number(limit));
  return rows.map((row) => ({
    id: row.id, actorId: row.actor_id, actorName: row.actor_name, actorEmail: row.actor_email,
    actorRoles: parseJson(row.actor_roles_json ?? row.actor_roles, []), action: row.action,
    entityType: row.entity_type, entityId: row.entity_id,
    details: parseJson(row.details_json ?? row.details, {}), createdAt: normalizeTimestamp(row.created_at)
  }));
}

export async function updateSyncState(platform, patch) {
  const current = await getSyncState(platform) || { platform };
  const merged = { ...current, ...patch, updatedAt: new Date().toISOString() };
  await ready;
  if (pool) {
    await pool.query(`INSERT INTO sync_state (platform, last_pull_at, last_push_at, last_success_at, last_error, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT(platform) DO UPDATE SET last_pull_at=EXCLUDED.last_pull_at, last_push_at=EXCLUDED.last_push_at,
        last_success_at=EXCLUDED.last_success_at, last_error=EXCLUDED.last_error, updated_at=EXCLUDED.updated_at`,
      [platform, merged.lastPullAt || null, merged.lastPushAt || null, merged.lastSuccessAt || null, merged.lastError || null, merged.updatedAt]);
  } else {
    sqlite.prepare(`INSERT INTO sync_state (platform, last_pull_at, last_push_at, last_success_at, last_error, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(platform) DO UPDATE SET last_pull_at=excluded.last_pull_at, last_push_at=excluded.last_push_at,
        last_success_at=excluded.last_success_at, last_error=excluded.last_error, updated_at=excluded.updated_at`)
      .run(platform, merged.lastPullAt || null, merged.lastPushAt || null, merged.lastSuccessAt || null, merged.lastError || null, merged.updatedAt);
  }
  return getSyncState(platform);
}

export async function getSyncState(platform) {
  await ready;
  const row = pool
    ? (await pool.query('SELECT * FROM sync_state WHERE platform = $1', [platform])).rows[0]
    : sqlite.prepare('SELECT * FROM sync_state WHERE platform = ?').get(platform);
  return row ? {
    platform: row.platform, lastPullAt: normalizeTimestamp(row.last_pull_at), lastPushAt: normalizeTimestamp(row.last_push_at),
    lastSuccessAt: normalizeTimestamp(row.last_success_at), lastError: row.last_error, updatedAt: normalizeTimestamp(row.updated_at)
  } : null;
}

export async function getAllSyncStates() {
  return Promise.all(['eaglebe', 'flowlab'].map(async (platform) => await getSyncState(platform) || { platform }));
}

export async function eventStats() {
  const events = await listEvents();
  return {
    total: events.length,
    upcoming: events.filter((event) => new Date(event.startAt) >= new Date()).length,
    highRisk: events.filter((event) => event.risk.finalRn >= 4).length,
    pendingFeedback: events.filter((event) => event.feedbackPending && event.source !== 'manual').length,
    bySource: Object.fromEntries(['eaglebe', 'flowlab', 'manual'].map((source) => [source, events.filter((event) => event.source === source).length]))
  };
}

export async function closeDatabase() {
  if (pool) await pool.end();
  if (sqlite) sqlite.close();
}
