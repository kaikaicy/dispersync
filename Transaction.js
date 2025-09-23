import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getBeneficiaryDataByUID } from './src/services/GetBeneficiaryDataBasedOnUIDService';
import { db } from './src/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function Transaction({ navigation, onSelectTransaction, scannedUID }) {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [beneficiaryData, setBeneficiaryData] = useState(null);
  const [isNewCard, setIsNewCard] = useState(false);

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

  // Validate UID when scannedUID changes
  useEffect(() => {
    if (scannedUID) {
      validateUID();
    } else {
      setValidationResult(null);
      setBeneficiaryData(null);
      setIsNewCard(false);
    }
  }, [scannedUID]);

  // Auto-navigate to Dispersal for new cards
  useEffect(() => {
    if (isNewCard && !isValidating) {
      // Delay to show the "New Card Detected" message before navigating
      const timer = setTimeout(() => {
        onSelectTransaction('Dispersal');
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [isNewCard, isValidating, onSelectTransaction]);

  const validateUID = async () => {
    setIsValidating(true);
    setValidationResult(null);
    setBeneficiaryData(null);
    setIsNewCard(false);

    try {
      // First try to get data from beneficiaries collection using card_uid
      const beneficiariesQuery = query(
        collection(db, 'beneficiaries'),
        where('card_uid', '==', scannedUID)
      );
      const beneficiariesSnap = await getDocs(beneficiariesQuery);
      
      if (!beneficiariesSnap.empty) {
        // Found in beneficiaries collection
        const beneficiaryDoc = beneficiariesSnap.docs[0];
        const beneficiaryData = {
          id: beneficiaryDoc.id,
          ...beneficiaryDoc.data()
        };
        
        setBeneficiaryData(beneficiaryData);
        setValidationResult({
          exists: true,
          data: beneficiaryData,
          source: 'beneficiaries'
        });
        setIsNewCard(false);
        return;
      }

      // Fallback to the original service if not found in beneficiaries
      const result = await getBeneficiaryDataByUID(scannedUID);
      setValidationResult(result);
      
      if (result.exists && result.data) {
        setBeneficiaryData(result.data);
        setIsNewCard(false);
      } else {
        setIsNewCard(true);
      }
    } catch (error) {
      console.error('Error validating UID:', error);
      setValidationResult({
        exists: false,
        data: null,
        error: 'Failed to validate UID'
      });
      setIsNewCard(true);
    } finally {
      setIsValidating(false);
    }
  };

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

  // Loading screen when validating UID or when new card is being processed
  if (isValidating || (isNewCard && !isValidating)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#e6f4f1' }}>
        <View style={styles.container}>
          <View style={cardStyle}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.loadingText}>
                {isValidating ? 'Validating Card UID...' : 'New Card Detected. Redirecting...'}
              </Text>
              <Text style={styles.loadingSubtext}>
                {isValidating 
                  ? 'Please wait while we check the beneficiary database' 
                  : 'Preparing to add new beneficiary data'
                }
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
              <View style={[
                styles.uidContainer,
                styles.uidContainerValid 
              ]}>
                <Ionicons 
                  name="checkmark-circle"
                  size={20} 
                  color="#25A18E" 
                  style={styles.uidIcon} 
                />
                <Text style={[
                  styles.uidText,
                  styles.uidTextValid
                ]}>
                  Card UID: {scannedUID}
                </Text>
              </View>
            )}
            {validationResult && !validationResult.exists && (
              <View style={styles.newCardContainer}>
                <Ionicons name="information-circle" size={16} color="#f59e0b" style={styles.newCardIcon} />
                <Text style={styles.newCardText}>
                  New Card. No Data Installed. Redirecting to Dispersal...
                </Text>
              </View>
            )}
            {beneficiaryData && (
              <View style={styles.beneficiaryInfo}>
                <Text style={styles.beneficiaryName}>
                  {beneficiaryData.name || beneficiaryData.fullName || 'Unknown Beneficiary'}
                </Text>
                {beneficiaryData.municipality && (
                  <Text style={styles.beneficiaryDetails}>
                    {beneficiaryData.barangay ? `${beneficiaryData.barangay}, ` : ''}{beneficiaryData.municipality}
                  </Text>
                )}
                {beneficiaryData.livestock && (
                  <Text style={styles.beneficiaryDetails}>
                    Livestock: {Array.isArray(beneficiaryData.livestock) 
                      ? beneficiaryData.livestock.join(', ') 
                      : beneficiaryData.livestock}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.subtitle}>
              Choose the type of transaction you want to perform
            </Text>
            
            {/* Show different buttons based on card status */}
            {isNewCard ? (
              // For new cards, show only Dispersal button
              <TransactionButton 
                icon="business"
                title="Dispersal of Livestock"
                onPress={() => onSelectTransaction('Dispersal')}
              />
            ) : (
              // For existing cards, show Cull and Status buttons
              <>
                <TransactionButton 
                  icon="medkit"
                  title="Record a Cull/Slaughter"
                  onPress={() => onSelectTransaction('Cull')}
                />

                <TransactionButton 
                  icon="pulse"
                  title="Add Status"
                  onPress={() => onSelectTransaction('Status')}
                />
              </>
            )}

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
  uidContainerValid: {
    backgroundColor: '#E3F4EC',
    borderColor: '#25A18E',
  },
  uidContainerNew: {
    backgroundColor: '#FEF3C7',
    borderColor: '#f59e0b',
  },
  uidTextValid: {
    color: '#25A18E',
  },
  uidTextNew: {
    color: '#f59e0b',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25A18E',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  newCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  newCardIcon: {
    marginRight: 8,
  },
  newCardText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  beneficiaryInfo: {
    backgroundColor: '#E3F4EC',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#25A18E',
    width: '100%',
  },
  beneficiaryName: {
    color: '#25A18E',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  beneficiaryDetails: {
    color: '#666',
    fontSize: 14,
  },
}); 