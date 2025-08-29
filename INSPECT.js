import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// 🔥 Firebase (your required path)
import { auth, db } from './src/config/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Logos
const leftLogo = require('./assets/images/logoleft.png');
const rightLogo = require('./assets/images/logoright.png');

const eligibilityCriteria = [
  'Beneficiary is not a senior citizen (below 60)',
  'Farmer',
  'Physically capable to care for livestock',
  'No full-time job or duty conflict',
  'Owns or has access to land for livestock',
  'Has water supply accessible',
  'Willing to attend training',
];

const siteSuitability = [
  'Area is not flood-prone',
  'Adequate space for livestock',
  'Can build or has livestock shelter',
  'Proper fencing for safety',
];

export default function INSPECT({ navigation, route }) {
  const [image, setImage] = useState(null); // local file:// preview
  const [uploading, setUploading] = useState(false);

  // Preferred: pass this when navigating to INSPECT
  const applicantIdFromRoute = route?.params?.applicantId || null;

  const [form, setForm] = useState({
    fullName: '',
    age: '',        // 👈 will be auto-filled from Firestore
    gender: '',
    contact: '',
    remarks: '',
  });

  const [eligibility, setEligibility] = useState(
    Array(eligibilityCriteria.length).fill(false)
  );
  const [site, setSite] = useState(Array(siteSuitability.length).fill(false));

  // Simple debug area text
  const [debug, setDebug] = useState('[DEBUG] Waiting to fetch…');

  // ——————————————————————————————————————————
  // Fetch applicant age using document ID in "applicants"
  // ——————————————————————————————————————————
  useEffect(() => {
    const fetchApplicantAge = async () => {
      try {
        if (!applicantIdFromRoute) {
          const msg = '[INSPECT] No applicantId in route params.';
          console.log(msg);
          setDebug(msg);
          return;
        }

        const ref = doc(db, 'applicants', applicantIdFromRoute);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const msg = `[INSPECT] No applicant doc found for ID: ${applicantIdFromRoute}`;
          console.log(msg);
          setDebug(msg);
          return;
        }

        const data = snap.data();
        console.log('[INSPECT] Applicant doc data:', data);
        setDebug(
          `[INSPECT] Loaded applicant ${applicantIdFromRoute}. ` +
          `Has age: ${typeof data.age === 'number' ? 'yes' : 'no'}, ` +
          `Has birthday: ${data.birthday ? 'yes' : 'no'}`
        );

        // If you also want to prefill name when available:
        if (data.fullName && !form.fullName) {
          setForm((prev) => ({ ...prev, fullName: data.fullName }));
        }

        // 1) Use stored age if present
        if (typeof data.age === 'number') {
          setForm((prev) => ({ ...prev, age: String(data.age) }));
          return;
        }

        // 2) Else compute from birthday Timestamp (Firestore)
        if (data.birthday?.toDate) {
          const birthDate = data.birthday.toDate();
          const now = new Date();
          let computedAge = now.getFullYear() - birthDate.getFullYear();
          const m = now.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
            computedAge--;
          }
          setForm((prev) => ({ ...prev, age: String(computedAge) }));
          setDebug((d) => d + ` | Computed age: ${computedAge}`);
        } else {
          setDebug((d) => d + ' | No birthday/age in doc.');
        }
      } catch (e) {
        console.error('[INSPECT] fetchApplicantAge error:', e);
        setDebug(`[INSPECT] Error fetching applicant: ${e?.message || e}`);
      }
    };

    fetchApplicantAge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicantIdFromRoute]);

  // ——————————————————————————————————————————
  // Image helpers
  // ——————————————————————————————————————————
  const ensureLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need access to your photo library to pick an image.');
      return false;
    }
    return true;
  };

  const ensureCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'We need camera permission to take a photo.');
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const ok = await ensureLibraryPermission();
    if (!ok) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const ok = await ensureCameraPermission();
    if (!ok) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  // ——————————————————————————————————————————
  // Submit inspection: upload image → save doc
  // ——————————————————————————————————————————
  const toIndexObject = (arr) => {
    const o = {};
    arr.forEach((v, i) => {
      o[i] = !!v;
    });
    return o;
  };

  const uploadLocalImage = async (localUri, inspectionId) => {
    if (!localUri || !localUri.startsWith('file://')) return null;
    const storage = getStorage();
    const filename = `documentation_${Date.now()}.jpg`;
    const path = `inspections/${inspectionId}/${filename}`;
    const sref = storageRef(storage, path);

    const resp = await fetch(localUri);
    const blob = await resp.blob();

    await uploadBytes(sref, blob, { contentType: blob.type || 'image/jpeg' });
    const url = await getDownloadURL(sref);
    return url;
  };

  const handleCheckbox = (type, idx) => {
    if (type === 'eligibility') {
      const updated = [...eligibility];
      updated[idx] = !updated[idx];
      setEligibility(updated);
    } else {
      const updated = [...site];
      updated[idx] = !updated[idx];
      setSite(updated);
    }
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async () => {
    try {
      const inspectorId = auth?.currentUser?.uid || null;
      const applicantId = applicantIdFromRoute || null;

      if (!inspectorId) {
        Alert.alert('Not signed in', 'Please sign in first.');
        return;
      }
      if (!applicantId) {
        Alert.alert('Missing applicant', 'No applicant selected. Pass applicantId in route params.');
        return;
      }

      setUploading(true);

      const inspectionId = `${applicantId}_${Date.now()}`;
      let documentationURL = null;
      if (image && image.startsWith('file://')) {
        documentationURL = await uploadLocalImage(image, inspectionId);
      }

      const payload = {
        applicantId,
        inspectorId,
        inspectionDate: new Date(), // use this for server-side ordering or switch to serverTimestamp()
        status: 'pending', // or your mobile flow status
        eligibilityCriteria: toIndexObject(eligibility),
        siteSuitability: toIndexObject(site),
        documentationURL: documentationURL || null,
        remarks: form.remarks || '',
        createdAt: serverTimestamp(),
      };

      const ref = doc(db, 'inspections', inspectionId);
      await setDoc(ref, payload, { merge: true });

      setUploading(false);
      Alert.alert('Success', 'Inspection submitted.');
      setImage(null);
      setForm({ fullName: '', age: form.age, gender: '', contact: '', remarks: '' }); // keep age if you want
      setEligibility(Array(eligibilityCriteria.length).fill(false));
      setSite(Array(siteSuitability.length).fill(false));
    } catch (e) {
      console.error('Submit inspection failed:', e);
      setUploading(false);
      Alert.alert('Error', e?.message || 'Failed to submit inspection.');
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.mainContainer}>
        {/* Header */}
        <SafeAreaView edges={['top']} style={styles.headerContainer}>
          <View style={styles.header}>
            <View style={styles.headerLogos}>
              <Image source={leftLogo} style={styles.logoImage} resizeMode="contain" />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Online Livestock Dispersal Monitoring System</Text>
                <Text style={styles.headerSubtitle}>Camarines Norte Provincial Veterinarian's Office</Text>
              </View>
              <Image source={rightLogo} style={styles.logoImage} resizeMode="contain" />
            </View>
          </View>

          {/* Search / icons */}
          <View style={styles.searchRow}>
            <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor="#b0b0b0" />
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={24} color="#4ca1af" />
            </TouchableOpacity>
            <TouchableOpacity>
              <MaterialIcons name="menu" size={24} color="#4ca1af" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Content */}
        <View style={styles.middleContent}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.card}>
              {/* Top Icon */}
              <View style={styles.topIconContainer}>
                <View style={styles.topIcon}>
                  <Ionicons name="clipboard-check" size={40} color="#25A18E" />
                </View>
                <Text style={styles.instructionText}>Complete the inspection details below</Text>
              </View>

              <Text style={styles.sectionTitle}>Personal Information</Text>

              {/* Full name (optional prefill) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Name"
                  value={form.fullName}
                  onChangeText={(text) => handleChange('fullName', text)}
                />
              </View>

              {/* Age (auto-filled from Firestore) */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Age (auto)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: '#EEF5F3' }]}
                  placeholder="Auto-loaded from applicant"
                  value={form.age}
                  editable={false} // make read-only
                />
                {/* tiny debug line below the field */}
                <Text style={{ marginTop: 6, fontSize: 12, color: '#7a7a7a' }}>
                  {applicantIdFromRoute
                    ? `Applicant ID: ${applicantIdFromRoute}`
                    : 'No applicantId passed via route.'}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Gender</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Gender"
                  value={form.gender}
                  onChangeText={(text) => handleChange('gender', text)}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter Contact Number"
                  keyboardType="phone-pad"
                  value={form.contact}
                  onChangeText={(text) => handleChange('contact', text)}
                />
              </View>

              <Text style={styles.sectionTitle}>Eligibility Criteria</Text>
              {eligibilityCriteria.map((label, idx) => (
                <TouchableOpacity
                  key={label}
                  style={styles.checkboxRow}
                  onPress={() => handleCheckbox('eligibility', idx)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, eligibility[idx] && styles.checkboxChecked]}>
                    {eligibility[idx] && <View style={styles.checkboxInner} />}
                  </View>
                  <Text style={styles.checkboxLabel}>{label}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.sectionTitle}>Site Suitability</Text>
              {siteSuitability.map((label, idx) => (
                <TouchableOpacity
                  key={label}
                  style={styles.checkboxRow}
                  onPress={() => handleCheckbox('site', idx)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, site[idx] && styles.checkboxChecked]}>
                    {site[idx] && <View style={styles.checkboxInner} />}
                  </View>
                  <Text style={styles.checkboxLabel}>{label}</Text>
                </TouchableOpacity>
              ))}

              {/* Image Picker Section */}
              <Text style={styles.sectionTitle}>Inspection Documentation</Text>
              {image && (
                <Image
                  source={{ uri: image }}
                  style={{ width: 250, height: 250, marginBottom: 16, borderRadius: 10, alignSelf: 'center' }}
                />
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={takePhoto} style={styles.photoBtn}>
                  <Text style={styles.photoBtnText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={pickImage} style={styles.photoBtn}>
                  <Text style={styles.photoBtnText}>Upload Image</Text>
                </TouchableOpacity>
              </View>

              {/* Remarks */}
              <Text style={styles.sectionTitle}>Additional Remarks</Text>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Summary or Recommendation</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="Write your summary or recommendation..."
                  multiline
                  value={form.remarks}
                  onChangeText={(text) => handleChange('remarks', text)}
                />
              </View>

              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={uploading}>
                <Text style={styles.submitBtnText}>{uploading ? 'Submitting…' : 'Submit Inspection'}</Text>
              </TouchableOpacity>

              {/* Debug panel */}
              <View style={{ marginTop: 16, padding: 10, backgroundColor: '#F2FBF7', borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: '#2e6b5f' }}>{debug}</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Bottom Navigation */}
        <SafeAreaView edges={['bottom']} style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Main')}>
              <FontAwesome name="dashboard" size={22} color="#fff" />
              <Text style={styles.navText}>Dashboard</Text>
            </TouchableOpacity>
            <View style={styles.centerButtonWrapper}>
              <TouchableOpacity style={styles.centerButton} onPress={() => navigation.navigate('Main')}>
                <Ionicons name="scan" size={28} color="#4ca1af" />
              </TouchableOpacity>
              <Text style={styles.centerButtonText}>Scan</Text>
            </View>
            <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Main')}>
              <Ionicons name="person-outline" size={22} color="#fff" />
              <Text style={styles.navText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#e6f4f1' },
  headerContainer: { backgroundColor: '#25A18E', zIndex: 1000 },
  header: {
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
  logoImage: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff' },
  headerTextContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { textAlign: 'center', fontWeight: '600', fontSize: 13, color: '#fff', marginBottom: 2, flexWrap: 'wrap' },
  headerSubtitle: { fontSize: 11, color: '#fff', textAlign: 'center', opacity: 0.9, flexWrap: 'wrap' },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    width: '100%', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    flex: 1, marginHorizontal: 8, backgroundColor: '#F5F9F8', borderRadius: 8, paddingHorizontal: 12, fontSize: 14, height: 36,
  },
  middleContent: { flex: 1, backgroundColor: '#e6f4f1' },
  scrollView: { flex: 1 },
  scrollContent: { paddingVertical: 24, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24, marginHorizontal: 18, width: '92%', alignSelf: 'center',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, marginBottom: 32,
  },
  sectionTitle: { fontWeight: 'bold', fontSize: 18, color: '#25A18E', marginBottom: 16, marginTop: 24 },
  input: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#E9ECEF', color: '#333' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  checkbox: {
    width: 24, height: 24, borderWidth: 2, borderColor: '#25A18E', borderRadius: 6, marginRight: 12,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { borderColor: '#25A18E', backgroundColor: '#C8E6C9' },
  checkboxInner: { width: 14, height: 14, backgroundColor: '#25A18E', borderRadius: 3 },
  checkboxLabel: { fontSize: 15, color: '#333', flex: 1 },
  photoBtn: {
    backgroundColor: '#25A18E', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginHorizontal: 8,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  photoBtnText: { color: '#fff', fontWeight: 'bold' },
  submitBtn: {
    backgroundColor: '#25A18E', padding: 18, borderRadius: 12, marginTop: 24, alignItems: 'center',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  navItem: { alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  navText: { color: '#fff', fontSize: 11, marginTop: 4, opacity: 0.8 },
  centerButtonWrapper: { alignItems: 'center', marginTop: -28, flex: 1 },
  centerButton: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
  },
  centerButtonText: { color: '#fff', fontSize: 11, marginTop: 4 },
  bottomNavContainer: { backgroundColor: '#25A18E', paddingBottom: Platform.OS === 'ios' ? 24 : 8, paddingTop: 8, zIndex: 1000 },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 56 },
  topIconContainer: { alignItems: 'center', marginBottom: 20 },
  topIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#C8E6C9', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  instructionText: { fontSize: 14, color: '#666', textAlign: 'center' },
  inputGroup: { marginBottom: 15 },
  inputLabel: { fontSize: 14, color: '#35796B', marginBottom: 5 },
});
