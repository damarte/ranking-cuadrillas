const fs = require('fs');
const path = require('path');

const BASE = 'https://sebuscancuadrillas.chorizoriojano.org';
const REST_URL = `${BASE}/wp-json/wp/v2/cuadrilla?per_page=100&edicion=310`;
const AJAX_URL = `${BASE}/wp-admin/admin-ajax.php`;

const OUT_PATH = path.join(__dirname, '..', 'public', 'ranking.json');

async function fetchCuadrillas() {
  const res = await fetch(REST_URL, {
    headers: { 'User-Agent': 'rankingcuadrillas/1.0' },
  });
  if (!res.ok) throw new Error(`REST HTTP ${res.status}`);
  const data = await res.json();
  return data.map((p) => ({ id: String(p.id), nombre: p.title.rendered }));
}

async function fetchVotos(ids) {
  const body = new URLSearchParams();
  body.append('action', 'get_votos');
  for (const id of ids) body.append('ids[]', id);
  const res = await fetch(AJAX_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'rankingcuadrillas/1.0',
    },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`AJAX HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const cuadrillas = await fetchCuadrillas();
  const ids = cuadrillas.map((c) => c.id);
  const votos = await fetchVotos(ids);
  const ranking = cuadrillas
    .map((c) => ({ id: c.id, nombre: c.nombre, votos: votos[c.id] || 0 }))
    .sort((a, b) => b.votos - a.votos);
  fs.writeFileSync(OUT_PATH, JSON.stringify(ranking, null, 2) + '\n');
  const total = ranking.reduce((s, c) => s + c.votos, 0);
  console.log(`OK: ${ranking.length} cuadrillas, ${total} votos -> ${OUT_PATH}`);
}

main().catch((e) => {
  console.error(`ERROR: ${e.message || e}`);
  process.exit(1);
});
