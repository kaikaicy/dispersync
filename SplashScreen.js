import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const logo = require('./assets/images/logo.png');

export default function SplashScreen({ navigation }) {
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Clear device context storage on app startup
    const clearDeviceStorage = async () => {
      try {
        await AsyncStorage.removeItem('@ds:lastBaseUrl');
        console.log('Device context storage cleared on app startup');
      } catch (error) {
        console.log('Error clearing device storage:', error);
      }
    };

    // Clear storage immediately when component mounts
    clearDeviceStorage();

    const steadyTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoTranslateY, {
          toValue: -120,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
        })
      ]).start(() => {
        navigation.replace('GetDeviceConnection');
      });
    }, 1000); // 1 second steady
    return () => clearTimeout(steadyTimer);
  }, [navigation, logoTranslateY, logoOpacity]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={logo}
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ translateY: logoTranslateY }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 180,
    height: 180,
    zIndex: 2,
  },
});

