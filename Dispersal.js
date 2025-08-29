import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Platform, Modal, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

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

export default function Dispersal({ navigation, onBackToTransactions }) {
  // ————————————————————————————————————————
  // Form state
  // ————————————————————————————————————————
  const [currentBeneficiary, setCurrentBeneficiary] = useState('');
  const [selectedApplicant, setSelectedApplicant] = useState(null); // {id, fullName, municipality, barangay, address?, gender?, birthday?, contact?, livestock?}
  const [applicantResults, setApplicantResults] = useState([]);
  const [showApplicantModal, setShowApplicantModal] = useState(false);

  const [livestockType, setLivestockType] = useState(''); // prefilled if applicant has one, editable
  const [livestockColor, setLivestockColor] = useState('');
  const [livestockAge, setLivestockAge] = useState(''); // number (string UI)
  const [livestockBreed, setLivestockBreed] = useState('');
  const [livestockMarkings, setLivestockMarkings] = useState('');

  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');

  // Start as null → user must pick a date (not defaulting to today)
  const [dateDisperse, setDateDisperse] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);

  // Static location data
  const municipalities = [
    'Basud','Capalonga','Daet','Jose Panganiban','Labo','Mercedes',
    'Paracale','San Lorenzo Ruiz','San Vicente','Sta. Elena','Talisay','Vinzons'
  ];
  const barangayData = {
    Basud: ['Angas','Bactas','Binatagan','Caayunan','Guinatungan','Hinampacan','Langa','Laniton','Lidong','Mampili','Mandazo','Mangcamagong','Manmuntay','Mantugawe','Matnog','Mocong','Oliva','Pagsangahan','Pinagwarasan','Plaridel','Poblacion 1','Poblacion 2','San Felipe','San Jose','San Pascual','Taba-taba','Tacad','Taisan','Tuaca'],
    Capalonga: ['Alayao','Binawangan','Calabaca','Camagsaan','Catabaguangan','Catioan','Del Pilar','Itok','Lucbanan','Mabini','Mactang','Magsaysay','Mataque','Old Camp','Poblacion','San Antonio','San Isidro','San Roque','Tanawan','Ubang','Villa Aurora','Villa Belen'],
    Daet: ['Alawihao','Awitan','Bagasbas','Barangay I','Barangay II','Barangay III','Barangay IV','Barangay V','Barangay VI','Barangay VII','Barangay VIII','Bibirao','Borabod','Calasgasan','Camambugan','Cobangbang','Dogongan','Gahonon','Gubat','Lag-on','Magang','Mambalite','Mancruz','Pamorangon','San Isidro'],
    'Jose Panganiban': ['Bagong Bayan','Calero','Dahican','Dayhagan','Larap','Luklukan Norte','Luklukan Sur','Motherlode','Nakalaya','North Poblacion','Osmeña','Pag-asa','Parang','Plaridel','Salvacion','San Isidro','San Jose','San Martin','San Pedro','San Rafael','Santa Cruz','Santa Elena','Santa Milagrosa','Santa Rosa Norte','Santa Rosa Sur','South Poblacion','Tamisan'],
    Labo: ['Anahaw','Anameam','Awitan','Baay','Bagacay','Bagong Silang I','Bagong Silang II','Bagong Silang III','Bakiad','Bautista','Bayabas','Bayan-bayan','Benit','Bulhao','Cabatuhan','Cabusay','Calabasa','Canapawan','Daguit','Dalas','Dumagmang','Exciban','Fundado','Guinacutan','Guisican','Gumamela','Iberica','Kalamunding','Lugui','Mabilo I','Mabilo II','Macogon','Mahawan-hawan','Malangcao-Basud','Malasugui','Malatap','Malaya','Malibago','Maot','Masalong','Matanlang','Napaod','Pag-asa','Pangpang','Pinya','San Antonio','San Francisco','Santa Cruz','Submakin','Talobatib','Tigbinan','Tulay na Lupa'],
    Mercedes: ['Apuao','Barangay I','Barangay II','Barangay III','Barangay IV','Barangay V','Barangay VI','Barangay VII','Caringo','Catandunganon','Cayucyucan','Colasi','Del Rosario','Gaboc','Hamoraon','Hinipaan','Lalawigan','Lanot','Mambungalon','Manguisoc','Masalongsalong','Matoogtoog','Pambuhan','Quinapaguian','San Roque','Tarum'],
    Paracale: ['Awitan','Bagumbayan','Bakal','Batobalani','Calaburnay','Capacuan','Casalugan','Dagang','Dalnac','Dancalan','Gumaos','Labnig','Macolabo Island','Malacbang','Malaguit','Mampungo','Mangkasay','Maybato','Palanas','Pinagbirayan Malaki','Pinagbirayan Munti','Poblacion Norte','Poblacion Sur','Tabas','Talusan','Tawig','Tugos'],
    'San Lorenzo Ruiz': ['Daculang Bolo','Dagotdotan','Langga','Laniton','Maisog','Mampurog','Manlimonsito','Matacong','San Antonio','San Isidro','San Ramon'],
    'San Vicente': ['Asdum','Cabanbanan','Calabagas','Fabrica','Iraya Sur','Man-ogob','Poblacion District I','Poblacion District II','San Jose'],
    'Sta. Elena': ['Basiad','Bulala','Don Tomas','Guitol','Kabuluan','Kagtalaba','Maulawin','Patag Ibaba','Patag Iraya','Plaridel','Polungguitguit','Rizal','Salvacion','San Lorenzo','San Pedro','San Vicente','Santa Elena','Tabugon','Villa San Isidro'],
    Talisay: ['Binanuaan','Caawigan','Cahabaan','Calintaan','Del Carmen','Gabon','Itomang','Poblacion','San Francisco','San Isidro','San Jose','San Nicolas','Santa Cruz','Santa Elena','Santo Niño'],
    Vinzons: ['Aguit-it','Banocboc','Barangay I','Barangay II','Barangay III','Cagbalogo','Calangcawan Norte','Calangcawan Sur','Guinacutan','Mangcawayan','Mangcayo','Manlucugan','Matango','Napilihan','Pinagtigasan','Sabang','Santo Domingo','Singi','Sula'],
  };

  // ————————————————————————————————————————
  // Applicant search (Firestore)
  // ————————————————————————————————————————
  const searchApplicants = async () => {
    const term = (currentBeneficiary || '').trim();
    if (!term) {
      Alert.alert('Search', 'Please enter a name to search.');
      return;
    }

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

      setApplicantResults(results);
      setShowApplicantModal(true);
    } catch (e) {
      console.error('searchApplicants error:', e);
      Alert.alert('Search failed', e?.message || 'Could not search applicants.');
    }
  };

  const selectApplicant = (app) => {
    setSelectedApplicant(app);
    setCurrentBeneficiary(app.fullName || '');
    setMunicipality(app.municipality || '');
    setBarangay(app.barangay || '');
    setLivestockType(app.livestock || ''); // keep editable if blank
    setShowApplicantModal(false);
  };

  // ————————————————————————————————————————
  // Municipality / Barangay pickers
  // ————————————————————————————————————————
  const handleMunicipalitySelect = (selectedMunicipality) => {
    setMunicipality(selectedMunicipality);
    setBarangay('');
    setShowMunicipalityPicker(false);
  };
  const handleBarangaySelect = (selectedBarangay) => {
    setBarangay(selectedBarangay);
    setShowBarangayPicker(false);
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
      if (!municipality || !barangay) {
        Alert.alert('Location required', 'Please select municipality and barangay.');
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
        barangay,

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
      const address =
        (selectedApplicant.address && String(selectedApplicant.address).trim()) ||
        [barangay, municipality].filter(Boolean).join(', ');

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
    accent: '#4fd1c5',
    background: '#e6f4f1',
    white: '#FFFFFF',
    text: '#25A18E',
    textLight: '#666',
    border: '#E3F4EC',
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBackToTransactions} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Dispersal of Livestock</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.card}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
              <Ionicons name="business" size={40} color={colors.accent} />
            </View>

            <Text style={[styles.subtitle, { color: colors.textLight }]}>
              Record the details of livestock dispersal
            </Text>

            {/* Search name */}
            <Text style={[styles.label, { color: colors.primary }]}>Search Name of Applicant</Text>
            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text, flex: 1 }]}
                placeholder="Type a name"
                placeholderTextColor={colors.textLight}
                value={currentBeneficiary}
                onChangeText={setCurrentBeneficiary}
              />
              <TouchableOpacity
                onPress={searchApplicants}
                style={{ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Search</Text>
              </TouchableOpacity>
            </View>
            {selectedApplicant && (
              <Text style={{ alignSelf: 'flex-start', marginTop: 6, color: colors.textLight }}>
                Selected: {selectedApplicant.fullName} ({selectedApplicant.id})
              </Text>
            )}

            {/* Livestock Type (prefilled/overridable) */}
            <Text style={[styles.label, { color: colors.primary }]}>Livestock Type</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Cattle / Swine / Carabao / Chicken"
              value={livestockType}
              onChangeText={setLivestockType}
              placeholderTextColor={colors.textLight}
            />

            {/* Extra Livestock Details */}
            <Text style={[styles.label, { color: colors.primary }]}>Color</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Brown"
              value={livestockColor}
              onChangeText={setLivestockColor}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.label, { color: colors.primary }]}>Age</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. 2"
              keyboardType="numeric"
              value={livestockAge}
              onChangeText={setLivestockAge}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.label, { color: colors.primary }]}>Breed</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. Native"
              value={livestockBreed}
              onChangeText={setLivestockBreed}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.label, { color: colors.primary }]}>Distinct Markings / Notes</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="e.g. White patch on forehead"
              value={livestockMarkings}
              onChangeText={setLivestockMarkings}
              placeholderTextColor={colors.textLight}
            />

            {/* Municipality / Barangay */}
            <Text style={[styles.label, { color: colors.primary }]}>Municipality</Text>
            <TouchableOpacity
              onPress={() => setShowMunicipalityPicker(true)}
              style={[styles.input, { borderColor: colors.border, justifyContent: 'center' }]}
            >
              <Text style={{ color: municipality ? colors.text : colors.textLight }}>
                {municipality || 'Select Municipality'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.label, { color: colors.primary }]}>Barangay</Text>
            <TouchableOpacity
              onPress={() => {
                if (!municipality) {
                  Alert.alert('Select municipality first');
                  return;
                }
                setShowBarangayPicker(true);
              }}
              style={[styles.input, { borderColor: colors.border, justifyContent: 'center' }]}
            >
              <Text style={{ color: barangay ? colors.text : colors.textLight }}>
                {barangay || 'Select Barangay'}
              </Text>
            </TouchableOpacity>

            {/* Date Disperse (user-picked) */}
            <Text style={[styles.label, { color: colors.primary }]}>Date Disperse</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: dateDisperse ? colors.text : colors.textLight }}>
                  {dateDisperse ? dateDisperse.toLocaleDateString() : 'Pick a date'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.calendarIcon} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
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

            {/* Submit */}
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Submit for Verification</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Applicant Search Modal */}
      <Modal visible={showApplicantModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Select Applicant</Text>
            <ScrollView style={styles.modalScrollView}>
              {applicantResults.length === 0 ? (
                <Text style={{ color: colors.textLight, textAlign: 'center', paddingVertical: 16 }}>
                  No results.
                </Text>
              ) : (
                applicantResults.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectApplicant(a)}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{a.fullName || '(No name)'}</Text>
                    <Text style={{ color: colors.textLight, marginTop: 2, fontSize: 12 }}>
                      {a.municipality || '-'} • {a.barangay || '-'}
                      {a.livestock ? ` • Livestock: ${a.livestock}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowApplicantModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

      {/* Barangay Picker */}
      <Modal visible={showBarangayPicker} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Select Barangay</Text>
            <ScrollView style={styles.modalScrollView}>
              {(barangayData[municipality] || []).map((b) => (
                <TouchableOpacity
                  key={b}
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleBarangaySelect(b)}
                >
                  <Text style={{ color: colors.text }}>{b}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowBarangayPicker(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#e6f4f1' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E3F4EC',
    backgroundColor: '#F8FFFE', ...Platform.select({ ios: { shadowColor: '#25A18E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3 }, android: { elevation: 2 } }),
    zIndex: 1000,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#25A18E' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 100 },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 16 },
  iconContainer: {
    backgroundColor: '#E3F4EC', borderRadius: 40, padding: 12, marginBottom: 16,
    alignItems: 'center', justifyContent: 'center', shadowColor: '#25A18E', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,
  },
  subtitle: { fontSize: 14, marginBottom: 24, textAlign: 'center', paddingHorizontal: 10, color: '#666' },
  label: { fontWeight: '600', marginTop: 16, marginBottom: 8, fontSize: 14, alignSelf: 'flex-start', color: '#25A18E' },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, marginBottom: 4, width: '100%', borderColor: '#E3F4EC', color: '#25A18E',
  },
  card: { borderRadius: 12, padding: 16, marginTop: 20, marginBottom: 16, width: '100%', backgroundColor: '#e6f4f1' },
  button: { borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 24, width: '100%', backgroundColor: '#4fd1c5' },
  buttonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  backButton: { padding: 8 },

  // Date
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, backgroundColor: '#fff', marginBottom: 4 },
  dateInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#25A18E' },
  calendarIcon: { padding: 10, borderLeftWidth: 1, borderLeftColor: '#E3F4EC' },

  // Modals
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '85%', maxHeight: '80%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalScrollView: { maxHeight: '70%' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E3F4EC' },
  modalButton: { marginTop: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
});
