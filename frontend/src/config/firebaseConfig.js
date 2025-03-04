import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Aqui você vai colocar as credenciais do seu Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDjXW-m_tVAFOWrwtSCfj9kNcbIRIlZTVk",
    authDomain: "matriciale-78f34.firebaseapp.com",
    projectId: "matriciale-78f34",
    storageBucket: "matriciale-78f34.firebasestorage.app",
    messagingSenderId: "1043136894708",
    appId: "1:1043136894708:web:6388a4e78bc13c46c230a1",
    measurementId: "G-05V7MJM8Z3"
};

// Inicialize o Firebase
const app = initializeApp(firebaseConfig);

// Exporte a instância do Firebase Auth
export const auth = getAuth(app);

