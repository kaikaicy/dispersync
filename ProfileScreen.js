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

  const roleText = user?.municipality ? `Field Staff in ${user.municipality}` : '';
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
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email || ''}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{addressText || ''}</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#e6f4f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 340,
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
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
  },
  infoLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    color: '#222',
    fontSize: 15,
    fontWeight: '600',
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