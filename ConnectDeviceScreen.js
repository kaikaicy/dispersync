import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect, Circle, Line } from "react-native-svg";
import { useDevice } from "./src/context/DeviceContext";
import { createDeviceListener } from "./src/services/ListenToDeviceGetData";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Simple device SVG
function DeviceIconSVG({ size = 100 }) {
  const accent = "#25A18E";
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 100 130" fill="none">
      <Line x1="80" y1="10" x2="98" y2="-30" stroke={accent} strokeWidth="5" />
      <Rect x="10" y="20" width="80" height="100" rx="8" fill="#F8FFFE" stroke={accent} strokeWidth="2" />
      <Rect x="25" y="30" width="50" height="28" rx="2" fill="#222" />
      <Circle cx="30" cy="70" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="30" cy="85" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="50" cy="70" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="50" cy="85" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="70" cy="70" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="70" cy="85" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
    </Svg>
  );
}

export default function ConnectDeviceScreen({ onContinue, navigation, onScannedUID, onUIDScanned, onConnect }) {
  const { baseUrl: deviceBaseUrl } = useDevice();

  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [lastUID, setLastUID] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [bypassMode, setBypassMode] = useState(false);

  const deviceListener = useRef(null);

  // Create/replace listener whenever deviceBaseUrl changes or bypass mode changes
  useEffect(() => {
    if (!deviceBaseUrl && !bypassMode) {
      setErrorMsg("No device URL. Please go back and scan for a device first.");
      // stop old listener if any
      if (deviceListener.current) {
        try { deviceListener.current.stop(); } catch {}
        deviceListener.current = null;
      }
      return;
    }

    try {
      // In bypass mode, use a dummy URL
      const host = bypassMode ? "http://localhost" : deviceBaseUrl;
      deviceListener.current = createDeviceListener({ host: host, path: "/getData" });
      
      // Enable dummy data in bypass mode
      if (bypassMode && deviceListener.current) {
        deviceListener.current.enableDummyData();
      }
      
      setErrorMsg(null);
    } catch (err) {
      console.error("Listener create error:", err);
      setErrorMsg("Invalid device URL. Please re-scan the device.");
      deviceListener.current = null;
    }

    return () => {
      // clean up listener on URL change/unmount
      if (deviceListener.current) {
        try { deviceListener.current.stop(); } catch {}
        deviceListener.current = null;
      }
    };
  }, [deviceBaseUrl, bypassMode]);

  // Subscribe to UID events when a listener exists
  useEffect(() => {
    if (!deviceListener.current) return;
    const unsubscribe = deviceListener.current.onUID((uid) => {
      setLastUID(uid);
      setScanSuccess(true);
      // Stop listening after detecting a UID
      setScanning(false);
      setErrorMsg(null);
      // Stop the listener to prevent continuous polling
      if (deviceListener.current) {
        try { deviceListener.current.stop(); } catch {}
      }
      // Call the onUIDScanned callback if provided
      if (onUIDScanned) {
        onUIDScanned(uid);
      }
      // Also call onScannedUID for backward compatibility
      if (onScannedUID) {
        onScannedUID(uid);
      }
    });
    return () => unsubscribe();
  }, [deviceBaseUrl, onUIDScanned]);

  // Start polling
  const handleScan = async () => {
    setErrorMsg(null);
    setLastUID(null);
    setScanSuccess(false);

    if (!deviceListener.current) {
      setErrorMsg("Device not configured. Re-scan for device first.");
      return;
    }

    try {
      // (re)start continuous polling
      deviceListener.current.stop();
      await deviceListener.current.start();
      setScanning(true);
    } catch (e) {
      console.error("Start listener error:", e);
      setScanning(false);
      setErrorMsg("Unable to start listening. Check your hotspot connection.");
    }
  };

  // Bypass function - simulates a UID scan
  const handleBypass = () => {
    const dummyUID = "AA:BB:CC:DD:EE";
    setLastUID(dummyUID);
    setScanSuccess(true);
    setScanning(false);
    setErrorMsg(null);
    
    // Call the callbacks
    if (onUIDScanned) {
      onUIDScanned(dummyUID);
    }
    if (onScannedUID) {
      onScannedUID(dummyUID);
    }
  };

  const handleStopListening = () => {
    if (deviceListener.current) {
      try { deviceListener.current.stop(); } catch {}
    }
    setScanning(false);
    setErrorMsg(null);
  };

  const handleContinue = () => {
    // Call onConnect if provided, otherwise fall back to onContinue
    if (onConnect) {
      onConnect();
    } else if (onContinue) {
      onContinue();
    }
  };

  // Animations
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
    }
  }, [scanning]);

  useEffect(() => {
    if (scanSuccess) {
      Animated.timing(checkAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }).start();
    } else {
      checkAnim.setValue(0);
    }
  }, [scanSuccess]);

  const spin = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });
  const checkPath = "M4 12L9 17L20 6";
  const checkLength = 29;
  const strokeDashoffset = checkAnim.interpolate({ inputRange: [0, 1], outputRange: [checkLength, 0] });

  const cardStyle = {
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
  };

  const accentColor = "#25A18E";
  const gradientColors = ["#4fd1c5", "#38b2ac", "#4299e1"];

  // UI states
  if (scanning) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#e6f4f1" }}>
        <View style={[cardStyle]}>
          <Animated.View style={{ alignItems: "center", justifyContent: "center", borderRadius: 110, marginBottom: 24, width: 180, height: 180, transform: [{ rotate: spin }] }}>
            <LinearGradient colors={gradientColors} style={{ width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center" }}>
              <View style={{ position: "absolute", left: 88, top: 20, width: 4, height: 70, backgroundColor: "#fff", opacity: 0.7, borderRadius: 2 }} />
              <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: "#fff", opacity: 0.12, position: "absolute" }} />
              <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: "#fff", opacity: 0.07, position: "absolute" }} />
            </LinearGradient>
          </Animated.View>
          <Text style={{ color: accentColor, fontWeight: "bold", fontSize: 22, marginTop: 8, marginBottom: 8, textAlign: "center" }}>
            Listening for NFC scan…
          </Text>
          <Text style={{ color: "#666", fontSize: 16, marginTop: 4, textAlign: "center" }}>
            Hold a card near the device reader
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: "#fff", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginTop: 16, borderWidth: 1, borderColor: accentColor }}
            onPress={handleStopListening}
          >
            <Text style={{ color: accentColor, fontWeight: "600", fontSize: 16 }}>Stop Listening</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (scanSuccess) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#e6f4f1" }}>
        <View style={[cardStyle]}>
          <LinearGradient colors={gradientColors} style={{ width: 180, height: 180, borderRadius: 90, alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
            <Svg width={120} height={120} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
              <AnimatedPath d={checkPath} strokeDasharray={checkLength} strokeDashoffset={strokeDashoffset} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </LinearGradient>
          <Text style={{ color: accentColor, fontWeight: "bold", fontSize: 22, marginTop: 8, marginBottom: 8, textAlign: "center" }}>
            NFC Card Detected!
          </Text>
          {lastUID && (
            <Text style={{ color: "#666", fontSize: 14, marginBottom: 8, textAlign: "center", fontFamily: "monospace" }}>
              UID: {lastUID}
            </Text>
          )}
          <Text style={{ color: "#666", fontSize: 12, marginBottom: 16, textAlign: "center", fontStyle: "italic" }}>
            NFC card successfully detected and processed.
          </Text>
          <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
            <TouchableOpacity onPress={handleStopListening} style={{ backgroundColor: "#fff", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginRight: 12, borderWidth: 1, borderColor: accentColor }}>
              <Text style={{ color: accentColor, fontWeight: "600", fontSize: 16 }}>Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleContinue} style={{ backgroundColor: accentColor, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24 }}>
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Idle (not scanning yet)
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#e6f4f1" }}>
      <View style={[cardStyle]}>
        <View style={{ backgroundColor: "#E3F4EC", borderRadius: 80, padding: 32, marginBottom: 32, alignItems: "center", justifyContent: "center" }}>
          <DeviceIconSVG size={100} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: "700", color: accentColor, marginBottom: 8, textAlign: "center" }}>Listen to Device</Text>
        <Text style={{ fontSize: 15, color: "#666", marginBottom: 32, textAlign: "center", paddingHorizontal: 10 }}>
          {deviceBaseUrl ? `Connected to ${deviceBaseUrl}` : "No device connected. Go back and scan a device first."}
        </Text>

        {deviceBaseUrl ? (
          <>
            <TouchableOpacity
              onPress={handleScan}
              style={{
                backgroundColor: accentColor,
                borderRadius: 24,
                paddingVertical: 16,
                paddingHorizontal: 48,
                alignItems: "center",
                shadowColor: accentColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 8,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 18, letterSpacing: 1 }}>START LISTENING</Text>
            </TouchableOpacity>
            
            {/* Bypass Mode Toggle */}
            <TouchableOpacity
              onPress={() => setBypassMode(!bypassMode)}
              style={{
                backgroundColor: bypassMode ? "#ff6b6b" : "#f8f9fa",
                borderRadius: 20,
                paddingVertical: 12,
                paddingHorizontal: 24,
                alignItems: "center",
                borderWidth: 2,
                borderColor: bypassMode ? "#ff6b6b" : "#dee2e6",
                marginBottom: 12,
              }}
            >
              <Text style={{ 
                color: bypassMode ? "#fff" : "#666", 
                fontWeight: "600", 
                fontSize: 14 
              }}>
                {bypassMode ? "BYPASS MODE ON" : "Enable Bypass Mode"}
              </Text>
            </TouchableOpacity>
            
            {/* Bypass Button - only show when bypass mode is on */}
            {bypassMode && (
              <TouchableOpacity
                onPress={handleBypass}
                style={{
                  backgroundColor: "#28a745",
                  borderRadius: 20,
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  alignItems: "center",
                  shadowColor: "#28a745",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                  SIMULATE UID SCAN
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity
              onPress={() => navigation && navigation.goBack()}
              style={{
                backgroundColor: accentColor,
                borderRadius: 24,
                paddingVertical: 16,
                paddingHorizontal: 48,
                alignItems: "center",
                shadowColor: accentColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 12,
                elevation: 8,
                marginBottom: 16,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 18, letterSpacing: 1 }}>Go Back</Text>
            </TouchableOpacity>
            
            {/* Bypass Mode Toggle for no device */}
            <TouchableOpacity
              onPress={() => setBypassMode(!bypassMode)}
              style={{
                backgroundColor: bypassMode ? "#ff6b6b" : "#f8f9fa",
                borderRadius: 20,
                paddingVertical: 12,
                paddingHorizontal: 24,
                alignItems: "center",
                borderWidth: 2,
                borderColor: bypassMode ? "#ff6b6b" : "#dee2e6",
                marginBottom: 12,
              }}
            >
              <Text style={{ 
                color: bypassMode ? "#fff" : "#666", 
                fontWeight: "600", 
                fontSize: 14 
              }}>
                {bypassMode ? "BYPASS MODE ON" : "Enable Bypass Mode"}
              </Text>
            </TouchableOpacity>
            
            {/* Bypass Button - only show when bypass mode is on */}
            {bypassMode && (
              <TouchableOpacity
                onPress={handleBypass}
                style={{
                  backgroundColor: "#28a745",
                  borderRadius: 20,
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  alignItems: "center",
                  shadowColor: "#28a745",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "600", fontSize: 16 }}>
                  SIMULATE UID SCAN
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {errorMsg && (
          <Text style={{ color: "#e53e3e", fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 20 }}>
            {errorMsg}
          </Text>
        )}
      </View>
    </View>
  );
}
