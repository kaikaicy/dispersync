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

// 🔥 Firebase (use your specified path)
import { auth, db } from './src/config/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  getDocs,
  documentId,
  getDoc,
  doc,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// --- Helpers to normalize/parse municipality from address ---

const normalize = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/["']/g, '')     // strip quotes
    .replace(/\s+/g, ' ')     // collapse spaces
    .trim();

/** Extract municipality from a full address like:
 *  "Purok 4, Cabanbanan, San Vicente"
 *  We take the last comma-separated part as municipality.
 */
const extractMunicipalityFromAddress = (address) => {
  const parts = String(address || '')
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return '';
  // Municipality is usually the last segment
  const last = parts[parts.length - 1];
  return normalize(last);
};


// helper: chunk array for Firestore "in" queries (max 10)
const chunk = (arr, size = 10) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );

// normalize a Firestore livestock value to an array of lowercase tokens
const toLivestockArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map((v) => String(v).toLowerCase().trim());
  // handle strings like "Cattle, Poultry" or "swine"
  return String(val)
    .split(',')
    .map((s) => s.toLowerCase().trim())
    .filter(Boolean);
};

export default function ListOfBeneficiaries() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState(null);

  const [beneficiaries, setBeneficiaries] = useState([]); // joined, approved
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [staffMunicipality, setStaffMunicipality] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  // Livestock filter state + dropdown
  const [livestockFilter, setLivestockFilter] = useState('all');
  const [livestockPickerOpen, setLivestockPickerOpen] = useState(false);
  const LIVESTOCK_OPTIONS = ['all', 'chicken', 'swine', 'carabao', 'cattle'];

  const [beneficiariesLive, setBeneficiariesLive] = useState([]);
const [loadingBeneficiariesLive, setLoadingBeneficiariesLive] = useState(true);

