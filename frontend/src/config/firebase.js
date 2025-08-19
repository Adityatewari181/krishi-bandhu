import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB99FvVX9DWvQ5gZsaWoteyHLDCz5uK0pc",
  authDomain: "adityapocpublicservices.firebaseapp.com",
  projectId: "adityapocpublicservices",
  storageBucket: "adityapocpublicservices.firebasestorage.app",
  messagingSenderId: "1098103029683",
  appId: "1:1098103029683:web:9b81d1644712b0286095c6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
