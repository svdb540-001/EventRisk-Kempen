import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.mjs';

const matrixPath = path.join(config.rootDir, 'config', 'risk-matrix.json');
export const riskConfig = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));

function clamp(number, min, max) {
  return Math.max(min, Math.min(max, number));
}

export function roundRisk(score, method = riskConfig.rounding) {
  const rounded = method === 'ceil' ? Math.ceil(score) : method === 'floor' ? Math.floor(score) : Math.round(score);
  return clamp(rounded, 0, 5);
}

export function selectAttendanceOption(attendance) {
  const count = Number(attendance);
  const parameter = riskConfig.parameters.find((item) => item.id === 'attendance');
  if (!parameter || !Number.isFinite(count)) return null;
  return parameter.options.find((option) => count >= option.min && (option.max === null || count <= option.max)) || null;
}

export function calculateRisk(event, rounding = riskConfig.rounding) {
  const answers = event.riskAnswers || {};
  const totals = { d1: 0, d2: 0, d3: 0 };
  const details = [];
  const missing = [];

  for (const parameter of riskConfig.parameters) {
    let selectedId = answers[parameter.id];
    if (parameter.id === 'attendance' && !selectedId && event.attendance !== undefined) {
      selectedId = selectAttendanceOption(event.attendance)?.id;
    }
    const option = parameter.options.find((candidate) => candidate.id === selectedId);
    if (!option) {
      missing.push(parameter.id);
      continue;
    }
    totals.d1 += option.d1;
    totals.d2 += option.d2;
    totals.d3 += option.d3;
    details.push({
      parameterId: parameter.id,
      parameter: parameter.title,
      optionId: option.id,
      option: option.label,
      d1: option.d1,
      d2: option.d2,
      d3: option.d3,
      needsApproval: Boolean(option.needsApproval)
    });
  }

  const disciplines = {
    d1: { score: Number(totals.d1.toFixed(2)), rn: roundRisk(totals.d1, rounding) },
    d2: { score: Number(totals.d2.toFixed(2)), rn: roundRisk(totals.d2, rounding) },
    d3: { score: Number(totals.d3.toFixed(2)), rn: roundRisk(totals.d3, rounding) }
  };

  const calculatedRn = Math.max(disciplines.d1.rn, disciplines.d2.rn, disciplines.d3.rn);
  const manualRn = event.manualRn === null || event.manualRn === undefined || event.manualRn === ''
    ? null
    : clamp(Number(event.manualRn), 0, 5);
  const finalRn = manualRn !== null && manualRn > calculatedRn ? manualRn : calculatedRn;

  return {
    complete: missing.length === 0,
    missing,
    rounding,
    details,
    disciplines,
    calculatedRn,
    manualRn,
    finalRn,
    measures: riskConfig.measures[String(finalRn)] || [],
    requiredDocuments: riskConfig.requiredDocuments[String(finalRn)] || [],
    warnings: details.filter((item) => item.needsApproval).map((item) => `${item.parameter}: “${item.option}” bevat een te valideren protocolwaarde.`)
  };
}

export function buildFeedbackPayload(event) {
  const result = calculateRisk(event);
  return {
    eventRiskReference: event.id,
    externalReference: event.externalReference || null,
    source: event.source,
    status: event.status,
    risk: {
      finalRn: result.finalRn,
      calculatedRn: result.calculatedRn,
      manualRn: result.manualRn,
      d1: result.disciplines.d1,
      d2: result.disciplines.d2,
      d3: result.disciplines.d3,
      measures: result.measures,
      requiredDocuments: result.requiredDocuments
    },
    advice: event.advice || {},
    updatedAt: event.updatedAt
  };
}
