import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDEJsatNZiyXM0tFGMXjE6ElfSnVIOs34Y",
  authDomain: "group-app-fbb09.firebaseapp.com",
  projectId: "group-app-fbb09",
  storageBucket: "group-app-fbb09.appspot.com",
  messagingSenderId: "70598852527",
  appId: "1:70598852527:web:3af3804b6785d616d9795a",
  measurementId: "G-9XKNP32DB1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);