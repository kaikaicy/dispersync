import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
import deviceListener from './src/services/ListenToDeviceGetData';


// Custom SVG icon for the device
function DeviceIconSVG({ size = 100 }) {
  const accent = '#25A18E';
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 100 130" fill="none">
      {/* Antenna */}
      <Line x1="80" y1="10" x2="98" y2="-30" stroke={accent} strokeWidth="5" />
      {/* Device body */}
      <Rect x="10" y="20" width="80" height="100" rx="8" fill="#F8FFFE" stroke={accent} strokeWidth="2" />
      {/* Screen */}
      <Rect x="25" y="30" width="50" height="28" rx="2" fill="#222" />
      {/* Buttons */}
      <Circle cx="30" cy="70" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="30" cy="85" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="50" cy="70" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="50" cy="85" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="70" cy="70" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
      <Circle cx="70" cy="85" r="5" fill="#E3F4EC" stroke={accent} strokeWidth="1.5" />
    </Svg>
  );
}

export default function ConnectDeviceScreen({ onBack, onConnect, navigation, onUIDScanned }) {

  
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  const rotateAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;


  const [lastUID, setLastUID] = useState(null);           
  const [errorMsg, setErrorMsg] = useState(null);      

  // Set up UID listener
  useEffect(() => {
    const unsubscribe = deviceListener.onUID((uid, meta) => {
      console.log('UID detected:', uid, meta);
      setLastUID(uid);
      setScanSuccess(true); 
      setScanning(false);
      setErrorMsg(null);
    });

    return () => {
      unsubscribe();
      // Stop the device listener when component unmounts
      deviceListener.stop();
    };
  }, []);

  const handleScan = async () => {
    setErrorMsg(null);
    setLastUID(null);
    setScanSuccess(false);
    setScanning(true);
    
    try {
      // Stop any existing listener first
      deviceListener.stop();
      
      // Start the listener
      await deviceListener.start();
      
      // Set a timeout to stop scanning if no UID is detected
      const timeoutId = setTimeout(() => {
        if (scanning && !scanSuccess) {
          setScanning(false);
          setErrorMsg('No device detected. Please ensure the device is connected and try again.');
          deviceListener.stop();
        }
      }, 10000); // 10 second timeout

      // Clean up timeout when component unmounts or scanning stops
      return () => clearTimeout(timeoutId);
    } catch (e) {
      console.error('Error starting device listener:', e);
      setScanning(false);
      setErrorMsg('Unable to start listener. Check Wi-Fi connection to the device.');
    }
  };

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

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  const checkPath = "M4 12L9 17L20 6";
  const checkLength = 29; // Approximate length of the check mark path

  const strokeDashoffset = checkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [checkLength, 0],
  });

  const cardStyle = {
    backgroundColor: '#F8FFFE',
    borderRadius: 32,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: 340,
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  };

  const accentColor = '#25A18E';
  const gradientColors = ['#4fd1c5', '#38b2ac', '#4299e1'];

  if (scanning) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6f4f1', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={[cardStyle, { marginBottom: 0 }]}>
          <Animated.View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 110,
              marginBottom: 24,
              width: 180,
              height: 180,
              transform: [{ rotate: spin }],
            }}
          >
            <LinearGradient
              colors={gradientColors}
              style={{
                width: 180,
                height: 180,
                borderRadius: 90,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Radar sweep line */}
              <View
                style={{
                  position: 'absolute',
                  left: 90 - 2, // center horizontally (width/2 - line width/2)
                  top: 20,      // start a bit below the top
                  width: 4,     // thickness of the line
                  height: 70,   // length of the line (from center to edge)
                  backgroundColor: '#fff',
                  opacity: 0.7,
                  borderRadius: 2,
                  zIndex: 2,
                }}
              />
              <View
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                  backgroundColor: '#fff',
                  opacity: 0.12,
                  position: 'absolute',
                }}
              />
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: '#fff',
                  opacity: 0.07,
                  position: 'absolute',
                }}
              />
            </LinearGradient>
          </Animated.View>
          <Text
            style={{
              color: accentColor,
              fontWeight: 'bold',
              fontSize: 22,
              marginTop: 8,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Scan NFC Tag
          </Text>
          <Text
            style={{
              color: '#666',
              fontSize: 16,
              marginTop: 4,
              textAlign: 'center',
            }}
          >
            Waiting for the device to Scan....
          </Text>
        </View>
      </View>
    );
  }

  if (scanSuccess) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6f4f1', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={[cardStyle, { marginBottom: 0 }]}>
          <LinearGradient
            colors={gradientColors}
            style={{ width: 180, height: 180, borderRadius: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}
          >
            <Svg width={120} height={120} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
              <AnimatedPath
                d={checkPath}
                strokeDasharray={checkLength}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </Svg>
          </LinearGradient>
          <Text
            style={{
              color: accentColor,
              fontWeight: 'bold',
              fontSize: 22,
              marginTop: 8,
              marginBottom: 8,
              textAlign: 'center',
            }}
          >
            Scan Successful!
          </Text>
          {lastUID && (
            <Text
              style={{
                color: '#666',
                fontSize: 14,
                marginBottom: 8,
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            >
              UID: {lastUID}
            </Text>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
            <TouchableOpacity onPress={handleScan} style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24, marginRight: 12, borderWidth: 1, borderColor: accentColor }}>
              <Text style={{ color: accentColor, fontWeight: '600', fontSize: 16 }}>Scan Again</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              if (onUIDScanned && lastUID) {
                onUIDScanned(lastUID);
              }
              onConnect();
            }} style={{ backgroundColor: accentColor, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 24 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6f4f1', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <View style={[cardStyle, { marginBottom: 0 }]}>
        <View style={{ backgroundColor: '#E3F4EC', borderRadius: 80, padding: 32, marginBottom: 32, alignItems: 'center', justifyContent: 'center' }}>
          <DeviceIconSVG size={100} />
        </View>
        <Text style={{ fontSize: 24, fontWeight: '700', color: accentColor, marginBottom: 8, textAlign: 'center' }}>Connect to Device</Text>
        <Text style={{ fontSize: 15, color: '#666', marginBottom: 32, textAlign: 'center', paddingHorizontal: 10 }}>
          Please connect to a nearby device to continue.
        </Text>
        <TouchableOpacity onPress={handleScan} style={{ backgroundColor: accentColor, borderRadius: 24, paddingVertical: 16, paddingHorizontal: 48, alignItems: 'center', shadowColor: accentColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 8, marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 18, letterSpacing: 1 }}>SCAN</Text>
        </TouchableOpacity>
        {errorMsg && (
          <Text style={{ color: '#e53e3e', fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 20 }}>
            {errorMsg}
          </Text>
        )}
        <TouchableOpacity onPress={onBack} style={{ marginTop: 8 }}>
          <Text style={{ color: accentColor, fontWeight: '600', fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
} 