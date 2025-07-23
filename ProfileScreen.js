import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const avatar = require('./assets/images/chick.png'); // Placeholder avatar image

export default function ProfileScreen({ navigation }) {
  // Dummy user data (replace with real data as needed)
  const user = {
    id: '123456',
    name: 'Juan Dela Cruz',
    email: 'juan@email.com',
    address: 'Field Staff in Basud',
    verified: true,
  };

  const handleLogout = () => {
    // Navigate to Login screen and clear the navigation stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
        <View style={styles.avatarSection}>
          <Image source={avatar} style={styles.avatar} />
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.address}>{user.address}</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>User ID</Text>
            <Text style={styles.statValue}>{user.id}</Text>
          </View>
        </View>
        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>E-mail</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>
        <TouchableOpacity style={styles.statusBtn}>
          <Text style={styles.statusText}>Verification Status</Text>
        </TouchableOpacity>
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
    backgroundColor: '#E3F4EC',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 18,
    alignItems: 'flex-start',
  },
  infoLabel: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  infoValue: {
    color: '#222',
    fontSize: 15,
    fontWeight: '600',
  },
  statusBtn: {
    width: '100%',
    backgroundColor: '#25A18E',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
}); 