import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { db } from './src/config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

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

export default function Status({ onBackToTransactions, navigation, scannedUID }) {
  console.log('Status component rendered with navigation:', navigation);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedHealth, setSelectedHealth] = useState('');
  const [remarks, setRemarks] = useState('');
  const [monthsPregnant, setMonthsPregnant] = useState('');
  const [calfAge, setCalfAge] = useState('');
  const [numCalf, setNumCalf] = useState('');
  const [soldAmount, setSoldAmount] = useState('');
  const [soldDate, setSoldDate] = useState('');
  const [deadDate, setDeadDate] = useState('');
  const [surrenderedDate, setSurrenderedDate] = useState('');
  const [monitoringDate, setMonitoringDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingBeneficiary, setIsEditingBeneficiary] = useState(false);
  const [isLoadingBeneficiary, setIsLoadingBeneficiary] = useState(false);
  const [beneficiary, setBeneficiary] = useState({
    id: '',
    municipality: '',
    name: '',
    address: '',
    sex: '',
    age: '',
    contact: '',
    livestock: '',
    livestockId: '',
    health: 'Healthy',
    dateDisperse: null,
  });

  const [editingBeneficiary, setEditingBeneficiary] = useState({
    id: '',
    municipality: '',
    name: '',
    address: '',
    sex: '',
    age: '',
    contact: '',
    livestock: '',
    livestockId: '',
    health: 'Healthy',
    dateDisperse: null,
  });

  // Fetch beneficiary data when scannedUID changes
  useEffect(() => {
    if (scannedUID) {
      fetchBeneficiaryData();
    } else {
      // Reset beneficiary data when no UID
      setBeneficiary({
        id: '',
        municipality: '',
        name: '',
        address: '',
        sex: '',
        age: '',
        contact: '',
        livestock: '',
        livestockId: '',
        health: 'Healthy',
        dateDisperse: null,
      });
      setEditingBeneficiary({
        id: '',
        municipality: '',
        name: '',
        address: '',
        sex: '',
        age: '',
        contact: '',
        livestock: '',
        livestockId: '',
        health: 'Healthy',
        dateDisperse: null,
      });
    }
  }, [scannedUID]);

  const fetchBeneficiaryData = async () => {
    setIsLoadingBeneficiary(true);
    try {
      const beneficiariesQuery = query(
        collection(db, 'beneficiaries'),
        where('card_uid', '==', scannedUID)
      );
      const beneficiariesSnap = await getDocs(beneficiariesQuery);
      
      if (!beneficiariesSnap.empty) {
        const beneficiaryDoc = beneficiariesSnap.docs[0];
        const beneficiaryData = {
          id: beneficiaryDoc.id,
          ...beneficiaryDoc.data()
        };
        
        const formattedData = {
          id: beneficiaryData.id, // Include the beneficiary ID
          municipality: beneficiaryData.municipality || '',
          name: beneficiaryData.name || '',
          address: beneficiaryData.address || '',
          sex: beneficiaryData.sex || '',
          age: beneficiaryData.age ? String(beneficiaryData.age) : '',
          contact: beneficiaryData.contactNumber || '',
          livestock: beneficiaryData.livestock || '',
          livestockId: beneficiaryData.livestockId || '',
          health: 'Healthy', // Default health status
          dateDisperse: beneficiaryData.dateDisperse || null,
        };
        
        setBeneficiary(formattedData);
        setEditingBeneficiary(formattedData);
        console.log('Beneficiary data loaded:', formattedData);
        
        // Load existing status data if available
        await loadExistingStatusData(beneficiaryData.id);
      } else {
        console.log('No beneficiary found for UID:', scannedUID);
        // Keep empty data if not found
      }
    } catch (error) {
      console.error('Error fetching beneficiary data:', error);
      Alert.alert('Error', 'Failed to load beneficiary information');
    } finally {
      setIsLoadingBeneficiary(false);
    }
  };

  const loadExistingStatusData = async (beneficiaryId) => {
    try {
      const statusQuery = query(
        collection(db, 'status'),
        where('beneficiaryId', '==', beneficiaryId),
        where('cardUid', '==', scannedUID)
      );
      const statusSnap = await getDocs(statusQuery);
      
      if (!statusSnap.empty) {
        const statusDoc = statusSnap.docs[0];
        const statusData = statusDoc.data();
        
        // Load existing status selections
        setSelectedStatus(statusData.statusOptions || []);
        setSelectedHealth(statusData.healthStatus || '');
        setRemarks(statusData.remarks || '');
        setMonthsPregnant(statusData.monthsPregnant || '');
        setCalfAge(statusData.calfAge || '');
        setNumCalf(statusData.numCalf || '');
        setSoldAmount(statusData.soldAmount || '');
        setSoldDate(statusData.soldDate || '');
        setDeadDate(statusData.deadDate || '');
        setSurrenderedDate(statusData.surrenderedDate || '');
        setMonitoringDate(statusData.monitoringDate || '');
        
        console.log('Existing status data loaded:', statusData);
      }
    } catch (error) {
      console.error('Error loading existing status data:', error);
    }
  };

  const toggleStatus = (key) => {
    if (selectedStatus.includes('cannot_found')) {
      // If unknown is selected, only allow unchecking it
      if (key === 'cannot_found') {
        setSelectedStatus([]);
      }
      return;
    }
    if (selectedStatus.includes('dead')) {
      // If dead is selected, only allow unchecking it
      if (key === 'dead') {
        setSelectedStatus([]);
      }
      return;
    }
    if (selectedStatus.includes('sold')) {
      // If sold is selected, only allow unchecking it
      if (key === 'sold') {
        setSelectedStatus(selectedStatus.filter(k => k !== 'sold'));
      }
      return;
    }
    if (selectedStatus.includes('existing')) {
      // Only allow toggling enabled checkboxes
      if (['pregnant', 'surrendered', 'sold', 'with_calf', 'existing'].includes(key)) {
        if (selectedStatus.includes(key)) {
          setSelectedStatus(selectedStatus.filter(k => k !== key));
        } else {
          setSelectedStatus([...selectedStatus, key]);
        }
      }
      return;
    }
    // Default toggle
    if (selectedStatus.includes(key)) {
      setSelectedStatus(selectedStatus.filter(k => k !== key));
    } else {
      setSelectedStatus([...selectedStatus, key]);
    }
  };

  const handleHealthSelection = (key) => {
    // Allow unchecking health status even when dead is selected
    if (selectedHealth === key) {
      setSelectedHealth('');
    } else {
      // Only allow health selection if dead is not selected
      if (!selectedStatus.includes('dead')) {
        setSelectedHealth(key);
      }
    }
  };

  const isStatusDisabled = (key) => {
    if (selectedStatus.includes('cannot_found')) {
      // Unknown disables all others
      return !selectedStatus.includes(key);
    }
    if (selectedStatus.includes('existing')) {
      // Only pregnant, surrendered, sold, with calf are enabled
      return !['pregnant', 'surrendered', 'sold', 'with_calf', 'existing'].includes(key);
    }
    if (selectedStatus.includes('pregnant')) {
      // Dead, unknown disabled
      return ['dead', 'cannot_found'].includes(key);
    }
    if (selectedStatus.includes('surrendered')) {
      // Dead disabled
      return key === 'dead';
    }
    if (selectedStatus.includes('sold')) {
      // Dead, pregnant, surrendered, unknown, with calf disabled
      return ['dead', 'pregnant', 'surrendered', 'cannot_found', 'with_calf'].includes(key);
    }
    if (selectedStatus.includes('dead')) {
      // All others disabled
      return key !== 'dead';
    }
    return false;
  };

  const isHealthDisabled = () => {
    // Health is disabled if dead or unknown is selected
    return selectedStatus.includes('dead') || selectedStatus.includes('cannot_found');
  };

  const handleEditBeneficiary = () => {
    setIsEditingBeneficiary(true);
  };

  const handleSaveBeneficiary = () => {
    setBeneficiary({ ...editingBeneficiary });
    setIsEditingBeneficiary(false);
    Alert.alert('Success', 'Beneficiary information updated successfully!');
  };

  const handleCancelEdit = () => {
    setEditingBeneficiary({ ...beneficiary });
    setIsEditingBeneficiary(false);
  };

  const handleSubmit = async () => {
    if (selectedStatus.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one status option.');
      return;
    }
    if (!selectedStatus.includes('dead') && !selectedStatus.includes('cannot_found') && !selectedHealth) {
      Alert.alert('Validation Error', 'Please select a health status.');
      return;
    }
    if ((selectedStatus.includes('dead') && !deadDate) || (selectedStatus.includes('surrendered') && !surrenderedDate)) {
      Alert.alert('Validation Error', 'Please provide date for Dead/Surrendered status.');
      return;
    }
    if (!monitoringDate) {
      Alert.alert('Validation Error', 'Please provide monitoring date.');
      return;
    }
    
    if (!beneficiary.id) {
      console.log('Beneficiary data:', beneficiary);
      console.log('Beneficiary ID:', beneficiary.id);
      Alert.alert('Error', 'No beneficiary data found. Please scan a valid card.');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Check if status document already exists for this beneficiary and card UID
      const existingStatusQuery = query(
        collection(db, 'status'),
        where('beneficiaryId', '==', beneficiary.id),
        where('cardUid', '==', scannedUID)
      );
      const existingStatusSnap = await getDocs(existingStatusQuery);
      
      // Prepare status data
      const statusData = {
        beneficiaryId: beneficiary.id,
        statusOptions: selectedStatus,
        healthStatus: selectedHealth || null,
        remarks: remarks.trim() || null,
        monthsPregnant: selectedStatus.includes('pregnant') ? monthsPregnant.trim() || null : null,
        calfAge: selectedStatus.includes('with_calf') ? calfAge.trim() || null : null,
        numCalf: selectedStatus.includes('with_calf') ? numCalf.trim() || null : null,
        soldAmount: selectedStatus.includes('sold') ? soldAmount.trim() || null : null,
        soldDate: selectedStatus.includes('sold') ? soldDate.trim() || null : null,
        deadDate: selectedStatus.includes('dead') ? deadDate.trim() || null : null,
        surrenderedDate: selectedStatus.includes('surrendered') ? surrenderedDate.trim() || null : null,
        monitoringDate: monitoringDate.trim() || null,
        cardUid: scannedUID,
        submittedAt: serverTimestamp(),
        verificationStatus: 'pending',
      };
      
      let docRef;
      if (!existingStatusSnap.empty) {
        // Update existing document
        const existingDoc = existingStatusSnap.docs[0];
        docRef = existingDoc.ref;
        await updateDoc(docRef, statusData);
        console.log('Status updated successfully for document ID:', existingDoc.id);
      } else {
        // Create new document
        docRef = await addDoc(collection(db, 'status'), statusData);
        console.log('Status created successfully with ID:', docRef.id);
      }
      
      Alert.alert('Success', 'Status submitted successfully for verification!');
      onBackToTransactions();
      
    } catch (error) {
      console.error('Error saving status:', error);
      Alert.alert('Error', 'Failed to submit status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCullingPress = () => {
    console.log('Culling button pressed - navigating to Cull screen');
    // Use the MainScreen's navigation system instead of React Navigation
    if (onBackToTransactions) {
      // Navigate to Cull screen while maintaining the MainScreen layout
      onBackToTransactions('Cull');
    } else {
      console.log('onBackToTransactions prop is not available');
      Alert.alert('Navigation Error', 'Unable to navigate to Cull screen. Please try again.');
    }
  };

  const handleRedispersalPress = () => {
    console.log('Redispersal button pressed - navigating to Redispersal screen');
    // Use the MainScreen's navigation system instead of React Navigation
    if (onBackToTransactions) {
      // Navigate to Redispersal screen while maintaining the MainScreen layout
      onBackToTransactions('Redispersal');
    } else {
      console.log('onBackToTransactions prop is not available');
      Alert.alert('Navigation Error', 'Unable to navigate to Redispersal screen. Please try again.');
    }
  };

  const handleTransferPress = () => {
    console.log('Transfer button pressed - navigating to Transfer screen');
    // Use the MainScreen's navigation system instead of React Navigation
    if (onBackToTransactions) {
      // Navigate to Transfer screen while maintaining the MainScreen layout
      onBackToTransactions('Transfer');
    } else {
      console.log('onBackToTransactions prop is not available');
      Alert.alert('Navigation Error', 'Unable to navigate to Transfer screen. Please try again.');
    }
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
            {scannedUID && (
              <View style={styles.uidContainer}>
                <Ionicons 
                  name="checkmark-circle"
                  size={20} 
                  color="#25A18E" 
                  style={styles.uidIcon} 
                />
                <Text style={styles.uidText}>
                  Card UID: {scannedUID}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.beneficiaryCard}>
            <View style={styles.beneficiaryHeader}>
              <Text style={styles.beneficiaryTitle}>
                {isLoadingBeneficiary ? 'Loading...' : (isEditingBeneficiary ? editingBeneficiary.municipality : beneficiary.municipality)}
              </Text>
              {!isEditingBeneficiary && !isLoadingBeneficiary && (
                <TouchableOpacity style={styles.editButton} onPress={handleEditBeneficiary}>
                  <Ionicons name="create-outline" size={16} color={colors.white} />
                  <Text style={styles.editButtonText}>EDIT</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.beneficiaryDetails}>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Name:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.beneficiaryValue}>Loading...</Text>
                ) : isEditingBeneficiary ? (
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.name}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, name: text }))}
                    placeholder="Enter name"
                    placeholderTextColor={colors.textLight}
                  />
                ) : (
                  <Text style={styles.beneficiaryValue}>{beneficiary.name || '—'}</Text>
                )}
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Address:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.beneficiaryValue}>Loading...</Text>
                ) : isEditingBeneficiary ? (
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.address}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, address: text }))}
                    placeholder="Enter address"
                    placeholderTextColor={colors.textLight}
                  />
                ) : (
                  <Text style={styles.beneficiaryValue}>{beneficiary.address || '—'}</Text>
                )}
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Sex:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.beneficiaryValue}>Loading...</Text>
                ) : isEditingBeneficiary ? (
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.sex}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, sex: text }))}
                    placeholder="Enter sex"
                    placeholderTextColor={colors.textLight}
                  />
                ) : (
                  <Text style={styles.beneficiaryValue}>{beneficiary.sex || '—'}</Text>
                )}
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Age:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.beneficiaryValue}>Loading...</Text>
                ) : isEditingBeneficiary ? (
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.age}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, age: text }))}
                    placeholder="Enter age"
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                  />
                ) : (
                  <Text style={styles.beneficiaryValue}>{beneficiary.age || '—'}</Text>
                )}
              </View>
              <View style={styles.beneficiaryRow}>
                <Text style={styles.beneficiaryLabel}>Contact:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.beneficiaryValue}>Loading...</Text>
                ) : isEditingBeneficiary ? (
                  <TextInput
                    style={styles.beneficiaryInput}
                    value={editingBeneficiary.contact}
                    onChangeText={(text) => setEditingBeneficiary(prev => ({ ...prev, contact: text }))}
                    placeholder="Enter contact"
                    placeholderTextColor={colors.textLight}
                    keyboardType="phone-pad"
                  />
                ) : (
                  <Text style={styles.beneficiaryValue}>{beneficiary.contact || '—'}</Text>
                )}
              </View>
              {isEditingBeneficiary && (
                <View style={styles.editActionsContainer}>
                  <View style={styles.editActions}>
                    <TouchableOpacity style={styles.saveButton} onPress={handleSaveBeneficiary}>
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                      <Text style={styles.saveButtonText}>SAVE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                      <Ionicons name="close" size={16} color={colors.primary} />
                      <Text style={styles.cancelButtonText}>CANCEL</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.livestockCard}>
            <Text style={styles.cardTitle}>Livestock Details</Text>
            <View style={styles.livestockDetails}>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>Type:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.livestockValue}>Loading...</Text>
                ) : (
                  <Text style={styles.livestockValue}>
                    {Array.isArray(beneficiary.livestock) 
                      ? beneficiary.livestock.join(', ') 
                      : beneficiary.livestock || '—'}
                  </Text>
                )}
              </View>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>ID:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.livestockValue}>Loading...</Text>
                ) : (
                  <Text style={styles.livestockValue}>{beneficiary.livestockId || '—'}</Text>
                )}
              </View>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>Health:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.livestockValue}>Loading...</Text>
                ) : (
                  <Text style={[styles.livestockValue, styles.healthStatus]}>
                    {selectedHealth ? healthOptions.find(opt => opt.key === selectedHealth)?.label || 'Healthy' : (beneficiary.health || 'Healthy')}
                  </Text>
                )}
              </View>
              <View style={styles.livestockRow}>
                <Text style={styles.livestockLabel}>Date:</Text>
                {isLoadingBeneficiary ? (
                  <Text style={styles.livestockValue}>Loading...</Text>
                ) : (
                  <Text style={styles.livestockValue}>
                    {beneficiary.dateDisperse 
                      ? (beneficiary.dateDisperse.toDate ? 
                          beneficiary.dateDisperse.toDate().toLocaleDateString() : 
                          new Date(beneficiary.dateDisperse).toLocaleDateString())
                      : '—'}
                  </Text>
                )}
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
                const isDisabled = isStatusDisabled(opt.key);
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[
                      styles.statusOptionCard,
                      isSelected && styles.statusOptionCardSelected,
                      isDisabled && styles.statusOptionCardDisabled
                    ]}
                    onPress={() => !isDisabled && toggleStatus(opt.key)}
                    activeOpacity={0.7}
                    disabled={isDisabled}
                  >
                    <View style={styles.statusOptionContent}>
                      <View style={[styles.statusIconContainer, isDisabled && styles.statusIconContainerDisabled]}>
                        <Ionicons 
                          name={opt.icon} 
                          size={20} 
                          color={isDisabled ? colors.disabled : (isSelected ? colors.primary : colors.textLight)} 
                        />
                      </View>
                      <Text style={[styles.statusOptionLabel, isSelected && styles.statusOptionLabelSelected, isDisabled && styles.statusOptionLabelDisabled]}>
                        {opt.label}
                      </Text>
                      <View style={[styles.statusCheckbox, isSelected && styles.statusCheckboxSelected, isDisabled && styles.statusCheckboxDisabled]}>
                        {isSelected && (
                          <Ionicons name="checkmark" size={12} color={colors.white} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {/* Date fields for dead and surrendered */}
            {selectedStatus.includes('dead') && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Date of Death</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter date of death (YYYY-MM-DD)"
                  placeholderTextColor={colors.textLight}
                  value={deadDate}
                  onChangeText={setDeadDate}
                />
              </View>
            )}
            {selectedStatus.includes('surrendered') && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Date Surrendered</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter date surrendered (YYYY-MM-DD)"
                  placeholderTextColor={colors.textLight}
                  value={surrenderedDate}
                  onChangeText={setSurrenderedDate}
                />
              </View>
            )}
            {/* Monitoring date field */}
            <View style={styles.formCard}>
              <Text style={styles.formCardTitle}>Monitoring Date</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter monitoring date (YYYY-MM-DD)"
                placeholderTextColor={colors.textLight}
                value={monitoringDate}
                onChangeText={setMonitoringDate}
              />
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
                const isDisabled = isHealthDisabled();
                return (
              <TouchableOpacity
                key={opt.key}
                    style={[
                      styles.healthOptionCard,
                      isSelected && styles.healthOptionCardSelected,
                      isDisabled && styles.healthOptionCardDisabled
                    ]}
                onPress={() => handleHealthSelection(opt.key)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.healthOptionContent}>
                      <View style={[
                        styles.healthIconContainer,
                        isDisabled && styles.healthIconContainerDisabled
                      ]}>
                        <Ionicons 
                          name={opt.icon} 
                          size={18} 
                          color={isDisabled ? colors.disabled : (isSelected ? colors.primary : colors.textLight)} 
                        />
                      </View>
                      <Text style={[
                        styles.healthOptionLabel,
                        isSelected && styles.healthOptionLabelSelected,
                        isDisabled && styles.healthOptionLabelDisabled
                      ]}>
                        {opt.label}
                      </Text>
                      <View style={[
                        styles.healthRadio,
                        isSelected && styles.healthRadioSelected,
                        isDisabled && styles.healthRadioDisabled
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
                          <View style={styles.configButtonsContainer}>
                <TouchableOpacity 
                  style={styles.cullingButton} 
                  activeOpacity={0.7}
                  onPress={handleCullingPress}
                >
                  <Ionicons name="cut-outline" size={20} color={colors.secondary} />
                  <Text style={styles.cullingText}>Culling</Text>
                </TouchableOpacity>
                {selectedStatus.includes('with_calf') && (
                  <>
                    <TouchableOpacity 
                      style={styles.redispersalButton} 
                      activeOpacity={0.7}
                      onPress={handleRedispersalPress}
                    >
                      <Ionicons name="share-outline" size={20} color={colors.primary} />
                      <Text style={styles.redispersalText}>Re-dispersal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.transferButton} 
                      activeOpacity={0.7}
                      onPress={handleTransferPress}
                    >
                      <Ionicons name="swap-horizontal-outline" size={20} color="#25A18E" />
                      <Text style={styles.transferText}>Transfer</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
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
  editActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    marginBottom: 8,
  },
  editActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexShrink: 0,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25A18E',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
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
    borderWidth: 2,
    borderColor: '#25A18E',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  configButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
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
  redispersalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#25A18E',
  },
  redispersalText: {
    color: '#25A18E',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#25A18E',
  },
  transferText: {
    color: '#25A18E',
    fontWeight: '700',
    fontSize: 16,
    marginLeft: 8,
  },
  uidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F4EC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#25A18E',
  },
  uidIcon: {
    marginRight: 8,
  },
  uidText: {
    color: '#25A18E',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  healthStatus: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});