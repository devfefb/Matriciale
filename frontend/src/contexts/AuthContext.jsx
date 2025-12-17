import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { auth as firebaseAuth } from '../config/firebaseConfig';
import api from '../services/api';

const AuthContext = createContext({});

// Small whitelist for additional admins
const ADMIN_WHITELIST = [
  'gustavo.moraes@beetsjr.com',
  'andre.ricardo.goncales@gmail.com'
];

const PALMARES = [
  'andre.ricardo.goncales@gmail.com'
];

// const PIRANGI = [
//   'andre.ricardo.goncales@gmail.com'
// ];

function isEmailAdmin(email) {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (normalized.endsWith('@beetsjr.com.br')) return true; // somos todos admins muhehe
  if (ADMIN_WHITELIST.includes(normalized)) return true;
  return false;
}

// Try to decode a JWT and return payload (not verifying signature) — helps get email if token present
function decodeTokenPayload(token) {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payload = parts[1];
    // base64url -> base64
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(b64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('@BaseRepo:user');
      const storedToken = localStorage.getItem('@BaseRepo:token');

      if (storedUser && storedToken) {
        api.defaults.headers.authorization = `Bearer ${storedToken}`;
        return JSON.parse(storedUser);
      }

      return null;
    } catch (e) {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      const storedUser = localStorage.getItem('@BaseRepo:user');
      const storedToken = localStorage.getItem('@BaseRepo:token');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        return isEmailAdmin(u.email);
      }
      if (storedToken) {
        const payload = decodeTokenPayload(storedToken);
        if (payload?.email) return isEmailAdmin(payload.email);
      }
      return false;
    } catch (e) {
      return false;
    }
  });

  const signIn = useCallback(async ({ email, password }) => {
    try {
      // Validar domínio antes de tentar login
      const dominios = ['exemplo1.com', 'exemplo2.com', 'exemplo3.com', 'beetsjr.com.br', 'gmail.com'];
      const dominioUsuario = email.split('@')[1];
      
      if (!dominios.includes(dominioUsuario)) {
        throw new Error('Domínio de email inválido');
      }

      // Fazer login no Firebase Auth diretamente
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const firebaseUser = userCredential.user;

      // Obter o ID Token (este é o token correto para usar no backend)
      const idToken = await firebaseUser.getIdToken();

      const userData = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || email.split('@')[0],
        email: firebaseUser.email
      };

      localStorage.setItem('@BaseRepo:token', idToken);
      localStorage.setItem('@BaseRepo:user', JSON.stringify(userData));

      api.defaults.headers.authorization = `Bearer ${idToken}`;
      setUser(userData);
      setIsAdmin(isEmailAdmin(userData.email));
    } catch (error) {
      console.error('Erro no login:', error);
      throw new Error(error.message || 'Erro ao fazer login');
    }
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    try {
      // Validar domínio antes de tentar registro
      const dominios = ['exemplo1.com', 'exemplo2.com', 'exemplo3.com', 'beetsjr.com.br', 'gmail.com'];
      const dominioUsuario = email.split('@')[1];
      
      if (!dominios.includes(dominioUsuario)) {
        throw new Error('Domínio de email inválido');
      }

      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const firebaseUser = userCredential.user;

      // Obter o ID Token
      const idToken = await firebaseUser.getIdToken();

      const userData = {
        id: firebaseUser.uid,
        name: name || email.split('@')[0],
        email: firebaseUser.email
      };

      localStorage.setItem('@BaseRepo:token', idToken);
      localStorage.setItem('@BaseRepo:user', JSON.stringify(userData));

      api.defaults.headers.authorization = `Bearer ${idToken}`;
      setUser(userData);
      setIsAdmin(isEmailAdmin(userData.email));
    } catch (error) {
      console.error('Erro no registro:', error);
      throw new Error(error.message || 'Erro ao criar conta');
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(firebaseAuth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
    localStorage.removeItem('@BaseRepo:token');
    localStorage.removeItem('@BaseRepo:user');
    api.defaults.headers.authorization = '';
    setUser(null);
    setIsAdmin(false);
  }, []);

  // Listener para renovar token automaticamente e manter sessão sincronizada
  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Obter token atualizado
          const idToken = await firebaseUser.getIdToken(true);
          
          const userData = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
            email: firebaseUser.email
          };

          localStorage.setItem('@BaseRepo:token', idToken);
          localStorage.setItem('@BaseRepo:user', JSON.stringify(userData));
          api.defaults.headers.authorization = `Bearer ${idToken}`;
          
          setUser(userData);
          setIsAdmin(isEmailAdmin(userData.email));
        } catch (error) {
          console.error('Erro ao atualizar token:', error);
        }
      } else {
        // Usuário não está autenticado
        const storedToken = localStorage.getItem('@BaseRepo:token');
        if (storedToken) {
          // Limpar dados se o usuário não está mais autenticado no Firebase
          localStorage.removeItem('@BaseRepo:token');
          localStorage.removeItem('@BaseRepo:user');
          api.defaults.headers.authorization = '';
          setUser(null);
          setIsAdmin(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAdmin, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}