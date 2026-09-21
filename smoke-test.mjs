const baseUrl = (process.env.APP_BASE_URL || process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const response = await fetch(`${baseUrl}/api/health`, { headers: { Accept: 'application/json' } });
const contentType = response.headers.get('content-type') || '';
if (!response.ok || !contentType.includes('application/json')) {
  const body = await response.text();
  throw new Error(`Healthcheck mislukt: HTTP ${response.status}; antwoord: ${body.slice(0, 200)}`);
}
const health = await response.json();
if (!health.ok || health.app !== 'EventRisk Kempen') throw new Error(`Onverwachte healthcheck: ${JSON.stringify(health)}`);
console.log(`OK: ${baseUrl} — database=${health.database}, storage=${health.storage}, tijd=${health.time}`);
