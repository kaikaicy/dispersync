import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert, Modal, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

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

const purposeOptions = [
  { label: 'Livelihood Support', key: 'livelihood', icon: 'business' },
  { label: 'Replacement', key: 'replacement', icon: 'refresh' },
  { label: 'Extension Program', key: 'extension', icon: 'school' },
  { label: 'Others', key: 'others', icon: 'ellipsis-horizontal' },
];

export default function Redispersal({ onBackToTransactions, navigation }) {
  const [beneficiaryInfo, setBeneficiaryInfo] = useState({
    fullName: '',
    address: '',
    contactNumber: '',
    barangayMunicipality: '',
  });

  const [animalDetails, setAnimalDetails] = useState({
    quantity: '',
    speciesItem: '',
    breedType: '',
    ageWeight: '',
    sex: '',
    remarks: '',
  });

  const [selectedPurpose, setSelectedPurpose] = useState('');
  const [otherPurpose, setOtherPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [image, setImage] = useState(null);

  // Search functionality states
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
    
    return mockData.filter(item => 
      item.fullName.toLowerCase().includes(term.toLowerCase())
    );
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

  const handlePurposeSelection = (key) => {
    if (selectedPurpose === key) {
      setSelectedPurpose('');
      if (key === 'others') {
        setOtherPurpose('');
      }
    } else {
      setSelectedPurpose(key);
      if (key !== 'others') {
        setOtherPurpose('');
      }
    }
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
    // Validation
    if (!beneficiaryInfo.fullName.trim()) {
      Alert.alert('Validation Error', 'Please enter the beneficiary\'s full name.');
      return;
    }
    if (!beneficiaryInfo.address.trim()) {
      Alert.alert('Validation Error', 'Please enter the beneficiary\'s address.');
      return;
    }
    if (!beneficiaryInfo.contactNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter the contact number.');
      return;
    }
    if (!beneficiaryInfo.barangayMunicipality.trim()) {
      Alert.alert('Validation Error', 'Please enter the barangay/municipality.');
      return;
    }
    if (!animalDetails.quantity.trim()) {
      Alert.alert('Validation Error', 'Please enter the quantity.');
      return;
    }
    if (!animalDetails.speciesItem.trim()) {
      Alert.alert('Validation Error', 'Please enter the species/item.');
      return;
    }
    if (!selectedPurpose) {
      Alert.alert('Validation Error', 'Please select a purpose of redispersal.');
      return;
    }
    if (selectedPurpose === 'others' && !otherPurpose.trim()) {
      Alert.alert('Validation Error', 'Please specify the other purpose.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Success', 'Redispersal form submitted successfully!');
      // Reset form
      setBeneficiaryInfo({
        fullName: '',
        address: '',
        contactNumber: '',
        barangayMunicipality: '',
      });
      setAnimalDetails({
        quantity: '',
        speciesItem: '',
        breedType: '',
        ageWeight: '',
        sex: '',
        remarks: '',
      });
      setSelectedPurpose('');
      setOtherPurpose('');
      setSearchTerm('');
      setSelectedBeneficiary(null);
      onBackToTransactions('Status');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onBackToTransactions('Status')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Redispersal Form</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>🐄 Provincial Veterinarian's Office</Text>
            <Text style={styles.pageSubtitle}>Redispersal Form</Text>
          </View>

          {/* Beneficiary Information Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>👤 Beneficiary Information</Text>
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
              <TouchableOpacity
                onPress={handleSearch}
                style={{ backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 12, justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Search</Text>
              </TouchableOpacity>
            </View>
            {selectedBeneficiary && (
              <Text style={{ alignSelf: 'flex-start', marginTop: 6, color: colors.textLight }}>
                Selected: {selectedBeneficiary.fullName} ({selectedBeneficiary.id})
              </Text>
            )}

            <Text style={styles.inputLabel}>Address:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter address"
              placeholderTextColor={colors.textLight}
              value={beneficiaryInfo.address}
              onChangeText={(text) => setBeneficiaryInfo(prev => ({ ...prev, address: text }))}
            />

            <Text style={styles.inputLabel}>Contact Number:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter contact number"
              placeholderTextColor={colors.textLight}
              value={beneficiaryInfo.contactNumber}
              onChangeText={(text) => setBeneficiaryInfo(prev => ({ ...prev, contactNumber: text }))}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Barangay/Municipality:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter barangay/municipality"
              placeholderTextColor={colors.textLight}
              value={beneficiaryInfo.barangayMunicipality}
              onChangeText={(text) => setBeneficiaryInfo(prev => ({ ...prev, barangayMunicipality: text }))}
            />
          </View>

          {/* Animal/Item Details Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="paw" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>📋 Animal / Item Details</Text>
            </View>
            
            <Text style={styles.inputLabel}>Quantity:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter quantity"
              placeholderTextColor={colors.textLight}
              value={animalDetails.quantity}
              onChangeText={(text) => setAnimalDetails(prev => ({ ...prev, quantity: text }))}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Species/Item:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter species or item"
              placeholderTextColor={colors.textLight}
              value={animalDetails.speciesItem}
              onChangeText={(text) => setAnimalDetails(prev => ({ ...prev, speciesItem: text }))}
            />

            <Text style={styles.inputLabel}>Breed/Type:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter breed or type"
              placeholderTextColor={colors.textLight}
              value={animalDetails.breedType}
              onChangeText={(text) => setAnimalDetails(prev => ({ ...prev, breedType: text }))}
            />

            <Text style={styles.inputLabel}>Age/Weight:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter age or weight"
              placeholderTextColor={colors.textLight}
              value={animalDetails.ageWeight}
              onChangeText={(text) => setAnimalDetails(prev => ({ ...prev, ageWeight: text }))}
            />

            <Text style={styles.inputLabel}>Sex:</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter sex (M/F)"
              placeholderTextColor={colors.textLight}
              value={animalDetails.sex}
              onChangeText={(text) => setAnimalDetails(prev => ({ ...prev, sex: text }))}
            />

            <Text style={styles.inputLabel}>Remarks:</Text>
            <TextInput
              style={styles.remarksInput}
              placeholder="Enter remarks"
              placeholderTextColor={colors.textLight}
              value={animalDetails.remarks}
              onChangeText={(text) => setAnimalDetails(prev => ({ ...prev, remarks: text }))}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Purpose of Redispersal Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Purpose of Redispersal</Text>
            </View>
            
            <View style={styles.purposeOptionsGrid}>
              {purposeOptions.map((opt) => {
                const isSelected = selectedPurpose === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.purposeOptionCard,
                      isSelected && styles.purposeOptionCardSelected
                    ]}
                    onPress={() => handlePurposeSelection(opt.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.purposeOptionContent}>
                      <View style={[
                        styles.purposeIconContainer,
                        isSelected && styles.purposeIconContainerSelected
                      ]}>
                        <Ionicons 
                          name={opt.icon} 
                          size={18} 
                          color={isSelected ? colors.white : colors.textLight} 
                        />
                      </View>
                      <Text style={[
                        styles.purposeOptionLabel,
                        isSelected && styles.purposeOptionLabelSelected
                      ]}>
                        {opt.label}
                      </Text>
                      <View style={[
                        styles.purposeRadio,
                        isSelected && styles.purposeRadioSelected
                      ]}>
                        {isSelected && (
                          <View style={styles.purposeRadioInner} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedPurpose === 'others' && (
              <View style={{ marginTop: 16 }}>
                <Text style={styles.inputLabel}>Others:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Specify other purpose"
                  placeholderTextColor={colors.textLight}
                  value={otherPurpose}
                  onChangeText={setOtherPurpose}
                />
              </View>
            )}
          </View>

          {/* Documentation Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Documentation</Text>
            <Text style={{ color: colors.textLight, marginBottom: 16 }}>Upload photos or take pictures for documentation</Text>
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
              isSubmitting && styles.submitButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? 'SUBMITTING...' : 'Submit'}
            </Text>
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
                <Text style={{ color: colors.textLight, textAlign: 'center', paddingVertical: 16 }}>
                  No results found.
                </Text>
              ) : (
                searchResults.map((beneficiary) => (
                  <TouchableOpacity
                    key={beneficiary.id}
                    style={[styles.modalItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectBeneficiary(beneficiary)}
                  >
                    <Text style={{ color: colors.text, fontWeight: '600' }}>{beneficiary.fullName}</Text>
                    <Text style={{ color: colors.textLight, marginTop: 2, fontSize: 12 }}>
                      {beneficiary.barangayMunicipality || '-'}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.accent }]}
              onPress={() => setShowSearchModal(false)}
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
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#25A18E',
    marginLeft: 8,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
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
  remarksInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E3F4EC',
    color: '#25A18E',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  purposeOptionsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  purposeOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  purposeOptionCardSelected: {
    borderColor: '#25A18E',
    backgroundColor: '#e6f4f1',
  },
  purposeOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purposeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  purposeIconContainerSelected: {
    backgroundColor: '#25A18E',
  },
  purposeOptionLabel: {
    fontSize: 15,
    color: '#25A18E',
    fontWeight: '500',
    flex: 1,
  },
  purposeOptionLabelSelected: {
    color: '#25A18E',
    fontWeight: '600',
  },
  purposeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#25A18E',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeRadioSelected: {
    backgroundColor: '#25A18E',
    borderColor: '#25A18E',
  },
  purposeRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
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
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
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
});




