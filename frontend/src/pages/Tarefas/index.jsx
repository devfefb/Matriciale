import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import PriorityTasks from '../../components/Tela_Principal/Dashboard/PriorityTasks';
import ScheduledTasks from '../../components/Tela_Principal/Dashboard/ScheduledTasks';
import { TaskProvider } from '../../components/Tela_Principal/Dashboard/TaskContext';
import theme from '../../theme/theme';

export default function Tarefas() {
  const navigate = useNavigate();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header/>
      <Box sx={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden'
      }}>
        <Sidebar/>
        <ThemeProvider theme={theme}>
          <CssBaseline/>
          <TaskProvider>
            <Box
              sx={{
                p: { xs: 2, sm: 2.5, md: 3 },
                width: { xs: '100%', sm: '100%', md: '80%' },
                minHeight: 'calc(100vh - 100px)',
                marginLeft: { xs: 0, sm: 0, md: '20%' },
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto'
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  mb: { xs: 2, md: 3 },
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  gap: 2
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    fontSize: { xs: '1.5rem', md: '2rem' },
                    fontWeight: 'bold',
                    color: 'var(--color-azul-escuro)'
                  }}
                >
                  Tarefas
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

              {/* Tarefas Agendadas e Prioritárias */}
              <Box 
                sx={{ 
                  width: '100%',
                  display: 'flex',
                  flexDirection: { xs: 'column', lg: 'row' },
                  gap: { xs: 2, md: 3 },
                  minHeight: { xs: 'auto', md: 'calc(100vh - 250px)' }
                }}
              >
                <Box sx={{ 
                  flex: 1, 
                  minWidth: 0, 
                  display: 'flex',
                  minHeight: { xs: '300px', md: 'auto' }
                }}>
                  <ScheduledTasks />
                </Box>
                <Box sx={{ 
                  flex: { xs: 1, lg: 0.5 }, 
                  minWidth: 0, 
                  display: 'flex',
                  minHeight: { xs: '250px', md: 'auto' }
                }}>
                  <PriorityTasks />
                </Box>
              </Box>
            </Box>
          </TaskProvider>
        </ThemeProvider>
      </Box>
    </Box>
  );
}

