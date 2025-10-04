import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Modal, Alert, SafeAreaView, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DropdownListComponent from './src/components/DropdownListComponent';

// 🔥 Firebase (your path)
import { auth, db } from './src/config/firebase';
import {
  collection, getDocs, query, where, limit, orderBy,
  doc, setDoc, addDoc, Timestamp, serverTimestamp, onSnapshot, getDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// ⬇️ changed: include uploadBytesResumable
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';

// helper: calculate age from Firestore Timestamp
const calculateAge = (birthdayTs) => {
  if (!birthdayTs) return null;
  try {
    const birthDate = birthdayTs.toDate ? birthdayTs.toDate() : new Date(birthdayTs);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  } catch {
    return null;
  }
};
// Normalize a JS Date to LOCAL date-only (set 12:00 to avoid DST/TZ edge cases)
const normalizeDateOnly = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12, 0, 0, 0);
};

// YYYY-MM-DD for easy display/search
const toISODate = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Expo-safe uploader (XHR → Blob, single attempt, no reuse)
 *  - Handles content:// by copying to cache first
 *  - Uses uploadBytesResumable
 *  - Writes to images/{filename} to match your current rules
 *  - Always returns a defined `size` (null if unknown)
 */
const uploadImageToStorage = async (imageUri, livestockId) => {
  try {
    if (!imageUri) return null;

    const uri = String(imageUri);
    const nameFromUri = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
    let ext = (nameFromUri.split('.').pop() || '').toLowerCase();
    if (!['jpg','jpeg','png','webp','heic','gif'].includes(ext)) ext = 'jpg';

    const contentType =
      ext === 'png'  ? 'image/png'  :
      ext === 'webp' ? 'image/webp' :
      ext === 'heic' ? 'image/heic' :
      ext === 'gif'  ? 'image/gif'  :
      /* default */    'image/jpeg';

    // Some Android URIs are content:// -> copy to cache as file:// first
    let localUri = uri;
    if (uri.startsWith('content://')) {
      const dest = `${FileSystem.cacheDirectory}upload_${Date.now()}.${ext}`;
      await FileSystem.copyAsync({ from: uri, to: dest });
      localUri = dest;
    }

    // Turn file URI into a Blob using XHR (reliable on RN/Expo)
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError('Failed to read file into Blob'));
      xhr.responseType = 'blob';
      xhr.open('GET', localUri, true);
      xhr.send(null);
    });

    const storage = getStorage(); // default bucket works with your current rules
    const safeId = (livestockId || `livestock_${Date.now()}`)
      .toString()
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeId}_${Date.now()}.${ext}`;
    const storageRef = ref(storage, `images/${filename}`);

    const metadata = { contentType, cacheControl: 'public, max-age=31536000' };

    // Upload once; do NOT read from/close the blob afterward
    const task = uploadBytesResumable(storageRef, blob, metadata);
    await new Promise((resolve, reject) => {
      task.on('state_changed', null, reject, resolve);
    });

    const downloadURL = await getDownloadURL(storageRef);

    // Important: don't touch blob here (no blob.size reads, no blob.close())
    return {
      url: downloadURL,
      path: storageRef.fullPath,
      name: filename,
      size: null,                // <- never undefined
      contentType,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('upload error:', error);
    return null; // let your submit flow continue without blocking
  }
};



export default function Dispersal({ navigation, onBackToTransactions, scannedUID }) {
  // ————————————————————————————————————————
  // Form state
  // ————————————————————————————————————————
  const [currentBeneficiary, setCurrentBeneficiary] = useState('');
  const [image, setImage] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null); // {id, fullName, municipality, barangay, address?, gender?, birthday?, contact?, livestock?}
  const [applicantResults, setApplicantResults] = useState([]);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);
  const [staffMunicipality, setStaffMunicipality] = useState(null);

  const [livestockType, setLivestockType] = useState(''); // prefilled if applicant has one, editable
  const [livestockColor, setLivestockColor] = useState('');
  const [livestockAge, setLivestockAge] = useState(''); // number (string UI)
  const [livestockBreed, setLivestockBreed] = useState('');
  const [livestockMarkings, setLivestockMarkings] = useState('');

  // Start as null → user must pick a date (not defaulting to today)
  const [dateDisperse, setDateDisperse] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);

  // Add sex options for dropdown
  const sexOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
  ];

  // Add sex state
  const [livestockSex, setLivestockSex] = useState('');

  // ————————————————————————————————————————
  // Get staff municipality on auth state change
  // ————————————————————————————————————————
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setStaffMunicipality(null);
          return;
        }
        // read staff profile to get municipality
        const staffRef = collection(db, 'staff');
        const q = query(staffRef, where('uid', '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs[0]?.data() || {};
        const muni = data.municipality || data.Municipality || data?.location?.municipality || null;
        setStaffMunicipality(typeof muni === 'string' ? muni : null);
      } catch (e) {
        console.error('Load staff municipality failed:', e);
        setStaffMunicipality(null);
      }
    });
    return () => unsub();
  }, []);

  // ————————————————————————————————————————
  // Load all scheduled applicants for staff municipality
  // ————————————————————————————————————————
  useEffect(() => {
    if (!staffMunicipality) return;

    const loadScheduledApplicants = async () => {
      setIsLoadingApplicants(true);
      try {
        // Get staff's additional municipalities (if any)
        let municipalities = [staffMunicipality];
        try {
          const staffRef = collection(db, 'staff');
          const q = query(staffRef, where('municipality', '==', staffMunicipality));
          const snap = await getDocs(q);
          const staffDoc = snap.docs[0]?.data();
          if (staffDoc?.additionalMunicipalities && Array.isArray(staffDoc.additionalMunicipalities)) {
            municipalities = Array.from(new Set([
              staffMunicipality,
              ...staffDoc.additionalMunicipalities.filter(m => typeof m === 'string' && m.trim())
            ]));
          }
        } catch (e) {
          // fallback: just use staffMunicipality
        }

        // Query all schedules for all municipalities
        let schedules = [];
        for (const muni of municipalities) {
          const schedulesQuery = query(
            collection(db, 'dispersalSchedules'),
            where('municipality', '==', muni)
          );
          const schedulesSnap = await getDocs(schedulesQuery);
          schedules = schedules.concat(
            schedulesSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
          );
        }

        // Sort by scheduledFor timestamp
        schedules.sort((a, b) => {
          const aTime = a.scheduledFor?.toDate ? a.scheduledFor.toDate() : new Date(a.scheduledFor || 0);
          const bTime = b.scheduledFor?.toDate ? b.scheduledFor.toDate() : new Date(b.scheduledFor || 0);
          return aTime - bTime;
        });

        // Filter out completed schedules
        const pendingSchedules = schedules.filter(schedule => schedule.status !== 'completed');
        console.log('All schedules:', schedules.length);
        console.log('Pending schedules for dropdown:', pendingSchedules.length);

        const dropdownOptions = pendingSchedules.map(schedule => {
          const mockApplicant = {
            id: schedule.id,
            applicantId: schedule.applicantId, // Add applicantId for fetching from applicants collection
            fullName: schedule.applicantName || 'Unknown',
            municipality: schedule.municipality || '',
            barangay: schedule.barangay || '',
            address: schedule.address || '',
            gender: schedule.gender || null,
            birthday: schedule.birthday || null,
            contact: schedule.contact || '',
            livestock: schedule.livestock || ''
          };
          
          return {
            value: mockApplicant.id,
            label: mockApplicant.fullName,
            subtitle: `${mockApplicant.barangay || '-'}, ${mockApplicant.municipality || '-'}${mockApplicant.livestock ? ` • ${mockApplicant.livestock}` : ''}`,
            data: mockApplicant
          };
        });

        setApplicantResults(dropdownOptions);

        // If we have a scanned UID, auto-select the first applicant
        if (scannedUID && dropdownOptions.length > 0) {
          const firstOption = dropdownOptions[0];
          selectApplicant(firstOption);
        }

      } catch (error) {
        console.error('Error loading scheduled applicants:', error);
        setApplicantResults([]);
      } finally {
        setIsLoadingApplicants(false);
      }
    };

    loadScheduledApplicants();
  }, [staffMunicipality, scannedUID]);

  // ————————————————————————————————————————
  // Image helpers (documentation)
  // ————————————————————————————————————————
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      // new API to quiet deprecation warning; identical behavior
      mediaTypes: [ImagePicker.MediaType.IMAGE],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const selectApplicant = (option) => {
    const app = option.data || option; // Handle both dropdown format and direct data
    setSelectedApplicant(app);
    setCurrentBeneficiary(app.fullName || '');
    setLivestockType(app.livestock || ''); // keep editable if blank
  };

  // ————————————————————————————————————————
  // Submit: save to "livestock" collection + "beneficiaries"
  // ————————————————————————————————————————
 // Utility: strip all `undefined` values (Firestore-safe)


// Utility: strip all `undefined` values (Firestore-safe)
const removeUndefinedDeep = (val) => {
  if (val === undefined) return undefined;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) return val.map(removeUndefinedDeep);
  const out = {};
  for (const k of Object.keys(val)) {
    const v = removeUndefinedDeep(val[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
};

const handleSubmit = async () => {
  try {
    const uid = auth?.currentUser?.uid || null;
    const email = auth?.currentUser?.email || null;

    if (!uid) return Alert.alert('Not signed in', 'Please sign in first.');
    if (!selectedApplicant) return Alert.alert('Missing applicant', 'Please search and select an applicant.');
    if (!livestockType?.trim()) return Alert.alert('Missing livestock type', 'Please provide a livestock type.');
    if (!selectedApplicant?.municipality) return Alert.alert('Location required', 'Applicant municipality not found.');
    if (!dateDisperse) return Alert.alert('Date required', 'Please pick the dispersal date.');

    // ---------- Build consistent “date only” pair ----------
    const pickedDate = normalizeDateOnly(dateDisperse);
    const dateDisperseTs = Timestamp.fromDate(pickedDate);  // true Firestore Timestamp
    const dateDisperseISO = toISODate(pickedDate);          // human-readable yyyy-mm-dd

    // Fetch applicant details (optional)
    let applicantDetails = null;
    if (selectedApplicant.applicantId) {
      try {
        const applicantDocRef = doc(db, 'applicants', selectedApplicant.applicantId);
        const applicantDoc = await getDoc(applicantDocRef);
        if (applicantDoc.exists()) applicantDetails = applicantDoc.data();
      } catch (error) {
        console.error('Error fetching applicant details:', error);
      }
    }

    // Fetch staff/inspector
    let inspectorDetails = null;
    try {
      const staffRef = collection(db, 'staff');
      const staffQuery = query(staffRef, where('uid', '==', uid));
      const staffSnap = await getDocs(staffQuery);
      if (!staffSnap.empty) inspectorDetails = staffSnap.docs[0].data();
    } catch (error) {
      console.error('Error fetching inspector details:', error);
    }

    // 1) Upload image (optional)
    let imageData = null;
    if (image) {
      const tempLivestockId = `${selectedApplicant.id}_${Date.now()}`;
      imageData = await uploadImageToStorage(image, tempLivestockId);
    }

    // 2) Save to "livestock" (rich data lives here)
    const livestockId = `${selectedApplicant.id}_${Date.now()}`;
    const livestockPayload = {
      livestockId,
      applicantName: selectedApplicant.fullName || currentBeneficiary || '',
      municipality: selectedApplicant.municipality,
      barangay: applicantDetails?.barangay || selectedApplicant.barangay || null,
      livestockSource: selectedApplicant?.livestockSource || null,
      inspectorName: inspectorDetails?.fullName || inspectorDetails?.name || 'Unknown Inspector',

      livestockType: livestockType.trim(),
      details: {
        color: livestockColor.trim() || null,
        age: livestockAge ? Number(livestockAge) : null,
        breed: livestockBreed.trim() || null,
        sex: livestockSex || null,
        markings: livestockMarkings.trim() || null,
      },

      dateDisperse: dateDisperseTs, // normalized Timestamp
      dateDisperseISO,              // human string
      createdBy: uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'livestock', livestockId), removeUndefinedDeep(livestockPayload));

    // 3) Build address (single field)
    const parts = [];
    if (applicantDetails?.street) parts.push(applicantDetails.street);
    if (applicantDetails?.purok) parts.push(applicantDetails.purok);
    if (applicantDetails?.barangay) parts.push(applicantDetails.barangay);
    if (applicantDetails?.municipality) parts.push(applicantDetails.municipality);
    if (parts.length === 0) {
      if (selectedApplicant?.address) parts.push(selectedApplicant.address);
      if (selectedApplicant?.barangay) parts.push(selectedApplicant.barangay);
      if (selectedApplicant?.municipality) parts.push(selectedApplicant.municipality);
    }
    const fullAddress = parts.length > 0 ? parts.join(', ') : selectedApplicant.municipality || '';

    // 4) Save to "beneficiaries" — CLEAN (no redundant fields)
    const beneficiaryPayload = {
      // identity
      name: selectedApplicant.fullName || currentBeneficiary || '',
      applicantId: selectedApplicant.applicantId || null,

      // location
      address: fullAddress,
      municipality: selectedApplicant.municipality,

      // contact + demographics
      sex: applicantDetails?.gender || selectedApplicant.gender || null,
      age:
        applicantDetails?.age ??
        calculateAge(applicantDetails?.birthday) ??
        calculateAge(selectedApplicant.birthday) ??
        null,
      contactNumber: applicantDetails?.contact || selectedApplicant.contact || '',

      // dispersal linkage + dates
      livestockId,
      dateDisperse: dateDisperseTs, // normalized Timestamp
      dateDisperseISO,              // human string for easy display

      // tagging / ownership
      card_uid: scannedUID || null,
      fieldInputBy: { uid, email: email || null },
      inspectorName: inspectorDetails?.fullName || inspectorDetails?.name || 'Unknown Inspector',

      // status + verification
      status: 'dispersed',
      verificationStatus: 'pending',

      // times
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),

      // media
      imageUrl: imageData?.url || null,
    };

    await addDoc(collection(db, 'beneficiaries'), removeUndefinedDeep(beneficiaryPayload));

    // 5) Mark schedule completed (best-effort)
    try {
      const updateData = {
        status: 'completed',
        completedAt: Timestamp.now(),
        completedBy: uid,
      };
      await setDoc(doc(db, 'dispersalSchedules', selectedApplicant.id), updateData, { merge: true });
    } catch (error) {
      console.error('Error updating dispersal schedule status:', error);
    }

    Alert.alert('Submitted for Verification');

    // Clear some fields
    setLivestockType('');
    setLivestockColor('');
    setLivestockAge('');
    setLivestockBreed('');
    setLivestockMarkings('');
    setDateDisperse(null);
  } catch (e) {
    console.error('Create records failed:', e);
    Alert.alert('Error', e?.message || 'Failed to create records.');
  }
};



  // ————————————————————————————————————————
  // UI
  // ————————————————————————————————————————
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

  // Breed options mapping (no duplicates)
const breedOptionsByLivestock = {
  'Cattle': [
    { value: 'Dairy', label: 'Dairy' },
    { value: 'Upgraded', label: 'Upgraded' },
  ],
  'Carabao': [
    { value: 'Upgraded', label: 'Upgraded' },
    { value: 'Murrah', label: 'Murrah' },
  ],
  'Swine': [
    { value: 'Landrace', label: 'Landrace' },
    { value: 'Large White', label: 'Large White' },
    { value: 'Duroc', label: 'Duroc' },
  ],
};

  // Dynamically reset breed when livestock type changes
useEffect(() => {
  setLivestockBreed('');
}, [livestockType]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      {/* <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBackToTransactions} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Dispersal of Livestock</Text>
        <View style={{ width: 24 }} />
      </View> */}

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { backgroundColor: colors.white }]}>

          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.primary }]}>DISPERSAL OF LIVESTOCK</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textLight }]}>
              Record the details of livestock dispersal
            </Text>
          </View>

          {/* Scanned UID Display */}
          {scannedUID && (
            <View style={[styles.uidDisplayContainer, { backgroundColor: colors.border, borderColor: colors.primary }]}>
              <Ionicons name="card" size={20} color={colors.primary} style={styles.uidIcon} />
              <Text style={[styles.uidText, { color: colors.primary }]}>
                Card UID: {scannedUID}
              </Text>
            </View>
          )}

          {/* Basic Information Section */}
          <View className="section" style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Enter the basic details of the beneficiary and livestock
            </Text>

            {/* Beneficiary Dropdown */}
            <DropdownListComponent
              label="Name of Beneficiary"
              placeholder={isLoadingApplicants ? "Loading scheduled applicants..." : "Select a beneficiary"}
              options={applicantResults}
              selectedValue={selectedApplicant?.id}
              onSelect={selectApplicant}
              loading={isLoadingApplicants}
              searchable={false}
              emptyMessage="No scheduled applicants found for your municipality."
            />
            {selectedApplicant && (
              <Text style={{ alignSelf: 'flex-start', marginTop: 6, color: colors.textLight, fontSize: 12 }}>
                {selectedApplicant.barangay ? `${selectedApplicant.barangay}, ` : ""}{selectedApplicant.municipality || ""} • ID: {selectedApplicant.id}
              </Text>
            )}

            {/* Livestock Type and Breed Group */}
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.inputLabel, { color: colors.primary }]}>Livestock Type</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Cattle / Swine / Carabao / Chicken"
                value={livestockType}
                onChangeText={text => setLivestockType(text)}
                placeholderTextColor={colors.textLight}
              />
              {livestockType && isLoadingScheduled && (
                <Text style={{ alignSelf: 'flex-start', marginTop: -12, marginBottom: 8, color: colors.textLight, fontSize: 12 }}>
                  Pre-filled from schedule
                </Text>
              )}

              {/* Breed Dropdown - grouped under Livestock Type */}
              <Text style={[styles.inputLabel, { color: colors.primary, marginTop: 8 }]}>Breed</Text>
              <Text style={{ alignSelf: 'flex-start', marginTop: -6, marginBottom: 8, color: colors.textLight, fontSize: 12 }}>
                (Breed of livestock)
              </Text>
              <DropdownListComponent
                label=""
                placeholder="Select breed"
                options={
                  Array.from(
                    new Map(
                      (breedOptionsByLivestock[livestockType?.trim().charAt(0).toUpperCase() + livestockType?.trim().slice(1)] || [])
                        .map(b => [b.label, b])
                    ).values()
                  )
                }
                selectedValue={livestockBreed}
                onSelect={option => setLivestockBreed(option.value)}
                searchable={false}
                emptyMessage="No breeds available for selected livestock."
              />

              {/* Sex Dropdown */}
              <Text style={[styles.inputLabel, { color: colors.primary, marginTop: 8 }]}>Sex</Text>
              <Text style={{ alignSelf: 'flex-start', marginTop: -6, marginBottom: 8, color: colors.textLight, fontSize: 12 }}>
                (Sex of livestock)
              </Text>
              <DropdownListComponent
                label=""
                placeholder="Select sex"
                options={sexOptions}
                selectedValue={livestockSex}
                onSelect={option => setLivestockSex(option.value)}
                searchable={false}
                emptyMessage="Please select sex."
              />
            </View>

            {/* Extra Livestock Details */}
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Color</Text>
            <Text style={{ alignSelf: 'flex-start', marginTop: -6, marginBottom: 8, color: colors.textLight, fontSize: 12 }}>
              (Color of livestock)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Brown"
              value={livestockColor}
              onChangeText={setLivestockColor}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Age</Text>
            <Text style={{ alignSelf: 'flex-start', marginTop: -6, marginBottom: 8, color: colors.textLight, fontSize: 12 }}>
              (Age of livestock)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 2"
              keyboardType="numeric"
              value={livestockAge}
              onChangeText={setLivestockAge}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Distinct Markings / Notes</Text>
            <Text style={{ alignSelf: 'flex-start', marginTop: -6, marginBottom: 8, color: colors.textLight, fontSize: 12 }}>
              (Unique markings or notes about the livestock)
            </Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. White patch on forehead"
              value={livestockMarkings}
              onChangeText={setLivestockMarkings}
              placeholderTextColor={colors.textLight}
            />

            {/* Date Disperse (user-picked) */}
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Date Disperse</Text>
            <TouchableOpacity
              style={[styles.datePickerButton, { borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.datePickerText, { color: dateDisperse ? colors.text : colors.textLight }]}>
                {dateDisperse ? dateDisperse.toLocaleDateString() : 'Pick a date'}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.primary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={dateDisperse || new Date()}
                mode="date"
                display="default"
                onChange={(e, selected) => {
                  setShowDatePicker(false);
                  if (selected) setDateDisperse(selected);
                }}
              />
            )}
          </View>

          {/* Documentation Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Documentation</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>Upload photos or take pictures for documentation</Text>
            {image && (
              <Image
                source={{ uri: image }}
                style={{ width: 250, height: 250, marginBottom: 16, borderRadius: 10, alignSelf: 'center' }}
              />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={takePhoto} style={[styles.photoBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={[styles.photoBtn, { backgroundColor: colors.accent }]}>
                <Text style={styles.photoBtnText}>Upload Image</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: colors.accent },
            ]}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            <Text style={[styles.submitText, { color: colors.white }]}>
              SUBMIT FOR VERIFICATION
            </Text>
          </TouchableOpacity>
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25A18E',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E3F4EC',
    color: '#25A18E',
    minHeight: 48,
  },
  submitButton: {
    backgroundColor: '#4fd1c5',
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

  // Date Picker
  datePickerButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F4EC',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerText: {
    fontSize: 15,
    color: '#25A18E',
    flex: 1,
  },

  // Modals
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '85%', maxHeight: '80%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalScrollView: { maxHeight: '70%' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E3F4EC' },
  modalButton: { marginTop: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },

  photoBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginHorizontal: 8,
    elevation: 2,
  },
  photoBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  uidDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F4EC',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#25A18E',
  },
  uidIcon: {
    marginRight: 12,
  },
  uidText: {
    color: '#25A18E',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'monospace',
    flex: 1,
  },
});
