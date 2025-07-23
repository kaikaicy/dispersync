import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ListOfBeneficiaries() {
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
        {[1, 2, 3, 4, 5].map((_, i) => (
          <View key={i} style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#fff',
            marginHorizontal: 8,
            marginVertical: 4,
            borderRadius: 8,
            padding: 10
          }}>
            <Text style={{ flex: 2, color: '#333' }}>Anika Feller</Text>
            <Text style={{ flex: 2, color: '#333' }}>Paracale</Text>
            <TouchableOpacity style={{
              flex: 1,
              backgroundColor: '#25A18E',
              borderRadius: 16,
              paddingVertical: 4,
              alignItems: 'center'
            }}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>View</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}