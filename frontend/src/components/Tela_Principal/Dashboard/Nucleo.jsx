import React from 'react';
import { Box } from '@mui/material';
import StockChart from './StockChart';

const Nucleo = () => {
  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        width: { xs: '100%', sm: '100%', md: '80%' },
        minHeight: 'calc(100vh - 100px)',
        marginLeft: { xs: 0, sm: 0, md: '20%' },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'auto'
      }}
    >
      {/* Gráfico de Estoque em Destaque */}
      <Box 
        sx={{ 
          width: '100%',
          maxWidth: '1200px',
          display: 'flex',
          justifyContent: 'center',
          minHeight: { xs: '400px', sm: '500px', md: '600px' }
        }}
      >
        <StockChart />
      </Box>
    </Box>
  );
};

export default Nucleo;