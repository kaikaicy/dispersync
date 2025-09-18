import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Image, Animated, Easing, Modal } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import Svg, { Circle, Line } from 'react-native-svg';
import ProfileScreen from './ProfileScreen';
import ConnectDeviceScreen from './ConnectDeviceScreen';
import Transaction from './Transaction';
import Dispersal from './Dispersal';
import Cull from './Cull';
import Status from './Status';
import Beneficiary from './Beneficiary';
import Redispersal from './Redispersal';
import ListOfBeneficiaries from './ListOfBeneficiaries';
import ListToInspect from './ListToInspect';
import ListForDispersal from './ListForDispersal';
import Transfer from './Transfer';
import { useDevice } from './src/context/DeviceContext';

// Import logo images
const leftLogo = require('./assets/images/logoleft.png');
const rightLogo = require('./assets/images/logoright.png');

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

export function ScanningCircle({ duration = 2000, size = 140, strokeWidth = 10, color = '#25A18E' }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedValue.setValue(0);
    Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration,
        useNativeDriver: false,
        easing: Easing.linear,
      })
    ).start();
  }, [animatedValue, duration]);

  // Radar sweep arc (quarter circle)
  const sweepLength = circumference * 0.25;
  const sweepOffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, circumference],
  });

  // Rotating needle
  const rotate = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Center point
  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {/* Glowing background circles */}
        <Circle cx={cx} cy={cy} r={radius + 10} fill="#25A18E" opacity={0.08} />
        <Circle cx={cx} cy={cy} r={radius + 5} fill="#25A18E" opacity={0.12} />
        <Circle cx={cx} cy={cy} r={radius} fill="#25A18E" opacity={0.18} />
        {/* Main background circle */}
        <Circle cx={cx} cy={cy} r={radius - 8} fill="#fff" />
        {/* Static outer circle */}
        <Circle cx={cx} cy={cy} r={radius} stroke="#E3F4EC" strokeWidth={strokeWidth} fill="none" />
        {/* Radar sweep arc */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${sweepLength}, ${circumference}`}
          strokeDashoffset={sweepOffset}
          strokeLinecap="round"
          opacity={0.7}
        />
        {/* Rotating needle */}
        <AnimatedLine
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - radius}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          originX={cx}
          originY={cy}
          style={{ transform: [{ rotate }] }}
        />
      </Svg>
    </View>
  );
}

export default function MainScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [showBeneficiaries, setShowBeneficiaries] = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  const [showForDispersal, setShowForDispersal] = useState(false);
  const [showTransactionScreen, setShowTransactionScreen] = useState(null);
  const [scannedUID, setScannedUID] = useState(null);
  
  // Get device IP from context
  const { baseUrl: deviceBaseUrl } = useDevice();
  
  // Debug logging
  useEffect(() => {
    if (deviceBaseUrl) {
      console.log('MainScreen received device IP from context:', deviceBaseUrl);
    }
  }, [deviceBaseUrl]);

  // Helper to render main content
  const renderMainContent = () => {
    // First check for special transaction screens
    if (showTransactionScreen === 'Dispersal') {
      return <Dispersal 
        navigation={navigation} 
        onBackToTransactions={() => setShowTransactionScreen('Transaction')} 
        scannedUID={scannedUID}
      />;
    } else if (showTransactionScreen === 'Cull') {
      return <Cull navigation={navigation} onBackToTransactions={(screen) => {
        if (screen === 'Status') {
          setShowTransactionScreen('Status');
        } else {
          setShowTransactionScreen('Transaction');
        }
      }} />;
    } else if (showTransactionScreen === 'Beneficiary') {
      return <Beneficiary navigation={navigation} onBackToTransactions={() => setShowTransactionScreen('Transaction')} />;
    } else if (showTransactionScreen === 'Status') {
      return <Status navigation={navigation} onBackToTransactions={(screen) => {
        console.log('Status screen navigation called with screen:', screen);
        if (screen === 'Cull') {
          console.log('Navigating to Cull screen');
          setShowTransactionScreen('Cull');
        } else if (screen === 'Redispersal') {
          console.log('Navigating to Redispersal screen');
          setShowTransactionScreen('Redispersal');
        } else if (screen === 'Transfer') {
          console.log('Navigating to Transfer screen');
          setShowTransactionScreen('Transfer');
        } else {
          console.log('Navigating back to Transaction screen');
          setShowTransactionScreen('Transaction');
        }
      }} />;
    } else if (showTransactionScreen === 'Redispersal') {
      return <Redispersal navigation={navigation} onBackToTransactions={(screen) => {
        if (screen === 'Status') {
          setShowTransactionScreen('Status');
        } else {
          setShowTransactionScreen('Transaction');
        }
      }} />;
    } else if (showTransactionScreen === 'Transfer') {
      return <Transfer navigation={navigation} onBackToTransactions={(screen) => {
        if (screen === 'Status') {
          setShowTransactionScreen('Status');
        } else {
          setShowTransactionScreen('Transaction');
        }
      }} />;
    }
    
    // Then check for other special screens
    if (showBeneficiaries) {
      return <ListOfBeneficiaries />;
    }
    if (showInspect) {
      return <ListToInspect />;
    }
    if (showForDispersal) {
      return <ListForDispersal />;
    }
    
    // Finally check the active tab
    if (activeTab === 'Profile') {
      return <ProfileScreen navigation={navigation} />;
    } else if (activeTab === 'Scan') {
      console.log('MainScreen navigating to ConnectDeviceScreen with device IP from context:', deviceBaseUrl);
      return <ConnectDeviceScreen 
        onBack={() => setActiveTab('Dashboard')} 
        onConnect={() => setActiveTab('Transaction')} 
        onUIDScanned={(uid) => setScannedUID(uid)}
        navigation={navigation}
      />;
    } else if (activeTab === 'Transaction') {
      return <Transaction 
        navigation={navigation} 
        onSelectTransaction={setShowTransactionScreen} 
        scannedUID={scannedUID}
      />;
    } else {
      // Dashboard content (default)
      return (
        <>
          <Text style={styles.sectionTitle}>Summary of Details</Text>
          <View style={styles.divider} />
          <View style={styles.statRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#B5D7AC' }]}>
                <Ionicons name="business" size={20} color="#459C8F" />
              </View>
              <Text style={styles.statNumber}>15</Text>
              <Text style={styles.statLabel}>Livestock Assigned to Municipality</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#A7D1C7' }]}>
                <Ionicons name="medkit" size={20} color="#49988E" />
              </View>
              <Text style={styles.statNumber}>5</Text>
              <Text style={styles.statLabel}>Livestock Needing Health Checks</Text>
            </View>
          </View>
          <View style={styles.statRowSingle}>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#E3F4EC' }]}>
                <Ionicons name="pulse" size={20} color="#459C8F" />
              </View>
              <Text style={styles.statNumber}>2</Text>
              <Text style={styles.statLabel}>Health Updates Today</Text>
            </View>
          </View>
          <Text style={styles.sectionTitle}>Dispersal Activities</Text>
          <View style={styles.divider} />
          <View style={styles.largeCardRow}>
            <View style={[styles.largeCard, styles.gradientCard1]}>
              <View style={styles.largeCardContent}>
                <Ionicons name="business" size={32} color="#fff" style={styles.largeCardIcon} />
                <View>
                  <Text style={styles.largeCardNumber}>15</Text>
                  <Text style={styles.largeCardLabel}>Livestock Assigned to Municipality</Text>
                </View>
              </View>
            </View>
            <View style={[styles.largeCard, styles.gradientCard2]}>
              <View style={styles.largeCardContent}>
                <Ionicons name="business" size={32} color="#fff" style={styles.largeCardIcon} />
                <View>
                  <Text style={styles.largeCardNumber}>5</Text>
                  <Text style={styles.largeCardLabel}>Livestock Needing Health Checks</Text>
                </View>
              </View>
            </View>
          </View>
        </>
      );
    }
  };

  const handleNotifChoice = (choice) => {
    setNotifModalVisible(false);
    setShowBeneficiaries(false);
    setShowInspect(false);
    setShowForDispersal(false);
    setShowTransactionScreen(null);
    if (choice === 'beneficiaries') {
      setShowBeneficiaries(true);
    } else if (choice === 'inspect') {
      setShowInspect(true);
    } else if (choice === 'for_dispersal') {
      setShowForDispersal(true);
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLogos}>
                <Image source={leftLogo} style={styles.logoImage} resizeMode="contain" />
                <View style={styles.headerTextContainer}>
                  <Text style={styles.headerTitle}>
                    Online Livestock Dispersal Monitoring System
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    Camarines Norte Provincial Veterinarian's Office
                  </Text>
                </View>
                <Image source={rightLogo} style={styles.logoImage} resizeMode="contain" />
              </View>
            </View>
            {/* Search and Icons - directly under header */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#b0b0b0"
              />
              <TouchableOpacity>
                <Ionicons name="notifications-outline" size={24} color="#4ca1af" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setNotifModalVisible(true)}>
                <MaterialIcons name="menu" size={24} color="#4ca1af" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Main Content */}
              <View style={styles.mainContent}>
                {renderMainContent()}
              </View>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
        {/* Bottom Navigation - always fixed, outside KeyboardAvoidingView */}
        <SafeAreaView edges={['bottom']} style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                setActiveTab('Dashboard');
                setShowBeneficiaries(false);
                setShowInspect(false);
                setShowTransactionScreen(null);
                setScannedUID(null);
              }}
            >
              <FontAwesome name="dashboard" size={22} color="#fff" />
              <Text style={activeTab === 'Dashboard' ? styles.navTextActive : styles.navText}>Dashboard</Text>
            </TouchableOpacity>
            <View style={styles.centerButtonWrapper}>
              <TouchableOpacity
                style={styles.centerButton}
                onPress={() => {
                  setActiveTab('Scan');
                  setShowBeneficiaries(false);
                  setShowInspect(false);
                  setShowTransactionScreen(null);
                  setScannedUID(null);
                }}
              >
                <Ionicons name="scan" size={28} color="#4ca1af" />
              </TouchableOpacity>
              <Text style={styles.centerButtonText}>Scan</Text>
            </View>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                setActiveTab('Profile');
                setShowBeneficiaries(false);
                setShowInspect(false);
                setShowTransactionScreen(null);
                setScannedUID(null);
              }}
            >
              <Ionicons name="person-outline" size={22} color="#fff" />
              <Text style={activeTab === 'Profile' ? styles.navTextActive : styles.navText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        {/* Notification Modal */}
        <Modal
          visible={notifModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setNotifModalVisible(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.2)',
              justifyContent: 'flex-start',
              alignItems: 'flex-end',
            }}
            activeOpacity={1}
            onPressOut={() => setNotifModalVisible(false)}
          >
            <View style={{
              backgroundColor: '#fff',
              borderRadius: 10,
              marginTop: 60,
              marginRight: 20,
              paddingVertical: 8,
              width: 180,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
            }}>
              <TouchableOpacity
                style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                onPress={() => handleNotifChoice('beneficiaries')}
              >
                <Text style={{ color: '#25A18E', fontWeight: '500' }}>List of Beneficiaries</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 14 }}
                onPress={() => handleNotifChoice('inspect')}
              >
                <Text style={{ color: '#25A18E', fontWeight: '500' }}>List to Inspect</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ padding: 14, borderTopWidth: 1, borderTopColor: '#eee' }}
                onPress={() => handleNotifChoice('for_dispersal')}
              >
                <Text style={{ color: '#25A18E', fontWeight: '500' }}>List for Dispersal</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e6f4f1',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#25A18E',
    paddingTop: Platform.OS === 'ios' ? 30 : 10,
    paddingBottom: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 13,
    color: '#fff',
    marginBottom: 2,
    flexWrap: 'wrap',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.9,
    flexWrap: 'wrap',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    backgroundColor: '#F5F9F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    height: 36,
  },
  mainContent: {
    flex: 1,
    backgroundColor: '#e6f4f1',
    paddingTop: 0,
  },
  bottomNavContainer: {
    backgroundColor: '#25A18E',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 56,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  navText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
    opacity: 0.8,
  },
  navTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 11,
    marginTop: 4,
  },
  centerButtonWrapper: {
    alignItems: 'center',
    marginTop: -28,
    flex: 1,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  centerButtonText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25A18E',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statRowSingle: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    backgroundColor: '#E3F4EC',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25A18E',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  largeCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 24,
  },
  largeCard: {
    flex: 1,
    borderRadius: 12,
    marginHorizontal: 4,
    padding: 16,
    minHeight: 90,
    justifyContent: 'center',
  },
  gradientCard1: {
    backgroundColor: '#25A18E',
  },
  gradientCard2: {
    backgroundColor: '#25A18E',
  },
  largeCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeCardIcon: {
    marginRight: 12,
  },
  largeCardNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  largeCardLabel: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.9,
    flexWrap: 'wrap',
  },
});