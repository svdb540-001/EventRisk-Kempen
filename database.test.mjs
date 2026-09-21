import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'eventrisk-db-'));
process.env.NODE_ENV = 'test';
process.env.DATABASE_PROVIDER = 'sqlite';
process.env.DATABASE_PATH = path.join(tempDir, 'eventrisk-test.db');
process.env.STORAGE_PROVIDER = 'local';

const database = await import(`../src/db.mjs?test=${Date.now()}`);

test('dossier wordt server-side bewaard en teruggelezen', async () => {
  const saved = await database.saveEvent({
    source: 'manual',
    municipality: 'Geel',
    name: 'Testevenement',
    startAt: '2026-09-01T18:00:00.000Z',
    attendance: 750,
    riskAnswers: { attendance: '500_2000' }
  }, { markFeedback: false });

  assert.ok(saved.id.startsWith('ERK-'));
  assert.equal(saved.name, 'Testevenement');
  assert.equal(saved.feedbackPending, false);

  const loaded = await database.getEvent(saved.id);
  assert.equal(loaded.municipality, 'Geel');
  assert.equal(loaded.attendance, 750);
  assert.ok(Number.isInteger(loaded.risk.finalRn));
});

test('advies verhoogt versie en zet terugkoppeling klaar', async () => {
  const event = (await database.listEvents()).find((item) => item.name === 'Testevenement');
  const advised = await database.saveAdvice(event.id, 'd1', 'Vrije aanrijroute voorzien.', {
    name: 'D1 Tester', email: 'd1@example.invalid'
  });
  assert.equal(advised.advice.d1.status, 'approved');
  assert.equal(advised.feedbackPending, true);
  assert.ok(advised.version > event.version);
});

test('auditlog wordt bewaard', async () => {
  await database.addAuditLog({ id: 'tester', name: 'Tester', email: 'tester@example.invalid', roles: ['EventRisk.Admin'] }, 'test.action', 'event', 'demo');
  const logs = await database.listAuditLogs(10);
  assert.equal(logs[0].action, 'test.action');
});

test.after(async () => {
  await database.closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});
