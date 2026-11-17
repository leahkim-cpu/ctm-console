// Where the console's events come from. Both sources hand the page the same thing,
// { summary, graph, meter, provider, at }, built from GET responses of the ledger API:
// the live source polls the running ledger, the demo source replays a recording of
// those responses on a clock. Neither ever writes.

const maxPages = 50;
const requestMs = 8000;
const maxLinkedReads = 10;

async function getJson(path) {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(requestMs) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
  return body;
}

const startOfDay = at => {
  const day = new Date(at);
  day.setHours(0, 0, 0, 0);
  return day.getTime();
};

/**
 * Poll GET /api/graphs every 2 seconds.
 * - First read: pages back to the start of today. The newest graph of each party is
 *   read in full; older ones are only counted. Until every one of those reads has
 *   worked, the next tick does the first read again, so a failure loses nothing.
 * - Later reads: pages back to the first graph already seen, and reads the rest.
 *   A graph whose read fails is kept and tried again on the next tick.
 * - A graph appears as soon as it is read; its meter (GET .../context) is read after,
 *   and a failed meter is tried again on later ticks.
 * - Graphs that current graphs link to are read once, so links and answers resolve.
 * Every request has an 8 second deadline. `fetchJson` and `now` are for tests.
 */
export function liveSource({ model, onGraph, onNote, onMeter, onStatus, fetchJson = getJson, now = Date.now, pollMs = 2000 }) {
  const providers = new Map();
  const sessions = new Map();
  const retry = new Map(); // graph ID -> list row whose read failed
  const pendingMeters = new Set();
  const linkFailures = new Map();
  let timer;
  let stopped = false;
  let first = true;

  async function provider(sessionId) {
    if (!providers.has(sessionId)) {
      const { sessions: rows } = await fetchJson('/api/sessions');
      for (const row of rows) providers.set(row.id, row.provider);
    }
    if (!providers.has(sessionId)) throw new Error('A graph names a session the ledger does not list.');
    return providers.get(sessionId);
  }

  /** List rows newest first, down to the start of today (first read) or a seen graph. */
  async function listRows() {
    const today = startOfDay(now());
    const rows = [];
    let after = null;
    for (let page = 0; page < maxPages; page += 1) {
      const query = new URLSearchParams({ limit: '100' });
      if (after) query.set('after', after);
      const { graphs, next } = await fetchJson(`/api/graphs?${query}`);
      let boundary = false;
      for (const row of graphs) {
        boundary = first ? Date.parse(row.createdAt) < today : model.hasGraph(row.id);
        if (boundary) break;
        rows.push(row);
      }
      if (boundary || !next) break;
      after = next;
    }
    return rows;
  }

  const atOf = row => Date.parse(row.createdAt) || now();

  async function readGraph(row, initial) {
    const { graph } = await fetchJson(`/api/graphs/${row.id}`);
    const event = { summary: row, graph, meter: null, provider: await provider(row.sessionId), at: atOf(row) };
    onGraph(event, { initial });
    pendingMeters.add(row.id);
  }

  async function readMeters() {
    const current = new Set(model.currentGraphIds());
    for (const id of [...pendingMeters]) {
      if (!current.has(id)) {
        pendingMeters.delete(id);
        continue;
      }
      try {
        const { context } = await fetchJson(`/api/graphs/${id}/context`);
        model.setMeter(id, context.meter);
        pendingMeters.delete(id);
        onMeter?.();
      } catch {
        // Kept in pendingMeters for the next tick.
      }
    }
  }

  async function readLinked() {
    let read = 0;
    for (const id of model.unknownLinkedGraphs()) {
      if ((linkFailures.get(id) ?? 0) >= 3 || read >= maxLinkedReads) continue;
      read += 1;
      try {
        model.noteGraph((await fetchJson(`/api/graphs/${id}`)).graph);
        onMeter?.();
      } catch {
        linkFailures.set(id, (linkFailures.get(id) ?? 0) + 1);
      }
    }
  }

  async function tick() {
    let failed = 0;
    try {
      const rows = await listRows();
      if (first) {
        // Only the newest graph of each party is drawn; older ones are counted.
        const newest = new Map();
        for (const row of [...rows].reverse()) newest.set(row.party ?? `session:${row.sessionId}`, row);
        const keep = new Set([...newest.values()].map(row => row.id));
        for (const row of [...rows].reverse()) {
          if (!keep.has(row.id)) onNote(row, atOf(row));
          else if (!model.hasGraph(row.id)) {
            try {
              await readGraph(row, true);
            } catch {
              failed += 1;
            }
          }
        }
        if (failed === 0) first = false;
      } else {
        for (const row of rows) if (!retry.has(row.id)) retry.set(row.id, row);
        // Oldest first, so a party's snapshots arrive in publish order.
        for (const row of [...retry.values()].sort((a, b) => atOf(a) - atOf(b))) {
          try {
            await readGraph(row, false);
            retry.delete(row.id);
          } catch {
            failed += 1;
          }
        }
      }
      await readMeters();
      await readLinked();
      onStatus(failed ? { ok: false, message: `${failed} ${failed === 1 ? 'graph' : 'graphs'} could not be read` } : { ok: true, at: now() });
    } catch (error) {
      onStatus({ ok: false, message: error.message });
    }
    if (!stopped && pollMs) timer = setTimeout(tick, pollMs);
  }

  return {
    mode: 'live',
    tick,
    start() { tick(); },
    stop() { stopped = true; clearTimeout(timer); },
    session(id) {
      if (!sessions.has(id)) {
        // A failed read is not kept, so opening the node again tries again.
        sessions.set(id, fetchJson(`/api/sessions/${id}`).then(body => body.session, error => {
          sessions.delete(id);
          throw error;
        }));
      }
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
