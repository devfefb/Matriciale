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
  TableRow,
  useTheme,
  useMediaQuery,
  Button,
  Fab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import Header from '../../Header';
import Sidebar from '../../Sidebar';
import { useTasks } from '../Dashboard/TaskContext';
import TaskDetailsModal from './TaskDetailsModal';

const Calendar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { tasks, isLoading, refreshTasks } = useTasks();
  
  // Usar a data atual
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState([]);
  const [eventsByDate, setEventsByDate] = useState({});
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Nomes dos dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Nomes dos meses em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Organizar tarefas por data
  useEffect(() => {
    if (!tasks) return;

    const eventMap = {};
    tasks.forEach(task => {
      // Ajusta o fuso horário para considerar a data local
      const taskDate = new Date(task.date);
      taskDate.setMinutes(taskDate.getMinutes() + taskDate.getTimezoneOffset());
      const formattedDate = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
      
      if (!eventMap[formattedDate]) {
        eventMap[formattedDate] = [];
      }
      
      eventMap[formattedDate].push({
        ...task,
        id: task.id || Math.random().toString(36).substr(2, 9),
      });
    });

    setEventsByDate(eventMap);
  }, [tasks]);

  // Função para gerar os dias do calendário
  useEffect(() => {
    const generateCalendarDays = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const firstDayOfWeek = firstDay.getDay();
      const daysInMonth = lastDay.getDate();
      
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
      const remainingDays = 42 - days.length;
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
      
      return days.reduce((weeks, day, i) => {
        if (i % 7 === 0) weeks.push([]);
        weeks[weeks.length - 1].push(day);
        return weeks;
      }, []);
    };
    
    setCalendarDays(generateCalendarDays());
  }, [currentDate]);

  // Handler para abrir o modal
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  // Renderiza os eventos para um determinado dia
  const renderEvents = (formattedDate) => {
    const events = eventsByDate[formattedDate] || [];
    
    return events.map((event) => (
      <Box 
        key={event.id}
        sx={{ 
          display: 'flex',
          alignItems: 'center',
          mb: 0.5,
          fontSize: '0.75rem',
          bgcolor: event.bgColor || '#f5f5f5',
          borderRadius: '4px',
          px: 1,
          py: 0.5,
          borderLeft: `10px solid ${event.color}`,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          '&:hover': {
            filter: 'brightness(0.95)',
          }
        }}
        onClick={() => handleTaskClick(event)}
      >
        <Typography variant="caption" sx={{ fontSize: '0.75rem', ml: 1 }}>
          {event.label}
        </Typography>
      </Box>
    ));
  };

  // Obter o nome do mês e ano atual
  const monthYearString = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <>
      <Header/>
      <div style={{
        display: "flex",
        backgroundColor: "#F3F1EE"
      }}>
        <Sidebar/>
        <Box
          sx={{
            p: { xs: 1, sm: 2, md: 3 },
            height: '100%',
            width: '100%',
            overflow: 'auto',
            marginLeft: '20%'
          }}
        >
          <Paper 
            elevation={1}
            sx={{ 
              p: { xs: 1, sm: 2 },
              borderRadius: 4,
              overflow: 'hidden',
              border: '1px solid #e0e0e0'
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 2
            }}>
              <Typography 
                variant="h5" 
                color="primary" 
                sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '1.2rem', sm: '1.5rem' }
                }}
              >
                {monthYearString}
              </Typography>
              
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => navigate('/calendar/criar-tarefa')}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none'
                }}
              >
                Nova Tarefa
              </Button>
            </Box>
            
            <TableContainer>
              <Table sx={{ tableLayout: 'fixed' }}>
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
                          px: { xs: 0.5, sm: 1 },
                          py: 1,
                          fontSize: { xs: '0.8rem', sm: '0.9rem' }
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
                            height: { xs: 80, sm: 100 },
                            width: `${100/7}%`,
                            p: { xs: 0.5, sm: 1 },
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
                              fontSize: { xs: '0.8rem', sm: '0.9rem' },
                              mb: 1
                            }}
                          >
                            {day.isNextMonth && day.day === 1 ? '1 mar' : 
                            day.isPrevMonth && day.day === 26 ? '26' : 
                            day.day}
                          </Typography>
                          {renderEvents(day.formattedDate)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          <Fab 
            color="primary" 
            aria-label="add"
            onClick={() => navigate('/calendar/criar-tarefa')}
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32
            }}
          >
            <AddIcon />
          </Fab>

          <TaskDetailsModal
            task={selectedTask}
            open={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setSelectedTask(null);
            }}
          />
        </Box> 
      </div>
    </>
  );
};

export default Calendar; 