const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 30045;
const BASE = 'https://sebuscancuadrillas.chorizoriojano.org';
const REST_URL = `${BASE}/wp-json/wp/v2/cuadrilla?per_page=100&edicion=310`;
const AJAX_URL = `${BASE}/wp-admin/admin-ajax.php`;

const INDEX_PATH = path.join(__dirname, 'public', 'index.html');

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
  const data = await res.json();
  return data;
}

async function buildRanking() {
  const cuadrillas = await fetchCuadrillas();
  const ids = cuadrillas.map((c) => c.id);
  const votos = await fetchVotos(ids);
  const ranking = cuadrillas
    .map((c) => ({ id: c.id, nombre: c.nombre, votos: votos[c.id] || 0 }))
    .sort((a, b) => b.votos - a.votos);
  return ranking;
}

function serveIndex(res) {
  fs.readFile(INDEX_PATH, (err, buf) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error cargando index.html');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/api/ranking') {
    try {
      const ranking = await buildRanking();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(ranking));
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: String(e.message || e) }));
    }
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    serveIndex(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`Ranking Cuadrillas corriendo en http://localhost:${PORT}`);
});
