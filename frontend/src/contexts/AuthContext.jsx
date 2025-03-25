import React, { createContext, useState, useContext, useCallback } from 'react';
import api from '../services/api';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebaseConfig'; // Importe o auth do arquivo de configuração do Firebase

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('@BaseRepo:user');
    const storedToken = localStorage.getItem('@BaseRepo:token');
    
    if (storedUser && storedToken) {
      api.defaults.headers.authorization = `Bearer ${storedToken}`;
      return JSON.parse(storedUser);
    }

    return null;
  });

  const signIn = useCallback(async ({ email, password }) => {
    try {
      const response = await api.post('/login', { email, password });
      const { token, user: userData } = response.data;
      console.log("user data:", user, "\ntoken:", token);
      if (!userData || !token) {
        throw new Error('Erro ao fazer login');
      }

      // Autenticação Firebase
      await signInWithEmailAndPassword(auth, email, password); // Faz o login no Firebase também

      // Armazenar o token e dados do usuário no localStorage
      localStorage.setItem('@BaseRepo:token', token);
      localStorage.setItem('@BaseRepo:user', JSON.stringify(userData));
      
      api.defaults.headers.authorization = `Bearer ${token}`;
      setUser(userData);
    } catch (error) {
      console.error('Erro no login:', error);
      throw new Error(error.response?.data?.error || 'Erro ao fazer login');
    }
  }, []);

  const signUp = useCallback(async ({ name, email, password }) => {
    try {
      const response = await api.post('/register', { name, email, password });
      const { token, user: userData } = response.data;
      if(!userData || !token)
      {
        throw new Error('Erro ao criar conta')
      }

      localStorage.setItem('@BaseRepo:token', token);
      localStorage.setItem('@BaseRepo:user', JSON.stringify(userData));
      
      api.defaults.headers.authorization = `Bearer ${token}`;
      setUser(userData);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Erro ao criar conta');
    }
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('@BaseRepo:token');
    localStorage.removeItem('@BaseRepo:user');
    api.defaults.headers.authorization = '';
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
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