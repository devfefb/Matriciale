import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';

const mockData = [
  { value: 33.1, label: 'Setor 1', color: '#00BCD4' },
  { value: 24.8, label: 'Setor 2', color: '#4CAF50' },
  { value: 20.2, label: 'Setor 3', color: '#FF9800' },
  { value: 16.3, label: 'Setor 4', color: '#F44336' },
  { value: 5.6, label: 'Setor 5', color: '#9C27B0' },
];

const StockChart = () => {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h6" gutterBottom>
          CAF - Giro de Estoque
        </Typography>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          height: '280px'
        }}>
          <PieChart
            series={[
              {
                data: mockData,
                innerRadius: 55,
                outerRadius: 90,
                paddingAngle: 0.5,
                cornerRadius: 0,
                highlightScope: { faded: 'global', highlighted: 'item' },
                arcLabel: (item) => `${item.value}%`,
                arcLabelMinAngle: 20,
              },
            ]}
            width={300}
            height={250}
            slotProps={{
              legend: { hidden: true }
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default StockChart; 