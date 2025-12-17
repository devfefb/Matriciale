import React from 'react';
import { 
  ThemeProvider,
  CssBaseline,
  Box
} from '@mui/material';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import Nucleo from '../../components/Tela_Principal/Dashboard/Nucleo'
import theme from '../../theme/theme';

export default function Dashboard() {

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
          <Nucleo/>
        </ThemeProvider>
      </Box>
    </Box>
  );
} 