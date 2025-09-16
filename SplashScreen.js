import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';

const logo = require('./assets/images/logo.png');

export default function SplashScreen({ navigation }) {
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
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
    }, 5000); // 5 seconds steady
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

