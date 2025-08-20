import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, ScrollView, StyleSheet, SafeAreaView, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth, db } from './src/config/firebase';
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Import logo images
const leftLogo = require('./assets/images/logoleft.png');
const rightLogo = require('./assets/images/logoright.png');

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

export default function ListToInspect() {
  const [showInspect, setShowInspect] = useState(false);
  const [image, setImage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userMunicipality, setUserMunicipality] = useState('');
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [form, setForm] = useState({
    fullName: '',
    age: '',
    gender: '',
    contact: '',
    remarks: ''
  });
  const [eligibility, setEligibility] = useState(Array(eligibilityCriteria.length).fill(false));
  const [site, setSite] = useState(Array(siteSuitability.length).fill(false));

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

  // Fetch user's municipality from staff collection
  const fetchUserMunicipality = async (userId) => {
    try {
      console.log('👤 Fetching staff profile for user ID:', userId);
      
      const staffDoc = await getDoc(doc(db, 'staff', userId));
      if (staffDoc.exists()) {
        const staffData = staffDoc.data();
        console.log('📋 Staff data found:', staffData);
        
        const municipality = staffData.municipality || staffData.municipalityName || staffData.area || '';
        console.log('🏘️ Staff municipality:', municipality);
        
        setUserMunicipality(municipality);
        if (municipality) {
          await fetchApplicantsByMunicipality(municipality);
        } else {
          console.log('⚠️ No municipality found for staff, showing all applicants');
          // If no municipality, show all applicants that need inspection
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
      setApplicants(applicantsNeedingInspection);
      
    } catch (error) {
      console.error('❌ Error fetching all applicants:', error);
    }
  };

  // Fetch applicants that need inspection from the same municipality
  const fetchApplicantsByMunicipality = async (municipality) => {
    try {
      setLoading(true);
      
      console.log('🔍 Searching for applicants in municipality:', municipality);
      
      // First, let's get ALL applicants to see what fields they actually have
      const applicantsRef = collection(db, 'applicants');
      const allApplicantsQuery = query(applicantsRef);
      const allApplicantsSnapshot = await getDocs(allApplicantsQuery);
      
      console.log('📊 Total applicants found:', allApplicantsSnapshot.size);
      
      // Log the first few applicants to see their structure
      allApplicantsSnapshot.forEach((doc, index) => {
        if (index < 3) { // Only log first 3 for debugging
          const data = doc.data();
          console.log(`📋 Applicant ${index + 1}:`, {
            id: doc.id,
            name: data.fullName || data.name || 'N/A',
            municipality: data.municipality || data.municipalityName || data.area || 'N/A',
            status: data.inspectionStatus || data.status || data.inspection || 'N/A',
            address: data.address || 'N/A'
          });
        }
      });
      
      // Now try the actual query with the municipality filter
      let q;
      try {
        q = query(
          applicantsRef,
          where('municipality', '==', municipality)
        );
        
        const municipalitySnapshot = await getDocs(q);
        console.log('🏘️ Applicants in municipality:', municipalitySnapshot.size);
        
        // Filter by inspection status in memory (more flexible)
        const applicantsList = [];
        municipalitySnapshot.forEach((doc) => {
          const data = doc.data();
          const status = data.inspectionStatus || data.status || data.inspection || 'pending';
          
          // Check if applicant needs inspection (pending, not started, etc.)
          if (status === 'pending' || status === 'not started' || status === 'pending inspection' || status === '') {
            applicantsList.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        console.log('✅ Applicants needing inspection:', applicantsList.length);
        setApplicants(applicantsList);
        
      } catch (queryError) {
        console.error('❌ Query error:', queryError);
        // Fallback: get all applicants and filter in memory
        const allApplicants = [];
        allApplicantsSnapshot.forEach((doc) => {
          const data = doc.data();
          const applicantMunicipality = data.municipality || data.municipalityName || data.area || '';
          const status = data.inspectionStatus || data.status || data.inspection || 'pending';
          
          if (applicantMunicipality.toLowerCase().includes(municipality.toLowerCase()) && 
              (status === 'pending' || status === 'not started' || status === 'pending inspection' || status === '')) {
            allApplicants.push({
              id: doc.id,
              ...data
            });
          }
        });
        
        console.log('🔄 Fallback filtering found:', allApplicants.length, 'applicants');
        setApplicants(allApplicants);
      }
      
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
      fullName: applicant.fullName || applicant.name || '',
      age: applicant.age || '',
      gender: applicant.gender || applicant.sex || '',
      contact: applicant.contact || applicant.phone || '',
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
      fullName: '',
      age: '',
      gender: '',
      contact: '',
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
            {userMunicipality ? `Municipality: ${userMunicipality}` : 'Loading...'}
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
              if (userMunicipality) {
                fetchApplicantsByMunicipality(userMunicipality);
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
            <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
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
                style={styles.applicantCard}
                onPress={() => handleApplicantSelect(applicant)}
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
                    <Ionicons name="chevron-forward" size={20} color="#25A18E" />
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
    <View style={styles.mainContainer}>
      {/* Middle Content Area - Form content only */}
      <View style={styles.middleContent}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={handleBackToList}
            >
              <Ionicons name="arrow-back" size={24} color="#25A18E" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Inspection Form</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.card}>
            {/* Top Icon */}
            <View style={styles.topIconContainer}>
              <View style={styles.topIcon}>
                <Ionicons name="clipboard-check" size={40} color="#25A18E" />
              </View>
              <Text style={styles.instructionText}>Complete the inspection details below</Text>
            </View>

            {/* Selected Applicant Info */}
            {selectedApplicant && (
              <View style={styles.selectedApplicantInfo}>
                <Text style={styles.sectionTitle}>Applicant Information</Text>
                <View style={styles.applicantInfoCard}>
                  <Text style={styles.applicantInfoText}>
                    <Text style={styles.applicantInfoLabel}>Name: </Text>
                    {selectedApplicant.fullName || selectedApplicant.name || 'N/A'}
                  </Text>
                  <Text style={styles.applicantInfoText}>
                    <Text style={styles.applicantInfoLabel}>Age: </Text>
                    {selectedApplicant.age || 'N/A'}
                  </Text>
                  <Text style={styles.applicantInfoText}>
                    <Text style={styles.applicantInfoLabel}>Gender: </Text>
                    {selectedApplicant.gender || selectedApplicant.sex || 'N/A'}
                  </Text>
                  <Text style={styles.applicantInfoText}>
                    <Text style={styles.applicantInfoLabel}>Address: </Text>
                    {selectedApplicant.address || 'N/A'}
                  </Text>
                </View>
              </View>
            )}

            <Text style={styles.sectionTitle}>Personal Information</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Name"
                value={form.fullName}
                onChangeText={text => handleChange('fullName', text)}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Age"
                keyboardType="numeric"
                value={form.age}
                onChangeText={text => handleChange('age', text)}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gender</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Gender"
                value={form.gender}
                onChangeText={text => handleChange('gender', text)}
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Contact Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Contact Number"
                keyboardType="phone-pad"
                value={form.contact}
                onChangeText={text => handleChange('contact', text)}
              />
            </View>

            <Text style={styles.sectionTitle}>Eligibility Criteria</Text>
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
                <Text style={styles.checkboxLabel}>{label}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.sectionTitle}>Site Suitability</Text>
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
                <Text style={styles.checkboxLabel}>{label}</Text>
              </TouchableOpacity>
            ))}

            {/* Image Picker Section */}
            <Text style={styles.sectionTitle}>Inspection Documentation</Text>
            {image && (
              <Image
                source={{ uri: image }}
                style={{ width: 250, height: 250, marginBottom: 16, borderRadius: 10, alignSelf: 'center' }}
              />
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={takePhoto} style={styles.photoBtn}>
                <Text style={styles.photoBtnText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.photoBtn}>
                <Text style={styles.photoBtnText}>Upload Image</Text>
              </TouchableOpacity>
            </View>

            {/* Remarks */}
            <Text style={styles.sectionTitle}>Additional Remarks</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Summary or Recommendation</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Write your summary or recommendation..."
                multiline
                value={form.remarks}
                onChangeText={text => handleChange('remarks', text)}
              />
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Submit Inspection</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFE0' }}>
      {showInspect ? renderInspectForm() : renderListView()}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFE0',
  },
  middleContent: {
    flex: 1,
    backgroundColor: '#FFFFE0',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 24,
    paddingBottom: 32,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F4F1',
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    color: '#25A18E',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
  placeholder: {
    width: 28,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 18,
    width: '92%',
    alignSelf: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 32,
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#25A18E',
    marginBottom: 16,
    marginTop: 24,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    color: '#333',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
    backgroundColor: '#C8E6C9',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    backgroundColor: '#25A18E',
    borderRadius: 3,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  photoBtn: {
    backgroundColor: '#25A18E',
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
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#25A18E',
    padding: 18,
    borderRadius: 12,
    marginTop: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
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
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#35796B',
    marginBottom: 5,
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
  selectedApplicantInfo: {
    backgroundColor: '#E6F4F1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D0D0D0',
  },
  applicantInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  applicantInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  applicantInfoLabel: {
    fontWeight: 'bold',
    color: '#25A18E',
  },
});