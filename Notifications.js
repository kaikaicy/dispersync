import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './src/config/firebase';
import { collection, onSnapshot, orderBy, query, updateDoc, doc, deleteDoc, where, getDocs, writeBatch, serverTimestamp, getDoc } from 'firebase/firestore';

export default function Notifications({ onGoTo, onClose, onMarkAllRead }) {
  const [items, setItems] = useState([]);
  const locallyReadIdsRef = React.useRef({});

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

      // Merge optimistic local read state to avoid flicker/countdown during bulk updates
      const merged = rows.map((n) => (locallyReadIdsRef.current[n.id] ? { ...n, read: true } : n));
      setItems(merged);
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
    const idsToMark = items.filter((n) => !n.read).map((n) => n.id);
    if (idsToMark.length === 0) return;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    // Track locally read ids to merge with snapshot data while backend updates
    const nextMap = { ...locallyReadIdsRef.current };
    idsToMark.forEach((id) => { nextMap[id] = true; });
    locallyReadIdsRef.current = nextMap;

    // Batch update Firestore to minimize intermediate snapshots
    const q = query(
      collection(db, 'mobileNotifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        batch.update(doc(db, 'mobileNotifications', d.id), { read: true, updatedAt: serverTimestamp() });
      });
      await batch.commit();
    }
    // Backend is now consistent; clear local overrides
    locallyReadIdsRef.current = {};
  };

  const deleteAll = async () => {
    const user = auth.currentUser;
    if (!user) return;
    
    if (items.length === 0) return;

    // Show confirmation alert
    Alert.alert(
      "Delete All Notifications",
      "Are you sure you want to delete all notifications? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            // Optimistically clear all items from UI immediately
            setItems([]);
            
            try {
              // Get all notifications for this user
              const q = query(
                collection(db, 'mobileNotifications'),
                where('userId', '==', user.uid)
              );
              const snap = await getDocs(q);
              
              if (!snap.empty) {
                // Batch update to mark all as hidden for this user
                const batch = writeBatch(db);
                snap.docs.forEach((d) => {
                  batch.update(doc(db, 'mobileNotifications', d.id), {
                    [`hiddenBy.${user.uid}`]: true,
                    updatedAt: serverTimestamp()
                  });
                });
                await batch.commit();
              }
            } catch (error) {
              console.error('Error deleting all notifications:', error);
              // If there's an error, we might want to refresh the data
              // The onSnapshot listener will automatically restore the data
            }
          }
        }
      ]
    );
  };

  const markRead = async (id) => {
    // Optimistically mark as read but keep in list
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    // Ensure snapshot does not momentarily revert the read state
    locallyReadIdsRef.current = { ...locallyReadIdsRef.current, [id]: true };
    await updateDoc(doc(db, 'mobileNotifications', id), { read: true, updatedAt: serverTimestamp() });
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={markAllRead} style={{ padding: 6, marginRight: 8 }}>
            <Text style={{ color: '#25A18E', fontWeight: '600' }}>Mark all as read</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteAll} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={20} color="#E53935" />
          </TouchableOpacity>
        </View>
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

function formatEventTime(ts) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  
  // Format: MM/DD/YYYY, H:MM:SS AM/PM
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  return `${month}/${day}/${year}, ${hours}:${minutes}:${seconds} ${ampm}`;
}

// Short format: MM/DD/YY, hh:mm:ssam/pm (lowercase am/pm, no space)
function formatEventTimeShort(ts) {
  if (!ts) return '';
  const date = ts?.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year2 = (date.getFullYear() % 100).toString().padStart(2, '0');
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const isPm = hours >= 12;
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = hours.toString().padStart(2, '0');
  return `${month}/${day}/${year2}, ${hh}:${minutes}:${seconds}${isPm ? 'pm' : 'am'}`;
}

