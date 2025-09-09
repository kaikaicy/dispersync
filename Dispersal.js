import React, { useState } from 'react';
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
  collection, getDocs, query, where, limit,
  doc, setDoc, addDoc, Timestamp, serverTimestamp
} from 'firebase/firestore';

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

export default function Dispersal({ navigation, onBackToTransactions, scannedUID }) {
  // ————————————————————————————————————————
  // Form state
  // ————————————————————————————————————————
  const [currentBeneficiary, setCurrentBeneficiary] = useState('');
  const [image, setImage] = useState(null);
  const [selectedApplicant, setSelectedApplicant] = useState(null); // {id, fullName, municipality, barangay, address?, gender?, birthday?, contact?, livestock?}
  const [applicantResults, setApplicantResults] = useState([]);
  const [showApplicantModal, setShowApplicantModal] = useState(false);
  const [isSearchingApplicants, setIsSearchingApplicants] = useState(false);

  const [livestockType, setLivestockType] = useState(''); // prefilled if applicant has one, editable
  const [livestockColor, setLivestockColor] = useState('');
  const [livestockAge, setLivestockAge] = useState(''); // number (string UI)
  const [livestockBreed, setLivestockBreed] = useState('');
  const [livestockMarkings, setLivestockMarkings] = useState('');

  const [municipality, setMunicipality] = useState('');

  // Start as null → user must pick a date (not defaulting to today)
  const [dateDisperse, setDateDisperse] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false);

  // Static location data
  const municipalities = [
    'Basud', 'Capalonga', 'Daet', 'Jose Panganiban', 'Labo', 'Mercedes',
    'Paracale', 'San Lorenzo Ruiz', 'San Vicente', 'Sta. Elena', 'Talisay', 'Vinzons'
  ];

  // ————————————————————————————————————————
  // Image helpers (documentation)
  // ————————————————————————————————————————
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  // ————————————————————————————————————————
  // Applicant search (Firestore)
  // ————————————————————————————————————————
  const searchApplicants = async (searchTerm) => {
    const term = (searchTerm || '').trim();
    if (!term) {
      setApplicantResults([]);
      return;
    }

    setIsSearchingApplicants(true);
    try {
      // Range match on fullName. If you also store fullNameLower, switch to that for case-insensitive querying.
      const q1 = query(
        collection(db, 'applicants'),
        where('fullName', '>=', term),
        where('fullName', '<=', term + '\uf8ff'),
        limit(10)
      );
      const snap1 = await getDocs(q1);

      let results = snap1.docs.map((d) => ({ id: d.id, ...d.data() }));
      if (results.length === 0) {
        // Fallback: sample + local filter
        const q2 = query(collection(db, 'applicants'), limit(20));
        const snap2 = await getDocs(q2);
        const termLower = term.toLowerCase();
        results = snap2.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((r) => (r.fullName || '').toLowerCase().includes(termLower));
      }

      // Convert to dropdown format
      const dropdownOptions = results.map(applicant => ({
        value: applicant.id,
        label: applicant.fullName || 'Unknown',
        subtitle: `${applicant.municipality || '-'}${applicant.livestock ? ` • ${applicant.livestock}` : ''}`,
        data: applicant
      }));

      setApplicantResults(dropdownOptions);
    } catch (e) {
      console.error('searchApplicants error:', e);
      setApplicantResults([]);
    } finally {
      setIsSearchingApplicants(false);
    }
  };

  const selectApplicant = (option) => {
    const app = option.data || option; // Handle both dropdown format and direct data
    setSelectedApplicant(app);
    setCurrentBeneficiary(app.fullName || '');
    setMunicipality(app.municipality || '');
    setLivestockType(app.livestock || ''); // keep editable if blank
  };

  // ————————————————————————————————————————
  // Municipality picker
  // ————————————————————————————————————————
  const handleMunicipalitySelect = (selectedMunicipality) => {
    setMunicipality(selectedMunicipality);
    setShowMunicipalityPicker(false);
  };

  // ————————————————————————————————————————
  // Submit: save to "livestock" collection + "beneficiaries"
  // ————————————————————————————————————————
  const handleSubmit = async () => {
    try {
      const uid = auth?.currentUser?.uid || null;
      const email = auth?.currentUser?.email || null;

      if (!uid) {
        Alert.alert('Not signed in', 'Please sign in first.');
        return;
      }
      if (!selectedApplicant) {
        Alert.alert('Missing applicant', 'Please search and select an applicant.');
        return;
      }
      if (!livestockType?.trim()) {
        Alert.alert('Missing livestock type', 'Please provide a livestock type.');
        return;
      }
      if (!municipality) {
        Alert.alert('Location required', 'Please select municipality.');
        return;
      }
      if (!dateDisperse) {
        Alert.alert('Date required', 'Please pick the dispersal date.');
        return;
      }

      // — 1) Save to "livestock"
      const livestockId = `${selectedApplicant.id}_${Date.now()}`; // doc id + field
      const livestockPayload = {
        // NOTE: per your request, DO NOT store applicantId here.
        livestockId,                         // ✅ keep livestockId inside the doc
        applicantName: selectedApplicant.fullName || currentBeneficiary || '',
        municipality,

        livestockType: livestockType.trim(),
        details: {
          color: livestockColor.trim() || null,
          age: livestockAge ? Number(livestockAge) : null,
          breed: livestockBreed.trim() || null,
          markings: livestockMarkings.trim() || null,
        },

        dateDisperse: Timestamp.fromDate(dateDisperse),
        createdBy: uid,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'livestock', livestockId), livestockPayload);

      // — 2) Also save to "beneficiaries"
      const address = municipality;

      const beneficiaryPayload = {
        name: selectedApplicant.fullName || currentBeneficiary || '',
        address,
        sex: selectedApplicant.gender || null,
        age: calculateAge(selectedApplicant.birthday) || null,   // ✅ computed from birthday
        contactNumber: selectedApplicant.contact || '',
        dateDisperse: Timestamp.fromDate(dateDisperse),
        livestock: livestockType.trim(),
        livestockId,                     // ✅ link to livestock
        fieldInputBy: { uid, email: email || null },
        verificationStatus: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'beneficiaries'), beneficiaryPayload);

      Alert.alert('Submitted for Verification');
      // Optional clear (keep selected applicant to allow multiple entries)
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
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Enter the basic details of the beneficiary and livestock
            </Text>

            {/* Beneficiary Dropdown */}
            <DropdownListComponent
              label="Name of Beneficiary"
              placeholder="Search and select a beneficiary"
              options={applicantResults}
              selectedValue={selectedApplicant?.id}
              onSelect={selectApplicant}
              onSearch={searchApplicants}
              loading={isSearchingApplicants}
              searchable={true}
              searchPlaceholder="Type a name to search..."
              emptyMessage="No beneficiaries found. Try a different search term."
            />
            {selectedApplicant && (
              <Text style={{ alignSelf: 'flex-start', marginTop: 6, color: colors.textLight }}>
                Selected: {selectedApplicant.fullName} ({selectedApplicant.id})
              </Text>
            )}

            {/* Livestock Type (prefilled/overridable) */}
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Livestock Type</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Cattle / Swine / Carabao / Chicken"
              value={livestockType}
              onChangeText={setLivestockType}
              placeholderTextColor={colors.textLight}
            />

            {/* Extra Livestock Details */}
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Color</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Brown"
              value={livestockColor}
              onChangeText={setLivestockColor}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Age</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 2"
              keyboardType="numeric"
              value={livestockAge}
              onChangeText={setLivestockAge}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Breed</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Native"
              value={livestockBreed}
              onChangeText={setLivestockBreed}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Distinct Markings / Notes</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. White patch on forehead"
              value={livestockMarkings}
              onChangeText={setLivestockMarkings}
              placeholderTextColor={colors.textLight}
            />

            {/* Municipality */}
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Municipality</Text>
            <TouchableOpacity
              onPress={() => setShowMunicipalityPicker(true)}
              style={[styles.input, { borderColor: colors.border, justifyContent: 'center' }]}
            >
              <Text style={{ color: municipality ? colors.text : colors.textLight }}>
                {municipality || 'Select Municipality'}
              </Text>
            </TouchableOpacity>

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


      {/* Municipality Picker */}
      <Modal visible={showMunicipalityPicker} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Select Municipality</Text>
            <ScrollView style={styles.modalScrollView}>
              {municipalities.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleMunicipalitySelect(m)}
                >
                  <Text style={{ color: colors.text }}>{m}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowMunicipalityPicker(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  // Documentation styles
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
  // UID Display styles
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
