// src/screen/GetDeviceConnectionScreen.js
import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  findDispersyncOnSubnet,
  whoAmI,
} from "../services/GetDeviceNetwork";
import DeviceScanningComponent from "../components/DeviceScanningComponent";

export default function GetDeviceConnectionScreen({ navigation }) {
  const [scanning, setScanning] = useState(false);
  const [baseUrl, setBaseUrl] = useState(null);
  const [currentIp, setCurrentIp] = useState(null);

  const onFind = async () => {
    setScanning(true);
    setBaseUrl(null);
    setCurrentIp(null);
    try {
      const found = await findDispersyncOnSubnet({
        timeoutPerHostMs: 700, // tune if needed
        maxConcurrent: 16, // 8–24 is a good range
        onIpProbe: (ip) => {
          setCurrentIp(ip);
        },
      });

      if (!found) {
        Alert.alert(
          "Not found",
          "No device on your subnet responded to /ping.\nMake sure the phone is on the same hotspot/LAN as the ESP32."
        );
        return;
      }

      setBaseUrl(found.baseUrl);

      // Optional identity check
      const who = await whoAmI(found.baseUrl);
      
      // Navigate directly to Login with the found device IP
      console.log('Device found, navigating to Login with IP:', found.baseUrl);
      navigation.replace("Login", {
        deviceBaseUrl: found.baseUrl
      });
    } finally {
      setScanning(false);
    }
  };

  const colors = {
    primary: "#25A18E",
    secondary: "#38b2ac",
    accent: "#4fd1c5",
    background: "#e6f4f1",
    white: "#FFFFFF",
    text: "#25A18E",
    textLight: "#666",
    border: "#E3F4EC",
  };

  return (
    <View style={styles.container}>
      {scanning ? (
        <DeviceScanningComponent scanning={scanning} currentIp={currentIp} />
      ) : (
        <View style={styles.card}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[colors.accent, colors.secondary, colors.primary]}
            style={styles.gradientIcon}
          >
            <Ionicons name="wifi" size={40} color={colors.white} />
          </LinearGradient>
        </View>

        <Text style={styles.title}>Find DisperSync Device</Text>
        <Text style={styles.subtitle}>
          Connect to a nearby DisperSync device to continue
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={onFind}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.accent, colors.secondary, colors.primary]}
              style={styles.buttonGradient}
            >
              <Ionicons
                name="search"
                size={20}
                color={colors.white}
                style={styles.buttonIcon}
              />
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

        {baseUrl ? (
          <View style={styles.selectedContainer}>
            <Text style={styles.selectedLabel}>Device Found</Text>
            <Text style={styles.selectedUrl}>{baseUrl}</Text>
          </View>
        ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6f4f1",
  },
  card: {
    backgroundColor: "#F8FFFE",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    width: 340,
    shadowColor: "#25A18E",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    marginBottom: 24,
  },
  gradientIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#25A18E",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 32,
    textAlign: "center",
    paddingHorizontal: 10,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  primaryButton: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#25A18E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
    letterSpacing: 1,
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#25A18E",
    fontWeight: "600",
    fontSize: 16,
  },
  selectedContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#E3F4EC",
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  selectedLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#25A18E",
    marginBottom: 4,
  },
  selectedUrl: {
    fontSize: 14,
    color: "#666",
    fontFamily: "monospace",
  },
});
