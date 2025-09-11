import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { auth, db } from './src/config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  documentId,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const chunk = (arr, size = 10) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

export default function ListForDispersal() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const [rows, setRows] = useState([]); // applicants approved for dispersal
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [staffMunicipality, setStaffMunicipality] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setStaffMunicipality(null);
          setAuthReady(true);
          return;
        }
        // read staff profile to get municipality
        const staffRef = collection(db, 'staff');
        const q = query(staffRef, where(documentId(), '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs[0]?.data() || {};
        const muni = data.municipality || data.Municipality || data?.location?.municipality || null;
        setStaffMunicipality(typeof muni === 'string' ? muni : null);
      } catch (e) {
        console.error('Load staff municipality failed:', e);
        setStaffMunicipality(null);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Listen to inspections approved → these applicants are ready for dispersal
  useEffect(() => {
    const qInsp = query(collection(db, 'inspections'), where('status', '==', 'approved'));
    const unsub = onSnapshot(
      qInsp,
      async (snap) => {
        try {
          const inspections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const applicantIds = Array.from(new Set(inspections.map((r) => r.applicantId).filter(Boolean)));

          if (applicantIds.length === 0) {
            setRows([]);
            setLoading(false);
            return;
          }

          // fetch applicants in batches
          const applicants = [];
          for (const ids of chunk(applicantIds, 10)) {
            const aSnap = await getDocs(
              query(collection(db, 'applicants'), where(documentId(), 'in', ids))
            );
            aSnap.forEach((doc) => applicants.push({ id: doc.id, ...doc.data() }));
          }

          // build rows
          const combined = applicants.map((app) => ({
            id: app.id,
            name: app.fullName || '(No name)',
            barangay: app.barangay || '-',
            municipality: app.municipality || '-',
            address: app.address || '-',
            livestock: app.livestock || '-',
            applicant: app,
          }));

          setRows(combined);
          setLoading(false);
        } catch (err) {
          console.error('Load list for dispersal failed:', err);
          setLoading(false);
          Alert.alert('Error', err?.message || 'Failed to load list for dispersal.');
        }
      },
      (err) => {
        console.error('onSnapshot error (dispersal list):', err);
        setLoading(false);
        Alert.alert('Error', err?.message || 'Failed to listen for dispersal list.');
      }
    );

    return () => unsub();
  }, []);

  const municipalityFiltered = useMemo(() => {
    if (!staffMunicipality) return rows;
    const target = String(staffMunicipality).toLowerCase().trim();
    return rows.filter((b) => String(b.municipality || '').toLowerCase().trim() === target);
  }, [rows, staffMunicipality]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return municipalityFiltered;
    return municipalityFiltered.filter(
      (b) => b.name?.toLowerCase().includes(s) || b.barangay?.toLowerCase().includes(s)
    );
  }, [municipalityFiltered, search]);

  const headerPlace = staffMunicipality && typeof staffMunicipality === 'string' ? staffMunicipality : 'your area';

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F9F8' }}>
      <View
        style={{
          backgroundColor: '#D9D9D9',
          padding: 16,
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
        }}
      >
        <Text
          style={{
            fontWeight: 'bold',
            fontSize: 17,
            color: '#25A18E',
            textAlign: 'center',
            marginBottom: 10,
          }}
        >
          {`For Dispersal in ${headerPlace}`}
        </Text>

        <View style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          marginBottom: 10,
        }}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            placeholder="Search applicants..."
            style={{ flex: 1, padding: 8 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <View style={{
          flexDirection: 'row',
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: '#ccc',
        }}>
          <Text style={{ flex: 2, fontWeight: 'bold', color: '#25A18E' }}>Applicant</Text>
          <Text style={{ flex: 2, fontWeight: 'bold', color: '#25A18E' }}>Barangay</Text>
          <Text style={{ flex: 1, fontWeight: 'bold', color: '#25A18E', textAlign: 'center' }}>Action</Text>
        </View>
      </View>

      {(!authReady || loading) ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator size="small" color="#25A18E" />
        </View>
      ) : (
        <ScrollView style={{ backgroundColor: '#F5F9F8' }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: '#777' }}>No applicants ready for dispersal.</Text>
            </View>
          ) : (
            filtered.map((b, i) => (
              <View
                key={`${b.id}-${i}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#fff',
                  marginHorizontal: 8,
                  marginVertical: 4,
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <Text style={{ flex: 2, color: '#333' }}>{b.name}</Text>
                <Text style={{ flex: 2, color: '#333' }}>{b.barangay}</Text>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: '#25A18E',
                    borderRadius: 16,
                    paddingVertical: 4,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setSelectedApplicant(b);
                    setIsModalVisible(true);
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>View</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 24,
            margin: 20,
            width: '90%',
            maxWidth: 400,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
            }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#25A18E' }}>Applicant Details</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedApplicant && (
              <View>
                <DetailRow label="Applicant ID" value={selectedApplicant.id} />
                <DetailRow label="Name" value={selectedApplicant.name} />
                <DetailRow label="Address" value={selectedApplicant.address || '—'} />
                <DetailRow label="Barangay" value={selectedApplicant.barangay || '—'} />
                <DetailRow label="Municipality" value={selectedApplicant.municipality || '—'} />
                <DetailRow label="Livestock" value={selectedApplicant.livestock || '—'} />
              </View>
            )}

            <TouchableOpacity
              style={{
                backgroundColor: '#25A18E',
                borderRadius: 8,
                padding: 12,
                marginTop: 20,
                alignItems: 'center',
              }}
              onPress={() => setIsModalVisible(false)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' }}>
      <Text style={{ flex: 1, fontWeight: 'bold', color: '#25A18E', fontSize: 16 }}>{label}:</Text>
      <Text style={{ flex: 2, color: '#333', fontSize: 16, lineHeight: 22 }}>{value}</Text>
    </View>
  );
}



