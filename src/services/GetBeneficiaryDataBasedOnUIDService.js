// src/services/GetBeneficiaryDataBasedOnUIDService.js

import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Service to check if a UID exists in the beneficiaries collection
 * and retrieve beneficiary data based on card_uid field
 * 
 * @param {string} cardUID - The card UID to search for
 * @returns {Promise<{exists: boolean, data: object|null, error: string|null}>}
 */
export async function getBeneficiaryDataByUID(cardUID) {
  try {
    if (!cardUID || typeof cardUID !== 'string') {
      return {
        exists: false,
        data: null,
        error: 'Invalid UID provided'
      };
    }

    // Create a query to find documents where card_uid matches the provided UID
    const beneficiariesRef = collection(db, 'beneficiaries');
    const q = query(
      beneficiariesRef,
      where('card_uid', '==', cardUID),
      limit(1) // Only get the first match
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        exists: false,
        data: null,
        error: null
      };
    }

    // Get the first document
    const doc = querySnapshot.docs[0];
    const beneficiaryData = {
      id: doc.id,
      ...doc.data()
    };

    return {
      exists: true,
      data: beneficiaryData,
      error: null
    };

  } catch (error) {
    console.error('Error checking beneficiary UID:', error);
    return {
      exists: false,
      data: null,
      error: error.message || 'Failed to check beneficiary data'
    };
  }
}

/**
 * Service to validate if a UID exists in the beneficiaries collection
 * (lightweight version that only checks existence)
 * 
 * @param {string} cardUID - The card UID to validate
 * @returns {Promise<{exists: boolean, error: string|null}>}
 */
export async function validateBeneficiaryUID(cardUID) {
  try {
    if (!cardUID || typeof cardUID !== 'string') {
      return {
        exists: false,
        error: 'Invalid UID provided'
      };
    }

    const beneficiariesRef = collection(db, 'beneficiaries');
    const q = query(
      beneficiariesRef,
      where('card_uid', '==', cardUID),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    return {
      exists: !querySnapshot.empty,
      error: null
    };

  } catch (error) {
    console.error('Error validating beneficiary UID:', error);
    return {
      exists: false,
      error: error.message || 'Failed to validate UID'
    };
  }
}

export default {
  getBeneficiaryDataByUID,
  validateBeneficiaryUID
};
