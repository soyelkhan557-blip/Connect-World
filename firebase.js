import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getMessaging } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyD8qTLYFoy_u9PcVIAmSCunNTXxfp_rEzk",
  authDomain: "connect-world-8d934.firebaseapp.com",
  projectId: "connect-world-8d934",
  storageBucket: "connect-world-8d934.firebasestorage.app",
  messagingSenderId: "216347498064",
  appId: "1:216347498064:web:3779448f5faf2512b82355",
  measurementId: "G-46STVVP6X1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
