import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export default function ListToInspect() {
  const navigation = useNavigation();

  return (
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
          onPress={() => navigation.navigate('INSPECT')}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>INSPECT</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}