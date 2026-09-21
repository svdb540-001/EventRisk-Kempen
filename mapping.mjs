import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.mjs';
import { buildFeedbackPayload } from '../risk-engine.mjs';

const mappingCache = new Map();

function getPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value == null ? undefined : value[key], object);
}

function firstValue(object, candidates = []) {
  for (const candidate of candidates) {
    const value = getPath(object, candidate);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
}

function setPath(object, dottedPath, value) {
  const parts = dottedPath.split('.');
  const final = parts.pop();
  let cursor = object;
  for (const part of parts) cursor = cursor[part] ||= {};
  cursor[final] = value;
}

export function loadMapping(platform) {
  if (mappingCache.has(platform)) return mappingCache.get(platform);
  const filePath = path.join(config.rootDir, 'config', 'mappings', `${platform}.json`);
  const mapping = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  mappingCache.set(platform, mapping);
  return mapping;
}

function normalizeDocuments(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => typeof item === 'string'
    ? { name: item, type: 'Bijlage', url: null }
    : { name: item.name || item.filename || 'Bijlage', type: item.type || item.category || 'Bijlage', url: item.url || item.downloadUrl || null }
  );
}

export function normalizeExternalEvent(platform, raw) {
  const mapping = loadMapping(platform);
  const normalized = { source: platform, riskAnswers: {}, factors: {}, advice: {}, status: 'imported' };
  for (const [target, candidates] of Object.entries(mapping)) {
    const value = firstValue(raw, candidates);
    if (value !== null) setPath(normalized, target, value);
  }
  normalized.externalId = String(normalized.externalId || '');
  normalized.externalReference = normalized.externalReference ? String(normalized.externalReference) : null;
  normalized.municipality = String(normalized.municipality || 'Onbekende gemeente');
  normalized.name = String(normalized.name || 'Naamloos evenement');
  normalized.startAt = normalized.startAt || new Date().toISOString();
  normalized.endAt = normalized.endAt || null;
  normalized.attendance = normalized.attendance === null || normalized.attendance === undefined ? null : Number(normalized.attendance);
  normalized.documents = normalizeDocuments(normalized.documents);
  normalized.rawSourcePayload = raw;
  return normalized;
}

export function createOutboundFeedback(event) {
  return buildFeedbackPayload(event);
}

export function extractCollection(body) {
  if (Array.isArray(body)) return body;
  for (const key of ['items', 'data', 'results', 'events', 'applications']) {
    if (Array.isArray(body?.[key])) return body[key];
  }
  return body && typeof body === 'object' ? [body] : [];
}
