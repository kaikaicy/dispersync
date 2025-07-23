import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
// import HeaderComponent from './HeaderComponent'; // Uncomment and adjust path
// import BottomNav from './BottomNav'; // Uncomment and adjust path

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

export default function INSPECT() {
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
  };

  return (
    <View style={{flex: 1, backgroundColor: '#F5F5F5'}}>
      {/* Uncomment and use your header component */}
      {/* <HeaderComponent /> */}
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={form.fullName}
            onChangeText={text => handleChange('fullName', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Age"
            keyboardType="numeric"
            value={form.age}
            onChangeText={text => handleChange('age', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Gender"
            value={form.gender}
            onChangeText={text => handleChange('gender', text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Contact Number"
            keyboardType="phone-pad"
            value={form.contact}
            onChangeText={text => handleChange('contact', text)}
          />

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
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Write your summary or recommendation..."
            multiline
            value={form.remarks}
            onChangeText={text => handleChange('remarks', text)}
          />

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Inspection</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Uncomment and use your bottom navigation component */}
      {/* <BottomNav /> */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: 24,
    paddingTop: 32,      // Add space for header
    paddingBottom: 32,   // Add space for bottom nav
  },
  card: {
    backgroundColor: '#A7D7C5',
    borderRadius: 18,
    padding: 22,
    marginHorizontal: 18,
    width: '92%',
    alignSelf: 'center',
    elevation: 2,
    marginBottom: 32,    // Extra space at bottom
  },
  sectionTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#35796B',
    marginBottom: 10,
    marginTop: 18,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#35796B',
    borderRadius: 5,
    marginRight: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#25A18E',
    backgroundColor: '#C8E6C9',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#25A18E',
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#35796B',
  },
  photoBtn: {
    backgroundColor: '#25A18E',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  photoBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  submitBtn: {
    backgroundColor: '#35796B',
    padding: 15,
    borderRadius: 10,
    marginTop: 18,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 17,
  },
});