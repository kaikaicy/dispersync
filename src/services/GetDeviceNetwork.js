// src/services/GetDeviceNetwork.js
import * as Network from "expo-network";

const PORT = 80;
const PING_PATH = "/ping";

// --- tiny helpers (no heuristics) ---
function httpGet(url, timeoutMs = 700) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), timeoutMs);
  return fetch(url, { signal: ctl.signal })
    .then(async (r) => (r.ok ? (await r.text()).trim() : null))
    .catch(() => null)
    .finally(() => clearTimeout(tm));
}

function parseIp(ip) {
  const p = ip.split(".").map((n) => Number(n));
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return p;
}

const ipStr = (a, b, c, d) => `${a}.${b}.${c}.${d}`;

/**
 * Pure subnet scan based only on the phone IP (/24).
 * Probes a.b.c.2..254 (skips the phone's own IP).
 */
export async function findDispersyncFromPhoneIpPure(
  {
    timeoutPerHostMs = 700,
    maxConcurrent = 16,
  } = {}
) {
  const phoneIp = await Network.getIpAddressAsync(); // e.g. "10.0.0.12", "172.16.1.8", "192.168.1.23"
  if (!phoneIp) return null;

  const parts = parseIp(phoneIp);
  if (!parts) return null;

  const [a, b, c, dSelf] = parts;
  const selfIp = ipStr(a, b, c, dSelf);

  // Build flat candidate list (a.b.c.2..254), excluding self
  const candidates = [];
  for (let d = 2; d <= 254; d++) {
    const ip = ipStr(a, b, c, d);
    if (ip !== selfIp) candidates.push(ip);
  }

  let idx = 0;
  let found = null;

  async function worker() {
    while (!found && idx < candidates.length) {
      const ip = candidates[idx++];
      const txt = await httpGet(`http://${ip}:${PORT}${PING_PATH}`, timeoutPerHostMs);
      if (txt && txt.toUpperCase() === "OK") {
        found = { ip, port: PORT, baseUrl: `http://${ip}:${PORT}` };
        return;
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(maxConcurrent, candidates.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return found;
}

/**
 * Alias for findDispersyncFromPhoneIpPure to match the import in GetDeviceConnectionScreen
 */
export async function findDispersyncOnSubnet(options = {}) {
  return findDispersyncFromPhoneIpPure(options);
}

/** Optional: verify identity if you exposed /whoami on ESP32 */
export async function whoAmI(baseUrl, timeoutMs = 900) {
  const txt = await httpGet(`${baseUrl}/whoami`, timeoutMs);
  if (!txt) return null;
  try { return JSON.parse(txt); } catch { return null; }
}
