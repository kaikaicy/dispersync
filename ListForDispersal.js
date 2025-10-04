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
  StyleSheet,
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

export default function ListForDispersal({ highlightScheduleId, onScanPress }) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  const [rows, setRows] = useState([]); // applicants approved for dispersal
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [highlightId, setHighlightId] = useState(null);

  // Filters
  const [muniFilter, setMuniFilter] = useState('all');
  const [brgyFilter, setBrgyFilter] = useState('all');
  const [livestockFilter, setLivestockFilter] = useState('all');
  const [muniPickerOpen, setMuniPickerOpen] = useState(false);
  const [brgyPickerOpen, setBrgyPickerOpen] = useState(false);
  const [livestockPickerOpen, setLivestockPickerOpen] = useState(false);

  useEffect(() => {
    if (highlightScheduleId) {
      setHighlightId(highlightScheduleId);
      // Removed timeout - highlight will persist until user interaction
    }
  }, [highlightScheduleId]);

  const [staffMunicipality, setStaffMunicipality] = useState(null);
  const [additionalMunicipalities, setAdditionalMunicipalities] = useState([]);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (!user) {
          setStaffMunicipality(null);
          setAdditionalMunicipalities([]);
          setAuthReady(true);
          return;
        }
        // read staff profile to get municipality and additionalMunicipalities
        const staffRef = collection(db, 'staff');
        const q = query(staffRef, where(documentId(), '==', user.uid));
        const snap = await getDocs(q);
        const data = snap.docs[0]?.data() || {};
        const muni = data.municipality || data.Municipality || data?.location?.municipality || null;
        setStaffMunicipality(typeof muni === 'string' ? muni : null);
        const additional = data.additionalMunicipalities || [];
        setAdditionalMunicipalities(Array.isArray(additional) ? additional : []);
      } catch (e) {
        console.error('Load staff municipality failed:', e);
        setStaffMunicipality(null);
        setAdditionalMunicipalities([]);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const qSched = query(collection(db, 'dispersalSchedules'));
    // Listen to both dispersalSchedules and beneficiaries
    let unsubSched = null;
    let unsubBeneficiaries = null;
    let latestSchedules = [];
    let latestApplicants = [];
    let latestBeneficiaryIds = [];

    // Helper to update rows after both data are loaded
    const updateRows = () => {
      // Only show pending schedules whose applicantId is NOT in beneficiaries
      const pendingSchedules = latestSchedules.filter((sched) => sched.status !== 'completed');
      const filtered = pendingSchedules.filter(
        (sched) => !latestBeneficiaryIds.includes(sched.applicantId)
      );
      const combined = filtered.map((sched) => {
        const app = latestApplicants.find((a) => a.id === sched.applicantId) || {};
        return {
          id: sched.id,
          applicantId: sched.applicantId,
          name: app.fullName || '(No name)',
          barangay: app.barangay || '-',
          municipality: app.municipality || '-',
          address: app.address || 'Address not specified',
          livestock: app.livestock || '-',
          contact: app.contact || 'No contact',
          scheduledFor: sched.scheduledFor,
          livestockSource: sched.livestockSource,
          applicant: app,
        };
      });
      setRows(combined);
      setLoading(false);
    };

    unsubSched = onSnapshot(
      qSched,
      async (snap) => {
        try {
          const schedules = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          latestSchedules = schedules;
          const applicantIds = Array.from(
            new Set(schedules.map((r) => r.applicantId).filter(Boolean))
          );
          if (applicantIds.length === 0) {
            latestApplicants = [];
            updateRows();
            return;
          }
          // fetch applicants in batches (with contact field)
          const applicants = [];
          for (const ids of chunk(applicantIds, 10)) {
            const aSnap = await getDocs(
              query(collection(db, 'applicants'), where(documentId(), 'in', ids))
            );
            aSnap.forEach((doc) =>
              applicants.push({ id: doc.id, ...doc.data() })
            );
          }
          latestApplicants = applicants;
          updateRows();
        } catch (err) {
          console.error('Load list for dispersal failed:', err);
          setLoading(false);
          Alert.alert(
            'Error',
            err?.message || 'Failed to load list for dispersal.'
          );
        }
      },
      (err) => {
        console.error('onSnapshot error (dispersal list):', err);
        setLoading(false);
        Alert.alert(
          'Error',
          err?.message || 'Failed to listen for dispersal list.'
        );
      }
    );

    // Listen to beneficiaries collection for live updates
    // Note: beneficiaries docs have random IDs; applicant linkage is in `applicantId` field
    unsubBeneficiaries = onSnapshot(
      collection(db, 'beneficiaries'),
      (snap) => {
        latestBeneficiaryIds = snap.docs
          .map((d) => (d.data() || {}).applicantId)
          .filter(Boolean);
        updateRows();
      },
      (err) => {
        console.error('beneficiaries onSnapshot error:', err);
        latestBeneficiaryIds = [];
        updateRows();
      }
    );

    return () => {
      if (unsubSched) unsubSched();
      if (unsubBeneficiaries) unsubBeneficiaries();
    };
  }, []);
  

  // Combine main and additional municipalities for filtering
  const municipalityFiltered = useMemo(() => {
    const allMunicipalities = [staffMunicipality, ...additionalMunicipalities.filter(m => !!m)].map(m => String(m).toLowerCase().trim());
    if (allMunicipalities.length === 0) return rows;
    return rows.filter((b) => allMunicipalities.includes(String(b.municipality || '').toLowerCase().trim()));
  }, [rows, staffMunicipality, additionalMunicipalities]);

  // Build dropdown options
  const municipalityOptions = useMemo(() => {
    const set = new Set();
    municipalityFiltered.forEach(r => {
      const m = (r.municipality || '').trim();
      if (m) set.add(m);
    });
    return ['all', ...Array.from(set).sort()];
  }, [municipalityFiltered]);

  const barangayOptions = useMemo(() => {
    const set = new Set();
    municipalityFiltered
      .filter(r => muniFilter === 'all' || (r.municipality || '') === muniFilter)
      .forEach(r => {
        const b = (r.barangay || '').trim();
        if (b) set.add(b);
      });
    return ['all', ...Array.from(set).sort()];
  }, [municipalityFiltered, muniFilter]);

  const livestockOptions = useMemo(() => {
    const set = new Set();
    municipalityFiltered.forEach(r => {
      const l = (r.livestock || '').trim();
      if (l) set.add(l.toLowerCase());
    });
    return ['all', ...Array.from(set).sort()];
  }, [municipalityFiltered]);

  // Apply filters pipeline
  const filtered = useMemo(() => {
    let list = municipalityFiltered;
    if (muniFilter !== 'all') {
      list = list.filter(r => (r.municipality || '') === muniFilter);
    }
    if (brgyFilter !== 'all') {
      list = list.filter(r => (r.barangay || '') === brgyFilter);
    }
    if (livestockFilter !== 'all') {
      list = list.filter(r => String(r.livestock || '').toLowerCase() === livestockFilter);
    }
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter(
      (b) => b.name?.toLowerCase().includes(s) || b.barangay?.toLowerCase().includes(s)
    );
  }, [municipalityFiltered, muniFilter, brgyFilter, livestockFilter, search]);

  const headerPlace = staffMunicipality && typeof staffMunicipality === 'string'
    ? [staffMunicipality, ...additionalMunicipalities.filter(m => !!m)].join(', ')
    : 'your area';

  // Colors and styles adapted from ListToInspect list view for consistent UI
  const colors = {
    primary: '#25A18E',
    background: '#FFFFE0',
    cardBg: '#F5F9F8',
    white: '#FFFFFF',
    border: '#E3F4EC',
    text: '#333',
    textLight: '#666',
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
          <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 15 }}>OLDMS</Text>
          <Text style={{ color: '#888', fontSize: 13 }}>
            {`For Dispersal in ${headerPlace}`}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: colors.primary, fontSize: 12, marginBottom: 4 }}>
            {filtered.length} Ready
          </Text>
        </View>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <View style={{
          backgroundColor: colors.white,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 8,
          marginBottom: 10,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Ionicons name="search" size={18} color="#888" />
          <TextInput
            placeholder="Search applicants..."
            style={{ flex: 1, padding: 8 }}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filters row */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <TouchableOpacity
            style={{ backgroundColor: colors.white, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            onPress={() => setMuniPickerOpen(true)}
          >
            <Text style={{ color: colors.text }}>{`Municipality: ${muniFilter === 'all' ? 'All' : muniFilter}`}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: colors.white, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            onPress={() => setBrgyPickerOpen(true)}
          >
            <Text style={{ color: colors.text }}>{`Barangay: ${brgyFilter === 'all' ? 'All' : brgyFilter}`}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: colors.white, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.border, flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
            onPress={() => setLivestockPickerOpen(true)}
          >
            <Text style={{ color: colors.text }}>{`Livestock: ${livestockFilter === 'all' ? 'All' : livestockFilter.charAt(0).toUpperCase() + livestockFilter.slice(1)}`}</Text>
            <Ionicons name="chevron-down" size={16} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      </View>

      {(!authReady || loading) ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 16, color: colors.textLight }}>Loading applicants...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 16 }}>
          {filtered.length === 0 ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 24 }}>
              <Text style={{ fontSize: 64, color: '#4CAF50' }}>✓</Text>
              <Text style={{ marginTop: 16, fontSize: 18, color: '#666', textAlign: 'center' }}>
                No applicants ready for dispersal in {headerPlace}
              </Text>
              <Text style={{ marginTop: 8, fontSize: 14, color: '#999', textAlign: 'center' }}>
                All approved inspections are processed
              </Text>
            </View>
          ) : (
            filtered.map((b, i) => (
              <TouchableOpacity
                key={`${b.id}-${i}`}
                style={[
                  styles.applicantCard,
                  b.id === highlightId ? { backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#FFC107' } : null,
                ]}
                onPress={() => {
                  // Clear highlight if clicking on the highlighted item
                  if (b.id === highlightId) {
                    setHighlightId(null);
                  }
                  setSelectedApplicant(b);
                  setIsModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.applicantHeader}>
                  <View style={styles.applicantAvatar}>
                    <Text style={styles.applicantInitial}>
                      {(b.name || 'A').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>{b.name}</Text>
                    <Text style={styles.applicantDetails}>
                      {[b.barangay || null, b.municipality || null].filter(Boolean).join(', ') || 'Location not specified'}
                    </Text>
                  </View>
                  <View style={styles.applicantStatus}>
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Ready</Text>
                    </View>
                    <Text style={{ fontSize: 20, color: colors.primary }}>→</Text>
                  </View>
                </View>
              </TouchableOpacity>
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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity 
                  onPress={() => {
                    setIsModalVisible(false);
                    // Trigger the scanner functionality
                    if (onScanPress) {
                      onScanPress();
                    }
                  }}
                  style={{
                    backgroundColor: '#25A18E',
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    marginRight: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="scan" size={16} color="#fff" style={{ marginRight: 4 }} />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>

            {selectedApplicant && (
              <View>
                <DetailRow label="Applicant ID" value={selectedApplicant.id} />
                <DetailRow label="Name" value={selectedApplicant.name} />
                <DetailRow label="Address" value={selectedApplicant.address || 'Address not specified'} />
                <DetailRow label="Barangay" value={selectedApplicant.barangay || '—'} />
                <DetailRow label="Municipality" value={selectedApplicant.municipality || '—'} />
                <DetailRow label="Contact Number" value={selectedApplicant?.contact || '—'} />
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

      {/* Municipality picker */}
      <Modal
        visible={muniPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMuniPickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          onPressOut={() => setMuniPickerOpen(false)}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 360, paddingVertical: 8 }}>
            {municipalityOptions.map((opt) => (
              <TouchableOpacity
                key={`muni-${opt}`}
                onPress={() => {
                  setMuniFilter(opt);
                  // Reset barangay if municipality changes
                  setBrgyFilter('all');
                  setMuniPickerOpen(false);
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: 16, color: '#333' }}>{opt === 'all' ? 'All' : opt}</Text>
                {muniFilter === opt && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Barangay picker */}
      <Modal
        visible={brgyPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setBrgyPickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          onPressOut={() => setBrgyPickerOpen(false)}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 360, paddingVertical: 8 }}>
            {barangayOptions.map((opt) => (
              <TouchableOpacity
                key={`brgy-${opt}`}
                onPress={() => {
                  setBrgyFilter(opt);
                  setBrgyPickerOpen(false);
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: 16, color: '#333' }}>{opt === 'all' ? 'All' : opt}</Text>
                {brgyFilter === opt && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Livestock picker */}
      <Modal
        visible={livestockPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLivestockPickerOpen(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}
          onPressOut={() => setLivestockPickerOpen(false)}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 12, width: '100%', maxWidth: 360, paddingVertical: 8 }}>
            {livestockOptions.map((opt) => (
              <TouchableOpacity
                key={`liv-${opt}`}
                onPress={() => {
                  setLivestockFilter(opt);
                  setLivestockPickerOpen(false);
                }}
                style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ fontSize: 16, color: '#333', textTransform: opt === 'all' ? 'none' : 'capitalize' }}>{opt === 'all' ? 'All' : opt}</Text>
                {livestockFilter === opt && (
                  <Ionicons name="checkmark" size={18} color={colors.primary} />
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
    <View style={{ flexDirection: 'row', marginBottom: 16, alignItems: 'flex-start' }}>
      <Text style={{ flex: 1, fontWeight: 'bold', color: '#25A18E', fontSize: 16 }}>{label}:</Text>
      <Text style={{ flex: 2, color: '#333', fontSize: 16, lineHeight: 22 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  applicantCard: {
    backgroundColor: '#F5F9F8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  applicantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  applicantAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#25A18E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  applicantInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  applicantInfo: {
    flex: 1,
  },
  applicantName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  applicantDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  applicantAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  applicantStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: 100,
  },
  statusBadge: {
    backgroundColor: '#C8E6C9',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  statusText: {
    color: '#25A18E',
    fontSize: 12,
    fontWeight: 'bold',
  },
});