import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  projectId: "valid-encoder-5dtd0",
  appId: "1:493543067662:web:11a3b0af5d4099810aac5f",
  apiKey: "AIzaSyCNUpvMH-kA7nkhq90OnEJJojb2HjvQDY8",
  authDomain: "valid-encoder-5dtd0.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-34133579-ca7a-4f42-8910-77e09af79897",
  storageBucket: "valid-encoder-5dtd0.firebasestorage.app",
  messagingSenderId: "493543067662"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || "(default)"
);
