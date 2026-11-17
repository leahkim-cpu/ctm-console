// Where the console's events come from. Both sources hand the page the same thing,
// { summary, graph, meter, provider, at }, built from GET responses of the ledger API:
// the live source polls the running ledger, the demo source replays a recording of
// those responses on a clock. Neither ever writes.

const pollMs = 2000;
const maxPages = 10;

async function getJson(path, signal) {
  const response = await fetch(path, { signal, headers: { Accept: 'application/json' } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

const startOfToday = () => {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

/**
 * Poll GET /api/graphs every 2 seconds. On the first read it pages back to the start
 * of today, counts every graph it lists, and reads in full only the newest graph of
 * each party. Later reads fetch only graphs it has not seen.
 */
export function liveSource({ onGraph, onNote, onStatus, model }) {
  const providers = new Map();
  const sessions = new Map();
  let timer;
  let stopped = false;
  let first = true;

  async function provider(sessionId) {
    if (!providers.has(sessionId)) {
      const { sessions: rows } = await getJson('/api/sessions');
      for (const row of rows) providers.set(row.id, row.provider);
    }
    return providers.get(sessionId) ?? 'claude';
  }

  async function unseen() {
    const rows = [];
    let after = null;
    for (let page = 0; page < maxPages; page += 1) {
      const query = new URLSearchParams({ limit: '100' });
      if (after) query.set('after', after);
      const { graphs, next } = await getJson(`/api/graphs?${query}`);
      const fresh = graphs.filter(row => !model.hasGraph(row.id));
      rows.push(...fresh);
      const reachedSeen = fresh.length < graphs.length;
      const beforeToday = graphs.some(row => Date.parse(row.createdAt) < startOfToday());
      if (!next || reachedSeen || (first && beforeToday) || (!first && fresh.length === 0)) break;
      after = next;
    }
    return rows.reverse(); // oldest first
  }

  async function read(row, initial) {
    const at = Date.parse(row.createdAt) || Date.now();
    const { graph } = await getJson(`/api/graphs/${row.id}`);
    const { context } = await getJson(`/api/graphs/${row.id}/context`);
    onGraph({ summary: row, graph, meter: context.meter, provider: await provider(row.sessionId), at }, { initial });
  }

  async function tick() {
    try {
      const rows = await unseen();
      if (first) {
        // Only the newest graph of each party is drawn; older ones are counted.
        const newest = new Map();
        for (const row of rows) newest.set(row.party ?? `session:${row.sessionId}`, row);
        const keep = new Set([...newest.values()].map(row => row.id));
        for (const row of rows) {
          if (keep.has(row.id)) await read(row, true);
          else onNote(row, Date.parse(row.createdAt) || Date.now());
        }
      } else {
        for (const row of rows) await read(row, false);
      }
      first = false;
      onStatus({ ok: true, at: Date.now() });
    } catch (error) {
      onStatus({ ok: false, message: error.message });
    }
    if (!stopped) timer = setTimeout(tick, pollMs);
  }

  return {
    mode: 'live',
    start() { tick(); },
    stop() { stopped = true; clearTimeout(timer); },
    async session(id) {
      if (!sessions.has(id)) sessions.set(id, getJson(`/api/sessions/${id}`).then(body => body.session));
      return sessions.get(id);
    },
  };
}

/** Replay a recording made by demo/console-recording.mjs. `speed` scales the clock. */
export function demoSource(recording, { onGraph, onDone, speed = 1 }) {
  let timers = [];
  let startedAt = 0;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  return {
    mode: 'demo',
    durationMs: recording.durationMs,
    elapsed: () => (startedAt ? Math.min(recording.durationMs, (performance.now() - startedAt) * speed) : 0),
    start() {
      clear();
      startedAt = performance.now();
      for (const event of recording.events) {
        timers.push(setTimeout(() => {
          const at = Date.now();
          const summary = { ...event.summary, createdAt: new Date(at).toISOString() };
          const { provider } = recording.sessions[event.graph.packet.sessionId];
          onGraph({ summary, graph: event.graph, meter: event.meter, provider, at }, { initial: false });
        }, event.atMs / speed));
      }
      timers.push(setTimeout(onDone, recording.durationMs / speed));
    },
    stop: clear,
    async session(id) { return recording.sessions[id]; },
  };
}
