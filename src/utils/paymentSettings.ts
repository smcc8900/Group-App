import { db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

const LOCAL_KEY = 'payment_settings';
const GROUP_KEY = 'group_info';

export interface PaymentSettings {
  gatewayEnabled: boolean;
  upiId: string;
}

export async function fetchAndStorePaymentSettings() {
  const snap = await getDoc(doc(db, 'static', 'settings'));
  if (snap.exists()) {
    const data = snap.data();
    const settings: PaymentSettings = {
      gatewayEnabled: !!data.gatewayEnabled,
      upiId: data.upiId || '',
    };
    localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
    return settings;
  }
  return null;
}

export function getStoredPaymentSettings(): PaymentSettings | null {
  const raw = localStorage.getItem(LOCAL_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function fetchAndStoreGroupInfo() {
  // Fetch group (assume only one group)
  const groupSnap = await getDocs(collection(db, 'groups'));
  let group = null;
  if (!groupSnap.empty) {
    group = { id: groupSnap.docs[0].id, ...groupSnap.docs[0].data() };
  }
  // Fetch all members
  const membersSnap = await getDocs(collection(db, 'members'));
  const members = membersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const groupInfo = { group, members };
  localStorage.setItem(GROUP_KEY, JSON.stringify(groupInfo));
  return groupInfo;
}

export function getStoredGroupInfo() {
  const raw = localStorage.getItem(GROUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
} 