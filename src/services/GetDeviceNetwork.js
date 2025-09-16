// src/services/GetDeviceNetwork.js
import * as Network from "expo-network";

const PORT = 80;
const PING_PATH = "/ping";

// quick GET with timeout
function httpGet(url, timeoutMs = 800) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), timeoutMs);
  return fetch(url, { signal: ctl.signal })
    .then(async (r) => (r.ok ? (await r.text()).trim() : null))
    .catch(() => null)
    .finally(() => clearTimeout(tm));
}

function parseIp(ip) {
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return parts;
}

function ipStr(a, b, c, d) {
  return `${a}.${b}.${c}.${d}`;
}

function isIosHotspot(a, b, c) {
  // Typical iOS Personal Hotspot: 172.20.10.0/28 (hosts .2 - .14)
  return a === 172 && b === 20 && c === 10;
}

function isAndroidHotspot(a, b, c) {
  // Very common Android hotspot: 192.168.43.0/24
  return a === 192 && b === 168 && c === 43;
}

/**
 * Build candidate IPs on the same subnet as the phone.
 * - iOS hotspot: 172.20.10.2..14
 * - Android hotspot: 192.168.43.2..254
 * - Otherwise: generic /24: a.b.c.2..254
 * We exclude the phone's own IP and .255; we also **prioritize .200** if it exists in range.
 */
function buildCandidatesFrom(myIp) {
  const parts = parseIp(myIp);
  if (!parts) {
    // Fallback: probe the two common hotspot ranges
    const ios = Array.from({ length: 13 }, (_, i) => `172.20.10.${i + 2}`); // 2..14
    const and = Array.from({ length: 253 }, (_, i) => `192.168.43.${i + 2}`); // 2..254
    return [...ios, ...and];
  }
  const [a, b, c, dSelf] = parts;
  let list = [];

  if (isIosHotspot(a, b, c)) {
    list = Array.from({ length: 13 }, (_, i) => ipStr(a, b, c, i + 2)); // .2..14
  } else if (isAndroidHotspot(a, b, c)) {
    list = Array.from({ length: 253 }, (_, i) => ipStr(a, b, c, i + 2)); // .2..254
  } else {
    // generic /24
    list = Array.from({ length: 253 }, (_, i) => ipStr(a, b, c, i + 2)); // .2..254
  }

  // remove self & broadcast
  const selfIp = ipStr(a, b, c, dSelf);
  list = list.filter((ip) => ip !== selfIp && !ip.endsWith(".255"));

  // put .200 first if it's within range
  const dot200 = ipStr(a, b, c, 200);
  if (list.includes(dot200)) {
    list = [dot200, ...list.filter((x) => x !== dot200)];
  }

  return list;
}

/**
 * Probe one host's /ping for OK.
 */
async function probeHost(ip, timeoutPerHostMs) {
  const url = `http://${ip}:${PORT}${PING_PATH}`;
  const txt = await httpGet(url, timeoutPerHostMs);
  if (txt && txt.toUpperCase() === "OK") {
    return { ip, port: PORT, baseUrl: `http://${ip}:${PORT}` };
  }
  return null;
}

/**
 * Find FIRST DisperSync device on the current subnet by probing /ping.
 * Expo Go friendly. No native modules.
 *
 * @param timeoutPerHostMs  per-host timeout (default 700ms)
 * @param maxConcurrent     concurrent probes (default 16)
 */
export async function findDispersyncOnSubnet(
  { timeoutPerHostMs = 700, maxConcurrent = 16, onIpProbe } = {}
) {
  const myIp = await Network.getIpAddressAsync();
  if (!myIp) return null;

  const candidates = buildCandidatesFrom(myIp);
  if (candidates.length === 0) return null;

  let idx = 0;
  let found = null;

  async function worker() {
    while (!found && idx < candidates.length) {
      const ip = candidates[idx++];
      if (onIpProbe) {
        onIpProbe(ip);
      }
      const hit = await probeHost(ip, timeoutPerHostMs);
      if (hit) {
        found = hit;
        return;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(maxConcurrent, candidates.length)) }, () => worker());
  await Promise.all(workers);
  return found;
}

/** Optional helper if you added /whoami on the ESP32 */
export async function whoAmI(baseUrl, timeoutMs = 900) {
  const txt = await httpGet(`${baseUrl}/whoami`, timeoutMs);
  if (!txt) return null;
  try {
    return JSON.parse(txt);
  } catch {
    return null;
  }
}
