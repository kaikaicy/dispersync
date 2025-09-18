// src/services/UDPDiscovery.js
import "react-native-get-random-values";
import dgram from "react-native-udp";
import { Buffer } from "buffer";

if (!global.Buffer) global.Buffer = Buffer;

const LISTEN_PORT = 40000;

// Singleton socket + waiter list
let sock = null;
let bound = false;
let closed = false;
const waiters = new Set(); // { resolve, timer }

function ensureSocket() {
  if (sock) return sock;
  try {
    sock = dgram.createSocket("udp4");
  } catch (e) {
    throw new Error("UDP not available in this build. Rebuild your dev client with react-native-udp.");
  }

  sock.on("close", () => { closed = true; });
  sock.on("error", (e) => {
    console.warn("UDP listener error:", e?.message || e);
    // Don’t reject active waiters; they will timeout naturally
  });

  sock.on("message", (msg, rinfo) => {
    const payload = (msg?.toString("utf8") || "").trim();
    let ip = rinfo?.address;
    let portFound = 80;

    if (payload.startsWith("{")) {
      try {
        const obj = JSON.parse(payload);
        if (obj && obj.ip) ip = obj.ip;
        if (obj && obj.port) portFound = obj.port;
      } catch {
        // ignore malformed json
      }
    }
    const result = { ip, port: portFound, baseUrl: `http://${ip}:${portFound}` };

    // Deliver to all current waiters (first packet wins for them)
    if (waiters.size) {
      [...waiters].forEach((w) => {
        clearTimeout(w.timer);
        w.resolve(result);
        waiters.delete(w);
      });
    }
  });

  sock.bind(LISTEN_PORT, "0.0.0.0", () => { bound = true; });
  return sock;
}

/**
 * Wait for a single beacon. Socket stays open across calls.
 * Resolves { ip, port, baseUrl } or null on timeout.
 */
export function waitForBeacon({ timeoutMs = 8000 } = {}) {
  ensureSocket();
  return new Promise((resolve) => {
    const entry = { resolve, timer: null };
    entry.timer = setTimeout(() => {
      waiters.delete(entry);
      resolve(null);
    }, Math.max(1200, timeoutMs));
    waiters.add(entry);
  });
}

/**
 * Convenience wrapper (keeps your old name)
 */
export async function discoverDispersync(opts = {}) {
  return waitForBeacon(opts);
}
