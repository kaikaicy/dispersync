import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import Notifications from './Notifications';
import { useDevice } from './src/context/DeviceContext';
import { auth, db } from './src/config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { collection, query, where, onSnapshot, getDocs, getDoc, doc, documentId, updateDoc } from 'firebase/firestore';
import { startNotificationsSync } from './src/services/NotificationsService';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

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
  const [notifCounts, setNotifCounts] = useState({ beneficiaries: 0, inspect: 0, dispersal: 0 });
  const [lastSeenCounts, setLastSeenCounts] = useState({ beneficiaries: 0, inspect: 0, dispersal: 0 });
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [staffRole, setStaffRole] = useState(null);
  const [staffMunicipality, setStaffMunicipality] = useState(null);
  const [showBeneficiaries, setShowBeneficiaries] = useState(false);
  const [showInspect, setShowInspect] = useState(false);
  const [showForDispersal, setShowForDispersal] = useState(false);
  const [highlightInspectApplicantId, setHighlightInspectApplicantId] = useState(null);
  const [highlightBeneficiaryApplicantId, setHighlightBeneficiaryApplicantId] = useState(null);
  const [highlightDispersalScheduleId, setHighlightDispersalScheduleId] = useState(null);
  const [showTransactionScreen, setShowTransactionScreen] = useState(null);
  const [scannedUID, setScannedUID] = useState(null);
  const [monthlyDispersal, setMonthlyDispersal] = useState(Array(12).fill(0));
  const [pendingTransfers, setPendingTransfers] = useState(0);
  const [totalDispersed, setTotalDispersed] = useState(0);
  const [staffName, setStaffName] = useState('');

  // Get device IP from context
  const { baseUrl: deviceBaseUrl } = useDevice();
  
  // Debug logging
  useEffect(() => {
    if (deviceBaseUrl) {
      console.log('MainScreen received device IP from context:', deviceBaseUrl);
    }
  }, [deviceBaseUrl]);

  // Load staff municipality from auth user and last seen counts
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setStaffMunicipality(null);
          setLastSeenCounts({ beneficiaries: 0, inspect: 0, dispersal: 0 });
          setUnreadCount(0);
          return;
        }
        const staffSnap = await getDoc(doc(db, 'staff', user.uid));
        const data = staffSnap.exists() ? staffSnap.data() : {};
        const muni = data.municipality || data.Municipality || data?.location?.municipality || null;
        setStaffMunicipality(typeof muni === 'string' ? muni : null);
        setStaffRole(data?.role || data?.userRole || null);
        const seen = data?.lastSeenCounts;
        if (seen && typeof seen === 'object') {
          setLastSeenCounts({
            beneficiaries: Number(seen.beneficiaries) || 0,
            inspect: Number(seen.inspect) || 0,
            dispersal: Number(seen.dispersal) || 0,
          });
        }
        // Subscribe to unread notifications count
        try {
          const unsubUnread = onSnapshot(
            query(collection(db, 'mobileNotifications'), where('userId', '==', user.uid), where('read', '==', false)),
            (snap) => setUnreadCount(snap.size),
            (err) => console.error('Unread notifications listener error:', err)
          );
          return () => unsubUnread();
        } catch (e) {
          console.error('Failed to subscribe to unread notifications:', e);
        }
      } catch (e) {
        console.error('Failed to load staff municipality:', e);
        setStaffMunicipality(null);
      }
    });
    return () => unsub();
  }, []);

  // Fetch staff name
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStaffName('');
        return;
      }
      const staffSnap = await getDoc(doc(db, 'staff', user.uid));
      const data = staffSnap.exists() ? staffSnap.data() : {};
      setStaffName(data?.name || data?.fullName || user.displayName || '');
    });
    return () => unsub();
  }, []);

  // Helper to update live counts for each category
  useEffect(() => {
    // Start background sync to create per-item notifications
    let stopSync;
    const user = auth.currentUser;
    if (user) {
      stopSync = startNotificationsSync(user.uid, staffMunicipality, staffRole);
    }

    // set up listeners for three sources
    const unsubscribers = [];

    // Applicants needing inspection
    try {
      const unsubApplicants = onSnapshot(
        collection(db, 'applicants'),
        (snap) => {
          let count = 0;
          snap.forEach((d) => {
            const data = d.data();
            const status = data.inspectionStatus || data.status || data.inspection || 'pending';
            const muni = data.municipality || data.municipalityName || data.area || '';
            const needsInspection = status === 'pending' || status === 'not started' || status === 'pending inspection' || status === '';
            if (!needsInspection) return;
            if (!staffMunicipality) {
              count += 1;
            } else if (String(muni).toLowerCase().trim() === String(staffMunicipality).toLowerCase().trim()) {
              count += 1;
            }
          });
          setNotifCounts((prev) => ({ ...prev, inspect: count }));
        },
        (err) => console.error('onSnapshot applicants error:', err)
      );
      unsubscribers.push(unsubApplicants);
    } catch (e) {
      console.error('Applicants listener setup failed:', e);
    }

    // Approved beneficiaries (inspections.status == 'approved'), dedup by applicant and filter by municipality
    try {
      const unsubBeneficiaries = onSnapshot(
        query(collection(db, 'inspections'), where('status', '==', 'approved')),
        async (snap) => {
          try {
            const inspections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            const applicantIds = Array.from(new Set(inspections.map((r) => r.applicantId).filter(Boolean)));
            if (applicantIds.length === 0) {
              setNotifCounts((prev) => ({ ...prev, beneficiaries: 0 }));
              return;
            }
            // batch fetch applicants
            const applicantsMap = {};
            for (let i = 0; i < applicantIds.length; i += 10) {
              const batch = applicantIds.slice(i, i + 10);
              const qs = await getDocs(query(collection(db, 'applicants'), where(documentId(), 'in', batch)));
              qs.forEach((docSnap) => {
                applicantsMap[docSnap.id] = docSnap.data();
              });
            }
            // dedup by applicant, apply muni filter
            const seen = new Set();
            let count = 0;
            for (const insp of inspections) {
              const appId = insp.applicantId;
              if (!appId || seen.has(appId)) continue;
              seen.add(appId);
              const app = applicantsMap[appId] || {};
              const muni = app.municipality || '-';
              if (!staffMunicipality || String(muni).toLowerCase().trim() === String(staffMunicipality).toLowerCase().trim()) {
                count += 1;
              }
            }
            setNotifCounts((prev) => ({ ...prev, beneficiaries: count }));
          } catch (err) {
            console.error('Beneficiaries count load failed:', err);
          }
        },
        (err) => console.error('onSnapshot inspections error:', err)
      );
      unsubscribers.push(unsubBeneficiaries);
    } catch (e) {
      console.error('Beneficiaries listener setup failed:', e);
    }

    // Dispersal schedules (status !== 'completed'), join applicants to filter by municipality
    try {
      const unsubDispersal = onSnapshot(
        collection(db, 'dispersalSchedules'),
        async (snap) => {
          try {
            const schedules = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            const filteredSched = schedules.filter((s) => s.status !== 'completed');
            const applicantIds = Array.from(new Set(filteredSched.map((r) => r.applicantId).filter(Boolean)));
            if (applicantIds.length === 0) {
              setNotifCounts((prev) => ({ ...prev, dispersal: 0 }));
              return;
            }
            const applicantsMap = {};
            for (let i = 0; i < applicantIds.length; i += 10) {
              const batch = applicantIds.slice(i, i + 10);
              const qs = await getDocs(query(collection(db, 'applicants'), where(documentId(), 'in', batch)));
              qs.forEach((docSnap) => {
                applicantsMap[docSnap.id] = docSnap.data();
              });
            }
            let count = 0;
            for (const sched of filteredSched) {
              const app = applicantsMap[sched.applicantId] || {};
              const muni = app.municipality || '-';
              if (!staffMunicipality || String(muni).toLowerCase().trim() === String(staffMunicipality).toLowerCase().trim()) {
                count += 1;
              }
            }
            setNotifCounts((prev) => ({ ...prev, dispersal: count }));
          } catch (err) {
            console.error('Dispersal count load failed:', err);
          }
        },
        (err) => console.error('onSnapshot dispersalSchedules error:', err)
      );
      unsubscribers.push(unsubDispersal);
    } catch (e) {
      console.error('Dispersal listener setup failed:', e);
    }

    return () => {
      unsubscribers.forEach((u) => {
        try { u && u(); } catch (_) {}
      });
      try { stopSync && stopSync(); } catch (_) {}
    };
  }, [staffMunicipality, staffRole]);

  // Fetch monthly dispersal trends and other stats
  useEffect(() => {
    // Monthly Dispersal Trends
    const unsub = onSnapshot(
      collection(db, 'dispersalSchedules'),
      async (snap) => {
        const now = new Date();
        const months = Array(12).fill(0);
        let total = 0;
        snap.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.date) return;
          const date = new Date(data.date.seconds ? data.date.seconds * 1000 : data.date);
          if (date.getFullYear() === now.getFullYear()) {
            months[date.getMonth()] += 1;
            total += 1;
          }
        });
        setMonthlyDispersal(months);
        setTotalDispersed(total);
      }
    );
    // Pending Transfers
    const unsubTransfers = onSnapshot(
      query(collection(db, 'transfers'), where('status', '==', 'pending')),
      (snap) => setPendingTransfers(snap.size)
    );
    return () => {
      unsub();
      unsubTransfers();
    };
  }, []);

  // New Dashboard Header
    const renderDashboardHeader = () => (
    <View style={styles.dashboardHeaderContainer}>
      <View>
        <Text style={styles.dashboardHeaderTitle}>Dashboard</Text>
        <Text style={styles.dashboardHeaderSubtitle}>
          Welcome back, {staffName || 'Field Staff'}
        </Text>
      </View>
    </View>
  );

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
        return <Cull navigation={navigation} scannedUID={scannedUID} onBackToTransactions={(screen) => {        if (screen === 'Status') {
          setShowTransactionScreen('Status');
        } else {
          setShowTransactionScreen('Transaction');
        }
      }} />;
    } else if (showTransactionScreen === 'Beneficiary') {
      return <Beneficiary navigation={navigation} onBackToTransactions={() => setShowTransactionScreen('Transaction')} />;
    } else if (showTransactionScreen === 'Status') {
      return <Status navigation={navigation} scannedUID={scannedUID} onBackToTransactions={(screen) => {
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
      return <Redispersal navigation={navigation} scannedUID={scannedUID} onBackToTransactions={(screen) => {
        if (screen === 'Status') {
          setShowTransactionScreen('Status');
        } else {
          setShowTransactionScreen('Transaction');
        }
      }} />;
    } else if (showTransactionScreen === 'Transfer') {
      return <Transfer navigation={navigation} scannedUID={scannedUID} onBackToTransactions={(screen) => {
        if (screen === 'Status') {
          setShowTransactionScreen('Status');
        } else {
          setShowTransactionScreen('Transaction');
        }
      }} />;
    }
    
    // Then check for other special screens
    if (showBeneficiaries) {
      return <ListOfBeneficiaries highlightApplicantId={highlightBeneficiaryApplicantId} />;
    }
    if (showInspect) {
      return <ListToInspect highlightApplicantId={highlightInspectApplicantId} />;
    }
    if (showForDispersal) {
      return <ListForDispersal highlightScheduleId={highlightDispersalScheduleId} />;
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
          {renderDashboardHeader()}
          {/* Summary Cards - 2x2 grid, more formal, smaller icons/text, no "Summary of Details" */}
          <View style={styles.summaryGrid}>
            <View style={styles.summaryGridRow}>
              {/* Beneficiaries in Municipality */}
              <View style={styles.summaryCard}>
                <View style={[styles.summaryIconCircle, { backgroundColor: '#E3F4EC' }]}>
                  <Ionicons name="people-outline" size={22} color="#25A18E" />
                </View>
                <Text style={styles.summaryNumber}>{notifCounts.beneficiaries}</Text>
                <Text style={styles.summaryLabel}>Beneficiaries{'\n'}in Municipality</Text>
              </View>
              {/* Applicants Needing Inspection */}
              <View style={styles.summaryCard}>
                <View style={[styles.summaryIconCircle, { backgroundColor: '#F5F9F8' }]}>
                  <Ionicons name="clipboard-outline" size={22} color="#25A18E" />
                </View>
                <Text style={styles.summaryNumber}>{notifCounts.inspect}</Text>
                <Text style={styles.summaryLabel}>Applicants Needing{'\n'}Inspection</Text>
              </View>
            </View>
            <View style={styles.summaryGridRow}>
              {/* Approved Beneficiaries */}
              <View style={styles.summaryCard}>
                <View style={[styles.summaryIconCircle, { backgroundColor: '#E3F4EC' }]}>
                  <Ionicons name="checkmark-done-outline" size={22} color="#25A18E" />
                </View>
                <Text style={styles.summaryNumber}>{notifCounts.beneficiaries}</Text>
                <Text style={styles.summaryLabel}>Approved{'\n'}Beneficiaries</Text>
              </View>
              {/* Scheduled Dispersals */}
              <View style={styles.summaryCard}>
                <View style={[styles.summaryIconCircle, { backgroundColor: '#F5F9F8' }]}>
                  <Ionicons name="calendar-outline" size={22} color="#25A18E" />
                </View>
                <Text style={styles.summaryNumber}>{notifCounts.dispersal}</Text>
                <Text style={styles.summaryLabel}>Scheduled{'\n'}Dispersals</Text>
              </View>
            </View>
          </View>
          {/* Analytics Cards */}
          <View style={styles.analyticsRow}>
            {/* Pending Transfers */}
            <View style={styles.analyticsCard}>
              <Ionicons name="swap-horizontal" size={16} color="#2563eb" style={{ marginBottom: 2 }} />
              <Text style={styles.analyticsNumber}>{pendingTransfers}</Text>
              <Text style={styles.analyticsLabel}>Pending Transfers</Text>
            </View>
            {/* Total Dispersed */}
            <View style={styles.analyticsCard}>
              <Ionicons name="stats-chart" size={16} color="#e11d48" style={{ marginBottom: 2 }} />
              <Text style={styles.analyticsNumber}>{totalDispersed}</Text>
              <Text style={styles.analyticsLabel}>Total Dispersed (Year)</Text>
            </View>
            {/* Most Active Month */}
            <View style={styles.analyticsCard}>
              <Ionicons name="calendar" size={16} color="#f59e0b" style={{ marginBottom: 2 }} />
              <Text style={styles.analyticsNumber}>
                {(() => {
                  const max = Math.max(...monthlyDispersal);
                  if (max === 0) return '-';
                  const idx = monthlyDispersal.findIndex(v => v === max);
                  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][idx];
                })()}
              </Text>
              <Text style={styles.analyticsLabel}>Most Active Month</Text>
            </View>
          </View>
          {/* Monthly Dispersal Trends Chart */}
          <View style={styles.chartCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={[styles.statIconCircle, { backgroundColor: '#E3F4EC', marginRight: 8 }]}>
                <Ionicons name="trending-up" size={14} color="#25A18E" />
              </View>
              <View>
                <Text style={{ fontWeight: 'bold', fontSize: 13, color: '#222' }}>Monthly Dispersal Trends</Text>
                <Text style={{ color: '#666', fontSize: 10 }}>Track livestock dispersal activities over the past year</Text>
              </View>
            </View>
            <LineChart
              data={{
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{ data: monthlyDispersal }]
              }}
              width={Dimensions.get('window').width - 48}
              height={160}
              yAxisInterval={1}
              chartConfig={{
                backgroundColor: '#fff',
                backgroundGradientFrom: '#fff',
                backgroundGradientTo: '#fff',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(37, 161, 142, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(34, 34, 34, ${opacity})`,
                style: { borderRadius: 12 },
                propsForDots: { r: '3', strokeWidth: '1', stroke: '#25A18E' }
              }}
              bezier
              style={{ borderRadius: 12 }}
            />
          </View>
        </>
      );
    }
  };

  // When navigated to with openSection param, open the corresponding section
  useFocusEffect(
    React.useCallback(() => {
      const section = route?.params?.openSection;
      if (!section) return;
      setShowBeneficiaries(false);
      setShowInspect(false);
      setShowForDispersal(false);
      setShowTransactionScreen(null);
      setHighlightInspectApplicantId(null);
      setHighlightBeneficiaryApplicantId(null);
      setHighlightDispersalScheduleId(null);
      if (section === 'beneficiaries') setShowBeneficiaries(true);
      else if (section === 'inspect') setShowInspect(true);
      else if (section === 'for_dispersal') setShowForDispersal(true);
      // Clear param so it doesn't retrigger
      navigation.setParams({ openSection: undefined });
    }, [route?.params?.openSection])
  );

  const handleNotifChoice = (choice) => {
    setNotifModalVisible(false);
    setShowNotifications(false);
    setShowBeneficiaries(false);
    setShowInspect(false);
    setShowForDispersal(false);
    setShowTransactionScreen(null);
    // Manual navigation: ensure no highlight is shown
    setHighlightInspectApplicantId(null);
    setHighlightBeneficiaryApplicantId(null);
    setHighlightDispersalScheduleId(null);
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
              <TouchableOpacity onPress={() => setShowNotifications(true)} style={{ padding: 4 }}>
                <View>
                  <Ionicons name="notifications-outline" size={24} color="#4ca1af" />
                  {unreadCount > 0 ? (
                    <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: '#E53935', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
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
                {showNotifications ? (
                  <Notifications
                    counts={notifCounts}
                    lastSeenCounts={lastSeenCounts}
                    onMarkAllRead={() => {
                      // Immediately set unread count to 0 for instant UI feedback
                      setUnreadCount(0);
                    }}
                onGoTo={(target, params) => {
                      setShowNotifications(false);
                      setShowBeneficiaries(false);
                      setShowInspect(false);
                      setShowForDispersal(false);
                      setShowTransactionScreen(null);
                  setHighlightInspectApplicantId(null);
                  setHighlightBeneficiaryApplicantId(null);
                  setHighlightDispersalScheduleId(null);
                      if (target === 'beneficiaries') {
                        setShowBeneficiaries(true);
                    if (params?.refId) setHighlightBeneficiaryApplicantId(params.refId);
                      } else if (target === 'inspect') {
                        setShowInspect(true);
                    if (params?.refId) setHighlightInspectApplicantId(params.refId);
                      } else if (target === 'for_dispersal') {
                        setShowForDispersal(true);
                    if (params?.refId) setHighlightDispersalScheduleId(params.refId);
                      }
                    }}
                    onClose={() => setShowNotifications(false)}
                  />
                ) : (
                  renderMainContent()
                )}
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
                setShowNotifications(false);
                setShowBeneficiaries(false);
                setShowInspect(false);
                setShowForDispersal(false);
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
                  setShowNotifications(false);
                  setShowBeneficiaries(false);
                  setShowInspect(false);
                  setShowForDispersal(false);
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
                setShowNotifications(false);
                setShowBeneficiaries(false);
                setShowInspect(false);
                setShowForDispersal(false);
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
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
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
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  summarySection: {
    backgroundColor: '#e6f4f1',
    paddingTop: 8,
    paddingBottom: 8,
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#25A18E',
    marginHorizontal: 16,
    marginBottom: 4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#CFE9E2',
    marginHorizontal: 16,
    marginBottom: 12,
  },

  summaryGrid: {
    paddingHorizontal: 16, // Fixed padding from screen edges
    marginTop: 8,
    marginBottom: 8,
  },

  summaryGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between', // Equal spacing between cards
    marginBottom: 8,
  },

  summaryCard: {
    width: '48%', // Fixed width for uniform sizing (48% allows for gap)
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    minHeight: 80,
  },
  summaryIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#25A18E',
    marginBottom: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#4ca1af',
    textAlign: 'center',
    lineHeight: 15,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 14,
    marginTop: 10,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
    paddingVertical: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    minWidth: 90,
  },
  analyticsNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25A18E',
    marginBottom: 1,
  },
  analyticsLabel: {
    fontSize: 10,
    color: '#4ca1af',
    textAlign: 'center',
  },
    dashboardHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f4f1',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 7,
    marginBottom: 2,
  },

  dashboardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#4ca1af',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#4ca1af',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  dashboardHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 0,
  },
  dashboardHeaderSubtitle: {
    fontSize: 12,
    color: '#4ca1af',
    marginTop: 0,
  },
});