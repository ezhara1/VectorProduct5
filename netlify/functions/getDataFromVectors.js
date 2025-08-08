// /.netlify/functions/getDataFromVectors
// Method: POST
// Body: Array of { vectorId, latestN }
// Returns: WDS getDataFromVectorsAndLatestNPeriods result

export async function handler(event) {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return cors(200);
    }
    if (event.httpMethod !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const body = safeJson(event.body);
    if (!Array.isArray(body) || body.length === 0) {
      return json({ error: 'Body must be an array of {vectorId, latestN}' }, 400);
    }

    const payload = body
      .map((item) => ({
        vectorId: normalizeVectorId(item?.vectorId),
        latestN: clampInt(item?.latestN, 1, 1000, 12),
      }))
      .filter((x) => Number.isFinite(x.vectorId));

    if (payload.length === 0) {
      return json({ error: 'No valid vectorId in body' }, 400);
    }

    const resp = await fetch(
      'https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    const data = await resp.json();
    return json(data, resp.ok ? 200 : resp.status);
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
}

function normalizeVectorId(v) {
  if (v == null) return NaN;
  const s = String(v).trim().replace(/^v/i, '').replace(/[^0-9]/g, '');
  return Number(s);
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

function cors(status = 200) {
  return {
    statusCode: status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: '',
  };
}

function json(body, status = 200) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
