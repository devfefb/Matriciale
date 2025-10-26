import React, { createContext, useState, useContext, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext({});

// Small whitelist for additional admins
const ADMIN_WHITELIST = [
  'andre.ricardo.goncales@gmail.com'
];

function isEmailAdmin(email) {
  if (!email) return false;
  const normalized = email.toLowerCase();
  if (normalized.endsWith('@beetsjr.com.br')) return true;
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
      const response = await api.post('/login', { email, password });
      const { token, user: userData } = response.data;

      localStorage.setItem('@BaseRepo:token', token);
      localStorage.setItem('@BaseRepo:user', JSON.stringify(userData));

      api.defaults.headers.authorization = `Bearer ${token}`;
      setUser(userData);
      setIsAdmin(isEmailAdmin(userData.email));
    } catch (error) {
      console.error('Erro no login:', error);
      throw new Error(error.response?.data?.error || 'Erro ao fazer login');
    }
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    try {
      const response = await api.post('/register', { name, email, password });
      const { token, user: userData } = response.data;

      localStorage.setItem('@BaseRepo:token', token);
      localStorage.setItem('@BaseRepo:user', JSON.stringify(userData));

      api.defaults.headers.authorization = `Bearer ${token}`;
      setUser(userData);
      setIsAdmin(isEmailAdmin(userData.email));
    } catch (error) {
      console.error('Erro no registro:', error);
      throw new Error(error.response?.data?.error || 'Erro ao criar conta');
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('@BaseRepo:token');
    localStorage.removeItem('@BaseRepo:user');
    api.defaults.headers.authorization = '';
    setUser(null);
    setIsAdmin(false);
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