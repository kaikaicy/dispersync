import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, ScrollView, StyleSheet, SafeAreaView, Platform } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

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
  const [form, setForm] = useState({
    fullName: '',
    age: '',
    gender: '',
    contact: '',
    remarks: ''
  });
  const [eligibility, setEligibility] = useState(Array(eligibilityCriteria.length).fill(false));
  const [site, setSite] = useState(Array(siteSuitability.length).fill(false));

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

  const handleSubmit = () => {
    // Handle form submission
    console.log('Form submitted:', form);
  };

  const handleBackToList = () => {
    setShowInspect(false);
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

  // Render the list view
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
          <Text style={{ color: '#888', fontSize: 13 }}>mamamo</Text>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: '#25A18E',
            borderRadius: 20,
            paddingHorizontal: 18,
            paddingVertical: 6
          }}
          onPress={() => setShowInspect(true)}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>INSPECT</Text>
        </TouchableOpacity>
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
});