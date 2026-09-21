import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRisk, roundRisk, selectAttendanceOption } from '../src/risk-engine.mjs';

test('aanwezigheid kiest correcte categorie', () => {
  assert.equal(selectAttendanceOption(99).id, 'lt100');
  assert.equal(selectAttendanceOption(100).id, '100_499');
  assert.equal(selectAttendanceOption(20001).id, 'gt20000');
});

test('RN blijft tussen 0 en 5', () => {
  assert.equal(roundRisk(-4), 0);
  assert.equal(roundRisk(8), 5);
});

test('hoogste discipline bepaalt algemeen RN', () => {
  const result = calculateRisk({
    attendance: 850,
    riskAnswers: {
      attendance: '500_2000', audience: 'violence', eventType: 'dance', catering: 'own_hot',
      security: 'own', substances: 'abundant', sound: '100db', location: 'improper_indoor',
      reputation: 'bad', accessibility: 'bad'
    },
    factors: {}
  });
  assert.equal(result.complete, true);
  assert.equal(result.finalRn, Math.max(result.disciplines.d1.rn, result.disciplines.d2.rn, result.disciplines.d3.rn));
  assert.ok(result.finalRn >= 3);
});

test('manuele opschaling kan alleen verhogen', () => {
  const low = calculateRisk({ attendance: 50, manualRn: 4, riskAnswers: {
    attendance:'lt100', audience:'normal', eventType:'family', catering:'none', security:'none',
    substances:'absent', sound:'none', location:'streets', reputation:'good', accessibility:'good'
  }});
  assert.equal(low.finalRn, 4);

  const high = calculateRisk({ attendance: 6000, manualRn: 1, riskAnswers: {
    attendance:'5001_20000', audience:'normal', eventType:'family', catering:'none', security:'none',
    substances:'present_low', sound:'none', location:'streets', reputation:'unknown', accessibility:'normal'
  }});
  assert.equal(high.finalRn, 4);
});
