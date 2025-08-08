// /.netlify/functions/getCubeMetadata
// Method: POST
// Body: Array of { productId }
// Returns: WDS getCubeMetadata result

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
      return json({ error: 'Body must be an array of {productId}' }, 400);
    }

    const payload = body
      .map((item) => ({ productId: normalizeProductId(item?.productId) }))
      .filter((x) => Number.isFinite(x.productId));

    if (payload.length === 0) {
      return json({ error: 'No valid productId in body' }, 400);
    }

    const resp = await fetch('https://www150.statcan.gc.ca/t1/wds/rest/getCubeMetadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    return json(data, resp.ok ? 200 : resp.status);
  } catch (err) {
    return json({ error: err?.message || 'Unexpected error' }, 500);
  }
}

function normalizeProductId(v) {
  if (v == null) return NaN;
  const s = String(v).trim().replace(/[^0-9]/g, '');
  return Number(s);
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
