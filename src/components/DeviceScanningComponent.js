// src/components/DeviceScanningComponent.js
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function DeviceScanningComponent({ scanning, currentIp, message = "Probing hosts for /ping…" }) {
  const colors = {
    primary: '#25A18E',
    secondary: '#38b2ac',
    accent: '#4fd1c5',
    background: '#e6f4f1',
    white: '#FFFFFF',
    text: '#25A18E',
    textLight: '#666',
    border: '#E3F4EC',
  };

  if (!scanning) return null;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <LinearGradient
          colors={[colors.accent, colors.secondary, colors.primary]}
          style={styles.gradientContainer}
        >
          <ActivityIndicator size="large" color={colors.white} />
        </LinearGradient>
        <Text style={styles.title}>Scanning for Device</Text>
        <Text style={styles.message}>{message}</Text>
        {currentIp && (
          <Text style={styles.currentIp}>Probing: {currentIp}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e6f4f1',
  },
  card: {
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
  },
  gradientContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    color: '#25A18E',
    fontWeight: 'bold',
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  currentIp: {
    color: '#25A18E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'monospace',
  },
});
