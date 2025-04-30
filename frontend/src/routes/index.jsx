import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Users from '../pages/Users';
import Dashboard from '../pages/Dashboard';
import Relatorio from '../pages/Relatorio';
import Gerenciamento from '../pages/Gerenciamento';
import MedicineInfoTable from '../components/Gerenciamento/MedicineInfoTable';
import Calendar from '../components/Tela_Principal/Calendar/Calendar';
import RelatorioImpressao from '../components/Relatorio/RelatorioImpressao';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route 
        path="/login" 
        element={user ? <Navigate to="/dashboard" /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={user ? <Navigate to="/dashboard" /> : <Register />} 
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <Users />
          </PrivateRoute>
        }
      />
      <Route 
        path="/" 
        element={<Navigate to={user ? "/dashboard" : "/login"} />} 
      />
      <Route path="/relatorio" element={<Relatorio/>}/>
      <Route path="/gerenciamento" element={<Gerenciamento/>}/>
      <Route path="/medicine/:codigo/:nome" element={<MedicineInfoTable/>}/>
      <Route path='/calendar' element={<Calendar/>}/>
      <Route path="/relatorio/impressao" element={<RelatorioImpressao />} />
    </Routes>
  );
} 