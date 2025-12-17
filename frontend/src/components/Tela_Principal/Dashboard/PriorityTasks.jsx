import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';
import { useTasks } from './TaskContext';

const PriorityTasks = () => {
  const { currentDate, todayTasks } = useTasks();

  const renderTask = (task) => (
    <Box
      key={task.id}
      sx={{
        display: 'flex',
        bgcolor: task.bgColor,
        borderRadius: 1.5,
        p: 2,
        borderLeft: `20px solid ${task.color}`,
        mb: 1
      }}
    >
      <Typography 
        sx={{ 
          flex: 1,
          color: 'text.secondary',
          fontSize: '0.95rem'
        }}
      >
        {task.label}
      </Typography>
      <Button
        variant="contained"
        sx={{
          minWidth: '120px',
          height: '36px'
        }}
      >
        Visualizar
      </Button>
    </Box>
  );

  return (
    <Card sx={{ 
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      <CardContent sx={{ 
        p: { xs: 2, md: 2.5 }, 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: { xs: 2, md: 2.5 },
          gap: { xs: 0.5, sm: 0 },
          flexShrink: 0
        }}>
          <Typography 
            variant="h6"
            sx={{
              fontSize: { xs: '1.1rem', md: '1.25rem' }
            }}
          >
            Tarefas Prioritárias
          </Typography>
          <Typography 
            sx={{ 
              color: 'primary.main',
              fontWeight: 500,
              fontSize: { xs: '0.85rem', md: '0.95rem' }
            }}
          >
            {currentDate}
          </Typography>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {todayTasks.length > 0 ? (
            todayTasks.map(task => renderTask(task))
          ) : (
            <Typography 
              sx={{ 
                color: 'text.secondary',
                fontSize: { xs: '0.875rem', md: '0.95rem' },
                textAlign: 'center',
                mt: 2
              }}
            >
              Nenhuma tarefa prioritária para hoje
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default PriorityTasks; 