// src/services/UDPDiscovery.js
import "react-native-get-random-values"; // safe polyfill, early
import dgram from "react-native-udp";
import { Buffer } from "buffer";

if (!global.Buffer) global.Buffer = Buffer;

const DISCOVERY_PORT = 40000;
const DISCOVERY_MESSAGE = "DISPERSYNC_DISCOVER";

// Extra broadcast targets help on some OEMs when hotspot is active.
const BROADCAST_TARGETS = [
  "255.255.255.255",
  "192.168.43.255",
  "192.168.42.255",
  "192.168.137.255",
  "10.0.0.255",
];

/**
 * Broadcast UDP discovery and wait for a reply.
 * Resolves to { ip, port, baseUrl } or null.
 * Throws only on fatal setup error (e.g., UDP module missing).
 */
export function discoverDispersync({
  timeoutMs = 3000,
  attempts = 2,
  intervalMs = 600,
  port = DISCOVERY_PORT,
  message = DISCOVERY_MESSAGE,
} = {}) {
  return new Promise((resolve, reject) => {
    let socket;
    try {
      socket = dgram.createSocket("udp4");
    } catch (e) {
      // Most common cause: dev client not rebuilt with react-native-udp
      return reject(
        new Error(
          "UDP not available. Rebuild your Expo dev client after installing `react-native-udp`."
        )
      );
    }

    let resolved = false;
    let attemptIndex = 0;
    const buf = Buffer.from(message, "utf8");

    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      try { socket.close(); } catch {}
      resolve(result);
    };

    const hardFail = (err) => {
      if (resolved) return;
      resolved = true;
      try { socket.close(); } catch {}
      reject(err);
    };

    // Overall timeout
    const killer = setTimeout(() => finish(null), Math.max(1000, timeoutMs));

    socket.on("message", (msg, rinfo) => {
      try {
        const txt = msg.toString("utf8").trim();
        let ip = rinfo?.address;
        let portFound = 80;

        if (txt.startsWith("{")) {
          const obj = JSON.parse(txt);
          if (obj && obj.ip) ip = obj.ip;
          if (obj && obj.port) portFound = obj.port;
        }
        clearTimeout(killer);
        finish({ ip, port: portFound, baseUrl: `http://${ip}:${portFound}` });
      } catch {
        // ignore malformed packets
      }
    });

    socket.on("error", (e) => {
      // Don’t crash the UI — treat as “no device”
      clearTimeout(killer);
      finish(null);
    });

    const sendBurst = () => {
      try {
        for (const target of BROADCAST_TARGETS) {
          socket.send(buf, 0, buf.length, port, target, () => {});
        }
      } catch {
        // ignore; next attempt may succeed
      }
    };

    socket.bind(0, () => {
      try { socket.setBroadcast(true); } catch {}
      // first burst immediately
      sendBurst();

      // then retry bursts until attempts exhausted or we resolve
      const tick = setInterval(() => {
        if (resolved) {
          clearInterval(tick);
          return;
        }
        attemptIndex += 1;
        if (attemptIndex >= attempts) {
          clearInterval(tick);
          return;
        }
        sendBurst();
      }, Math.max(200, intervalMs));
    });
  });
}
