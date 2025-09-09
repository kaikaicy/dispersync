import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function Transaction({ navigation, onSelectTransaction, scannedUID }) {
  const cardStyle = {
    backgroundColor: '#F8FFFE',
    borderRadius: 32,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: 320,
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  };

  const accentColor = '#25A18E';
  const gradientColors = ['#4fd1c5', '#38b2ac', '#4299e1'];

  const TransactionButton = ({ icon, title, onPress }) => (
    <TouchableOpacity 
      style={styles.transactionButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={gradientColors}
        style={styles.buttonGradient}
      >
        <Ionicons name={icon} size={24} color="#fff" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#e6f4f1' }}>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={cardStyle}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="list" 
                size={40}
                color={accentColor} 
                style={styles.headerIcon} 
              />
            </View>
            
            <Text style={styles.title}>Select a Transaction</Text>
            {scannedUID && (
              <View style={styles.uidContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#25A18E" style={styles.uidIcon} />
                <Text style={styles.uidText}>Card UID: {scannedUID}</Text>
              </View>
            )}
            <Text style={styles.subtitle}>
              Choose the type of transaction you want to perform
            </Text>
            
            <TransactionButton 
              icon="business"
              title="Dispersal of Livestock"
              onPress={() => onSelectTransaction('Dispersal')}
            />

            <TransactionButton 
              icon="medkit"
              title="Record a Cull/Slaughter"
              onPress={() => onSelectTransaction('Cull')}
            />

            <TransactionButton 
              icon="people"
              title="Add Beneficiary"
              onPress={() => onSelectTransaction('Beneficiary')}
            />

            <TransactionButton 
              icon="pulse"
              title="Add Status"
              onPress={() => onSelectTransaction('Status')}
            />

            <TouchableOpacity 
              onPress={() => onSelectTransaction('Dashboard')} 
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#e6f4f1',
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#e6f4f1',
  },
  iconContainer: {
    backgroundColor: '#E3F4EC',
    borderRadius: 40,
    padding: 10,
    marginBottom: 10,
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#25A18E',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  transactionButton: {
    width: '100%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  backButton: {
    marginTop: 16,
    padding: 8,
  },
  backButtonText: {
    color: '#25A18E',
    fontSize: 16,
    fontWeight: '600',
  },
  uidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F4EC',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#25A18E',
  },
  uidIcon: {
    marginRight: 8,
  },
  uidText: {
    color: '#25A18E',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
}); 