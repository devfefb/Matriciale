import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import StockChart from './StockChart';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const Nucleo = () => {
  const [municipality, setMunicipality] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchMunicipality = async () => {
      try {
        if (!user?.email) return;

        const response = await api.get('/medicines/general', {
          params: { email: user.email }
        });

        if (response.data && response.data.municipality) {
          setMunicipality(response.data.municipality);
        }
      } catch (error) {
        console.error('Erro ao buscar município:', error);
      }
    };

    fetchMunicipality();
  }, [user]);

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        width: { xs: '100%', sm: '100%', md: '80%' },
        height: 'calc(100vh - 100px)',
        maxHeight: '1200px',
        marginLeft: { xs: 0, sm: 0, md: '20%' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden'
      }}
    >
      {/* Título com nome do município */}
      {municipality && (
        <Typography
          variant="h4"
          sx={{
            color: '#0D91F3',
            fontWeight: 'bold',
            mb: 1,
            textAlign: 'center',
            fontSize: { xs: '1.5rem', md: '1.75rem' }
          }}
        >
          {municipality}
        </Typography>
      )}

      {/* Gráfico de Estoque em Destaque */}
      <Box 
        sx={{ 
          width: '100%',
          maxWidth: '1200px',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <StockChart />
      </Box>
    </Box>
  );
};

export default Nucleo;