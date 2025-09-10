// services/ListenToDeviceGetData.js

/**
 * Lightweight listener for an ESP32 endpoint that returns a UID as text.
 * Default endpoint: http://192.168.4.1/getData
 *
 * API:
 *   const listener = createDeviceListener({ host, intervalMs, requestTimeoutMs });
 *   const unsub = listener.onUID((uid, meta) => { ... });
 *   await listener.start();
 *   listener.stop();
 *   const last = listener.getLastReading(); // { uid, at } | null
 *   const uid = await listener.waitForNextUID({ timeoutMs }); // resolves on next UID
 */

const DEFAULT_HOST = "http://176.16.35.200";
const DEFAULT_PATH = "/getData";
const DEFAULT_INTERVAL_MS = 500;
const DEFAULT_REQ_TIMEOUT_MS = 1000;

export function createDeviceListener(opts = {}) {
  const host = String(opts.host || DEFAULT_HOST).replace(/\/+$/, "");
  const path = opts.path || DEFAULT_PATH;
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const requestTimeoutMs = opts.requestTimeoutMs ?? DEFAULT_REQ_TIMEOUT_MS;

  let timer = null;
  let isListening = false;
  let lastUID = null;
  let lastAt = null;
  let lastEmitUID = null;
  let lastEmitAt = 0;
  const subscribers = new Set(); // (uid, meta) => void

  // waiters for "next UID" promises
  let pendingResolvers = [];

  function _emit(uid) {
    const now = Date.now();
    lastUID = uid;
    lastAt = now;

    // de-dupe rapid repeats of the exact same UID (within 1.5s)
    if (uid === lastEmitUID && now - lastEmitAt < 1500) return;
    lastEmitUID = uid;
    lastEmitAt = now;

    const meta = { at: now, host, path };
    subscribers.forEach((cb) => {
      try { cb(uid, meta); } catch { /* no-op */ }
    });

    // resolve any waiters
    if (pendingResolvers.length) {
      const resolvers = [...pendingResolvers];
      pendingResolvers = [];
      resolvers.forEach((r) => {
        try { r.resolve(uid); } catch {}
      });
    }
  }

  async function pollOnce(abortSignal) {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), requestTimeoutMs);
    try {
      const res = await fetch(`${host}${path}`, {
        signal: abortSignal || ctl.signal,
      });
      const text = await res.text();
      const trimmed = String(text || "").trim();

      // Ignore empty/no-scan message
      if (!trimmed || trimmed === "No Card Scanned Yet") return null;

      // If firmware sends JSON later, allow quick parse fallback
      // e.g. { "uid": "AA:BB:..." }
      if (trimmed.startsWith("{")) {
        try {
          const obj = JSON.parse(trimmed);
          if (obj && typeof obj.uid === "string" && obj.uid) {
            _emit(obj.uid.trim());
            return obj.uid.trim();
          }
        } catch {
          // not JSON—fall through to treat as plain text
        }
      }

      _emit(trimmed);
      return trimmed;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  function onUID(cb) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }

  async function start() {
    if (isListening) return;
    isListening = true;

    // kick an immediate poll so UI reacts fast
    pollOnce().finally(() => {});

    timer = setInterval(() => {
      // slight jitter helps avoid lockstep with device state
      const jitter = Math.floor(Math.random() * 50);
      setTimeout(() => { pollOnce(); }, jitter);
    }, Math.max(200, intervalMs));
  }

  function stop() {
    isListening = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function getLastReading() {
    return lastUID ? { uid: lastUID, at: lastAt } : null;
  }

  function waitForNextUID({ timeoutMs = 5000 } = {}) {
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject };
      pendingResolvers.push(entry);
      const t = setTimeout(() => {
        // remove from pending and reject
        pendingResolvers = pendingResolvers.filter((x) => x !== entry);
        reject(new Error("Timed out waiting for next UID"));
      }, timeoutMs);

      // wrap resolve to clear timeout
      const origResolve = resolve;
      entry.resolve = (uid) => {
        clearTimeout(t);
        origResolve(uid);
      };
    });
  }

  return {
    start,
    stop,
    onUID,
    getLastReading,
    waitForNextUID,
    get isListening() { return isListening; },
    get config() { return { host, path, intervalMs, requestTimeoutMs }; },
  };
}

/**
 * A convenient singleton using default config.
 *   import deviceListener from '@/services/ListenToDeviceGetData';
 *   await deviceListener.start();
 */
const defaultListener = createDeviceListener();
export default defaultListener;
