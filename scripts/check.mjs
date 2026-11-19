// One status check: every site in sites.json (HTTP status, response time, Last-Modified = last deploy) and every data
// feed (age of its `generated` stamp). Writes data/status.json (latest) and data/history.json (90 days, per day).
import fs from 'node:fs';

const cfg = JSON.parse(fs.readFileSync('sites.json', 'utf8'));
const HIST = 'data/history.json', DAYS = 90;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function hit(url) {
  const t = Date.now();
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'check=' + t, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'ldb-status (github.com/ldiazbusquets/status)', 'Cache-Control': 'no-cache' } });
    const body = await r.text();
    return { code: r.status, ms: Date.now() - t, lm: r.headers.get('last-modified'), body };
  } catch (e) { return { code: 0, ms: Date.now() - t, err: e.name === 'TimeoutError' ? 'timed out' : String(e.message || e) }; }
}
// A failure is retried once after 10 s, so one dropped request doesn't count as an outage.
async function check(url) { let r = await hit(url); if (!(r.code >= 200 && r.code < 400)) { await wait(10000); r = await hit(url); } return r; }

const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
const sites = [];
for (const s of cfg.sites) {
  const r = await check(s.url);
  sites.push({ id: s.id, up: r.code >= 200 && r.code < 400, code: r.code, ms: r.ms, deployed: r.lm ? Date.parse(r.lm) : null, err: r.err ?? null });
}
const data = [];
for (const d of cfg.data) {
  const r = await check(d.url);
  let at = null; try { const j = JSON.parse(r.body); at = typeof j.generated === 'number' ? j.generated : Date.parse(j.generated); } catch { /* unreadable */ }
  const age = at ? Math.round((now - at) / 60000) : null;
  data.push({ id: d.id, at, ok: age != null && age <= d.maxAgeMin, code: r.code });
}

let hist = { sites: {} };
try { hist = JSON.parse(fs.readFileSync(HIST, 'utf8')); } catch { /* first run */ }
for (const x of [...sites, ...data.map((d) => ({ id: d.id, up: d.ok, ms: null }))]) {
  const h = (hist.sites[x.id] ??= { days: [], events: [] });
  let b = h.days.find((o) => o.d === day);
  if (!b) { b = { d: day, n: 0, up: 0, ms: 0 }; h.days.push(b); }
  b.n++; if (x.up) b.up++;
  if (x.ms != null && x.up) b.ms = Math.round((b.ms * (b.up - 1) + x.ms) / b.up);
  h.days = h.days.filter((o) => o.d >= new Date(now - DAYS * 864e5).toISOString().slice(0, 10));
  const last = h.events[h.events.length - 1];
  if (!last || last.up !== x.up) h.events.push({ t: now, up: x.up, code: x.code ?? null });
  h.events = h.events.filter((e, i, a) => i === a.length - 1 || e.t >= now - DAYS * 864e5).slice(-50);
}
fs.mkdirSync('data', { recursive: true });
fs.writeFileSync('data/status.json', JSON.stringify({ checked: now, sites, data }));
fs.writeFileSync(HIST, JSON.stringify(hist));
console.log(new Date(now).toISOString(), sites.map((s) => `${s.id}:${s.up ? s.ms + 'ms' : 'DOWN ' + (s.code || s.err)}`).join(' '), '|', data.map((d) => `${d.id}:${d.ok ? 'ok' : 'STALE'}`).join(' '));
