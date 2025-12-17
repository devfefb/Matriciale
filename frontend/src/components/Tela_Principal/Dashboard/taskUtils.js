// Tipos de tarefas e suas cores
export const TASK_TYPES = {
  REPOSICAO: {
    label: 'Repor Farmácia Central',
    color: '#9C27B0',
    bgColor: '#E8D5F7'
  },
  ENTREGA: {
    label: 'Entrega de Materiais',
    color: '#FF9800',
    bgColor: '#FFF3E0'
  },
  AUDITORIA: {
    label: 'Auditoria CAF',
    color: '#4CAF50',
    bgColor: '#E8F5E9'
  },
  LIMPEZA: {
    label: 'Limpeza de Almoxarifado Central',
    color: '#F44336',
    bgColor: '#FFEBEE'
  },
  INSPECAO: {
    label: 'Inspeção de Estoque Central',
    color: '#00BCD4',
    bgColor: '#E0F7FA'
  }
};

// Função para obter a semana atual (segunda a sexta)
export const getCurrentWeek = () => {
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  
  // Ajusta para começar na segunda-feira
  const monday = new Date(today);
  monday.setDate(today.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  
  const weekDays = [];
  const dayNames = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
  
  for (let i = 0; i < 5; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    
    weekDays.push({
      day: dayNames[i],
      date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      fullDate: date,
      tasks: []
    });
  }
  
  return weekDays;
};

// Função para formatar a data atual
export const getCurrentDate = () => {
  return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

// Função para verificar se uma data é hoje
export const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}; 