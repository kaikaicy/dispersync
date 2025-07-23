import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const livestockDetails = {
  type: 'Swine',
  id: 'IBHf24o7pFdfS6bvuDnl',
  health: 'Healthy',
  date: '2025-05-23',
};

const statusOptions = [
  { label: 'Existing(E)', key: 'existing', icon: 'checkmark-circle' },
  { label: 'Cannot be found(UK)', key: 'cannot_found', icon: 'help-circle' },
  { label: 'Dead', key: 'dead', icon: 'close-circle' },
  { label: 'Surrendered(SURR)', key: 'surrendered', icon: 'hand-left' },
  { label: 'Pregnant(PREG)', key: 'pregnant', icon: 'heart' },
  { label: 'Sold', key: 'sold', icon: 'cash' },
  { label: 'With Calf(WC)', key: 'with_calf', icon: 'paw' },
];

const healthOptions = [
  { label: 'Healthy', key: 'healthy', icon: 'checkmark-circle' },
  { label: 'Sick', key: 'sick', icon: 'medical' },
  { label: 'Injured', key: 'injured', icon: 'bandage' },
  { label: 'Under Observation', key: 'observation', icon: 'eye' },
  { label: 'Other', key: 'other', icon: 'ellipsis-horizontal' },
];

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

export default function Status({ onBackToTransactions }) {
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedHealth, setSelectedHealth] = useState('');
  const [remarks, setRemarks] = useState('');
  const [monthsPregnant, setMonthsPregnant] = useState('');
  const [calfAge, setCalfAge] = useState('');
  const [numCalf, setNumCalf] = useState('');
  const [soldAmount, setSoldAmount] = useState('');
  const [soldDate, setSoldDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const beneficiary = {
    municipality: 'Municipality of Paracale',
    name: 'Raymundo, Jan Vincent M.',
    address: 'Paracale',
    sex: 'Male',
    age: 22,
    contact: '0972342634',
  };

  const toggleStatus = (key) => {
    setSelectedStatus((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmit = () => {
    if (selectedStatus.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one status option.');
      return;
    }
    if (!selectedHealth) {
      Alert.alert('Validation Error', 'Please select a health status.');
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Success', 'Status submitted successfully for verification!');
      onBackToTransactions();
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBackToTransactions} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Status</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>ADD STATUS</Text>
            <Text style={styles.pageSubtitle}>
              Fill the details below to add an update to livestock
            </Text>
          </View>

          <View style={styles.beneficiaryCard}>
            <View style={styles.beneficiaryHeader}>
              <View style={styles.beneficiaryHeaderLeft}>
                <View style={styles.radioDot} />
                <Text style={styles.beneficiaryTitle}>{beneficiary.municipality}</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="create-outline" size={16} color={colors.white} />
                <Text style={styles.editButtonText}>EDIT</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.beneficiaryDetails}>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Name:</Text>
                <Text style={styles.beneficiaryValue}>{beneficiary.name}</Text>
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Address:</Text>
                <Text style={styles.beneficiaryValue}>{beneficiary.address}</Text>
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Sex:</Text>
                <Text style={styles.beneficiaryValue}>{beneficiary.sex}</Text>
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Age:</Text>
                <Text style={styles.beneficiaryValue}>{beneficiary.age}</Text>
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Contact:</Text>
                <Text style={styles.beneficiaryValue}>{beneficiary.contact}</Text>
              </View>
            </View>
          </View>

          <View style={styles.livestockCard}>
            <Text style={styles.cardTitle}>Livestock Details</Text>
            <View style={styles.livestockDetails}>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>Type:</Text>
                <Text style={styles.livestockValue}>{livestockDetails.type}</Text>
              </View>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>ID:</Text>
                <Text style={styles.livestockValue}>{livestockDetails.id}</Text>
              </View>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>Health:</Text>
                <Text style={styles.livestockValue}>{livestockDetails.health}</Text>
              </View>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>Date:</Text>
                <Text style={styles.livestockValue}>{livestockDetails.date}</Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status Options</Text>
            <Text style={styles.sectionSubtitle}>
              Check the status of livestock (select all that apply)
            </Text>
            <View style={styles.statusOptionsGrid}>
              {statusOptions.map((opt) => {
                const isSelected = selectedStatus.includes(opt.key);
                return (
              <TouchableOpacity
                key={opt.key}
                  style={[
                      styles.statusOptionCard,
                      isSelected && styles.statusOptionCardSelected
                    ]}
                    onPress={() => toggleStatus(opt.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.statusOptionContent}>
                      <View style={styles.statusIconContainer}>
                        <Ionicons 
                          name={opt.icon} 
                          size={20} 
                          color={isSelected ? colors.primary : colors.textLight} 
                        />
                      </View>
                      <Text style={[
                        styles.statusOptionLabel,
                        isSelected && styles.statusOptionLabelSelected
                      ]}>
                  {opt.label}
                </Text>
                      <View style={[
                        styles.statusCheckbox,
                        isSelected && styles.statusCheckboxSelected
                      ]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={12} color={colors.white} />
                        )}
                      </View>
                    </View>
              </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {(selectedStatus.includes('pregnant') || selectedStatus.includes('with_calf') || selectedStatus.includes('sold')) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Details</Text>
              
          {selectedStatus.includes('pregnant') && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Pregnancy Information</Text>
              <TextInput
                    style={styles.input}
                    placeholder="Enter months of pregnancy"
                placeholderTextColor={colors.textLight}
                value={monthsPregnant}
                onChangeText={setMonthsPregnant}
                keyboardType="numeric"
              />
                  
              {selectedStatus.includes('with_calf') && (
                <>
                  <TextInput
                        style={styles.input}
                        placeholder="Enter calf age (months)"
                    placeholderTextColor={colors.textLight}
                    value={calfAge}
                    onChangeText={setCalfAge}
                    keyboardType="numeric"
                  />
                  <TextInput
                        style={styles.input}
                        placeholder="Enter number of calves"
                    placeholderTextColor={colors.textLight}
                    value={numCalf}
                    onChangeText={setNumCalf}
                    keyboardType="numeric"
                  />
                </>
              )}
            </View>
          )}

          {!selectedStatus.includes('pregnant') && selectedStatus.includes('with_calf') && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Calf Information</Text>
              <TextInput
                    style={styles.input}
                    placeholder="Enter calf age (months)"
                placeholderTextColor={colors.textLight}
                value={calfAge}
                onChangeText={setCalfAge}
                keyboardType="numeric"
              />
              <TextInput
                    style={styles.input}
                    placeholder="Enter number of calves"
                placeholderTextColor={colors.textLight}
                value={numCalf}
                onChangeText={setNumCalf}
                keyboardType="numeric"
              />
            </View>
          )}

          {selectedStatus.includes('sold') && (
                <View style={styles.formCard}>
                  <Text style={styles.formCardTitle}>Sale Information</Text>
                  <Text style={styles.formCardSubtitle}>
                Beneficiary's Share – 30% (B30%S)
              </Text>
              <TextInput
                    style={styles.input}
                    placeholder="Enter amount sold (₱)"
                placeholderTextColor={colors.textLight}
                value={soldAmount}
                onChangeText={setSoldAmount}
                keyboardType="numeric"
              />
              {soldAmount !== '' && !isNaN(Number(soldAmount)) && (
                    <View style={styles.calculationCard}>
                      <Text style={styles.calculationLabel}>30% Share:</Text>
                      <Text style={styles.calculationValue}>
                        ₱{Number(soldAmount) * 0.3}
                </Text>
                    </View>
              )}
              <TextInput
                    style={styles.input}
                    placeholder="Enter date sold (YYYY-MM-DD)"
                placeholderTextColor={colors.textLight}
                value={soldDate}
                onChangeText={setSoldDate}
              />
                </View>
              )}
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Health Status</Text>
            <Text style={styles.sectionSubtitle}>
              Select the current health condition
            </Text>
            <View style={styles.healthOptionsGrid}>
              {healthOptions.map((opt) => {
                const isSelected = selectedHealth === opt.key;
                return (
              <TouchableOpacity
                key={opt.key}
                    style={[
                      styles.healthOptionCard,
                      isSelected && styles.healthOptionCardSelected
                    ]}
                onPress={() => setSelectedHealth(opt.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.healthOptionContent}>
                      <View style={styles.healthIconContainer}>
                        <Ionicons 
                          name={opt.icon} 
                          size={18} 
                          color={isSelected ? colors.primary : colors.textLight} 
                        />
                      </View>
                      <Text style={[
                        styles.healthOptionLabel,
                        isSelected && styles.healthOptionLabelSelected
                      ]}>
                        {opt.label}
                      </Text>
                      <View style={[
                        styles.healthRadio,
                        isSelected && styles.healthRadioSelected
                      ]}>
                        {isSelected && (
                          <View style={styles.healthRadioInner} />
                        )}
                      </View>
                    </View>
              </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Remarks</Text>
            <Text style={styles.sectionSubtitle}>
              Additional notes or observations
            </Text>
          <TextInput
              style={styles.remarksInput}
            placeholder="Enter remarks here..."
            placeholderTextColor={colors.textLight}
            value={remarks}
            onChangeText={setRemarks}
            multiline
              numberOfLines={4}
            />
          </View>

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
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT STATUS FOR VERIFICATION'}
            </Text>
          </TouchableOpacity>

          <View style={styles.otherConfigSection}>
            <Text style={styles.otherConfigText}>
            OTHER STATUS CONFIGURATION
          </Text>
            <TouchableOpacity style={styles.cullingButton} activeOpacity={0.7}>
              <Ionicons name="cut-outline" size={20} color={colors.secondary} />
              <Text style={styles.cullingText}>Culling</Text>
          </TouchableOpacity>
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
  beneficiaryCard: {
    backgroundColor: '#e6f4f1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  beneficiaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  beneficiaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#38b2ac',
    marginRight: 8,
  },
  beneficiaryTitle: {
    fontWeight: '700',
    color: '#25A18E',
    fontSize: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25A18E',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  beneficiaryDetails: {
    gap: 6,
  },
  beneficiaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  beneficiaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 80,
  },
  beneficiaryValue: {
    fontSize: 14,
    color: '#25A18E',
    fontWeight: '600',
    flex: 1,
  },
  livestockCard: {
    backgroundColor: '#e6f4f1',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#25A18E',
    marginBottom: 12,
  },
  livestockDetails: {
    gap: 6,
  },
  livestockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  livestockLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    width: 80,
  },
  livestockValue: {
    fontSize: 14,
    color: '#25A18E',
    fontWeight: '600',
    flex: 1,
  },
  statusOptionsGrid: {
    gap: 12,
  },
  statusOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  statusOptionCardSelected: {
    borderColor: '#25A18E',
    backgroundColor: '#e6f4f1',
  },
  statusOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statusOptionLabel: {
    fontSize: 15,
    color: '#25A18E',
    fontWeight: '500',
    flex: 1,
  },
  statusOptionLabelSelected: {
    color: '#25A18E',
    fontWeight: '600',
  },
  statusCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#25A18E',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCheckboxSelected: {
    backgroundColor: '#25A18E',
    borderColor: '#25A18E',
  },
  healthOptionsGrid: {
    gap: 12,
  },
  healthOptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  healthOptionCardSelected: {
    borderColor: '#25A18E',
    backgroundColor: '#e6f4f1',
  },
  healthOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  healthIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  healthOptionLabel: {
    fontSize: 15,
    color: '#25A18E',
    fontWeight: '500',
    flex: 1,
  },
  healthOptionLabelSelected: {
    color: '#25A18E',
    fontWeight: '600',
  },
  healthRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#25A18E',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthRadioSelected: {
    backgroundColor: '#25A18E',
    borderColor: '#25A18E',
  },
  healthRadioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  formCard: {
    backgroundColor: '#e6f4f1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  formCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#25A18E',
    marginBottom: 12,
  },
  formCardSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E3F4EC',
    color: '#25A18E',
    minHeight: 48,
  },
  calculationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  calculationLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  calculationValue: {
    fontSize: 16,
    color: '#25A18E',
    fontWeight: '700',
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
  otherConfigSection: {
    alignItems: 'center',
  },
  otherConfigText: {
    color: '#25A18E',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
    fontSize: 14,
  },
  cullingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#38b2ac',
  },
  cullingText: {
    color: '#38b2ac',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
});