function NotificationItem({ n, onGoTo, onMarkRead, onDelete }) {
  const icon = n.type === 'inspect' ? 'clipboard-outline'
    : n.type === 'beneficiaries' ? 'people-outline'
    : n.type === 'inspect_rejected' ? 'close-circle-outline'
    : n.title?.toLowerCase().includes('inspection form approved') ? 'checkmark-done-outline'
    : 'trail-sign-outline';

  // If the notification is for inspection form approved, always go to for_dispersal
  let target;
  if (n.title?.toLowerCase().includes('inspection form approved')) {
    target = 'for_dispersal';
  } else {
    target = n.type === 'inspect' ? 'inspect'
      : n.type === 'beneficiaries' ? 'beneficiaries'
      : n.type === 'inspect_rejected' ? 'inspect'
      : 'for_dispersal';
  }

  const handleOpen = async () => {
    try {
      // For inspection notifications, ensure applicant still needs action
      if ((n.type === 'inspect' || n.type === 'inspect_rejected') && n.refId) {
        const applicantSnap = await getDoc(doc(db, 'applicants', n.refId));
        if (applicantSnap.exists()) {
          const data = applicantSnap.data();
          const statusRaw = data.inspectionStatus || data.status || data.inspection || '';
          const status = String(statusRaw).toLowerCase();
          if (status === 'completed' || status === 'approved') {
            if (!n.read) onMarkRead?.();
            Alert.alert('Already inspected', 'This item has already been inspected.');
            return;
          }
        }
      }
      if (!n.read) onMarkRead?.();
      
      // Enhanced navigation with scroll target and highlight data
      const navigationData = {
        refId: n.refId,
        notifId: n.id,
        type: n.type,
        // Add scroll and highlight information
        scrollTarget: n.refId, // ID of the item to scroll to
        highlightDuration: 3000, // How long to highlight (3 seconds)
        scrollBehavior: 'smooth', // Smooth scrolling animation
        // Additional context for better targeting
        applicantName: n.applicantName,
        barangay: n.barangay,
        municipality: n.municipality,
        // Auto-scroll configuration
        autoScroll: {
          enabled: true,
          targetId: n.refId,
          offset: 100, // Offset from top when scrolling to target
          behavior: 'smooth',
          highlight: {
            enabled: true,
            duration: 3000,
            color: '#25A18E20', // Light teal background
            borderColor: '#25A18E',
          }
        }
      };
      
      onGoTo?.(target, navigationData);
    } catch (err) {
      console.error('Failed to open notification target:', err);
      // Fallback: still prevent navigation if uncertain, but mark read to avoid re-alert loops
      if (!n.read) onMarkRead?.();
      Alert.alert('Unavailable', 'Unable to open this item at the moment.');
    }
  };

  return (
    <View style={[styles.itemRow, !n.read ? styles.itemRowUnread : styles.itemRowRead]}>
      <View style={styles.itemIconWrap}>
        <Ionicons name={icon} size={20} color="#25A18E" />
      </View>
      <View style={{ flex: 1 }}>
        <TouchableOpacity onPress={handleOpen} activeOpacity={0.8}>
          <Text style={[styles.itemTitle, !n.read ? styles.itemTitleUnread : null]}>{n.title}</Text>
          {/* Primary message: "<name> from <barangay, municipality> needs inspection" */}
          {(() => {
            const locationParts = [n.barangay, n.municipality || n.city || n.town || n.municipal].filter(Boolean);
            const location = locationParts.length > 0 ? ` from ${locationParts.join(', ')}` : '';
            const base = n.message || '';
            let composed = base;
            if (base && location) {
              // Try to inject location before the trailing action, defaults to appending if not matched
              const needsIdx = base.toLowerCase().lastIndexOf(' needs');
              composed = needsIdx > 0
                ? `${base.slice(0, needsIdx)}${location}${base.slice(needsIdx)}`
                : `${base}${location}`;
            }
            return (
              <Text style={[styles.itemMessage, !n.read ? styles.itemMessageUnread : null]}>
                {composed || (location ? `From${location}` : '')}
              </Text>
            );
          })()}

          {/* Location line: Barangay, Municipality */}
          {(() => {
            const locParts = [n.barangay, n.municipality || n.city || n.town || n.municipal].filter(Boolean);
            if (locParts.length === 0) return null;
            return (
              <View style={styles.eventDetails}>
                <Text style={styles.eventDetailText}>{locParts.join(', ')}</Text>
              </View>
            );
          })()}

          {/* Compact event time on its own line */}
          <View style={styles.eventDetails}>
            <Text style={styles.eventDetailText}>{formatEventTimeShort(n.eventTime || n.createdAt)}</Text>
          </View>

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
  eventDetails: {
    marginTop: 4,
  },
  eventDetailText: {
    color: '#666',
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
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

// Export utility functions for use in target screens
export const scrollToNotificationTarget = (scrollViewRef, targetId, options = {}) => {
  const {
    offset = 100,
    behavior = 'smooth',
    timeout = 500
  } = options;

  setTimeout(() => {
    // Find the target element by testID or other identifier
    const targetElement = scrollViewRef.current?.querySelector(`[data-notification-target="${targetId}"]`);
    
    if (targetElement && scrollViewRef.current) {
      const elementPosition = targetElement.offsetTop - offset;
      
      if (scrollViewRef.current.scrollTo) {
        scrollViewRef.current.scrollTo({
          y: elementPosition,
          animated: behavior === 'smooth'
        });
      } else if (scrollViewRef.current.scrollToOffset) {
        // For FlatList
        scrollViewRef.current.scrollToOffset({
          offset: elementPosition,
          animated: behavior === 'smooth'
        });
      }
    }
  }, timeout);
};

export const highlightNotificationTarget = (targetId, options = {}) => {
  const {
    duration = 3000,
    color = '#25A18E20',
    borderColor = '#25A18E'
  } = options;

  // This would be implemented in the target screen component
  // Return a style object that can be applied conditionally
  return {
    backgroundColor: color,
    borderColor: borderColor,
    borderWidth: 2,
    borderRadius: 8,
  };
};