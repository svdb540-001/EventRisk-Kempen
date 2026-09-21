export async function fetchJson(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!response.ok) {
      const error = new Error(`Externe API gaf HTTP ${response.status}: ${typeof body === 'string' ? body.slice(0, 300) : JSON.stringify(body)}`);
      error.statusCode = response.status;
      error.responseBody = body;
      throw error;
    }
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export function joinUrl(baseUrl, resourcePath) {
  return new URL(resourcePath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

export function applyTemplate(template, values) {
  return Object.entries(values).reduce((result, [key, value]) => result.replaceAll(`{${key}}`, encodeURIComponent(value)), template);
}
