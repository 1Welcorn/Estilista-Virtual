// FIX: Use Firebase v8 compat imports to resolve module errors
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

// Your web app's Firebase configuration using the credentials you provided
const firebaseConfig = {
  apiKey: "AIzaSyBUBRMSwZSg-TQGGCRrX7xNLkJELykm7ew",
  authDomain: "estilista-virtual-ia.firebaseapp.com",
  projectId: "estilista-virtual-ia",
  storageBucket: "estilista-virtual-ia.appspot.com",
  messagingSenderId: "556529107111",
  appId: "1:556529107111:web:9a7cd11018122e36c31b82",
  measurementId: "G-FX9FKQJ3JF"
};


// FIX: Use Firebase v8 initialization syntax
// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// FIX: Export Firebase v8 services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
