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
import { Ionicons } from '@expo/vector-icons';

// 🔥 Firebase (your required path)
import { auth, db } from './src/config/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const eligibilityCriteria = [
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
    remarks: '',
  });

  const [eligibility, setEligibility] = useState(
    Array(eligibilityCriteria.length).fill(false)
  );
  const [site, setSite] = useState(Array(siteSuitability.length).fill(false));

  // Simple debug area text
  const [debug, setDebug] = useState('[DEBUG] Waiting to fetch…');

  // Color constants - matching Cull.js exactly
  const colors = {
    primary: '#25A18E',
    secondary: '#38b2ac',
    accent: '#4fd1c5',
    background: '#e6f4f1',
    white: '#FFFFFF',
    text: '#25A18E',
    textLight: '#666',
    border: '#E3F4EC',
    disabled: '#BDC3C7',
  };

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
      setForm({ remarks: '' });
      setEligibility(Array(eligibilityCriteria.length).fill(false));
      setSite(Array(siteSuitability.length).fill(false));
    } catch (e) {
      console.error('Submit inspection failed:', e);
      setUploading(false);
      Alert.alert('Error', e?.message || 'Failed to submit inspection.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => {
            if (navigation && typeof navigation.goBack === 'function') {
              navigation.goBack();
            } else if (navigation && typeof navigation.navigate === 'function') {
              navigation.navigate('Main');
            }
          }} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Record Inspection</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { backgroundColor: colors.white }]}>
          
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.primary }]}>RECORD INSPECTION</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textLight }]}>
              Record the details of the inspection process
            </Text>
          </View>

          {/* Eligibility Criteria Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Eligibility Criteria</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Check the criteria that apply
            </Text>
            
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
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Site Suitability Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Site Suitability</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Assess the suitability of the site
            </Text>
            
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
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Image Picker Section removed from Inspection form */}

          {/* Remarks Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Remarks</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Additional notes or observations
            </Text>
            <TextInput
              style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter remarks here..."
              placeholderTextColor={colors.textLight}
              value={form.remarks}
              onChangeText={(text) => handleChange('remarks', text)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              { backgroundColor: colors.accent },
              uploading && { opacity: 0.7 }
            ]}
            onPress={handleSubmit}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Text style={[styles.submitText, { color: colors.white }]}>
              {uploading ? 'SUBMITTING...' : 'SUBMIT FOR VERIFICATION'}
            </Text>
          </TouchableOpacity>

          {/* Debug panel */}
          <View style={{ marginTop: 16, padding: 10, backgroundColor: '#F2FBF7', borderRadius: 8 }}>
            <Text style={{ fontSize: 12, color: '#2e6b5f' }}>{debug}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e6f4f1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3F4EC',
    elevation: 2,
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#25A18E',
  },
  backButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    flexGrow: 1,
  },
  pageHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#25A18E',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#25A18E',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    fontWeight: '500',
  },
  checkboxRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  checkbox: {
    width: 24, 
    height: 24, 
    borderWidth: 2, 
    borderColor: '#25A18E', 
    borderRadius: 6, 
    marginRight: 12,
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  checkboxChecked: { 
    borderColor: '#25A18E', 
    backgroundColor: '#C8E6C9' 
  },
  checkboxInner: { 
    width: 14, 
    height: 14, 
    backgroundColor: '#25A18E', 
    borderRadius: 3 
  },
  checkboxLabel: { 
    fontSize: 15, 
    color: '#25A18E', 
    flex: 1 
  },
  photoBtn: {
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    marginHorizontal: 8,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4,
  },
  photoBtnText: { 
    color: '#fff', 
    fontWeight: 'bold' 
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E3F4EC',
    color: '#25A18E',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
