import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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

export default function Transfer({ onBackToTransactions, navigation }) {
  const [beneficiaryInfo, setBeneficiaryInfo] = useState({
    fullName: '',
    address: '',
    contactNumber: '',
    barangayMunicipality: '',
  });

  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  // Mock search results - replace with actual search logic
  const mockSearch = (term) => {
    const mockData = [
      { id: '1', fullName: 'Juan Dela Cruz', address: 'Sample Address 1', contactNumber: '09123456789', barangayMunicipality: 'Sample Barangay' },
      { id: '2', fullName: 'Maria Santos', address: 'Sample Address 2', contactNumber: '09876543210', barangayMunicipality: 'Sample Municipality' },
      { id: '3', fullName: 'Pedro Reyes', address: 'Sample Address 3', contactNumber: '09112233445', barangayMunicipality: 'Sample Location' },
    ];
    return mockData.filter(item => item.fullName.toLowerCase().includes(term.toLowerCase()))
  };

  const handleSearch = () => {
    const term = searchTerm.trim();
    if (!term) {
      Alert.alert('Search', 'Please enter a name to search.');
      return;
    }
    const results = mockSearch(term);
    setSearchResults(results);
    setShowSearchModal(true);
  };

  const selectBeneficiary = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setBeneficiaryInfo({
      fullName: beneficiary.fullName,
      address: beneficiary.address,
      contactNumber: beneficiary.contactNumber,
      barangayMunicipality: beneficiary.barangayMunicipality,
    });
    setSearchTerm(beneficiary.fullName);
    setShowSearchModal(false);
  };

  // Documentation image helpers
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

  const handleSubmit = () => {
    if (!beneficiaryInfo.fullName.trim()) { Alert.alert('Validation Error', 'Please enter the beneficiary\'s full name.'); return; }
    if (!beneficiaryInfo.address.trim()) { Alert.alert('Validation Error', 'Please enter the address.'); return; }
    if (!beneficiaryInfo.contactNumber.trim()) { Alert.alert('Validation Error', 'Please enter the contact number.'); return; }
    if (!beneficiaryInfo.barangayMunicipality.trim()) { Alert.alert('Validation Error', 'Please enter the barangay/municipality.'); return; }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Success', 'Transfer form submitted successfully!');
      setBeneficiaryInfo({ fullName: '', address: '', contactNumber: '', barangayMunicipality: '' });
      setRemarks('');
      setSearchTerm('');
      setSelectedBeneficiary(null);
      setImage(null);
      onBackToTransactions('Status');
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onBackToTransactions('Status')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Form</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>Provincial Veterinarian's Office</Text>
            <Text style={styles.pageSubtitle}>Transfer Form</Text>
          </View>

          {/* Beneficiary Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Beneficiary Information</Text>
            </View>

            <Text style={styles.inputLabel}>Full Name:</Text>
            <View style={{ flexDirection: 'row', gap: 8, width: '100%' }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Type a name to search"
                placeholderTextColor={colors.textLight}
                value={searchTerm}
                onChangeText={setSearchTerm}
              />
              <TouchableOpacity onPress={handleSearch} style={{ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Search</Text>
              </TouchableOpacity>
            </View>
            {selectedBeneficiary && (
              <Text style={{ alignSelf: 'flex-start', marginTop: 6, color: colors.textLight }}>
                Selected: {selectedBeneficiary.fullName} ({selectedBeneficiary.id})
              </Text>
            )}

            <Text style={styles.inputLabel}>Address:</Text>
            <TextInput style={styles.input} placeholder="Enter address" placeholderTextColor={colors.textLight} value={beneficiaryInfo.address} onChangeText={(text) => setBeneficiaryInfo(prev => ({ ...prev, address: text }))} />

            <Text style={styles.inputLabel}>Contact Number:</Text>
            <TextInput style={styles.input} placeholder="Enter contact number" placeholderTextColor={colors.textLight} value={beneficiaryInfo.contactNumber} onChangeText={(text) => setBeneficiaryInfo(prev => ({ ...prev, contactNumber: text }))} keyboardType="phone-pad" />

            <Text style={styles.inputLabel}>Barangay/Municipality:</Text>
            <TextInput style={styles.input} placeholder="Enter barangay/municipality" placeholderTextColor={colors.textLight} value={beneficiaryInfo.barangayMunicipality} onChangeText={(text) => setBeneficiaryInfo(prev => ({ ...prev, barangayMunicipality: text }))} />

            <Text style={styles.inputLabel}>Additional notes or observations</Text>
            <TextInput
              style={[styles.input, styles.remarksInput]}
              placeholder="Enter remarks here..."
              placeholderTextColor={colors.textLight}
              value={remarks}
              onChangeText={setRemarks}
              multiline={true}
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Documentation Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentation</Text>
            <Text style={{ color: colors.textLight, marginBottom: 16 }}>Upload photos or take pictures for documentation</Text>
            {image && (
              <Image source={{ uri: image }} style={{ width: 250, height: 250, marginBottom: 16, borderRadius: 10, alignSelf: 'center' }} />
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
          <TouchableOpacity style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.8}>
            <Text style={styles.submitText}>{isSubmitting ? 'SUBMITTING...' : 'Submit'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Search Results Modal */}
      <Modal visible={showSearchModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
            <Text style={[styles.modalTitle, { color: colors.primary }]}>Select Beneficiary</Text>
            <ScrollView style={styles.modalScrollView}>
              {searchResults.length === 0 ? (
                <Text style={{ color: colors.textLight, textAlign: 'center', paddingVertical: 16 }}>No results found.</Text>
              ) : (
                searchResults.map((beneficiary) => (
                  <TouchableOpacity key={beneficiary.id} style={[styles.modalItem, { borderBottomColor: colors.border }]} onPress={() => selectBeneficiary(beneficiary)}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{beneficiary.fullName}</Text>
                    <Text style={{ color: colors.textLight, marginTop: 2, fontSize: 12 }}>{beneficiary.barangayMunicipality || '-'}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.modalButton, { backgroundColor: colors.accent }]} onPress={() => setShowSearchModal(false)}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#e6f4f1' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E3F4EC', elevation: 2, shadowColor: '#25A18E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#25A18E' },
  backButton: { padding: 5 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 18 },
  container: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, flexGrow: 1 },
  pageHeader: { alignItems: 'center', marginBottom: 24 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#25A18E', marginBottom: 4 },
  pageSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#25A18E', marginLeft: 8 },
  inputLabel: { fontSize: 14, color: '#666', fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16, fontSize: 15, borderWidth: 1, borderColor: '#E3F4EC', color: '#25A18E', minHeight: 48 },
  remarksInput: { minHeight: 80, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#4fd1c5', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 20, shadowColor: '#25A18E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2 },
  submitButtonDisabled: { opacity: 0.7 },
  submitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.5 },
  // Modals
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '85%', maxHeight: '80%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalScrollView: { maxHeight: '70%' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E3F4EC' },
  modalButton: { marginTop: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
  photoBtn: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, marginHorizontal: 8, elevation: 2 },
  photoBtnText: { color: '#fff', fontWeight: 'bold' },
});