useEffect(() => {
  // Wait until auth is known so we can read staff municipality
  if (!authReady) return;

  // Use Firestore query to filter by municipality field
  const qRef = staffMunicipality
    ? query(collection(db, 'beneficiaries'), where('municipality', '==', staffMunicipality))
    : collection(db, 'beneficiaries');

  const unsub = onSnapshot(
    qRef,
    (snap) => {
      const rows = snap.docs.map((d) => {
        const data = d.data() || {};
        
        return {
          id: d.id,
          name: data.name || data.fullName || '(No name)',
          barangay: data.barangay || null,
          municipality: data.municipality || null, // Now using the separate municipality field
          address: data.address || null,
          livestock: data.livestock || data.livestocks || null,
          contactNumber: data.contactNumber || null,
          sex: data.sex || null,
          age: data.age || null,
          card_uid: data.card_uid || null,
          inspectorName: data.inspectorName || null,
          verificationStatus: data.verificationStatus || 'pending',
          image: data.image || null,
          raw: data,
        };
      });

      setBeneficiariesLive(rows);
      setLoadingBeneficiariesLive(false);
    },
    (err) => {
      console.error('beneficiaries onSnapshot error:', err);
      setBeneficiariesLive([]);
      setLoadingBeneficiariesLive(false);
      Alert.alert('Error', err?.message || 'Failed to load beneficiaries.');
    }
  );

  return () => unsub();
}, [authReady, staffMunicipality]);

  // Watch auth → fetch staff/{uid} to get inspector municipality
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setStaffMunicipality(null);
          setAuthReady(true);
          return;
        }
        const sDoc = await getDoc(doc(db, 'staff', user.uid));
        const sData = sDoc.exists() ? sDoc.data() : {};
        const muni =
          sData?.municipality ||
          sData?.Municipality ||
          sData?.location?.municipality ||
          null;
        setStaffMunicipality(typeof muni === 'string' ? muni : null);
        setAuthReady(true);
      } catch (e) {
        console.error('Load staff municipality failed:', e);
        setStaffMunicipality(null);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Listen to approved inspections → join to applicants
  useEffect(() => {
    const q = query(collection(db, 'inspections'), where('status', '==', 'approved'));
    const unsub = onSnapshot(
      q,
      async (snap) => {
        try {
          const inspections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const applicantIds = Array.from(
            new Set(inspections.map((r) => r.applicantId).filter(Boolean))
          );

          if (applicantIds.length === 0) {
            setBeneficiaries([]);
            setLoading(false);
            return;
          }

          // batch fetch applicants
          const applicantsMap = {};
          for (const ids of chunk(applicantIds, 10)) {
            const qs = await getDocs(
              query(collection(db, 'applicants'), where(documentId(), 'in', ids))
            );
            qs.forEach((docSnap) => {
              applicantsMap[docSnap.id] = docSnap.data();
            });
          }

          // Deduplicate by applicant (keep the most recent by inspectionDate if present)
          const rowsByApplicant = {};
          for (const insp of inspections) {
            const app = applicantsMap[insp.applicantId] || {};
            const row = {
              id: insp.applicantId,
              name: app.fullName || '(No name)',
              barangay: app.barangay || '-',
              municipality: app.municipality || '-',
              address: app.address || '-',
              livestock: app.livestock || '-', // can be string or array
              status: 'Active', // display-friendly mapping for approved
              applicant: app,
              inspection: insp,
            };

            const existing = rowsByApplicant[insp.applicantId];
            if (!existing) {
              rowsByApplicant[insp.applicantId] = row;
            } else {
              const dtNew = insp?.inspectionDate?.toMillis?.() ?? 0;
              const dtOld =
                existing?.inspection?.inspectionDate?.toMillis?.() ?? 0;
              if (dtNew > dtOld) rowsByApplicant[insp.applicantId] = row;
            }
          }

          setBeneficiaries(Object.values(rowsByApplicant));
          setLoading(false);
        } catch (err) {
          console.error('Load approved beneficiaries failed:', err);
          setLoading(false);
          Alert.alert('Error', err?.message || 'Failed to load beneficiaries.');
        }
      },
      (err) => {
        console.error('onSnapshot error:', err);
        setLoading(false);
        Alert.alert('Error', err?.message || 'Failed to listen for beneficiaries.');
      }
    );

    return () => unsub();
  }, []);

  const showBeneficiaryDetails = (beneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setIsModalVisible(true);
  };
  const closeModal = () => {
    setIsModalVisible(false);
    setSelectedBeneficiary(null);
  };
// Since we're now using Firestore queries to filter by municipality,
// we can directly use beneficiariesLive (which is already filtered by municipality)
const beneficiariesForStaff = useMemo(() => {
  return beneficiariesLive; // Already filtered by Firestore query
}, [beneficiariesLive]);

  // Filter by livestock type
  const livestockFiltered = useMemo(() => {
    const target = livestockFilter.toLowerCase();
    if (target === 'all') return beneficiariesForStaff;

    return beneficiariesForStaff.filter((b) => {
      const list = toLivestockArray(b.livestock);
      const normalized = list.map((x) =>
        x
          .replace(/poultry/, 'chicken')
          .replace(/chickens?/, 'chicken')
          .replace(/swines?/, 'swine')
          .replace(/carabaos?/, 'carabao')
          .replace(/cattles?/, 'cattle')
      );
      return normalized.includes(target);
    });
  }, [beneficiariesForStaff, livestockFilter]);

  // Search by name/barangay
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return livestockFiltered;
    return livestockFiltered.filter(
      (b) =>
        b.name?.toLowerCase().includes(s) ||
        b.barangay?.toLowerCase().includes(s)
    );
  }, [livestockFiltered, search]);

  const headerPlace =
    staffMunicipality && typeof staffMunicipality === 'string'
      ? staffMunicipality
      : 'your area';

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
          {`Beneficiaries to Visit in ${headerPlace}`}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}
        >
          {/* Keep Barangay button for future use */}
          <TouchableOpacity
            style={{
              backgroundColor: '#25A18E',
              borderRadius: 8,
              padding: 8,
              flex: 1,
              marginRight: 8,
            }}
          >
            <Text style={{ color: '#fff', textAlign: 'center' }}>Barangay</Text>
          </TouchableOpacity>

          {/* Livestock "combobox" */}
          <TouchableOpacity
            style={{
              backgroundColor: '#25A18E',
              borderRadius: 8,
              padding: 8,
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
            onPress={() => setLivestockPickerOpen(true)}
          >
            <Text style={{ color: '#fff', textAlign: 'center' }}>
              {`Livestock: ${livestockFilter === 'all'
                ? 'All'
                : livestockFilter.charAt(0).toUpperCase() + livestockFilter.slice(1)
              }`}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search box */}
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 8,
            marginBottom: 10,
          }}
        >
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            placeholder="Search beneficiaries..."
            style={{ flex: 1, padding: 8 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Table header */}
        <View
          style={{
            flexDirection: 'row',
            paddingVertical: 6,
            borderBottomWidth: 1,
            borderBottomColor: '#ccc',
          }}
        >
          <Text style={{ flex: 2, fontWeight: 'bold', color: '#25A18E' }}>
            Beneficiary
          </Text>
          <Text style={{ flex: 2, fontWeight: 'bold', color: '#25A18E' }}>
            Barangay
          </Text>
          <Text
            style={{
              flex: 1,
              fontWeight: 'bold',
              color: '#25A18E',
              textAlign: 'center',
            }}
          >
            Action
          </Text>
        </View>
      </View>

      {(!authReady || loadingBeneficiariesLive) ? (
        <View style={{ padding: 16 }}>
          <ActivityIndicator size="small" color="#25A18E" />
        </View>
      ) : (
        <ScrollView style={{ backgroundColor: '#F5F9F8' }}>
          {filtered.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={{ color: '#777' }}>No approved beneficiaries found.</Text>
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
                    setSelectedBeneficiary(b);
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

      {/* Beneficiary Details Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 16,
              padding: 24,
              margin: 20,
              width: '90%',
              maxWidth: 400,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#25A18E',
                }}
              >
                Beneficiary Details
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedBeneficiary && (
              <View>
                <DetailRow label="Beneficiary ID" value={selectedBeneficiary.id} />
                <DetailRow label="Name" value={selectedBeneficiary.name} />
                <DetailRow
                  label="Address"
                  value={selectedBeneficiary.address || '—'}
                />
                <DetailRow
                  label="Barangay"
                  value={selectedBeneficiary.barangay || '—'}
                />
                <DetailRow
                  label="Municipality"
                  value={selectedBeneficiary.municipality || '—'}
                />
                <DetailRow
                  label="Contact Number"
                  value={selectedBeneficiary.contactNumber || '—'}
                />
                <DetailRow
                  label="Sex"
                  value={selectedBeneficiary.sex || '—'}
                />
                <DetailRow
                  label="Age"
                  value={selectedBeneficiary.age ? String(selectedBeneficiary.age) : '—'}
                />
                <DetailRow
                  label="Card UID"
                  value={selectedBeneficiary.card_uid || '—'}
                />
                <DetailRow
                  label="Inspector"
                  value={selectedBeneficiary.inspectorName || '—'}
                />
                <DetailRow
                  label="Status"
                  value={selectedBeneficiary.verificationStatus || '—'}
                />
                <DetailRow
                  label="Livestock"
                  value={
                    Array.isArray(selectedBeneficiary.livestock)
                      ? selectedBeneficiary.livestock.join(', ')
                      : selectedBeneficiary.livestock || '—'
                  }
                />
                {selectedBeneficiary.image && (
                  <DetailRow
                    label="Image"
                    value={selectedBeneficiary.image.url ? 'Uploaded' : '—'}
                  />
                )}
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

      {/* Livestock dropdown/combobox */}
      <Modal
        visible={livestockPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLivestockPickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
          onPressOut={() => setLivestockPickerOpen(false)}
        >
          <View
            style={{
              backgroundColor: '#fff',
              borderRadius: 12,
              width: '100%',
              maxWidth: 360,
              paddingVertical: 8,
            }}
          >
            {LIVESTOCK_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  setLivestockFilter(opt);
                  setLivestockPickerOpen(false);
                }}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: '#333',
                    textTransform: opt === 'all' ? 'none' : 'capitalize',
                  }}
                >
                  {opt === 'all' ? 'All' : opt}
                </Text>
                {livestockFilter === opt && (
                  <Ionicons name="checkmark" size={18} color="#25A18E" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function DetailRow({ label, value }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-start',
      }}
    >
      <Text
        style={{
          flex: 1,
          fontWeight: 'bold',
          color: '#25A18E',
          fontSize: 16,
        }}
      >
        {label}:
      </Text>
      <Text
        style={{
          flex: 2,
          color: '#333',
          fontSize: 16,
          lineHeight: 22,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
