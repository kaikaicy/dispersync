import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from './src/config/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const avatar = require('./assets/images/chick.png'); // Placeholder avatar image

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let unsubscribeDoc = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setError('Not signed in');
        setUser(null);
        setLoading(false);
        return;
      }

      const ref = doc(db, 'staff', currentUser.uid);
      unsubscribeDoc = onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
          setError('Profile not found');
          setUser(null);
        } else {
          const data = snap.data();
          setUser({
            userId: data.userId || '',
            name: data.name || '',
            email: data.email || '',
            municipality: data.municipality || '',
            barangay: data.barangay || '',
            status: data.status || '',
            additionalMunicipalities: Array.isArray(data.additionalMunicipalities) ? data.additionalMunicipalities : undefined,
          });
          setError('');
        }
        setLoading(false);
      }, (err) => {
        setError(err?.message || 'Failed to load profile');
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      // ignore
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  let roleText = '';
  if (user?.municipality) {
    const muniList = [user.municipality];
    if (user.additionalMunicipalities && user.additionalMunicipalities.length > 0) {
      muniList.push(...user.additionalMunicipalities);
    }
    if (muniList.length === 1) {
      roleText = `Field Staff in ${muniList[0]}`;
    } else if (muniList.length === 2) {
      roleText = `Field Staff in ${muniList[0]} and ${muniList[1]}`;
    } else {
      roleText = `Field Staff in ${muniList.slice(0, -1).join(', ')} and ${muniList[muniList.length - 1]}`;
    }
  }
  const addressText = user ? `${user.barangay || ''}${user.barangay && user.municipality ? ', ' : ''}${user.municipality || ''}` : '';
  const isActive = (user?.status || '').toLowerCase() === 'active';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={{ paddingVertical: 40 }}>
            <ActivityIndicator size="large" color="#25A18E" />
          </View>
        ) : error ? (
          <View style={{ paddingVertical: 16 }}>
            <Text style={{ color: '#E74C3C', textAlign: 'center' }}>{error}</Text>
          </View>
        ) : (
          <>
            <View style={styles.avatarSection}>
              <Image source={avatar} style={styles.avatar} />
              <Text style={styles.name}>{user?.name}</Text>
              {!!roleText && <Text style={styles.roleText}>{roleText}</Text>}
              <View style={styles.badgeRow}>
                <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusBadgeText, !isActive && { color: '#6b7280' }]}>{(user?.status || 'Unknown').toUpperCase()}</Text>
                </View>
              </View>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>User ID</Text>
                <Text style={styles.statValue}>{user?.userId || ''}</Text>
              </View>
            </View>
            <View style={[styles.infoSectionMatchCard, {flex: 1, alignSelf: 'stretch'}]}> 
              <View style={styles.infoRowVerticalUnderline}>
                <Text style={styles.infoLabelMatchCard}>Email</Text>
                <Text style={styles.infoValueMatchCardVertical}>{user?.email || ''}</Text>
              </View>
              <View style={styles.infoRowVerticalUnderline}>
                <Text style={styles.infoLabelMatchCard}>Address</Text>
                <Text style={styles.infoValueMatchCardVertical}>{addressText || ''}</Text>
              </View>
              {user?.additionalMunicipalities && user.additionalMunicipalities.length > 0 && (
                <View style={styles.infoRowVerticalUnderlineLast}>
                  <Text style={styles.infoLabelMatchCard}>Additional Municipalities</Text>
                  <Text style={styles.infoValueMatchCardVertical}>
                    {user.additionalMunicipalities.length === 1
                      ? user.additionalMunicipalities[0]
                      : user.additionalMunicipalities.slice(0, -1).join(', ') + ' and ' + user.additionalMunicipalities[user.additionalMunicipalities.length - 1]}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  infoRowVerticalUnderline: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  infoRowVerticalUnderlineLast: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  infoValueMatchCardVertical: {
    color: '#222',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'left',
  },
  infoRowHorizontalUnderline: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  infoSectionMatchCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexWrap: 'wrap',
    flex: 1,
    alignSelf: 'stretch',
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRowHorizontal: {
  width: '100%',
  alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabelMatchCard: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '500',
    flexShrink: 1,
    marginRight: 8,
    maxWidth: '45%',
    flexWrap: 'nowrap',
    width: 'auto',
  },
  infoValueMatchCard: {
    color: '#222',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'right',
    minWidth: 0,
    maxWidth: '55%',
  },
  infoDividerMatchCard: {
    height: 1,
    backgroundColor: '#EAEAEA',
    width: '100%',
  },
  infoLabelStrong: {
    color: '#222',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'left',
  },
  infoValueStrong: {
    color: '#222',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 6,
    textAlign: 'left',
  },
  infoSpacer: {
    height: 8,
  },
  infoRowVertical: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'flex-start',
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#e6f4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    minWidth: 340,
    maxWidth: '90%',
    width: 'auto',
    backgroundColor: '#F8FFFE',
    borderRadius: 28,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
  },
  logoutBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    zIndex: 2,
    padding: 4,
  },
  logoutText: {
    color: '#25A18E',
    fontSize: 15,
    opacity: 0.85,
    fontWeight: '500',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 18,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E3F4EC',
    borderWidth: 3,
    borderColor: '#E3F4EC',
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 2,
    textAlign: 'center',
  },
  roleText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
    textAlign: 'center',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    marginBottom: 18,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#25A18E',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: 2,
    elevation: 2,
  },
  statLabel: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.85,
    marginBottom: 2,
    fontWeight: '400',
  },
  statValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  infoSection: {
    width: '100%',
    minWidth: 260,
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    flexWrap: 'wrap',
    alignSelf: 'center',
    shadowColor: '#25A18E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    flexWrap: 'wrap',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 8,
    maxWidth: '45%',
  },
  infoValue: {
    color: '#222',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    flexWrap: 'wrap',
    textAlign: 'left',
    minWidth: 0,
    maxWidth: '55%',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusActive: {
    backgroundColor: '#E3F4EC',
    borderColor: '#25A18E',
  },
  statusInactive: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#25A18E',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
}); 