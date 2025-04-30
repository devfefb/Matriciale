import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow 
} from '@mui/material';
import Header from '../../Header';
import Sidebar from '../../Sidebar';

// Dados mockados para eventos do calendário - atualizados conforme imagem
const mockEvents = {
  '2024-02-03': [
    { id: 1, title: 'Tarefa', color: '#FF9800' },
    { id: 2, title: 'Tarefa', color: '#4CAF50' }
  ],
  '2024-02-14': [
    { id: 3, title: 'Reposição', color: '#9C27B0' }
  ],
  '2024-02-25': [
    { id: 4, title: 'Reposição', color: '#F44336' }
  ],
  '2024-02-27': [
    { id: 5, title: 'Reposição', color: '#FF9800' }
  ],
  // Adicionados para corresponder à imagem
  '2024-01-26': [],
  '2024-01-27': [],
  '2024-01-28': [],
  '2024-01-29': [],
  '2024-01-30': [],
  '2024-01-31': [],
  '2024-02-01': []
};

const Calendar = () => {
  // Fixar a data para fevereiro de 2025 conforme a imagem
  const [currentDate, setCurrentDate] = useState(new Date(2025, 1, 1)); // Fevereiro é mês 1 no JavaScript
  const [calendarDays, setCalendarDays] = useState([]);

  // Nomes dos dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Nomes dos meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Função para gerar os dias do calendário
  useEffect(() => {
    const generateCalendarDays = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      // Primeiro dia do mês
      const firstDay = new Date(year, month, 1);
      
      // Último dia do mês
      const lastDay = new Date(year, month + 1, 0);
      
      // Dia da semana do primeiro dia (0 = Domingo, 6 = Sábado)
      const firstDayOfWeek = firstDay.getDay();
      
      // Total de dias no mês
      const daysInMonth = lastDay.getDate();
      
      // Array para armazenar todos os dias a serem exibidos
      const days = [];
      
      // Adicionar dias do mês anterior
      const prevMonthLastDay = new Date(year, month, 0).getDate();
      for (let i = firstDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthLastDay - i;
        const date = new Date(year, month - 1, day);
        days.push({
          date,
          day,
          isCurrentMonth: false,
          isPrevMonth: true,
          formattedDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        });
      }
      
      // Adicionar dias do mês atual
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        days.push({
          date,
          day,
          isCurrentMonth: true,
          formattedDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        });
      }
      
      // Adicionar dias do próximo mês
      const remainingDays = 42 - days.length; // 6 linhas de 7 dias
      for (let day = 1; day <= remainingDays; day++) {
        const date = new Date(year, month + 1, day);
        days.push({
          date,
          day,
          isCurrentMonth: false,
          isNextMonth: true,
          formattedDate: `${year}-${String(month + 2).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        });
      }
      
      // Dividir os dias em semanas
      const weeks = [];
      for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7));
      }
      
      return weeks;
    };
    
    setCalendarDays(generateCalendarDays());
  }, [currentDate]);

  // Renderiza os eventos para um determinado dia
  const renderEvents = (formattedDate, day) => {
    // Para simular exatamente os dados da imagem
    if (day === 3 && currentDate.getMonth() === 1 && currentDate.getFullYear() === 2025) {
      return (
        <>
          <Box 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              mb: 0.5,
              fontSize: '0.75rem',
              bgcolor: '#f5f5f5',
              borderRadius: '4px',
              px: 1,
              py: 0.5,
              borderLeft: '10px solid #FF9800'
            }}
          >
            <Typography variant="caption" sx={{ fontSize: '0.75rem', ml: 1 }}>
              Tarefa
            </Typography>
          </Box>
          <Box 
            sx={{ 
              display: 'flex',
              alignItems: 'center',
              mb: 0.5,
              fontSize: '0.75rem',
              bgcolor: '#f5f5f5',
              borderRadius: '4px',
              px: 1,
              py: 0.5,
              borderLeft: '10px solid #4CAF50'
            }}
          >
            <Typography variant="caption" sx={{ fontSize: '0.75rem', ml: 1 }}>
              Tarefa
            </Typography>
          </Box>
        </>
      );
    }
    
    if (day === 14 && currentDate.getMonth() === 1 && currentDate.getFullYear() === 2025) {
      return (
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 0.5,
            fontSize: '0.75rem',
            bgcolor: '#f5f5f5',
            borderRadius: '4px',
            px: 1,
            py: 0.5,
            borderLeft: '10px solid #9C27B0'
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.75rem', ml: 1 }}>
            Reposição
          </Typography>
        </Box>
      );
    }
    
    if (day === 25 && currentDate.getMonth() === 1 && currentDate.getFullYear() === 2025) {
      return (
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 0.5,
            fontSize: '0.75rem',
            bgcolor: '#f5f5f5',
            borderRadius: '4px',
            px: 1,
            py: 0.5,
            borderLeft: '10px solid #F44336'
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.75rem', ml: 1 }}>
            Reposição
          </Typography>
        </Box>
      );
    }
    
    if (day === 27 && currentDate.getMonth() === 1 && currentDate.getFullYear() === 2025) {
      return (
        <Box 
          sx={{ 
            display: 'flex',
            alignItems: 'center',
            mb: 0.5,
            fontSize: '0.75rem',
            bgcolor: '#f5f5f5',
            borderRadius: '4px',
            px: 1,
            py: 0.5,
            borderLeft: '10px solid #FF9800'
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.75rem', ml: 1 }}>
            Reposição
          </Typography>
        </Box>
      );
    }
    
    return null;
  };

  // Obter o nome do mês e ano atual
  const monthYearString = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <>
      <Header/>
      <div style={{
        display: "flex"
      }}>
        <Sidebar/>
        <Box
          sx={{
            p: 3,
            height: '100%',
            width: '100%',
            overflow: 'auto',
          }}
        >
          <Paper 
            elevation={1}
            sx={{ 
              p: 2, 
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid #e0e0e0'
            }}
          >
            <Typography 
              variant="h5" 
              color="primary" 
              sx={{ mb: 2, fontWeight: 500 }}
            >
              {monthYearString}
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    {weekDays.map((day, index) => (
                      <TableCell 
                        key={index} 
                        align="center"
                        sx={{ 
                          color: index === 0 || index === 6 ? 'error.main' : 'primary.main',
                          fontWeight: 'bold',
                          borderBottom: '2px solid',
                          borderColor: 'primary.main',
                          px: 1,
                          py: 1
                        }}
                      >
                        {day}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {calendarDays.map((week, weekIndex) => (
                    <TableRow key={weekIndex}>
                      {week.map((day, dayIndex) => (
                        <TableCell 
                          key={dayIndex}
                          align="center"
                          sx={{ 
                            height: 100,
                            width: `${100/7}%`,
                            p: 1,
                            verticalAlign: 'top',
                            border: '1px solid #e0e0e0',
                            backgroundColor: day.isCurrentMonth 
                              ? 'inherit' 
                              : 'rgba(0, 0, 255, 0.1)',
                          }}
                        >
                          <Typography 
                            sx={{ 
                              fontWeight: 'medium',
                              color: !day.isCurrentMonth 
                                ? 'text.secondary' 
                                : 'inherit',
                              fontSize: '0.9rem',
                              mb: 1
                            }}
                          >
                            {day.isNextMonth && day.day === 1 ? '1 mar' : 
                            day.isPrevMonth && day.day === 26 ? '26' : 
                            day.day}
                          </Typography>
                          {renderEvents(day.formattedDate, day.day)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box> 
      </div>
    </>
  );
};

export default Calendar; 