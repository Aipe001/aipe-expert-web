import { initializeApp, getApps, getApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Fallback values in case environment variables are missing during build/runtime
// These are public values and already present in public/firebase-messaging-sw.js
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA38sb_Qi2BBthqL23APfY7Afc6JimNZ6c",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aipe-edfeb.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aipe-edfeb",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aipe-edfeb.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1032054778017",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1032054778017:web:eae3e1de00ea2713faa8e0",
};

// Check if critical config values are present
if (typeof window !== "undefined") {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
        console.error("[Firebase] Missing required configuration values. Firebase initialization might fail.", {
            hasApiKey: !!firebaseConfig.apiKey,
            hasProjectId: !!firebaseConfig.projectId,
            hasAppId: !!firebaseConfig.appId
        });
    }
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const getFirebaseMessaging = async () => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
        try {
            const supported = await isSupported();
            if (supported) {
                return getMessaging(app);
            }
        } catch (err) {
            console.error("[Firebase] Error checking for messaging support:", err);
        }
    }
    return null;
};
