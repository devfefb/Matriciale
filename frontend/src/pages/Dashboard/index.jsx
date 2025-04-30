import React from 'react';
import { 
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import Nucleo from '../../components/Tela_Principal/Dashboard/Nucleo'
import theme from '../../theme/theme';

export default function Dashboard() {

  return (
    <>
      <Header/>
      <div style={{
        display: 'flex'
      }}>
        <Sidebar/>
          <ThemeProvider theme={theme}>
            <CssBaseline/>
            <Nucleo/>
          </ThemeProvider>
      </div>
    </>
  );
} 