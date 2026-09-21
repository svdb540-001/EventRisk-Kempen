import { config } from './config.mjs';
import {
  addSyncLog, getEvent, getSyncState, listEvents, markFeedbackSent, saveEvent, updateSyncState
} from './db.mjs';
import { getConnector } from './integrations/index.mjs';
import { createOutboundFeedback, normalizeExternalEvent } from './integrations/mapping.mjs';

export async function pullPlatform(platform) {
  const connector = getConnector(platform);
  const state = await getSyncState(platform);
  const startedAt = new Date().toISOString();
  try {
    const rawEvents = await connector.pullEvents(state?.lastPullAt || null);
    const results = [];
    for (const raw of rawEvents) {
      const normalized = normalizeExternalEvent(platform, raw);
      if (!normalized.externalId) {
        await addSyncLog({ platform, direction: 'in', status: 'skipped', message: 'Dossier zonder externe id overgeslagen.', payload: raw });
        continue;
      }
      const saved = await saveEvent({ ...normalized, feedbackPending: false }, { markFeedback: false });
      await addSyncLog({
        platform, direction: 'in', eventId: saved.id, externalId: saved.externalId, status: 'success',
        message: `Dossier “${saved.name}” geïmporteerd of bijgewerkt.`, payload: raw
      });
      results.push(saved);
    }
    await updateSyncState(platform, { lastPullAt: startedAt, lastSuccessAt: new Date().toISOString(), lastError: null });
    return { platform, imported: results.length, events: results };
  } catch (error) {
    await updateSyncState(platform, { lastError: error.message });
    await addSyncLog({ platform, direction: 'in', status: 'error', message: error.message });
    throw error;
  }
}

export async function pushEvent(platform, eventId) {
  const connector = getConnector(platform);
  const event = await getEvent(eventId);
  if (!event) throw new Error('Evenement niet gevonden.');
  if (event.source !== platform) throw new Error(`Dit dossier is niet afkomstig uit ${platform}.`);
  if (!event.externalId) throw new Error('Externe dossier-id ontbreekt.');
  const payload = createOutboundFeedback(event);
  try {
    const response = await connector.pushFeedback(event.externalId, payload);
    await markFeedbackSent(event.id);
    await updateSyncState(platform, { lastPushAt: new Date().toISOString(), lastSuccessAt: new Date().toISOString(), lastError: null });
    await addSyncLog({
      platform, direction: 'out', eventId: event.id, externalId: event.externalId,
      status: 'success', message: `EventRisk-resultaat teruggekoppeld voor “${event.name}”.`, payload
    });
    return { platform, eventId, response };
  } catch (error) {
    await updateSyncState(platform, { lastError: error.message });
    await addSyncLog({
      platform, direction: 'out', eventId: event.id, externalId: event.externalId,
      status: 'error', message: error.message, payload
    });
    throw error;
  }
}

export async function pushPending(platform = null) {
  const pending = (await listEvents()).filter((event) => event.feedbackPending && event.source !== 'manual' && (!platform || event.source === platform));
  const results = [];
  for (const event of pending) {
    try { results.push({ eventId: event.id, ok: true, result: await pushEvent(event.source, event.id) }); }
    catch (error) { results.push({ eventId: event.id, ok: false, error: error.message }); }
  }
  return results;
}

export async function testPlatform(platform) {
  return getConnector(platform).testConnection();
}

let timer = null;
export function startAutomaticSync() {
  if (!config.sync.automatic || timer) return;
  const interval = Math.max(1, config.sync.intervalMinutes) * 60_000;
  const execute = async () => {
    for (const platform of ['eaglebe', 'flowlab']) {
      try { await pullPlatform(platform); } catch (error) { console.error(`[sync:${platform}]`, error.message); }
      try { await pushPending(platform); } catch (error) { console.error(`[push:${platform}]`, error.message); }
    }
  };
  timer = setInterval(execute, interval);
  timer.unref();
  setTimeout(execute, 3000).unref();
}
