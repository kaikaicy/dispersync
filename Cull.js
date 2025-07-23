import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Cull({ onBackToTransactions }) {
  const [selectedTab, setSelectedTab] = useState('Sold');
  const [selectedSoldOption, setSelectedSoldOption] = useState('');
  const [selectedReplacementOption, setSelectedReplacementOption] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Additional form fields for comprehensive recording
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [livestockId, setLivestockId] = useState('');
  const [livestockType, setLivestockType] = useState('');
  const [cullDate, setCullDate] = useState('');
  const [cullReason, setCullReason] = useState('');
  const [cullMethod, setCullMethod] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [replacementDetails, setReplacementDetails] = useState('');

  // Color constants
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

  const soldOptions = [
    { label: 'Provincial Livestock Dispersal Officer', key: 'dispersal_officer', icon: 'person' },
    { label: 'Provincial Veterinary Office', key: 'veterinary_office', icon: 'medical' },
    { label: 'Beneficiary', key: 'beneficiary', icon: 'people' },
  ];

  const replacementReasons = [
    { label: 'Offspring', key: 'offspring', icon: 'paw' },
    { label: 'Died', key: 'died', icon: 'close-circle' },
    { label: 'Disease', key: 'disease', icon: 'medical' },
    { label: 'Poor Performance', key: 'poor_performance', icon: 'trending-down' },
    { label: 'Other', key: 'other', icon: 'ellipsis-horizontal' },
  ];

  const cullMethods = [
    { label: 'Slaughter', key: 'slaughter', icon: 'cut' },
    { label: 'Euthanasia', key: 'euthanasia', icon: 'medical' },
    { label: 'Natural Death', key: 'natural_death', icon: 'close-circle' },
    { label: 'Other', key: 'other', icon: 'ellipsis-horizontal' },
  ];

  const handleSubmit = () => {
    if (!beneficiaryName.trim()) {
      Alert.alert('Validation Error', 'Please enter the beneficiary name.');
      return;
    }
    if (!livestockId.trim()) {
      Alert.alert('Validation Error', 'Please enter the livestock ID.');
      return;
    }
    if (!livestockType.trim()) {
      Alert.alert('Validation Error', 'Please enter the livestock type.');
      return;
    }
    if (!cullDate.trim()) {
      Alert.alert('Validation Error', 'Please enter the cull date.');
      return;
    }
    if (!cullReason.trim()) {
      Alert.alert('Validation Error', 'Please enter the cull reason.');
      return;
    }
    if (!cullMethod.trim()) {
      Alert.alert('Validation Error', 'Please select the cull method.');
      return;
    }
    
    if (selectedTab === 'Sold' && !selectedSoldOption) {
      Alert.alert('Validation Error', 'Please select who sold the livestock.');
      return;
    }
    if (selectedTab === 'Replacement' && !selectedReplacementOption) {
      Alert.alert('Validation Error', 'Please select the reason for replacement.');
      return;
    }
    
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert('Success', 'Cull/Slaughter record submitted successfully for verification!');
      onBackToTransactions();
    }, 2000);
  };

  const renderOption = (option, isSelected, onSelect, iconSize = 18) => (
    <TouchableOpacity
      key={option.key}
      style={[
        styles.optionCard,
        { backgroundColor: colors.white, borderColor: colors.border },
        isSelected && { borderColor: colors.primary, backgroundColor: colors.background }
      ]}
      onPress={() => onSelect(option.key)}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        <View style={styles.optionIconContainer}>
          <Ionicons 
            name={option.icon} 
            size={iconSize} 
            color={isSelected ? colors.primary : colors.textLight} 
          />
        </View>
        <Text style={[
          styles.optionLabel,
          { color: colors.text },
          isSelected && { color: colors.primary, fontWeight: '600' }
        ]}>
          {option.label}
        </Text>
        <View style={[
          styles.optionRadio,
          { borderColor: colors.primary, backgroundColor: colors.white },
          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
        ]}>
          {isSelected && (
            <View style={[styles.optionRadioInner, { backgroundColor: colors.white }]} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={onBackToTransactions} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Record Cull/Slaughter</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { backgroundColor: colors.white }]}>
          
          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.primary }]}>RECORD CULL/SLAUGHTER</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textLight }]}>
              Record the details of livestock culling or slaughter
            </Text>
          </View>

          {/* Basic Information Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Basic Information</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Enter the basic details of the livestock
            </Text>
            
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Beneficiary Name</Text>
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
          </View>

          {/* Cull Details Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Cull Details</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Information about the culling process
            </Text>
            
            <Text style={[styles.inputLabel, { color: colors.primary }]}>Cull Date</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter cull date (YYYY-MM-DD)"
              placeholderTextColor={colors.textLight}
              value={cullDate}
              onChangeText={setCullDate}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Cull Reason</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter reason for culling"
              placeholderTextColor={colors.textLight}
              value={cullReason}
              onChangeText={setCullReason}
            />

            <Text style={[styles.inputLabel, { color: colors.primary }]}>Cull Method</Text>
            <View style={styles.optionsGrid}>
              {cullMethods.map((method) => 
                renderOption(
                  method, 
                  cullMethod === method.key, 
                  setCullMethod,
                  16
                )
              )}
            </View>
          </View>

          {/* Toggle Tabs */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Transaction Type</Text>
            <View style={[styles.tabContainer, { backgroundColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'Sold' && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedTab('Sold')}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="cash" 
                  size={18} 
                  color={selectedTab === 'Sold' ? colors.white : colors.primary} 
                />
                <Text style={[styles.tabText, selectedTab === 'Sold' && { color: colors.white }]}>
                  Sold
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'Replacement' && { backgroundColor: colors.primary }]}
                onPress={() => setSelectedTab('Replacement')}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="refresh" 
                  size={18} 
                  color={selectedTab === 'Replacement' ? colors.white : colors.primary} 
                />
                <Text style={[styles.tabText, selectedTab === 'Replacement' && { color: colors.white }]}>
                  Replacement
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SOLD Tab Content */}
          {selectedTab === 'Sold' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Sale Information</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
                Who sold the livestock?
              </Text>
              <View style={styles.optionsGrid}>
                {soldOptions.map((option) => 
                  renderOption(
                    option, 
                    selectedSoldOption === option.key, 
                    setSelectedSoldOption
                  )
                )}
              </View>

              <Text style={[styles.inputLabel, { color: colors.primary }]}>Sale Amount (₱)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="Enter sale amount"
                placeholderTextColor={colors.textLight}
                value={saleAmount}
                onChangeText={setSaleAmount}
                keyboardType="numeric"
              />

              <Text style={[styles.inputLabel, { color: colors.primary }]}>Sale Date</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="Enter sale date (YYYY-MM-DD)"
                placeholderTextColor={colors.textLight}
                value={saleDate}
                onChangeText={setSaleDate}
              />
            </View>
          )}

          {/* REPLACEMENT Tab Content */}
          {selectedTab === 'Replacement' && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>Replacement Information</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
                Reason for replacement
              </Text>
              <View style={styles.optionsGrid}>
                {replacementReasons.map((option) => 
                  renderOption(
                    option, 
                    selectedReplacementOption === option.key, 
                    setSelectedReplacementOption
                  )
                )}
              </View>

              <Text style={[styles.inputLabel, { color: colors.primary }]}>Replacement Details</Text>
              <TextInput
                style={[styles.textArea, { borderColor: colors.border, color: colors.text }]}
                placeholder="Enter additional details about the replacement"
                placeholderTextColor={colors.textLight}
                value={replacementDetails}
                onChangeText={setReplacementDetails}
                multiline
                numberOfLines={4}
              />
            </View>
          )}

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
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              { backgroundColor: colors.accent },
              isSubmitting && { opacity: 0.7 }
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[styles.submitText, { color: colors.white }]}>
              {isSubmitting ? 'SUBMITTING...' : 'SUBMIT FOR VERIFICATION'}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F4EC',
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  tabText: {
    color: '#25A18E',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 6,
  },
  optionsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 15,
    color: '#25A18E',
    fontWeight: '500',
    flex: 1,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#25A18E',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
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
  submitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
