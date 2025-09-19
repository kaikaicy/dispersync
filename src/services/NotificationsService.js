import { db } from '../config/firebase';
import { collection, onSnapshot, query, where, getDocs, documentId, setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

function safeEquals(a, b) {
  return String(a || '').toLowerCase().trim() === String(b || '').toLowerCase().trim();
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

export function startNotificationsSync(userId, staffMunicipality, staffRole) {
  // Do not generate notifications for admins (admin uses web)
  if (String(staffRole || '').toLowerCase() === 'admin') {
    return () => {};
  }
  const unsubs = [];

  // Applicants needing inspection → notification per applicant
  try {
    const unsubApplicants = onSnapshot(collection(db, 'applicants'), async (snap) => {
      const ops = [];
      for (const d of snap.docs) {
        const data = d.data();
        const status = data.inspectionStatus || data.status || data.inspection || 'pending';
        const muni = data.municipality || data.municipalityName || data.area || '';
        const needsInspection = status === 'pending' || status === 'not started' || status === 'pending inspection' || status === '';
        if (!needsInspection) continue;
        if (staffMunicipality && !safeEquals(muni, staffMunicipality)) continue;
        const name = data.fullName || data.name || 'Applicant';
        const notifId = `inspect_${d.id}`;
        ops.push(ensureNotification(userId, notifId, {
          type: 'inspect',
          refId: d.id,
          title: 'New applicant to inspect',
          message: `${name} needs inspection`,
        }));
      }
      await Promise.all(ops);
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
      const ops = [];
      for (const appId of applIds) {
        const app = applicantsMap[appId] || {};
        const muni = app.municipality || '-';
        if (staffMunicipality && !safeEquals(muni, staffMunicipality)) continue;
        const name = app.fullName || app.name || 'Beneficiary';
        const notifId = `beneficiary_${appId}`;
        ops.push(ensureNotification(userId, notifId, {
          type: 'beneficiaries',
          refId: appId,
          title: 'New beneficiary approved',
          message: `${name} is now a beneficiary`,
        }));
      }
      await Promise.all(ops);
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
      const applicantsMap = {};
      for (let i = 0; i < applIds.length; i += 10) {
        const batch = applIds.slice(i, i + 10);
        const qs = await getDocs(query(collection(db, 'applicants'), where(documentId(), 'in', batch)));
        qs.forEach((x) => { applicantsMap[x.id] = x.data(); });
      }
      const ops = [];
      for (const s of schedules) {
        const app = applicantsMap[s.applicantId] || {};
        const muni = app.municipality || '-';
        if (staffMunicipality && !safeEquals(muni, staffMunicipality)) continue;
        const name = app.fullName || app.name || 'Applicant';
        const notifId = `dispersal_${s.id}`;
        ops.push(ensureNotification(userId, notifId, {
          type: 'dispersal',
          refId: s.id,
          title: 'Scheduled for dispersal',
          message: `${name} is scheduled for dispersal`,
        }));
      }
      await Promise.all(ops);
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
          const applicantsMap = {};
          for (let i = 0; i < applicantIds.length; i += 10) {
            const batch = applicantIds.slice(i, i + 10);
            const qs = await getDocs(query(collection(db, 'applicants'), where(documentId(), 'in', batch)));
            qs.forEach((docSnap) => { applicantsMap[docSnap.id] = docSnap.data(); });
          }
          const ops = [];
          for (const insp of inspections) {
            const appId = insp.applicantId;
            const app = applicantsMap[appId] || {};
            const muni = app.municipality || '-';
            if (staffMunicipality && !safeEquals(muni, staffMunicipality)) continue;
            const name = app.fullName || app.name || 'Applicant';
            const notifId = `inspection_rejected_${insp.id}`;
            ops.push(ensureNotification(userId, notifId, {
              type: 'inspect_rejected',
              refId: insp.id,
              title: 'Inspection Rejected',
              message: `Inspection for ${name} has been rejected and will not proceed to livestock dispersal.`,
            }));
          }
          await Promise.all(ops);
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


