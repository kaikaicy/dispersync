import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createDeviceListener } from "../services/ListenToDeviceGetData";

// Keys for persistence (optional)
const STORAGE_KEY = "@ds:lastBaseUrl";

const DeviceCtx = createContext(null);

export function DeviceProvider({ children }) {
  const [baseUrl, setBaseUrl] = useState(null);
  const listenerRef = useRef(null);

  // Recreate listener when baseUrl changes
  useEffect(() => {
    // stop & dispose previous one
    if (listenerRef.current) {
      try { listenerRef.current.stop(); } catch {}
      listenerRef.current = null;
    }
    if (baseUrl) {
      listenerRef.current = createDeviceListener({ host: baseUrl, path: "/getData" });
    }
  }, [baseUrl]);

  // Restore last known baseUrl on boot (optional)
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) setBaseUrl(saved);
      } catch {}
    })();
  }, []);

  // Persist baseUrl (optional)
  useEffect(() => {
    (async () => {
      try {
        if (baseUrl) await AsyncStorage.setItem(STORAGE_KEY, baseUrl);
      } catch {}
    })();
  }, [baseUrl]);

  const value = useMemo(
    () => ({
      baseUrl,
      setBaseUrl,
      listener: listenerRef, // .current is the device listener (or null)
      isReady: !!baseUrl,
      clearBaseUrl: async () => {
        try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
        setBaseUrl(null);
      },
    }),
    [baseUrl]
  );

  return <DeviceCtx.Provider value={value}>{children}</DeviceCtx.Provider>;
}

export function useDevice() {
  const ctx = useContext(DeviceCtx);
  if (!ctx) throw new Error("useDevice must be used inside <DeviceProvider />");
  return ctx;
}
