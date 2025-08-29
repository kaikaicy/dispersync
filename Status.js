import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 🔥 Firebase
import { auth, db } from './src/config/firebase';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';

const livestockDetails = {
  type: 'Swine',
  id: 'IBHf24o7pFdfS6bvuDnl', // ← this will be saved as `livestockId`
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
  const [isEditingBeneficiary, setIsEditingBeneficiary] = useState(false);
  const [beneficiary, setBeneficiary] = useState({
    municipality: 'Municipality of Paracale',
    name: 'Raymundo, Jan Vincent M.',
    address: 'Paracale',
    sex: 'Male',
    age: 22,
    contact: '0972342634',
  });

  const [editingBeneficiary, setEditingBeneficiary] = useState({
    municipality: 'Municipality of Paracale',
    name: 'Raymundo, Jan Vincent M.',
    address: 'Paracale',
    sex: 'Male',
    age: 22,
    contact: '0972342634',
  });

  // ——— helpers ———
  const parseDateToTimestamp = (yyyyMmDd) => {
    if (!yyyyMmDd) return null;
    const m = /^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd);
    if (!m) return null;
    const d = new Date(yyyyMmDd + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    return Timestamp.fromDate(d);
    // (If you prefer server-side time only, you can omit this and store the string.)
  };

  const toggleStatus = (key) => {
    if (key === 'dead') {
      if (selectedStatus.includes('dead')) {
        setSelectedStatus(selectedStatus.filter(k => k !== 'dead'));
      } else {
        setSelectedStatus(['dead']);
        setSelectedHealth('');
      }
    } else {
      if (selectedStatus.includes(key)) {
        setSelectedStatus(prev => prev.filter(k => k !== key));
      } else {
        setSelectedStatus(prev => {
          const withoutDead = prev.filter(k => k !== 'dead');
          return [...withoutDead, key];
        });
      }
    }
  };

  const handleHealthSelection = (key) => {
    if (selectedHealth === key) {
      setSelectedHealth('');
    } else if (!selectedStatus.includes('dead')) {
      setSelectedHealth(key);
    }
  };

  const isStatusDisabled = (key) => {
    if (key === 'dead') {
      return selectedStatus.length > 0 && !selectedStatus.includes('dead');
    } else {
      return selectedStatus.includes('dead');
    }
  };

  const isHealthDisabled = () => selectedStatus.includes('dead');

  const handleEditBeneficiary = () => setIsEditingBeneficiary(true);

  const handleSaveBeneficiary = () => {
    setBeneficiary({ ...editingBeneficiary });
    setIsEditingBeneficiary(false);
    Alert.alert('Success', 'Beneficiary information updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditingBeneficiary({ ...beneficiary });
    setIsEditingBeneficiary(false);
  };

  // ——— SAVE to Firestore (status collection) ———
  const handleSubmit = async () => {
    if (selectedStatus.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one status option.');
      return;
    }
    if (!selectedStatus.includes('dead') && !selectedHealth) {
      Alert.alert('Validation Error', 'Please select a health status.');
      return;
    }

    const uid = auth?.currentUser?.uid || null;
    const email = auth?.currentUser?.email || null;

    // Build minimal payload (NO beneficiary info, NO livestock details)
    const payload = {
      livestockId: livestockDetails.id,       // required by your request
      statuses: selectedStatus,               // array of selected status keys
      health: selectedStatus.includes('dead') ? null : selectedHealth || null,
      remarks: remarks.trim() || null,
      createdBy: { uid, email: email || null },
      createdAt: serverTimestamp(),
    };

    // Optional extras tied to certain statuses
    if (selectedStatus.includes('pregnant')) {
      payload.pregnancy = {
        months: monthsPregnant ? Number(monthsPregnant) : null,
      };
    }
    if (selectedStatus.includes('with_calf')) {
      payload.calf = {
        ageMonths: calfAge ? Number(calfAge) : null,
        count: numCalf ? Number(numCalf) : null,
      };
    }
    if (selectedStatus.includes('sold')) {
      payload.sale = {
        amount: soldAmount ? Number(soldAmount) : null,
        date: parseDateToTimestamp(soldDate), // stored as Firestore Timestamp if valid, else null
        beneficiaryShare30pct: soldAmount ? Number(soldAmount) * 0.3 : null,
      };
    }

    try {
      setIsSubmitting(true);
      await addDoc(collection(db, 'status'), payload);
      setIsSubmitting(false);
      Alert.alert('Success', 'Status submitted successfully for verification!');
      onBackToTransactions?.();

      // optional: clear fields after submit
      setSelectedStatus([]);
      setSelectedHealth('');
      setRemarks('');
      setMonthsPregnant('');
      setCalfAge('');
      setNumCalf('');
      setSoldAmount('');
      setSoldDate('');
    } catch (e) {
      console.error('Failed to save status:', e);
      setIsSubmitting(false);
      Alert.alert('Error', e?.message || 'Failed to submit status.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* … UI below unchanged … */}
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

          {/* Beneficiary Card */}
          <View style={styles.beneficiaryCard}>
            <View style={styles.beneficiaryHeader}>
              <View style={styles.beneficiaryHeaderLeft}>
                <View style={styles.radioDot} />
                <Text style={styles.beneficiaryTitle}>Beneficiary</Text>
              </View>
              {!isEditingBeneficiary ? (
                <TouchableOpacity style={styles.editButton} onPress={handleEditBeneficiary}>
                  <Ionicons name="pencil" size={12} color={colors.white} />
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {!isEditingBeneficiary ? (
              <View style={styles.beneficiaryDetails}>
                <View style={styles.beneficiaryRow}>
                  <Text style={styles.beneficiaryLabel}>Municipality:</Text>
                  <Text style={styles.beneficiaryValue}>{beneficiary.municipality}</Text>
                </View>
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
            ) : (
              <View style={styles.beneficiaryDetails}>
                <View style={styles.beneficiaryRow}>
                  <Text style={styles.beneficiaryLabel}>Municipality:</Text>
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.municipality}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, municipality: text }))}
                  />
                </View>
                <View style={styles.beneficiaryRow}>
                  <Text style={styles.beneficiaryLabel}>Name:</Text>
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.name}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, name: text }))}
                  />
                </View>
                <View style={styles.beneficiaryRow}>
                  <Text style={styles.beneficiaryLabel}>Address:</Text>
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.address}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, address: text }))}
                  />
                </View>
                <View style={styles.beneficiaryRow}>
                  <Text style={styles.beneficiaryLabel}>Sex:</Text>
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.sex}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, sex: text }))}
                  />
                </View>
                <View style={styles.beneficiaryRow}>
                  <Text style={styles.beneficiaryLabel}>Age:</Text>
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.age.toString()}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, age: parseInt(text) || 0 }))}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.beneficiaryRow}>
                  <Text style={styles.beneficiaryLabel}>Contact:</Text>
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.contact}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, contact: text }))}
                  />
                </View>
                <View style={styles.editActions}>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveBeneficiary}>
                    <Ionicons name="checkmark" size={12} color={colors.white} />
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                    <Ionicons name="close" size={12} color={colors.primary} />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Livestock Details Card */}
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

          {/* Status Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status Options</Text>
            <Text style={styles.sectionSubtitle}>Select the current status of the livestock</Text>
            <View style={styles.statusOptionsGrid}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.statusOptionCard,
                    selectedStatus.includes(option.key) && styles.statusOptionCardSelected,
                    isStatusDisabled(option.key) && styles.statusOptionCardDisabled
                  ]}
                  onPress={() => toggleStatus(option.key)}
                  disabled={isStatusDisabled(option.key)}
                >
                  <View style={styles.statusOptionContent}>
                    <View style={[
                      styles.statusIconContainer,
                      isStatusDisabled(option.key) && styles.statusIconContainerDisabled
                    ]}>
                      <Ionicons 
                        name={option.icon} 
                        size={20} 
                        color={selectedStatus.includes(option.key) ? colors.primary : colors.textLight} 
                      />
                    </View>
                    <Text style={[
                      styles.statusOptionLabel,
                      selectedStatus.includes(option.key) && styles.statusOptionLabelSelected,
                      isStatusDisabled(option.key) && styles.statusOptionLabelDisabled
                    ]}>
                      {option.label}
                    </Text>
                    <View style={[
                      styles.statusCheckbox,
                      selectedStatus.includes(option.key) && styles.statusCheckboxSelected,
                      isStatusDisabled(option.key) && styles.statusCheckboxDisabled
                    ]}>
                      {selectedStatus.includes(option.key) && (
                        <Ionicons name="checkmark" size={14} color={colors.white} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Details */}
          {selectedStatus.includes('pregnant') && (
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Pregnancy Details</Text>
              <Text style={styles.formCardSubtitle}>How many months pregnant?</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter months (e.g., 3)"
                value={monthsPregnant}
                onChangeText={setMonthsPregnant}
                keyboardType="numeric"
              />
            </View>
          )}

          {selectedStatus.includes('with_calf') && (
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Calf Details</Text>
              <Text style={styles.formCardSubtitle}>Provide information about the calf</Text>
              <TextInput
                style={styles.input}
                placeholder="Calf age in months"
                value={calfAge}
                onChangeText={setCalfAge}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Number of calves"
                value={numCalf}
                onChangeText={setNumCalf}
                keyboardType="numeric"
              />
            </View>
          )}

          {selectedStatus.includes('sold') && (
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Sale Details</Text>
              <Text style={styles.formCardSubtitle}>Provide information about the sale</Text>
              <TextInput
                style={styles.input}
                placeholder="Sale amount (₱)"
                value={soldAmount}
                onChangeText={setSoldAmount}
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                placeholder="Sale date (YYYY-MM-DD)"
                value={soldDate}
                onChangeText={setSoldDate}
              />
              {soldAmount && (
                <View style={styles.calculationCard}>
                  <Text style={styles.calculationLabel}>Beneficiary Share (30%):</Text>
                  <Text style={styles.calculationValue}>₱{(Number(soldAmount) * 0.3).toFixed(2)}</Text>
                </View>
              )}
            </View>
          )}

          {/* Health Options */}
          {!selectedStatus.includes('dead') && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Health Status</Text>
              <Text style={styles.sectionSubtitle}>Select the current health condition</Text>
              <View style={styles.healthOptionsGrid}>
                {healthOptions.map((option) => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.healthOptionCard,
                      selectedHealth === option.key && styles.healthOptionCardSelected,
                      isHealthDisabled() && styles.healthOptionCardDisabled
                    ]}
                    onPress={() => handleHealthSelection(option.key)}
                    disabled={isHealthDisabled()}
                  >
                    <View style={styles.healthOptionContent}>
                      <View style={[
                        styles.healthIconContainer,
                        isHealthDisabled() && styles.healthIconContainerDisabled
                      ]}>
                        <Ionicons 
                          name={option.icon} 
                          size={18} 
                          color={selectedHealth === option.key ? colors.primary : colors.textLight} 
                        />
                      </View>
                      <Text style={[
                        styles.healthOptionLabel,
                        selectedHealth === option.key && styles.healthOptionLabelSelected,
                        isHealthDisabled() && styles.healthOptionLabelDisabled
                      ]}>
                        {option.label}
                      </Text>
                      <View style={[
                        styles.healthRadio,
                        selectedHealth === option.key && styles.healthRadioSelected,
                        isHealthDisabled() && styles.healthRadioDisabled
                      ]}>
                        {selectedHealth === option.key && (
                          <View style={styles.healthRadioInner} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Remarks */}
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Additional Remarks</Text>
            <Text style={styles.formCardSubtitle}>Any additional notes or comments</Text>
            <TextInput
              style={styles.remarksInput}
              placeholder="Enter any additional remarks..."
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? 'Submitting...' : 'Submit Status'}
            </Text>
          </TouchableOpacity>

          {/* Other Configuration Section */}
          <View style={styles.otherConfigSection}>
            <Text style={styles.otherConfigText}>Other Configuration</Text>
            <TouchableOpacity style={styles.cullingButton}>
              <Ionicons name="trash" size={20} color={colors.secondary} />
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
  beneficiaryInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E3F4EC',
    color: '#25A18E',
    flex: 1,
    minHeight: 36,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25A18E',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#25A18E',
  },
  cancelButtonText: {
    color: '#25A18E',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
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
  statusOptionCardDisabled: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
    borderColor: '#E3F4EC',
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
  statusIconContainerDisabled: {
    backgroundColor: '#E3F4EC',
    borderColor: '#E3F4EC',
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
  statusOptionLabelDisabled: {
    color: '#BDC3C7',
    fontWeight: '500',
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
  statusCheckboxDisabled: {
    borderColor: '#E3F4EC',
    backgroundColor: '#E3F4EC',
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
  healthOptionCardDisabled: {
    opacity: 0.7,
    backgroundColor: '#f8f9fa',
    borderColor: '#E3F4EC',
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
  healthIconContainerDisabled: {
    backgroundColor: '#E3F4EC',
    borderColor: '#E3F4EC',
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
  healthOptionLabelDisabled: {
    color: '#BDC3C7',
    fontWeight: '500',
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
  healthRadioDisabled: {
    borderColor: '#E3F4EC',
    backgroundColor: '#E3F4EC',
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