import React from 'react';
import { 
  ThemeProvider,
  CssBaseline
} from '@mui/material';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import theme from '../../theme/theme';
import Documentos from '../../components/Historico/Documentos';

export default function Historico() {

  return (
    <>
      <Header/>
      <div style={{
        display: 'flex'
      }}>
        <Sidebar/>
          <div style={{ marginLeft: '20%', width: '80%' }}>
            <ThemeProvider theme={theme}>
              <CssBaseline/>
              <Documentos />
            </ThemeProvider>
          </div>
      </div>
    </>
  );
} 