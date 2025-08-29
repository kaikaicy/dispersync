import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome } from '@expo/vector-icons';

export default function IconTest() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Icon Test</Text>
      
      <View style={styles.iconRow}>
        <Text>Ionicons:</Text>
        <Ionicons name="star" size={24} color="gold" />
        <Ionicons name="heart" size={24} color="red" />
        <Ionicons name="checkmark" size={24} color="green" />
      </View>
      
      <View style={styles.iconRow}>
        <Text>MaterialIcons:</Text>
        <MaterialIcons name="home" size={24} color="blue" />
        <MaterialIcons name="favorite" size={24} color="red" />
        <MaterialIcons name="star" size={24} color="gold" />
      </View>
      
      <View style={styles.iconRow}>
        <Text>FontAwesome:</Text>
        <FontAwesome name="home" size={24} color="blue" />
        <FontAwesome name="heart" size={24} color="red" />
        <FontAwesome name="star" size={24} color="gold" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
    gap: 10,
  },
});
