// src/screen/GetDeviceConnectionScreen.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useKeepAwake } from "expo-keep-awake";
import { useDevice } from "../context/DeviceContext";
import { findDispersyncOnSubnet, whoAmI } from "../services/GetDeviceNetwork";

async function ping(baseUrl, timeoutMs = 700) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  const { setBaseUrl } = useDevice();
  try {
    const r = await fetch(`${baseUrl}/ping`, { signal: ctl.signal });
    const txt = (await r.text()).trim();
    return r.ok && txt.toUpperCase() === "OK";
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

export default function GetDeviceConnectionScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const { baseUrl, setBaseUrl } = useDevice();

  useKeepAwake(scanning); // keep radio alive while scanning

  const colors = {
    primary: "#25A18E",
    secondary: "#38b2ac",
    accent: "#4fd1c5",
    background: "#e6f4f1",
    white: "#FFFFFF",
  };

  const onFind = async () => {
    setScanning(true);
    setDeviceInfo(null);
    try {
      const found = await findDispersyncOnSubnet({ timeoutMs: 8000 });
      if (!found) {
        Alert.alert(
          "Not found",
          "No device replied. Ensure the ESP32 is connected to THIS phone's hotspot and powered on."
        );
        return;
      }

      // Store in context (this will update the UI to show "Device Found" section)
      setBaseUrl(found.baseUrl);

      // Optional whoami
      const who = await whoAmI(found.baseUrl).catch(() => null);
      if (who) setDeviceInfo(who);

      // Don't navigate automatically - let user see the "Device Found" section and choose when to proceed
    } catch (e) {
      Alert.alert("Discovery error", e?.message || "Could not listen for the device.");
    } finally {
      setScanning(false);
    }
  };

  const onUseDevice = () => {
    if (!baseUrl) return;
    navigation.replace("Login");
  };

  const onScanAgain = () => {
    setDeviceInfo(null);
    onFind();
  };

  return (
    <View style={styles.container}>
      {scanning ? (
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <LinearGradient colors={[colors.accent, colors.secondary, colors.primary]} style={styles.gradientIcon}>
              <Ionicons name="wifi" size={40} color={colors.white} />
            </LinearGradient>
          </View>
          <Text style={styles.title}>Listening…</Text>
          <Text style={styles.subtitle}>Waiting for a DisperSync beacon</Text>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 16 }} />
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setScanning(false)} activeOpacity={0.7}>
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <LinearGradient colors={[colors.accent, colors.secondary, colors.primary]} style={styles.gradientIcon}>
              <Ionicons name="wifi" size={40} color={colors.white} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Find DisperSync Device</Text>
          <Text style={styles.subtitle}>Connect to a nearby DisperSync device to continue</Text>

          {!baseUrl ? (
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={onFind} activeOpacity={0.8}>
                <LinearGradient colors={[colors.accent, colors.secondary, colors.primary]} style={styles.buttonGradient}>
                  <Ionicons name="search" size={20} color={colors.white} style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Scan Device</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => navigation.navigate("Login")}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Cancel Scan</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.selectedContainer}>
                <Text style={styles.selectedLabel}>Device Found</Text>
                <Text style={styles.selectedUrl}>{baseUrl}</Text>
                {deviceInfo ? (
                  <Text style={styles.deviceMeta}>{JSON.stringify(deviceInfo)}</Text>
                ) : (
                  <Text style={styles.deviceMetaMuted}>(No extra device info)</Text>
                )}
              </View>

              <View style={[styles.buttonContainer, { marginTop: 16 }]}>
                <TouchableOpacity style={styles.primaryButton} onPress={onUseDevice} activeOpacity={0.8}>
                  <LinearGradient colors={[colors.accent, colors.secondary, colors.primary]} style={styles.buttonGradient}>
                    <Ionicons name="checkmark" size={20} color={colors.white} style={styles.buttonIcon} />
                    <Text style={styles.primaryButtonText}>Use This Device</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={onScanAgain} activeOpacity={0.7}>
                  <Text style={styles.secondaryButtonText}>Scan Again</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#e6f4f1" },
  card: {
    backgroundColor: "#F8FFFE", borderRadius: 32, padding: 32, alignItems: "center", justifyContent: "center",
    width: 340, shadowColor: "#25A18E", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 12,
  },
  iconContainer: { marginBottom: 24 },
  gradientIcon: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#25A18E", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 24, textAlign: "center", paddingHorizontal: 10 },
  buttonContainer: { width: "100%", gap: 16 },
  primaryButton: {
    borderRadius: 24, overflow: "hidden", shadowColor: "#25A18E", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 8,
  },
  buttonGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 16, paddingHorizontal: 48 },
  buttonIcon: { marginRight: 8 },
  primaryButtonText: { color: "#fff", fontWeight: "600", fontSize: 18, letterSpacing: 1 },
  secondaryButton: { paddingVertical: 12, paddingHorizontal: 24, alignItems: "center" },
  secondaryButtonText: { color: "#25A18E", fontWeight: "600", fontSize: 16 },

  selectedContainer: { marginTop: 8, padding: 16, backgroundColor: "#E3F4EC", borderRadius: 12, width: "100%", alignItems: "center" },
  selectedLabel: { fontSize: 16, fontWeight: "600", color: "#25A18E", marginBottom: 6 },
  selectedUrl: { fontSize: 14, color: "#333", fontFamily: "monospace" },
  deviceMeta: { marginTop: 6, fontSize: 12, color: "#444", textAlign: "center" },
  deviceMetaMuted: { marginTop: 6, fontSize: 12, color: "#888", textAlign: "center" },
});
