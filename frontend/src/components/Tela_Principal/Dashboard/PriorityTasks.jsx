import React from 'react';
import { Card, CardContent, Typography, Button, Box } from '@mui/material';

const PriorityTasks = () => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5, height: '100%' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mb: 2.5 
        }}>
          <Typography variant="h6">
            Tarefas Prioritárias
          </Typography>
          <Typography 
            sx={{ 
              color: 'primary.main',
              fontWeight: 500,
              fontSize: '0.95rem'
            }}
          >
            14/02
          </Typography>
        </Box>
        <Box
          sx={{
            display: 'flex',
            bgcolor: '#f3e5f5',
            borderRadius: 1.5,
            p: 2,
            borderLeft: '20px solid #9c27b0'
          }}
        >
          <Typography 
            sx={{ 
              flex: 1,
              color: 'text.secondary',
              fontSize: '0.95rem'
            }}
          >
            Repor Farmácia &lt;nome&gt;
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
      </CardContent>
    </Card>
  );
};

export default PriorityTasks; 