import React, { createContext, useContext, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const TaskContext = createContext(null);

const getMunicipio = (email) => {
  if (!email) return null;

  console.log('Determining municipio for email:', email);
  const normalizedEmail = email.toLowerCase();
  
  const PALMARES = ['gustavo.moraes@beetsjr.com.br'];
  const PIRANGI = ['andre.ricardo.goncales@gmail.com'];
  
  if (PALMARES.includes(normalizedEmail)) return 'Palmares';
  if (PIRANGI.includes(normalizedEmail)) return 'Pirangi';
  
  return null;
};

export const TaskProvider = ({ children }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const municipio = getMunicipio(user?.email);
      if (!municipio) {
        console.error('Usuário não tem permissão para visualizar tarefas');
        setIsLoading(false);
        return;
      }

      const response = await api.get(`/tasks/${municipio}`);
      setTasks(response.data);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const currentDate = format(new Date(), "dd 'de' MMMM", { locale: ptBR });
  
  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.date);
    return format(taskDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  });

  const value = {
    tasks,
    currentDate,
    todayTasks,
    isLoading,
    refreshTasks: fetchTasks
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};