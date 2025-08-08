async function lookupByProductId(productId) {
  const res = await fetch('/data.json');
  if (!res.ok) throw new Error('Failed to load data.json');
  const data = await res.json();
  return data.find((d) => d.productId === productId);
}

function renderVectors(container, entry) {
  if (!entry) {
    container.innerHTML = '<p>No match found for that Product ID.</p>';
    return;
  }
  const title = `<div class="small">${entry.description}</div>`;
  const items = entry.vectors
    .map(
      (v) => `
      <div class="item">
        <div class="flex">
          <strong>${v.vectorId}</strong>
          <button class="copy" data-copy="${v.vectorId}">Copy</button>
          <button class="copy" data-fill="${v.vectorId}">Use</button>
        </div>
        <div class="small">${v.text || ''}</div>
      </div>`
    )
    .join('');
  container.innerHTML = `${title}<div class="list">${items}</div>`;
  container.querySelectorAll('button[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copied!';
        setTimeout(() => (btn.textContent = 'Copy'), 1000);
      } catch {}
    });
  });
  container.querySelectorAll('button[data-fill]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const v = btn.dataset.fill;
      document.getElementById('vectorId').value = v;
      document.getElementById('vectorId').focus();
    });
  });
}

function renderVectorData(container, payload) {
  if (!payload) {
    container.innerHTML = '<p>No data.</p>';
    return;
  }
  // WDS function returns an array like: [{ status, object: { vectorId, vectorDataPoint: [...] } }, ...]
  let entry = null;
  if (Array.isArray(payload)) {
    entry = payload.find((x) => x && x.status === 'SUCCESS' && x.object);
  } else if (payload.object && payload.object.vectorDataPoint) {
    entry = payload;
  }

  if (!entry) {
    container.innerHTML = `<pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre>`;
    return;
  }

  const obj = entry.object || entry;
  const points = obj.vectorDataPoint || obj.vectorData || [];
  const vectorId = obj.vectorId ? `v${obj.vectorId}` : '';

  if (!Array.isArray(points) || points.length === 0) {
    container.innerHTML = '<p>No datapoints returned.</p>';
    return;
  }

  const rows = points
    .map(
      (r) => `<tr><td>${escapeHtml(vectorId)}</td><td>${escapeHtml(r.refPer || '')}</td><td>${escapeHtml(String(r.value))}</td></tr>`
    )
    .join('');

  container.innerHTML = `
    <div class="small">Vector ${escapeHtml(vectorId)} — ${points.length} rows</div>
    <div style="overflow:auto">
      <table style="width:100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom:1px solid #30363d; padding:6px;">Vector</th>
            <th style="text-align:left; border-bottom:1px solid #30363d; padding:6px;">RefPer</th>
            <th style="text-align:left; border-bottom:1px solid #30363d; padding:6px;">Value</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchVector(vectorId, latestN) {
  const url = new URL('/.netlify/functions/statscan', window.location.origin);
  url.searchParams.set('vectorIds', vectorId);
  if (latestN) url.searchParams.set('latestN', latestN);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch StatsCan data');
  return res.json();
}

function init() {
  const lookupForm = document.getElementById('lookup-form');
  const lookupResult = document.getElementById('lookup-result');
  lookupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const productId = new FormData(lookupForm).get('productId').trim();
    lookupResult.innerHTML = '<div class="small">Searching…</div>';
    try {
      const entry = await lookupByProductId(productId);
      renderVectors(lookupResult, entry);
    } catch (err) {
      lookupResult.innerHTML = `<p>Error: ${escapeHtml(err.message)}</p>`;
    }
  });

  const vectorForm = document.getElementById('vector-form');
  const vectorResult = document.getElementById('vector-result');
  vectorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(vectorForm);
    const vectorId = fd.get('vectorId').trim();
    const latestN = fd.get('latestN').trim();
    vectorResult.innerHTML = '<div class="small">Loading…</div>';
    try {
      const data = await fetchVector(vectorId, latestN);
      renderVectorData(vectorResult, data);
    } catch (err) {
      vectorResult.innerHTML = `<p>Error: ${escapeHtml(err.message)}</p>`;
    }
  });
}

window.addEventListener('DOMContentLoaded', init);
