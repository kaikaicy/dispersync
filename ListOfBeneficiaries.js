import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ListOfBeneficiaries() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  // Sample beneficiary data - in a real app, this would come from an API or database
  const beneficiaries = [
    {
      id: 'BEN001',
      name: 'Anika Feller',
      address: '123 Main Street, Paracale, Camarines Norte',
      livestock: 'Cattle, Poultry',
      status: 'Active',
      barangay: 'Paracale'
    },
    {
      id: 'BEN002',
      name: 'Maria Santos',
      address: '456 Rural Road, Paracale, Camarines Norte',
      livestock: 'Swine, Goats',
      status: 'Active',
      barangay: 'Paracale'
    },
    {
      id: 'BEN003',
      name: 'Juan Dela Cruz',
      address: '789 Farm Lane, Paracale, Camarines Norte',
      livestock: 'Cattle, Carabao',
      status: 'Inactive',
      barangay: 'Paracale'
    },
    {
      id: 'BEN004',
      name: 'Ana Rodriguez',
      address: '321 Village Street, Paracale, Camarines Norte',
      livestock: 'Poultry, Ducks',
      status: 'Active',
      barangay: 'Paracale'
    },
    {
      id: 'BEN005',
      name: 'Pedro Martinez',
      address: '654 Country Road, Paracale, Camarines Norte',
      livestock: 'Swine, Cattle',
      status: 'Active',
      barangay: 'Paracale'
    }
  ];

  const showBeneficiaryDetails = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedBeneficiary(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F9F8' }}>
      <View style={{
        backgroundColor: '#D9D9D9',
        padding: 16,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8
      }}>
        <Text style={{
          fontWeight: 'bold',
          fontSize: 17,
          color: '#25A18E',
          textAlign: 'center',
          marginBottom: 10
        }}>
          Beneficiaries to Visit in Paracale
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity style={{
            backgroundColor: '#25A18E',
            borderRadius: 8,
            padding: 8,
            flex: 1,
            marginRight: 8
          }}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>Barangay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{
            backgroundColor: '#25A18E',
            borderRadius: 8,
            padding: 8,
            flex: 1
          }}>
            <Text style={{ color: '#fff', textAlign: 'center' }}>Livestock</Text>
          </TouchableOpacity>
        </View>
        <View style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          marginBottom: 10
        }}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput placeholder="Search beneficiaries..." style={{ flex: 1, padding: 8 }} />
        </View>
        <View style={{
          flexDirection: 'row',
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: '#ccc'
        }}>
          <Text style={{ flex: 2, fontWeight: 'bold', color: '#25A18E' }}>Beneficiary</Text>
          <Text style={{ flex: 2, fontWeight: 'bold', color: '#25A18E' }}>Barangay</Text>
          <Text style={{ flex: 1, fontWeight: 'bold', color: '#25A18E', textAlign: 'center' }}>Action</Text>
        </View>
      </View>
      <ScrollView style={{ backgroundColor: '#F5F9F8' }}>
        {beneficiaries.map((beneficiary, i) => (
          <View key={i} style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 8,
            padding: 10
          }}>
            <Text style={{ flex: 2, color: '#333' }}>{beneficiary.name}</Text>
            <Text style={{ flex: 2, color: '#333' }}>{beneficiary.barangay}</Text>
            <TouchableOpacity 
              style={{
                flex: 1,
                backgroundColor: '#25A18E',
                borderRadius: 16,
                paddingVertical: 4,
                alignItems: 'center'
              }}
              onPress={() => showBeneficiaryDetails(beneficiary)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>View</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {/* Beneficiary Details Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            margin: 20,
            width: '90%',
            maxWidth: 400
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#25A18E'
              }}>
                Beneficiary Details
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedBeneficiary && (
              <View>
                <View style={styles.detailRow}>
                  <Text style={styles.label}>ID:</Text>
                  <Text style={styles.value}>{selectedBeneficiary.id}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Name:</Text>
                  <Text style={styles.value}>{selectedBeneficiary.name}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Address:</Text>
                  <Text style={styles.value}>{selectedBeneficiary.address}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Livestock:</Text>
                  <Text style={styles.value}>{selectedBeneficiary.livestock}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.label}>Status:</Text>
                  <View style={{
                    backgroundColor: selectedBeneficiary.status === 'Active' ? '#4CAF50' : '#F44336',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12
                  }}>
                    <Text style={{
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: 12
                    }}>
                      {selectedBeneficiary.status}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#25A18E',
                borderRadius: 8,
                padding: 12,
                marginTop: 20,
                alignItems: 'center'
              }}
              onPress={closeModal}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = {
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start'
  },
  label: {
    flex: 1,
    fontWeight: 'bold',
    color: '#25A18E',
    fontSize: 16
  },
  value: {
    flex: 2,
    color: '#333',
    fontSize: 16,
    lineHeight: 22
  }
};