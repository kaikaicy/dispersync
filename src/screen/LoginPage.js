import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  Modal,
  Alert
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import logo from '../../assets/images/logo.png';

import { auth, db } from "../config/firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import {
  collection, query, where, getDocs, doc, getDoc
} from "firebase/firestore";
import { useDevice } from "../context/DeviceContext";

export default function LoginPage({ navigation, route }) {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [userIdError, setUserIdError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Forgot password states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotUserId, setForgotUserId] = useState("");
  const [forgotUserIdError, setForgotUserIdError] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  
  // Get device IP from context
  const { baseUrl: deviceBaseUrl } = useDevice();

  // 🔎 Find email by the numeric User ID stored in Firestore
  const findEmailByUserId = async (numericId) => {
    const staffCol = collection(db, "staff");
    const q = query(staffCol, where("userId", "==", numericId));
    const snap = await getDocs(q); 
    
    if (snap.empty) return null;

    const first = snap.docs[0];
    const data = first.data();
    console.log("email "+data.email);
    return { email: data.email, uid: data.uid };
  };

  // Handle forgot password
  const handleForgotPassword = async () => {
    setForgotUserIdError("");
    
    if (!forgotUserId.trim()) {
      setForgotUserIdError("Please enter your user ID");
      return;
    } else if (!/^\d+$/.test(forgotUserId)) {
      setForgotUserIdError("User ID must contain only numbers");
      return;
    }

    try {
      setResetSubmitting(true);
      
      // Find email by user ID
      const found = await findEmailByUserId(forgotUserId);
      if (!found || !found.email) {
        setForgotUserIdError("User ID not found");
        return;
      }

      // Send password reset email
      await sendPasswordResetEmail(auth, found.email);
      
      Alert.alert(
        "Reset Email Sent",
        `A password reset link has been sent to ${found.email}. Please check your email and follow the instructions to reset your password.`,
        [
          {
            text: "OK",
            onPress: () => {
              setShowForgotPassword(false);
              setForgotUserId("");
            }
          }
        ]
      );
    } catch (error) {
      console.error("Password reset error:", error);
      setForgotUserIdError("Failed to send reset email. Please try again.");
    } finally {
      setResetSubmitting(false);
    }
  };

  // Handle login: validate → lookup email → sign in → (optional) load profile → navigate
  const handleLogin = async () => {
    // keep your current validations
    let hasError = false;
    setUserIdError("");
    setPasswordError("");
    console.log(password.trim());
    if (!userId.trim()) {
      setUserIdError("Please enter your user ID");
      hasError = true;
    } else if (!/^\d+$/.test(userId)) {
      setUserIdError("User ID must contain only numbers");
      hasError = true;
    }

    if (!password.trim()) {
      setPasswordError("Please enter your password");
      hasError = true;
    }

    if (hasError) return;

    try {
      setSubmitting(true);

      // 1) Lookup email by userId in Firestore
      const found = await findEmailByUserId(userId);
      console.log("test");
      if (!found || !found.email) {
        setUserIdError("User ID not found");
        return;
      }
      console.log("test "+found.email);
      // 2) Sign in with email/password
      const cred = await signInWithEmailAndPassword(auth, found.email.trim(), password.trim());
      console.log("test2 "+cred.user.uid);
      // 3) (Optional) Load full staff profile if you need it herecred.user.uid
      const staffSnap = await getDoc(doc(db, "staff", cred.user.uid));
      if (!staffSnap.exists()) {
        // You can still continue, but warn
        console.log("Signed in, but staff profile not found.");
      } else {
        // If you want to pass this to next screen:
        const staffData = staffSnap.data();
        // e.g., you could put it in some global context/store if you have one
        // or pass as params:
        // navigation.replace('Main', { staff: staffData });
      }

      // 4) Navigate to Main after successful login (device IP is now in context)
      console.log('Login successful, navigating to Main');
      navigation.replace("Main");
    } catch (err) {
      console.error("Login failed:", err?.message || err);
      // Show a friendly error
      setPasswordError("Invalid credentials1");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "height" : ""}
      style={styles.background}
    >
      <View style={styles.scrollContainer}>
        <View style={styles.cardContainer}>
          <View style={styles.logoContainer}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
          </View>

          <Text style={styles.welcomeText}>Welcome back!</Text>
          <Text style={styles.loginText}>Login to your account</Text>

          <View style={styles.container}>
            {/* User ID Input */}
            <View style={styles.formGroup}>
              <View style={[styles.inputWrapper, userIdError && styles.inputError]}>
                <Icon
                  name="user"
                  size={22}
                  color={userIdError ? "#E74C3C" : "#459C8F"}
                  style={[styles.inputIcon, userIdError && { color: "#E74C3C" }]}
                />
                <TextInput
                  style={[styles.input, userIdError && { color: "#E74C3C" }]}
                  placeholder="User ID"
                  value={userId}
                  onChangeText={(text) => {
                    if (/^\d*$/.test(text)) {
                      setUserId(text);
                      setUserIdError("");
                    }
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={userIdError ? "#E74C3C" : "#b0b0b0"}
                />
              </View>
              <View style={styles.errorContainer}>
                {userIdError ? (
                  <Text style={styles.errorText}>{userIdError}</Text>
                ) : (
                  <Text style={styles.errorText}>{" "}</Text>
                )}
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.formGroup}>
              <View style={[styles.inputWrapper, passwordError && styles.inputError]}>
                <Icon
                  name="lock"
                  size={22}
                  color={passwordError ? "#E74C3C" : "#459C8F"}
                  style={[styles.inputIcon, passwordError && { color: "#E74C3C" }]}
                />
                <TextInput
                  style={[styles.input, passwordError && { color: "#E74C3C" }]}
                  placeholder="Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError("");
                  }}
                  placeholderTextColor={passwordError ? "#E74C3C" : "#b0b0b0"}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Icon
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color={passwordError ? "#E74C3C" : "#459C8F"}
                    style={passwordError && { color: "#E74C3C" }}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.errorContainer}>
                {passwordError ? (
                  <Text style={styles.errorText}>{passwordError}</Text>
                ) : (
                  <Text style={styles.errorText}>{" "}</Text>
                )}
              </View>
            </View>

            {/* Forgot Password Link (below password input, right-aligned) */}
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => setShowForgotPassword(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, submitting && { opacity: 0.6 }]}
              onPress={handleLogin}
              activeOpacity={0.8}
              disabled={submitting}
            >
              <Text style={styles.loginButtonText}>
                {submitting ? "Logging in..." : "Login"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity
                onPress={() => setShowForgotPassword(false)}
                style={styles.closeButton}
              >
                <Icon name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter your User ID to receive a password reset link via email.
            </Text>

            <View style={styles.modalFormGroup}>
              <View style={[styles.modalInputWrapper, forgotUserIdError && styles.inputError]}>
                <Icon
                  name="user"
                  size={20}
                  color={forgotUserIdError ? "#E74C3C" : "#459C8F"}
                  style={styles.modalInputIcon}
                />
                <TextInput
                  style={[styles.modalInput, forgotUserIdError && { color: "#E74C3C" }]}
                  placeholder="User ID"
                  value={forgotUserId}
                  onChangeText={(text) => {
                    if (/^\d*$/.test(text)) {
                      setForgotUserId(text);
                      setForgotUserIdError("");
                    }
                  }}
                  keyboardType="numeric"
                  placeholderTextColor={forgotUserIdError ? "#E74C3C" : "#b0b0b0"}
                />
              </View>
              {forgotUserIdError ? (
                <Text style={styles.modalErrorText}>{forgotUserIdError}</Text>
              ) : null}
            </View>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalCancelButton]}
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotUserId("");
                  setForgotUserIdError("");
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalResetButton, resetSubmitting && { opacity: 0.6 }]}
                onPress={handleForgotPassword}
                activeOpacity={0.8}
                disabled={resetSubmitting}
              >
                <Text style={styles.modalResetButtonText}>
                  {resetSubmitting ? "Sending..." : "Send Reset Link"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// =====================
// Styles
// =====================
const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#E8F5F2',
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
    backgroundColor: '#FFFFFF',
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
    color: '#2C3E50',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  loginText: {
    fontSize: 16,
    color: '#459C8F',
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
    color: '#2C3E50',
    height: 60,
    fontWeight: '500',
  },
  inputError: {
    borderColor: '#E74C3C',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    color: '#E74C3C',
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
    backgroundColor: '#459C8F',
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
    width: '100%',
    marginTop: 8,
    paddingVertical: 4,
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: '#459C8F',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
  },
  closeButton: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalFormGroup: {
    marginBottom: 24,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    borderWidth: 1,
    borderColor: '#E8F5F2',
  },
  modalInputIcon: {
    marginRight: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  modalErrorText: {
    color: '#E74C3C',
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8F5F2',
  },
  modalCancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  modalResetButton: {
    flex: 1,
    backgroundColor: '#459C8F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalResetButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
}); 