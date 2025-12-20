import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, Typography, Button, Grid, Box, Divider } from '@mui/material';
import { useTasks } from './TaskContext';

const ScheduledTasks = () => {
  const navigate = useNavigate();
  const { weekDays } = useTasks();

  const handleViewMore = () => {
    navigate('/calendar');
  };

  const renderTask = (task) => (
    <Box
      key={task.id}
      sx={{
        bgcolor: task.bgColor,
        borderRadius: '16px 16px 16px 16px',
        overflow: 'hidden',
        position: 'relative',
        mb: 1,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '20px',
          bgcolor: task.color
        }
      }}
    >
      <Box
        sx={{
          p: 2,
          pt: 2.5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '90px',
        }}
      >
        <Typography
          align="center"
          sx={{
            color: '#555',
            fontSize: '0.9rem',
            lineHeight: 1.4
          }}
        >
          {task.label}
        </Typography>
      </Box>
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
        p: { xs: 2, md: 3 },
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        overflow: 'auto'
      }}>
        <Typography
          variant="h6"
          align="center"
          sx={{ 
            mb: { xs: 2, md: 3 },
            fontSize: { xs: '1.1rem', md: '1.25rem' },
            flexShrink: 0,
            color: 'var(--text-azul-claro)'
          }}
        >
          Tarefas Agendadas
        </Typography>
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <Grid container spacing={0}>
            {weekDays && weekDays.length > 0 ? (
              weekDays.map((dayInfo, index) => (
                <React.Fragment key={dayInfo.day}>
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={2.4}
                    sx={{
                      position: 'relative',
                      px: { xs: 0.5, md: 1 },
                      mb: { xs: 2, md: 0 }
                    }}
                  >
                    <Box sx={{
                      textAlign: 'center',
                      mb: 1.5,
                      borderBottom: '2px solid',
                      borderColor: 'primary.main',
                      pb: 0.5
                    }}>
                      <Typography
                        color="error"
                        sx={{
                          fontWeight: 500,
                          fontSize: { xs: '0.85rem', md: '0.95rem' }
                        }}
                      >
                        {dayInfo.day}
                      </Typography>
                      <Typography
                        color="error"
                        sx={{
                          fontSize: { xs: '0.75rem', md: '0.85rem' }
                        }}
                      >
                        {dayInfo.date}
                      </Typography>
                    </Box>
                    <Box sx={{ minHeight: { xs: '120px', md: '150px' } }}>
                      {dayInfo.tasks.map(task => renderTask(task))}
                    </Box>
                    {index < weekDays.length - 1 && (
                      <Divider
                        orientation="vertical"
                        sx={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          borderColor: 'rgba(0, 0, 0, 0.12)',
                          display: { xs: 'none', md: 'block' }
                        }}
                      />
                    )}
                  </Grid>
                </React.Fragment>
              ))
            ) : (
              <Typography align="center" sx={{ width: '100%', py: 4 }}>
                Nenhuma tarefa agendada para esta semana.
              </Typography>
            )}
          </Grid>
        </Box>
        <Box sx={{ textAlign: 'center', mt: { xs: 2, md: 4 }, flexShrink: 0 }}>
          <Button
            variant="contained"
            sx={{
              minWidth: { xs: '120px', md: '140px' },
              height: { xs: '36px', md: '40px' },
              fontSize: { xs: '0.875rem', md: '1rem' }
            }}
            onClick={handleViewMore}
          >
            Ver Mais
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ScheduledTasks;