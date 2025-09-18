/**
 * Lightweight listener for an ESP32 NFC device endpoint.
 *
 * ESP32 Behavior:
 * - Returns "No Card Scanned Yet" when no NFC card is present
 * - Returns UID (e.g., "04:BE:F3:0E:BF:2A:81") when card is scanned
 * - UID is kept for 5 seconds before being cleared
 *
 * API:
 *   const listener = createDeviceListener({ host, intervalMs, requestTimeoutMs, path });
 *   const unsub = listener.onUID((uid, meta) => { ... });
 *   await listener.start();
 *   listener.stop();
 *   const last = listener.getLastReading(); // { uid, at } | null
 *   const uid = await listener.waitForNextUID({ timeoutMs }); // resolves on next UID
 *
 * Runtime controls:
 *   listener.setHost("http://192.168.43.27"); // change target at runtime
 *   listener.getHost();                        // read current host
 */

const DEFAULT_PATH = "/getData";
const DEFAULT_INTERVAL_MS = 200;    // sensible minimum — avoids overlapping requests by default
const DEFAULT_REQ_TIMEOUT_MS = 2000;

function normalizeHost(input) {
  let h = String(input || "").trim();
  if (!h) throw new Error("Host is required for createDeviceListener. Provide a valid host URL (e.g. http://172.20.10.2)");
  // Add scheme if missing
  if (!/^https?:\/\//i.test(h)) h = "http://" + h;
  // Remove trailing slashes
  h = h.replace(/\/+$/, "");
  // Remove default :80
  h = h.replace(/:80$/i, "");
  return h;
}

function normalizePath(p) {
  if (!p) return DEFAULT_PATH;
  return p.startsWith("/") ? p : `/${p}`;
}

export function createDeviceListener(opts = {}) {
  let host = normalizeHost(opts.host);
  let path = normalizePath(opts.path || DEFAULT_PATH);
  let intervalMs = typeof opts.intervalMs === "number" ? opts.intervalMs : DEFAULT_INTERVAL_MS;
  let requestTimeoutMs = typeof opts.requestTimeoutMs === "number" ? opts.requestTimeoutMs : DEFAULT_REQ_TIMEOUT_MS;

  let timer = null;
  let isListening = false;
  let lastUID = null;
  let lastAt = null;
  let lastEmitUID = null;
  let lastEmitAt = 0;

  // prevent overlapping polls
  let inFlight = false;
  let inFlightController = null;

  const subscribers = new Set(); // (uid, meta) => void
  let pendingResolvers = [];     // for waitForNextUID

  // Optional dummy data for testing
  const DUMMY_UID = "AA:BB:CC:DD:EE";
  let dummyDataEnabled = false;

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
      try { cb(uid, meta); } catch (err) { /* no-op */ }
    });

    if (pendingResolvers.length) {
      const resolvers = [...pendingResolvers];
      pendingResolvers = [];
      resolvers.forEach((r) => {
        try { r.resolve(uid); } catch {}
      });
    }
  }

  async function pollOnce() {
    if (inFlight) return null;

    if (dummyDataEnabled) {
      _emit(DUMMY_UID);
      return DUMMY_UID;
    }

    const url = `${host}${path}`;
    inFlight = true;
    inFlightController = new AbortController();
    const ctl = inFlightController;
    const timeout = setTimeout(() => ctl.abort(), requestTimeoutMs);

    try {
      const res = await fetch(url, { signal: ctl.signal });
      const text = await res.text();
      const trimmed = String(text || "").trim();

      if (!trimmed || trimmed === "No Card Scanned Yet") return null;

      // JSON fallback: { "uid": "AA:BB:..." }
      if (trimmed.startsWith("{")) {
        try {
          const obj = JSON.parse(trimmed);
          if (obj && typeof obj.uid === "string" && obj.uid) {
            _emit(obj.uid.trim());
            return obj.uid.trim();
          }
        } catch {/* ignore */}
      }

      // Looks like UID?
      const uidPattern = /^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){3,}$/; // allow 4+ bytes
      if (uidPattern.test(trimmed)) {
        _emit(trimmed.toUpperCase());
        return trimmed.toUpperCase();
      }

      // Emit anyway in case firmware format changes later
      _emit(trimmed);
      return trimmed;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
      inFlight = false;
      inFlightController = null;
    }
  }

  function onUID(cb) {
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  }

  function _startTimer() {
    // immediate poll for snappy UX
    pollOnce().finally(() => {});
    // interval loop
    timer = setInterval(() => {
      // light jitter so we don't lockstep with firmware timing
      const jitter = Math.floor(Math.random() * 40);
      setTimeout(() => { pollOnce(); }, jitter);
    }, Math.max(150, intervalMs));
  }

  async function start() {
    if (isListening) return;
    isListening = true;
    _startTimer();
  }

  function stop() {
    isListening = false;
    if (timer) { clearInterval(timer); timer = null; }
    // abort in-flight fetch
    try { inFlightController?.abort(); } catch {}
    inFlight = false;
    inFlightController = null;
  }

  // runtime controls
  function setHost(newHost) {
    if (!newHost) return;
    const old = host;
    host = normalizeHost(newHost);
    return { old, host };
  }
  function getHost() { return host; }

  function setPath(newPath = DEFAULT_PATH) {
    path = normalizePath(newPath || DEFAULT_PATH);
  }
  function setIntervalMs(ms) {
    if (typeof ms === "number" && ms >= 100) {
      intervalMs = ms;
      if (isListening) {
        clearInterval(timer);
        _startTimer();
      }
    }
  }
  function setRequestTimeoutMs(ms) {
    if (typeof ms === "number" && ms >= 100) requestTimeoutMs = ms;
  }

  function getLastReading() {
    return lastUID ? { uid: lastUID, at: lastAt } : null;
  }

  function waitForNextUID({ timeoutMs = 5000 } = {}) {
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject };
      pendingResolvers.push(entry);
      const t = setTimeout(() => {
        pendingResolvers = pendingResolvers.filter((x) => x !== entry);
        reject(new Error("Timed out waiting for next UID"));
      }, Math.max(500, timeoutMs));
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
    setHost,
    getHost,
    setPath,
    setIntervalMs,
    setRequestTimeoutMs,
    get isListening() { return isListening; },
    get config() { return { host, path, intervalMs, requestTimeoutMs }; },
    // Dummy data controls
    enableDummyData: () => { dummyDataEnabled = true; },
    disableDummyData: () => { dummyDataEnabled = false; },
    get isDummyDataEnabled() { return dummyDataEnabled; },
  };
}

// Note: no default singleton here because host is required.
