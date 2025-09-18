// src/services/GetDeviceNetwork.js
import { discoverDispersync } from "./UDPDiscovery";

// Return shape: { ip, port, baseUrl } or null
export async function findDispersyncOnSubnet(options = {}) {
  const { timeoutPerHostMs, timeoutMs = timeoutPerHostMs ?? 3000 } = options;
  try {
    return await discoverDispersync({ timeoutMs });
  } catch (e) {
    // Don’t propagate to UI silently; just return null so screen shows "Not found"
    console.warn("Discovery error:", e?.message || e);
    return null;
  }
}

// Optional: identity check if your ESP32 exposes /whoami
export async function whoAmI(baseUrl, timeoutMs = 900) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/whoami`, { signal: ctl.signal });
    const txt = await res.text();
    try { return JSON.parse(txt); } catch { return null; }
  } catch {
    return null;
  } finally {
    clearTimeout(tm);
  }
}
