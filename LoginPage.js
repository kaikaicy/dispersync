import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import logo from './assets/images/logo.png';

// =====================
// LoginPage Component
// =====================
export default function LoginPage({ navigation }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [userIdError, setUserIdError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Handle login logic
  const handleLogin = () => {
    let hasError = false;
    setUserIdError('');
    setPasswordError('');
    if (!userId.trim()) {
      setUserIdError('Please enter your user ID');
      hasError = true;
    } else if (!/^\d+$/.test(userId)) {
      setUserIdError('User ID must contain only numbers');
      hasError = true;
    }
    if (!password.trim()) {
      setPasswordError('Please enter your password');
      hasError = true;
    }
    if (hasError) return;
    navigation.replace('Main');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'height' : ''}
      style={styles.background}
    >
      <View style={styles.scrollContainer}>
        <View style={styles.cardContainer}>
          <View style={styles.logoContainer}>
            <Image
              source={logo}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.loginText}>Login to your account</Text>
          <View style={styles.container}>
            {/* User ID Input */}
            <View style={styles.formGroup}>
              <View style={[
                styles.inputWrapper,
                userIdError && styles.inputError
              ]}>
                <Icon 
                  name="user" 
                  size={22} 
                  color={userIdError ? '#E74C3C' : '#459C8F'} 
                  style={[styles.inputIcon, userIdError && { color: '#E74C3C' }]} 
                />
                <TextInput
                  style={[styles.input, userIdError && { color: '#E74C3C' }]}
                  placeholder="User ID"
                  value={userId}
                  onChangeText={text => {
                    // Only allow numbers
                    if (/^\d*$/.test(text)) {
                      setUserId(text);
                      setUserIdError('');
                    }
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={userIdError ? '#E74C3C' : '#b0b0b0'}
                />
              </View>
              <View style={styles.errorContainer}>
                {userIdError ? <Text style={styles.errorText}>{userIdError}</Text> : <Text style={styles.errorText}>{' '}</Text>}
              </View>
            </View>
            {/* Password Input */}
            <View style={styles.formGroup}>
              <View style={[
                styles.inputWrapper,
                passwordError && styles.inputError
              ]}>
                <Icon 
                  name="lock" 
                  size={22} 
                  color={passwordError ? '#E74C3C' : '#459C8F'} 
                  style={[styles.inputIcon, passwordError && { color: '#E74C3C' }]} 
                />
                <TextInput
                  style={[styles.input, passwordError && { color: '#E74C3C' }]}
                  placeholder="Password"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    setPasswordError('');
                  }}
                  placeholderTextColor={passwordError ? '#E74C3C' : '#b0b0b0'}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity 
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Icon 
                    name={showPassword ? "eye-off" : "eye"} 
                    size={22} 
                    color={passwordError ? '#E74C3C' : '#459C8F'} 
                    style={passwordError && { color: '#E74C3C' }}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.errorContainer}>
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : <Text style={styles.errorText}>{' '}</Text>}
              </View>
            </View>
            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// =====================
// Styles
// =====================
const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#E8F5F2', // Lighter, more subtle background
  },
  scrollContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: StatusBar.currentHeight + 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF', // Pure white for better contrast
    borderRadius: 24,
    alignItems: 'center',
    padding: 32,
    shadowColor: '#459C8F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50', // Darker, more readable text
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  loginText: {
    fontSize: 16,
    color: '#459C8F', // Teal Green accent
    textAlign: 'center',
    marginBottom: 32,
    fontWeight: '400',
  },
  container: {
    width: '100%',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 16,
    width: '100%',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 60,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E8F5F2',
    shadowColor: '#459C8F',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50', // Darker text for better readability
    height: 60,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#E74C3C', // Softer error red
    backgroundColor: '#FEF2F2', // Light red background
  },
  errorText: {
    color: '#E74C3C', // Matching error red
    fontSize: 13,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
    alignSelf: 'flex-start',
    width: '100%',
  },
  errorContainer: {
    height: 20,
    width: '100%',
    justifyContent: 'flex-start',
  },
  loginButton: {
    backgroundColor: '#459C8F', // Teal Green
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
    width: '100%',
    shadowColor: '#459C8F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  eyeIcon: {
    padding: 8,
    marginLeft: 8,
  },
  forgotPasswordContainer: {
    marginTop: 16,
    padding: 8,
  },
  forgotPasswordText: {
    color: '#459C8F', // Teal Green accent
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
}); 