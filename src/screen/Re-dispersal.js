import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView, Platform, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function Dispersal({ navigation, onBackToTransactions }) {
  const [currentBeneficiary, setCurrentBeneficiary] = useState('');
  const [livestockId, setLivestockId] = useState('');
  const [livestockType, setLivestockType] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [dateDisperse, setDateDisperse] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMunicipalityPicker, setShowMunicipalityPicker] = useState(false);
  const [showBarangayPicker, setShowBarangayPicker] = useState(false);

  const municipalities = [
    'Basud', 'Capalonga', 'Daet', 'Jose Panganiban', 'Labo', 'Mercedes', 
    'Paracale', 'San Lorenzo Ruiz', 'San Vicente', 'Sta. Elena', 'Talisay', 'Vinzons'
  ];

  const barangayData = {
    'Basud': ['Angas', 'Bactas', 'Binatagan', 'Caayunan', 'Guinatungan', 'Hinampacan', 'Langa', 'Laniton', 'Lidong', 'Mampili', 'Mandazo', 'Mangcamagong', 'Manmuntay', 'Mantugawe', 'Matnog', 'Mocong', 'Oliva', 'Pagsangahan', 'Pinagwarasan', 'Plaridel', 'Poblacion 1', 'Poblacion 2', 'San Felipe', 'San Jose', 'San Pascual', 'Taba-taba', 'Tacad', 'Taisan', 'Tuaca'],
    'Capalonga': [ 'Alayao', 'Binawangan', 'Calabaca', 'Camagsaan', 'Catabaguangan', 'Catioan', 'Del Pilar', 'Itok', 'Lucbanan', 'Mabini', 'Mactang', 'Magsaysay', 'Mataque', 'Old Camp', 'Poblacion', 'San Antonio', 'San Isidro', 'San Roque', 'Tanawan', 'Ubang', 'Villa Aurora', 'Villa Belen'],
    'Daet': [ 'Alawihao', 'Awitan', 'Bagasbas', 'Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Barangay V', 'Barangay VI', 'Barangay VII', 'Barangay VIII', 'Bibirao', 'Borabod', 'Calasgasan', 'Camambugan', 'Cobangbang', 'Dogongan', 'Gahonon', 'Gubat', 'Lag-on', 'Magang', 'Mambalite', 'Mancruz', 'Pamorangon', 'San Isidro'],
    'Jose Panganiban': [ 'Bagong Bayan', 'Calero', 'Dahican', 'Dayhagan', 'Larap', 'Luklukan Norte', 'Luklukan Sur', 'Motherlode', 'Nakalaya', 'North Poblacion', 'Osmeña', 'Pag-asa', 'Parang', 'Plaridel', 'Salvacion', 'San Isidro', 'San Jose', 'San Martin', 'San Pedro', 'San Rafael', 'Santa Cruz', 'Santa Elena', 'Santa Milagrosa', 'Santa Rosa Norte', 'Santa Rosa Sur', 'South Poblacion', 'Tamisan'],
    'Labo': [ 'Anahaw', 'Anameam', 'Awitan', 'Baay', 'Bagacay', 'Bagong Silang I', 'Bagong Silang II', 'Bagong Silang III', 'Bakiad', 'Bautista', 'Bayabas', 'Bayan-bayan', 'Benit', 'Bulhao', 'Cabatuhan', 'Cabusay', 'Calabasa', 'Canapawan', 'Daguit', 'Dalas', 'Dumagmang', 'Exciban', 'Fundado', 'Guinacutan', 'Guisican', 'Gumamela', 'Iberica', 'Kalamunding', 'Lugui', 'Mabilo I', 'Mabilo II', 'Macogon', 'Mahawan-hawan', 'Malangcao-Basud', 'Malasugui', 'Malatap', 'Malaya', 'Malibago', 'Maot', 'Masalong', 'Matanlang', 'Napaod', 'Pag-asa', 'Pangpang', 'Pinya', 'San Antonio', 'San Francisco', 'Santa Cruz', 'Submakin', 'Talobatib', 'Tigbinan', 'Tulay na Lupa'],
    'Mercedes': [ 'Apuao', 'Barangay I', 'Barangay II', 'Barangay III', 'Barangay IV', 'Barangay V', 'Barangay VI', 'Barangay VII', 'Caringo', 'Catandunganon', 'Cayucyucan', 'Colasi', 'Del Rosario', 'Gaboc', 'Hamoraon', 'Hinipaan', 'Lalawigan', 'Lanot', 'Mambungalon', 'Manguisoc', 'Masalongsalong', 'Matoogtoog', 'Pambuhan', 'Quinapaguian', 'San Roque', 'Tarum'],
    'Paracale': ['Awitan', 'Bagumbayan', 'Bakal', 'Batobalani', 'Calaburnay', 'Capacuan', 'Casalugan', 'Dagang', 'Dalnac', 'Dancalan', 'Gumaos', 'Labnig', 'Macolabo Island', 'Malacbang', 'Malaguit', 'Mampungo', 'Mangkasay', 'Maybato', 'Palanas', 'Pinagbirayan Malaki', 'Pinagbirayan Munti', 'Poblacion Norte', 'Poblacion Sur', 'Tabas', 'Talusan', 'Tawig', 'Tugos'],
    'San Lorenzo Ruiz': [ 'Daculang Bolo', 'Dagotdotan', 'Langga', 'Laniton', 'Maisog', 'Mampurog', 'Manlimonsito', 'Matacong', 'San Antonio', 'San Isidro', 'San Ramon'],
    'San Vicente': [ 'Asdum', 'Cabanbanan', 'Calabagas', 'Fabrica', 'Iraya Sur', 'Man-ogob', 'Poblacion District I', 'Poblacion District II', 'San Jose'],
    'Sta. Elena': [ 'Basiad', 'Bulala', 'Don Tomas', 'Guitol', 'Kabuluan', 'Kagtalaba', 'Maulawin', 'Patag Ibaba', 'Patag Iraya', 'Plaridel', 'Polungguitguit', 'Rizal', 'Salvacion', 'San Lorenzo', 'San Pedro', 'San Vicente', 'Santa Elena', 'Tabugon', 'Villa San Isidro'],
    'Talisay': [ 'Binanuaan', 'Caawigan', 'Cahabaan', 'Calintaan', 'Del Carmen', 'Gabon', 'Itomang', 'Poblacion', 'San Francisco', 'San Isidro', 'San Jose', 'San Nicolas', 'Santa Cruz', 'Santa Elena', 'Santo Niño'],
    'Vinzons': [ 'Aguit-it', 'Banocboc', 'Barangay I', 'Barangay II', 'Barangay III', 'Cagbalogo', 'Calangcawan Norte', 'Calangcawan Sur', 'Guinacutan', 'Mangcawayan', 'Mangcayo', 'Manlucugan', 'Matango', 'Napilihan', 'Pinagtigasan', 'Sabang', 'Santo Domingo', 'Singi', 'Sula']
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDateDisperse(selectedDate.toLocaleDateString());
    }
  };

  const handleMunicipalitySelect = (selectedMunicipality) => {
    setMunicipality(selectedMunicipality);
    setBarangay('Barangay'); // Reset barangay when municipality changes
    setShowMunicipalityPicker(false);
  };

  const handleBarangaySelect = (selectedBarangay) => {
    setBarangay(selectedBarangay);
    setShowBarangayPicker(false);
  };

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

  const cardStyle = {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: colors.background }]}>
      {/* Fixed Header */}
      <View style={[styles.header, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={onBackToTransactions} 
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.primary }]}>Dispersal of Livestock</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={cardStyle}>
            <View style={[styles.iconContainer, { backgroundColor: colors.background, shadowColor: colors.primary }]}>
              <Ionicons 
                name="business" 
                size={40}
                color={colors.accent} 
                style={{shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8,}} 
              />
            </View>
            
            <Text style={[styles.subtitle, { color: colors.textLight }]}>
              Record the details of livestock dispersal
            </Text>

            <Text style={[styles.label, { color: colors.primary }]}>Current Beneficiary</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter Name"
              value={currentBeneficiary}
              onChangeText={setCurrentBeneficiary}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.label, { color: colors.primary }]}>Livestock ID</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter ID No."
              value={livestockId}
              onChangeText={setLivestockId}
              placeholderTextColor={colors.textLight}
            />

            <Text style={[styles.label, { color: colors.primary }]}>Livestock Type</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              placeholder="Enter Livestock Type"
              value={livestockType}
              onChangeText={setLivestockType}
              placeholderTextColor={colors.textLight}
            />

            <View style={[styles.card, { backgroundColor: colors.background }]}>
              <Text style={[styles.cardTitle, { color: colors.primary }]}>New Beneficiary</Text>
              <Text style={[styles.label, { color: colors.primary }]}>Name of Recipient</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                placeholder="Enter Name"
                value={recipientName}
                onChangeText={setRecipientName}
                placeholderTextColor={colors.textLight}
              />
              <Text style={[styles.label, { color: colors.primary }]}>Municipality</Text>
              <TouchableOpacity 
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                onPress={() => setShowMunicipalityPicker(true)}
              >
                <Text style={{ color: municipality ? colors.text : colors.textLight }}>
                  {municipality || 'Choose Municipality'}
                </Text>
              </TouchableOpacity>

              <Text style={[styles.label, { color: colors.primary }]}>Barangay</Text>
              <TouchableOpacity 
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                onPress={() => setShowBarangayPicker(true)}
              >
                <Text style={{ color: barangay ? colors.text : colors.textLight }}>
                  {barangay || 'Choose Barangay'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.primary }]}>Date Disperse</Text>
            <View style={[styles.inputContainer, { borderColor: colors.border }]}>
              <TouchableOpacity 
                style={styles.dateInput}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: colors.text }}>{dateDisperse || 'Select Date'}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.calendarIcon}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={dateDisperse ? new Date(dateDisperse) : new Date()}
                mode="date"
                display="default"
                onChange={handleDateChange}
              />
            )}

            <Modal
              visible={showMunicipalityPicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
                  <Text style={[styles.modalTitle, { color: colors.primary }]}>Select Municipality</Text>
                  <ScrollView style={styles.modalScrollView}>
                    {municipalities.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.modalItem, { borderBottomColor: colors.border }]}
                        onPress={() => handleMunicipalitySelect(item)}
                      >
                        <Text style={{ color: colors.text }}>{item}</Text>
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

            <Modal
              visible={showBarangayPicker}
              transparent={true}
              animationType="slide"
            >
              <View style={styles.modalContainer}>
                <View style={[styles.modalContent, { backgroundColor: colors.white }]}>
                  <Text style={[styles.modalTitle, { color: colors.primary }]}>Select Barangay</Text>
                  <ScrollView style={styles.modalScrollView}>
                    {barangayData[municipality]?.map((item) => (
                      <TouchableOpacity
                        key={item}
                        style={[styles.modalItem, { borderBottomColor: colors.border }]}
                        onPress={() => handleBarangaySelect(item)}
                      >
                        <Text style={{ color: colors.text }}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: colors.accent }]}
                    onPress={() => setShowBarangayPicker(false)}
                  >
                    <Text style={styles.modalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <TouchableOpacity style={[styles.button, { backgroundColor: colors.accent }]}>
              <Text style={styles.buttonText}>Submit for Verification</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#e6f4f1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F4EC',
    backgroundColor: '#F8FFFE',
    ...Platform.select({
      ios: {
        shadowColor: '#25A18E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
    zIndex: 1000,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25A18E',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  iconContainer: {
    backgroundColor: '#E3F4EC',
    borderRadius: 40,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerIcon: {
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 10,
    color: '#666',
  },
  label: {
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    fontSize: 14,
    alignSelf: 'flex-start',
    color: '#25A18E',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 4,
    width: '100%',
    borderColor: '#E3F4EC',
    color: '#25A18E',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 16,
    width: '100%',
    backgroundColor: '#e6f4f1',
  },
  cardTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 16,
    alignSelf: 'center',
    color: '#25A18E',
  },
  disabledInput: {
    color: '#666',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    width: '100%',
    backgroundColor: '#4fd1c5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  backButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: '70%',
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  modalButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  dateInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#25A18E',
  },
  calendarIcon: {
    padding: 10,
    borderLeftWidth: 1,
    borderLeftColor: '#E3F4EC',
  },
}); 