import { db } from '../config/firebase';
import { collection, onSnapshot, query, where, getDocs, documentId, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

function safeEquals(a, b) {
  return String(a || '').toLowerCase().trim() === String(b || '').toLowerCase().trim();
}

// Helper function to get all staff members assigned to a specific municipality
async function getStaffByMunicipality(municipality) {
  try {
    const staffQuery = query(
      collection(db, 'staff'),
      where('municipality', '==', municipality)
    );
    const staffSnapshot = await getDocs(staffQuery);
    
    // Also check alternative municipality field names
    const staffQueryAlt = query(
      collection(db, 'staff'),
      where('Municipality', '==', municipality)
    );
    const staffSnapshotAlt = await getDocs(staffQueryAlt);
    
    // Combine results and remove duplicates
    const allStaff = new Map();
    
    staffSnapshot.docs.forEach(doc => {
      const data = doc.data();
      allStaff.set(doc.id, { uid: doc.id, ...data });
    });
    
    staffSnapshotAlt.docs.forEach(doc => {
      const data = doc.data();
      allStaff.set(doc.id, { uid: doc.id, ...data });
    });
    
    return Array.from(allStaff.values());
  } catch (error) {
    console.error('Error fetching staff by municipality:', error);
    return [];
  }
}

async function ensureNotification(userId, notifId, payload) {
  const id = `${userId}::${notifId}`;
  const ref = doc(db, 'mobileNotifications', id);
  const snap = await getDoc(ref);
  if (snap.exists()) return; // already created
  await setDoc(ref, {
    userId,
    source: 'mobile',
    ...payload,
    read: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// Helper function to send notifications to all staff in a municipality
async function sendNotificationToMunicipality(municipality, notifId, payload) {
  if (!municipality) return;
  
  const staffMembers = await getStaffByMunicipality(municipality);
  const operations = [];
  
  for (const staff of staffMembers) {
    // Skip admin users (they use web interface)
    if (String(staff.role || staff.userRole || '').toLowerCase() === 'admin') {
      continue;
    }
    
    operations.push(ensureNotification(staff.uid, notifId, payload));
  }
  
  await Promise.all(operations);
}

export function startNotificationsSync(userId, staffMunicipality, staffRole) {
  // Do not generate notifications for admins (admin uses web)
  if (String(staffRole || '').toLowerCase() === 'admin') {
    return () => {};
  }
  const unsubs = [];

  // Applicants needing inspection → notification per applicant
  try {
    const unsubApplicants = onSnapshot(collection(db, 'applicants'), async (snap) => {
      const municipalityGroups = new Map();
      
      for (const d of snap.docs) {
        const data = d.data();
        const status = data.inspectionStatus || data.status || data.inspection || 'pending';
        const muni = data.municipality || data.municipalityName || data.area || '';
        const needsInspection = status === 'pending' || status === 'not started' || status === 'pending inspection' || status === '';
        
        if (!needsInspection || !muni) continue;
        
        // Group by municipality
        if (!municipalityGroups.has(muni)) {
          municipalityGroups.set(muni, []);
        }
        municipalityGroups.get(muni).push({ id: d.id, data });
      }
      
      // Send notifications to all staff in each municipality
      for (const [municipality, applicants] of municipalityGroups) {
        for (const { id, data } of applicants) {
          const name = data.fullName || data.name || 'Applicant';
          const notifId = `inspect_${id}`;
          await sendNotificationToMunicipality(municipality, notifId, {
            type: 'inspect',
            refId: id,
            title: 'New applicant to inspect',
            message: `${name} needs inspection`,
          });
        }
      }
    });
    unsubs.push(unsubApplicants);
  } catch (e) {
    console.error('Applicants notifications sync failed:', e);
  }

  // Approved beneficiaries (inspections.status == 'approved') → per applicant
  try {
    const unsubBeneficiaries = onSnapshot(query(collection(db, 'inspections'), where('status', '==', 'approved')), async (snap) => {
      // gather unique applicant ids
      const applIds = Array.from(new Set(snap.docs.map((d) => d.data().applicantId).filter(Boolean)));
      if (applIds.length === 0) return;
      
      // fetch applicants in batches
      const applicantsMap = {};
      for (let i = 0; i < applIds.length; i += 10) {
        const batch = applIds.slice(i, i + 10);
        const qs = await getDocs(query(collection(db, 'applicants'), where(documentId(), 'in', batch)));
        qs.forEach((x) => { applicantsMap[x.id] = x.data(); });
      }
      
      // Group by municipality
      const municipalityGroups = new Map();
      for (const appId of applIds) {
        const app = applicantsMap[appId] || {};
        const muni = app.municipality || app.municipalityName || app.area || '';
        if (!muni) continue;
        
        if (!municipalityGroups.has(muni)) {
          municipalityGroups.set(muni, []);
        }
        municipalityGroups.get(muni).push({ id: appId, data: app });
      }
      
      // Send notifications to all staff in each municipality
      for (const [municipality, beneficiaries] of municipalityGroups) {
        for (const { id, data } of beneficiaries) {
          const name = data.fullName || data.name || 'Beneficiary';
          const notifId = `beneficiary_${id}`;
          await sendNotificationToMunicipality(municipality, notifId, {
            type: 'beneficiaries',
            refId: id,
            title: 'New beneficiary approved',
            message: `${name} is now a beneficiary`,
          });
        }
      }
    });
    unsubs.push(unsubBeneficiaries);
  } catch (e) {
    console.error('Beneficiaries notifications sync failed:', e);
  }

  // Dispersal schedules (status !== 'completed') → per schedule
  try {
    const unsubDispersal = onSnapshot(collection(db, 'dispersalSchedules'), async (snap) => {
      const schedules = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.status !== 'completed');
      const applIds = Array.from(new Set(schedules.map((s) => s.applicantId).filter(Boolean)));
      
      if (applIds.length === 0) return;
      
      const applicantsMap = {};
      for (let i = 0; i < applIds.length; i += 10) {
        const batch = applIds.slice(i, i + 10);
        const qs = await getDocs(query(collection(db, 'applicants'), where(documentId(), 'in', batch)));
        qs.forEach((x) => { applicantsMap[x.id] = x.data(); });
      }
      
      // Group by municipality
      const municipalityGroups = new Map();
      for (const s of schedules) {
        const app = applicantsMap[s.applicantId] || {};
        const muni = app.municipality || app.municipalityName || app.area || '';
        if (!muni) continue;
        
        if (!municipalityGroups.has(muni)) {
          municipalityGroups.set(muni, []);
        }
        municipalityGroups.get(muni).push({ schedule: s, applicant: app });
      }
      
      // Send notifications to all staff in each municipality
      for (const [municipality, scheduleData] of municipalityGroups) {
        for (const { schedule, applicant } of scheduleData) {
          const name = applicant.fullName || applicant.name || 'Applicant';
          const notifId = `dispersal_${schedule.id}`;
          await sendNotificationToMunicipality(municipality, notifId, {
            type: 'dispersal',
            refId: schedule.id,
            title: 'Scheduled for dispersal',
            message: `${name} is scheduled for dispersal`,
          });
        }
      }
    });
    unsubs.push(unsubDispersal);
  } catch (e) {
    console.error('Dispersal notifications sync failed:', e);
  }

  // Inspection rejections → notify field staff in app (mobile only)
  try {
    const unsubRejected = onSnapshot(
      query(collection(db, 'inspections'), where('status', '==', 'rejected')),
      async (snap) => {
        try {
          const inspections = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          const applicantIds = Array.from(new Set(inspections.map((r) => r.applicantId).filter(Boolean)));
          
          if (applicantIds.length === 0) return;
          
          const applicantsMap = {};
          for (let i = 0; i < applicantIds.length; i += 10) {
            const batch = applicantIds.slice(i, i + 10);
            const qs = await getDocs(query(collection(db, 'applicants'), where(documentId(), 'in', batch)));
            qs.forEach((docSnap) => { applicantsMap[docSnap.id] = docSnap.data(); });
          }
          
          // Group by municipality
          const municipalityGroups = new Map();
          for (const insp of inspections) {
            const appId = insp.applicantId;
            const app = applicantsMap[appId] || {};
            const muni = app.municipality || app.municipalityName || app.area || '';
            if (!muni) continue;
            
            if (!municipalityGroups.has(muni)) {
              municipalityGroups.set(muni, []);
            }
            municipalityGroups.get(muni).push({ inspection: insp, applicant: app });
          }
          
          // Send notifications to all staff in each municipality
          for (const [municipality, inspectionData] of municipalityGroups) {
            for (const { inspection, applicant } of inspectionData) {
              const name = applicant.fullName || applicant.name || 'Applicant';
              const notifId = `inspection_rejected_${inspection.id}`;
              await sendNotificationToMunicipality(municipality, notifId, {
                type: 'inspect_rejected',
                refId: inspection.id,
                title: 'Inspection Rejected',
                message: `Inspection for ${name} has been rejected and will not proceed to livestock dispersal.`,
              });
            }
          }
        } catch (err) {
          console.error('Rejected inspections notifications failed:', err);
        }
      }
    );
    unsubs.push(unsubRejected);
  } catch (e) {
    console.error('Rejected inspections listener setup failed:', e);
  }

  return () => unsubs.forEach((u) => { try { u && u(); } catch (_) {} });
}


// Call this ONLY on explicit submit actions to notify the website/admin
export async function createWebsiteNotification(notifId, payload) {
  try {
    const ref = notifId
      ? doc(db, 'notifications', notifId)
      : doc(collection(db, 'notifications'));
    await setDoc(
      ref,
      {
        ...payload,
        source: 'app_submit',
        read: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error('Failed to create website notification:', e);
  }
}

// Utility function to send notifications to all staff in a specific municipality
// This can be used by other parts of the application
export async function sendNotificationToMunicipalityStaff(municipality, notifId, payload) {
  if (!municipality) {
    console.warn('No municipality provided for notification');
    return;
  }
  
  await sendNotificationToMunicipality(municipality, notifId, payload);
}

// Utility function to send notifications to all staff in multiple municipalities
export async function sendNotificationToMultipleMunicipalities(municipalities, notifId, payload) {
  if (!municipalities || !Array.isArray(municipalities)) {
    console.warn('No municipalities provided for notification');
    return;
  }
  
  const operations = municipalities.map(municipality => 
    sendNotificationToMunicipality(municipality, notifId, payload)
  );
  
  await Promise.all(operations);
}


