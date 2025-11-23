import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Login from '../pages/Login';
import Register from '../pages/Register';
import Users from '../pages/Users';
import Dashboard from '../pages/Dashboard';
import Relatorio from '../pages/Relatorio';
import Gerenciamento from '../pages/Gerenciamento';
import ConversorArquivos from '../pages/ConversorArquivos';
import MedicineInfoTable from '../components/Gerenciamento/MedicineInfoTable';
import Calendar from '../components/Tela_Principal/Calendar/Calendar';
import RelatorioImpressao from '../components/Relatorio/RelatorioImpressao';
import Pacientes from '../pages/pacientes/Pacientes';
import VisualizarPacientes from '../components/Pacientes/VisualizarPacientes';
import Historico from '../pages/Historico';
import CriarTarefa from '../pages/Dashboard/Calendar/CriarTarefa';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return isAdmin ? children : <Navigate to="/dashboard" />;
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
        path="/users/pacientes"
        element={
          <PrivateRoute>
            <Pacientes />
          </PrivateRoute>
        }
      />
      <Route
        path="/conversor"
        element={
          <AdminRoute>
            <ConversorArquivos />
          </AdminRoute>
        }
      />
      <Route
        path="/"
        element={<Navigate to={user ? "/dashboard" : "/login"} />}
      />
      <Route path="/relatorio" element={<Relatorio />} />
      {/* <Route path="/documentos" element={<Historico />} /> */}
      <Route path="/gerenciamento" element={<Gerenciamento />} />
      <Route path="/medicine/:id" element={<MedicineInfoTable />} />
      <Route path="/users/pacientes/:id/:nome" element={<VisualizarPacientes />} />
      <Route path='/calendar' element={<Calendar />} />
      <Route path='/calendar/criar-tarefa' element={<CriarTarefa />} />
      <Route path="/relatorio/impressao" element={<RelatorioImpressao />} />
    </Routes>
  );
} 