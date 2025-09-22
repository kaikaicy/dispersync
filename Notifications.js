import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './src/config/firebase';
import { collection, onSnapshot, orderBy, query, updateDoc, doc, deleteDoc, where, getDocs } from 'firebase/firestore';

export default function Notifications({ onGoTo, onClose, onMarkAllRead }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const q = query(
      collection(db, 'mobileNotifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((n) => !n.hiddenBy?.[user.uid]); // <-- filter out hidden
      setItems(rows);
    });
    return () => unsub();
  }, []);

  // Live-updating relative time every 30s
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const markAllRead = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    // Immediately clear the unread count in parent component
    if (onMarkAllRead) {
      onMarkAllRead();
    }
    
    // Optimistically update local state so highlights disappear immediately
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    
    // Update Firestore in the background
    const q = query(collection(db, 'mobileNotifications'), where('userId', '==', user.uid), where('read', '==', false));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      await updateDoc(doc(db, 'mobileNotifications', d.id), { read: true, updatedAt: new Date() });
    }
  };

  const markRead = async (id) => {
    // Optimistically mark as read but keep in list
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    await updateDoc(doc(db, 'mobileNotifications', id), { read: true, updatedAt: new Date() });
  };

  const remove = async (id) => {
    const user = auth.currentUser;
    if (!user) return;
    // Optimistically remove from list for immediate UI feedback
    setItems((prev) => prev.filter((n) => n.id !== id));
    // Instead of deleting, mark as hidden for this user
    await updateDoc(doc(db, 'mobileNotifications', id), {
      [`hiddenBy.${user.uid}`]: true,
    });
  };

  // Group by time sections like Facebook: Today, Yesterday, This week, Earlier
  const groups = useMemo(() => {
    const out = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - ((now.getDay() || 7) - 1) * 86400000; // Monday as start
    for (const n of items) {
      const d = n.createdAt?.toDate ? n.createdAt.toDate() : (n.createdAt ? new Date(n.createdAt) : new Date());
      const t = d.getTime();
      if (t >= startOfToday) out['Today'].push(n);
      else if (t >= startOfYesterday) out['Yesterday'].push(n);
      else if (t >= startOfWeek) out['This week'].push(n);
      else out['Earlier'].push(n);
    }
    return out;
  }, [items]);

  // Add this line to count unread notifications
  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: '#e6f4f1' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
          <Ionicons name="arrow-back" size={24} color="#25A18E" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllRead} style={{ padding: 6 }}>
          <Text style={{ color: '#25A18E', fontWeight: '600' }}>Mark all as read</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
        {['Today', 'Yesterday', 'This week', 'Earlier'].map((sec) => (
          groups[sec].length > 0 ? (
            <View key={sec} style={{ marginBottom: 12 }}>
              <Text style={styles.sectionHeader}>{sec}</Text>
              {groups[sec].map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  onGoTo={onGoTo}
                  onMarkRead={() => markRead(n.id)}
                  onDelete={() => remove(n.id)}
                />
              ))}
            </View>
          ) : null
        ))}
        {items.length === 0 && (
          <View style={{ alignItems: 'center', marginTop: 24 }}>
            <Text style={{ color: '#25A18E' }}>No notifications</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationItem({ n, onGoTo, onMarkRead, onDelete }) {
  const icon = n.type === 'inspect' ? 'clipboard-outline'
    : n.type === 'beneficiaries' ? 'people-outline'
    : n.type === 'inspect_rejected' ? 'close-circle-outline'
    : 'trail-sign-outline';
  const target = n.type === 'inspect' ? 'inspect'
    : n.type === 'beneficiaries' ? 'beneficiaries'
    : n.type === 'inspect_rejected' ? 'inspect'
    : 'for_dispersal';
  return (
    <View style={[styles.itemRow, !n.read ? styles.itemRowUnread : styles.itemRowRead]}>
      <View style={styles.itemIconWrap}>
        <Ionicons name={icon} size={20} color="#25A18E" />
      </View>
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={() => { if (!n.read) onMarkRead(); onGoTo?.(target); }} activeOpacity={0.8}>
          <Text style={[styles.itemTitle, !n.read ? styles.itemTitleUnread : null]}>{n.title}</Text>
          {!!n.message && <Text style={[styles.itemMessage, !n.read ? styles.itemMessageUnread : null]}>{n.message}</Text>}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            {!n.read && <View style={styles.unreadDot} />}
            <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
        <TouchableOpacity onPress={onMarkRead} style={{ padding: 6, marginRight: 4 }}>
          <Ionicons name="eye-outline" size={20} color="#25A18E" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={{ padding: 6 }}>
          <Ionicons name="trash-outline" size={20} color="#E53935" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E3F4EC',
  },
  headerTitle: {
    color: '#25A18E',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    color: '#25A18E',
    fontWeight: '700',
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E3F4EC',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F4EC',
  },
  itemRowUnread: {
    backgroundColor: '#F1FFFA',
  },
  itemRowRead: {
    backgroundColor: '#FFFFFF',
  },
  itemIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemTitle: {
    color: '#25A18E',
    fontSize: 14,
    fontWeight: '700',
  },
  itemTitleUnread: {
    fontWeight: '800',
  },
  itemMessage: {
    color: '#333',
    fontSize: 13,
    marginTop: 2,
  },
  itemMessageUnread: {
    fontWeight: '600',
  },
  itemTime: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#25A18E',
    marginRight: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    color: '#25A18E',
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  countLabel: {
    color: '#25A18E',
    fontSize: 12,
    fontWeight: '600',
  },
  unreadBadge: {
    marginTop: 4,
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});


