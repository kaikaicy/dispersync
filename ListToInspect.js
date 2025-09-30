import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, ScrollView, StyleSheet, SafeAreaView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from './src/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

  const eligibilityCriteria = [
    "Beneficiary is not a senior citizen (below 60)",
    "Farmer",
    "Physically capable to care for livestock",
    "No full-time job or duty conflict",
    "Owns or has access to land for livestock",
    "Has water supply accessible",
    "Willing to attend training"
  ];

  const siteSuitability = [
    "Area is not flood-prone",
    "Adequate space for livestock",
    "Can build or has livestock shelter",
    "Proper fencing for safety"
  ];

export default function ListToInspect({ highlightApplicantId }) {
  const [showInspect, setShowInspect] = useState(false);
  const [image, setImage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userMunicipality, setUserMunicipality] = useState('');
  const [additionalMunicipalities, setAdditionalMunicipalities] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [form, setForm] = useState({
    remarks: ''
  });
  const [eligibility, setEligibility] = useState(Array(eligibilityCriteria.length).fill(false));
  const [site, setSite] = useState(Array(siteSuitability.length).fill(false));
  const [highlightId, setHighlightId] = useState(null);

  useEffect(() => {
    if (highlightApplicantId) {
      setHighlightId(highlightApplicantId);
      // Removed timeout - highlight will persist until user interaction
    }
  }, [highlightApplicantId]);

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

  // Get current user and their municipality
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        await fetchUserMunicipality(user.uid);
      } else {
        setCurrentUser(null);
        setUserMunicipality('');
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch user's municipality and additionalMunicipalities from staff collection
  const fetchUserMunicipality = async (userId) => {
    try {
      console.log('👤 Fetching staff profile for user ID:', userId);
      const staffDoc = await getDoc(doc(db, 'staff', userId));
      if (staffDoc.exists()) {
        const staffData = staffDoc.data();
        console.log('📋 Staff data found:', staffData);
        const municipality = staffData.municipality || staffData.municipalityName || staffData.area || '';
        const additional = staffData.additionalMunicipalities || [];
        setUserMunicipality(municipality);
        setAdditionalMunicipalities(Array.isArray(additional) ? additional : []);
        // Combine main and additional municipalities
        const allMunicipalities = [municipality, ...((Array.isArray(additional) ? additional : []).filter(m => !!m))].filter(m => !!m);
        if (allMunicipalities.length > 0) {
          await fetchApplicantsByMunicipalities(allMunicipalities);
        } else {
          console.log('⚠️ No municipality found for staff, showing all applicants');
          await fetchAllApplicantsNeedingInspection();
        }
      } else {
        console.log('❌ Staff profile not found');
        Alert.alert('Error', 'Staff profile not found');
      }
    } catch (error) {
      console.error('❌ Error fetching user municipality:', error);
      Alert.alert('Error', 'Failed to fetch user information');
    }
  };

  // Fetch all applicants that need inspection (fallback when no municipality)
  const fetchAllApplicantsNeedingInspection = async () => {
    try {
      console.log('🔄 Fetching all applicants needing inspection...');
      
      const applicantsRef = collection(db, 'applicants');
      const allApplicantsQuery = query(applicantsRef);
      const allApplicantsSnapshot = await getDocs(allApplicantsQuery);
      
      const applicantsNeedingInspection = [];
      allApplicantsSnapshot.forEach((doc) => {
        const data = doc.data();
        const status = data.inspectionStatus || data.status || data.inspection || 'pending';
        
        // Check if applicant needs inspection
        if (status === 'pending' || status === 'not started' || status === 'pending inspection' || status === '') {
          applicantsNeedingInspection.push({
            id: doc.id,
            ...data
          });
        }
      });
      
      console.log('✅ All applicants needing inspection:', applicantsNeedingInspection.length);
      
      // Sort applicants by creation date to ensure queue-like behavior (oldest first)
      const sortedApplicants = applicantsNeedingInspection.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
        return dateA - dateB; // Ascending order - oldest first (FIFO queue)
      });
      
      setApplicants(sortedApplicants);
      
    } catch (error) {
      console.error('❌ Error fetching all applicants:', error);
    }
  };

  // Fetch applicants that need inspection from multiple municipalities
  const fetchApplicantsByMunicipalities = async (municipalities) => {
    try {
      setLoading(true);
      console.log('🔍 Searching for applicants in municipalities:', municipalities);
      const applicantsRef = collection(db, 'applicants');
      const allApplicantsQuery = query(applicantsRef);
      const allApplicantsSnapshot = await getDocs(allApplicantsQuery);
      console.log('📊 Total applicants found:', allApplicantsSnapshot.size);
      // Log the first few applicants to see their structure
      let debugCount = 0;
      allApplicantsSnapshot.forEach((doc) => {
        if (debugCount < 3) {
          const data = doc.data();
          console.log(`📋 Applicant ${debugCount + 1}:`, {
            id: doc.id,
            name: data.fullName || data.name || 'N/A',
            municipality: data.municipality || data.municipalityName || data.area || 'N/A',
            status: data.inspectionStatus || data.status || data.inspection || 'N/A',
            address: data.address || 'N/A'
          });
          debugCount++;
        }
      });
      // Filter applicants by municipalities and inspection status
      const applicantsList = [];
      allApplicantsSnapshot.forEach((doc) => {
        const data = doc.data();
        const applicantMunicipality = (data.municipality || data.municipalityName || data.area || '').toLowerCase();
        const status = data.inspectionStatus || data.status || data.inspection || 'pending';
        if (
          municipalities.some(m => applicantMunicipality === m.toLowerCase()) &&
          (status === 'pending' || status === 'not started' || status === 'pending inspection' || status === '')
        ) {
          applicantsList.push({
            id: doc.id,
            ...data
          });
        }
      });
      console.log('✅ Applicants needing inspection:', applicantsList.length);
      // Sort applicants by creation date to ensure queue-like behavior (oldest first)
      const sortedApplicants = applicantsList.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt.seconds * 1000) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt.seconds * 1000) : new Date(0);
        return dateA - dateB;
      });
      setApplicants(sortedApplicants);
    } catch (error) {
      console.error('❌ Error fetching applicants:', error);
      Alert.alert('Error', 'Failed to fetch applicants');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };
  
  const handleCheckbox = (type, idx) => {
    if (type === 'eligibility') {
      const updated = [...eligibility];
      updated[idx] = !updated[idx];
      setEligibility(updated);
    } else {
      const updated = [...site];
      updated[idx] = !updated[idx];
      setSite(updated);
    }
  };

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleApplicantSelect = (applicant) => {
    setSelectedApplicant(applicant);
    setForm({
      remarks: ''
    });
    setShowInspect(true);
  };

  const handleSubmit = async () => {
    try {
      // Update applicant inspection status and save inspection results
      if (selectedApplicant) {
        const inspectionData = {
          applicantId: selectedApplicant.id,
          inspectorId: currentUser.uid,
          inspectionDate: new Date(),
          eligibilityCriteria: eligibility,
          siteSuitability: site,
          remarks: form.remarks,
          image: image,
          status: 'completed'
        };

        // Save to inspections collection
        await addDoc(collection(db, 'inspections'), inspectionData);
        
        // Update applicant status
        await updateDoc(doc(db, 'applicants', selectedApplicant.id), {
          inspectionStatus: 'completed',
          lastInspectionDate: new Date()
        });

        // Remove inspected applicant from local list immediately
        setApplicants((prev) => prev.filter((a) => a.id !== selectedApplicant.id));

        Alert.alert('Success', 'Inspection completed successfully!');
        handleBackToList();
      }
    } catch (error) {
      console.error('Error submitting inspection:', error);
      Alert.alert('Error', 'Failed to submit inspection');
    }
  };

  const handleBackToList = () => {
    setShowInspect(false);
    setSelectedApplicant(null);
    // Reset form data when going back
    setForm({
      remarks: ''
    });
    setEligibility(Array(eligibilityCriteria.length).fill(false));
    setSite(Array(siteSuitability.length).fill(false));
    setImage(null);
  };

  // Render the list view with applicants
  const renderListView = () => (
    <View style={{ backgroundColor: '#FFFFE0', flex: 1 }}>
      <View style={{
        backgroundColor: '#F5F9F8',
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8
      }}>
        <View>
          <Text style={{ fontWeight: 'bold', color: '#25A18E', fontSize: 15 }}>OLDMS</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>
            {userMunicipality
              ? `Municipalities: ${[userMunicipality, ...additionalMunicipalities.filter(m => !!m)].join(', ')}`
              : 'Loading...'}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#25A18E', fontSize: 12, marginBottom: 4 }}>
            {applicants.length} Pending
          </Text>
          <TouchableOpacity 
            style={{ 
              backgroundColor: '#25A18E', 
              paddingHorizontal: 12, 
              paddingVertical: 4, 
              borderRadius: 8,
              marginTop: 4
            }}
            onPress={() => {
              const allMunicipalities = [userMunicipality, ...additionalMunicipalities.filter(m => !!m)].filter(m => !!m);
              if (allMunicipalities.length > 0) {
                fetchApplicantsByMunicipalities(allMunicipalities);
              } else {
                fetchAllApplicantsNeedingInspection();
              }
            }}
          >
            <Text style={{ color: '#fff', fontSize: 10 }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Applicants List */}
      <View style={{ flex: 1, padding: 16 }}>
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#25A18E" />
            <Text style={{ marginTop: 16, color: '#666' }}>Loading applicants...</Text>
          </View>
        ) : applicants.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 64, color: '#4CAF50' }}>✓</Text>
            <Text style={{ marginTop: 16, fontSize: 18, color: '#666', textAlign: 'center' }}>
              No pending inspections in {userMunicipality}
            </Text>
            <Text style={{ marginTop: 8, fontSize: 14, color: '#999', textAlign: 'center' }}>
              All applicants in your municipality have been inspected
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {applicants.map((applicant, index) => (
              <TouchableOpacity
                key={applicant.id}
                style={[
                  styles.applicantCard,
                  applicant.id === highlightId ? { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFC107' } : null,
                ]}
                onPress={() => {
                  // Clear highlight if clicking on the highlighted item
                  if (applicant.id === highlightId) {
                    setHighlightId(null);
                  }
                  handleApplicantSelect(applicant);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.applicantHeader}>
                  <View style={styles.applicantAvatar}>
                    <Text style={styles.applicantInitial}>
                      {(applicant.fullName || applicant.name || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>
                      {applicant.fullName || applicant.name || 'Unknown Name'}
                    </Text>
                    <Text style={styles.applicantDetails}>
                      {applicant.age ? `${applicant.age} years old` : 'Age not specified'} • {applicant.gender || applicant.sex || 'Gender not specified'}
                    </Text>
                    <Text style={styles.applicantAddress}>
                      {applicant.address || 'Address not specified'}
                    </Text>
                  </View>
                  <View style={styles.applicantStatus}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Pending</Text>
                    </View>
                    <Text style={{ fontSize: 20, color: '#25A18E' }}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );

  // Render the INSPECT form
  const renderInspectForm = () => (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={handleBackToList} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Inspection Form</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, { backgroundColor: colors.white }]}>
          
          {/* Top Icon */}
          <View style={styles.topIconContainer}>
            <View style={styles.topIcon}>
              <Text style={{ fontSize: 40, color: '#25A18E' }}>📋</Text>
            </View>
          </View>

          {/* Page Header */}
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: colors.primary }]}>INSPECTION FORM</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textLight }]}>
              Complete the inspection details below
            </Text>
          </View>

          {/* Selected Applicant Info */}
          {selectedApplicant && (
            <View style={styles.section}>
              <View style={[styles.applicantInfoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 8 }]}>Applicant Information</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textLight, marginBottom: 16 }]}>
                  Details of the selected applicant
                </Text>
                <Text style={[styles.applicantInfoText, { color: colors.text }]}>
                  <Text style={[styles.applicantInfoLabel, { color: colors.primary }]}>Name: </Text>
                  {selectedApplicant.fullName || selectedApplicant.name || 'N/A'}
                </Text>
                <Text style={[styles.applicantInfoText, { color: colors.text }]}>
                  <Text style={[styles.applicantInfoLabel, { color: colors.primary }]}>Age: </Text>
                  {selectedApplicant.age || 'N/A'}
                </Text>
                <Text style={[styles.applicantInfoText, { color: colors.text }]}>
                  <Text style={[styles.applicantInfoLabel, { color: colors.primary }]}>Gender: </Text>
                  {selectedApplicant.gender || selectedApplicant.sex || 'N/A'}
                </Text>
                <Text style={[styles.applicantInfoText, { color: colors.text }]}>
                  <Text style={[styles.applicantInfoLabel, { color: colors.primary }]}>Address: </Text>
                  {selectedApplicant.address || 'N/A'}
                </Text>
              </View>
            </View>
          )}

          {/* Eligibility Criteria Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Eligibility Criteria</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Check the criteria that apply
            </Text>
            
            {eligibilityCriteria.map((label, idx) => (
              <TouchableOpacity
                key={label}
                style={styles.checkboxRow}
                onPress={() => handleCheckbox('eligibility', idx)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, eligibility[idx] && styles.checkboxChecked]}>
                  {eligibility[idx] && <View style={styles.checkboxInner} />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Site Suitability Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Site Suitability</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textLight }]}>
              Assess the suitability of the site
            </Text>
            
            {siteSuitability.map((label, idx) => (
              <TouchableOpacity
                key={label}
                style={styles.checkboxRow}
                onPress={() => handleCheckbox('site', idx)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, site[idx] && styles.checkboxChecked]}>
                  {site[idx] && <View style={styles.checkboxInner} />}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Image Picker Section removed from Inspection form */}

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
              value={form.remarks}
              onChangeText={(text) => handleChange('remarks', text)}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              { backgroundColor: colors.accent }
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

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFE0' }}>
      {showInspect ? renderInspectForm() : renderListView()}
    </View>
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
  checkboxRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  checkbox: {
    width: 24, 
    height: 24, 
    borderWidth: 2, 
    borderColor: '#25A18E', 
    borderRadius: 6, 
    marginRight: 12,
    backgroundColor: '#fff', 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  checkboxChecked: { 
    borderColor: '#25A18E', 
    backgroundColor: '#C8E6C9' 
  },
  checkboxInner: { 
    width: 14, 
    height: 14, 
    backgroundColor: '#25A18E', 
    borderRadius: 3 
  },
  checkboxLabel: { 
    fontSize: 15, 
    color: '#25A18E', 
    flex: 1 
  },
  photoBtn: {
    paddingVertical: 12, 
    paddingHorizontal: 20, 
    borderRadius: 10, 
    marginHorizontal: 8,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4,
  },
  photoBtnText: { 
    color: '#fff', 
    fontWeight: 'bold' 
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
  submitButton: {
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
  applicantInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  applicantInfoText: {
    fontSize: 14,
    color: '#25A18E',
    marginBottom: 4,
  },
  applicantInfoLabel: {
    fontWeight: 'bold',
    color: '#25A18E',
  },
  topIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  topIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  applicantCard: {
    backgroundColor: '#F5F9F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  applicantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25A18E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  applicantInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  applicantDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  applicantAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  applicantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 100,
  },
  statusBadge: {
    backgroundColor: '#FFE082',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#25A18E',
    fontSize: 12,
    fontWeight: 'bold',
  },
});