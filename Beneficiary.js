import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TextInput,
  Alert,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Beneficiary({ onBackToTransactions }) {
  // Form state
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [livestockId, setLivestockId] = useState('');
  const [livestockType, setLivestockType] = useState('');
  const [municipality, setMunicipality] = useState('');

  // Picker states
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false);

  // Static location data (matching Dispersal.js)
  const municipalities = [
    'Basud','Capalonga','Daet','Jose Panganiban','Labo','Mercedes',
    'Paracale','San Lorenzo Ruiz','San Vicente','Sta. Elena','Talisay','Vinzons'
  ];

  const handleSubmit = () => {
    if (!beneficiaryName.trim() || !livestockId.trim() || !livestockType.trim() || !municipality) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }
    
    // Here you would typically save to database
    Alert.alert('Success', 'Beneficiary added successfully!', [
      { text: 'OK', onPress: onBackToTransactions }
    ]);
  };

  const handleMunicipalitySelect = (selectedMunicipality) => {
    setMunicipality(selectedMunicipality);
    setShowMunicipalityPicker(false);
  };

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

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={onBackToTransactions} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Add Beneficiary</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { backgroundColor: colors.white }]}>
          
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.primary }]}>ADD BENEFICIARY</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textLight }]}>
              Record the details of new beneficiary
            </Text>
          </View>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Enter the basic details of the beneficiary
            </Text>
            
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Name of Beneficiary</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter beneficiary name"
              placeholderTextColor={colors.textLight}
              value={beneficiaryName}
              onChangeText={setBeneficiaryName}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Livestock ID</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter livestock ID"
              placeholderTextColor={colors.textLight}
              value={livestockId}
              onChangeText={setLivestockId}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Livestock Type</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter livestock type (e.g., Swine, Cattle)"
              placeholderTextColor={colors.textLight}
              value={livestockType}
              onChangeText={setLivestockType}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Municipality</Text>
            <TouchableOpacity
              onPress={() => setShowMunicipalityPicker(true)}
              style={[styles.input, { borderColor: colors.border, justifyContent: 'center' }]}
            >
              <Text style={{ color: municipality ? colors.text : colors.textLight }}>
                {municipality || 'Select Municipality'}
              </Text>
            </TouchableOpacity>
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

      {/* Municipality Picker Modal */}
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

  // Modals
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalContent: { width: '85%', maxHeight: '80%', borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalScrollView: { maxHeight: '70%' },
  modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#E3F4EC' },
  modalButton: { marginTop: 16, padding: 12, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
}); 