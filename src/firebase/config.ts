import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAeNrDbKiWogu2XbMx0QHCOCqUko-wVTbU",
  authDomain: "guitarstudio-bbd18.firebaseapp.com",
  projectId: "guitarstudio-bbd18",
  storageBucket: "guitarstudio-bbd18.firebasestorage.app",
  messagingSenderId: "980149190916",
  appId: "1:980149190916:web:bf8ba70891a5cf5cfc5051"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
