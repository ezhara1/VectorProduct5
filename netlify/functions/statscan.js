// Netlify Function: statscan
// Proxies Statistics Canada WDS vector endpoints
// Docs: https://www.statcan.gc.ca/en/developers/wds/user-guide

/**
 * Expected query params:
 * - vectorIds: comma-separated vector ids (e.g. v86822802,v86822803 or 86822802)
 * - latestN: optional integer; defaults to 12
 */

export async function handler(event) {
  try {
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    let vectorIdsParam = '';
    let latestNParam = '';

    if (event.httpMethod === 'GET') {
      const params = new URLSearchParams(event.rawQuery || event.queryStringParameters || {});
      vectorIdsParam = params.get('vectorIds') || '';
      latestNParam = params.get('latestN') || '';
    } else if (event.httpMethod === 'POST') {
      const body = safeJson(event.body);
      vectorIdsParam = body?.vectorIds || '';
      latestNParam = body?.latestN || '';
    }

    const latestN = clampInt(latestNParam, 1, 1000, 12);

    const ids = String(vectorIdsParam)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((id) => id.replace(/^v/i, '')) // strip leading 'v'
      .map((id) => id.replace(/[^0-9]/g, '')) // keep digits only
      .filter(Boolean)
      .map((id) => Number(id))
      .filter((n) => Number.isFinite(n));

    if (ids.length === 0) {
      return json({ error: 'Provide vectorIds as comma-separated list' }, 400);
    }

    const payload = ids.map((vectorId) => ({ vectorId, latestN }));

    const resp = await fetch(
      'https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await resp.json();

    if (!resp.ok) {
      return json({ error: 'StatsCan error', status: resp.status, data }, resp.status);
    }

    // Pass-through raw WDS response; frontend will parse vectorDataPoint
    return json(data, 200);
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
}

function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

function safeJson(str) {
  try {
    return str ? JSON.parse(str) : undefined;
  } catch {
    return undefined;
  }
}

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}
