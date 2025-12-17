import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, Skeleton, useMediaQuery, useTheme } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const StockChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!user?.email) return;

        const response = await api.get('/medicines/general', {
          params: { email: user.email }
        });

        let medicines = [];
        if (Array.isArray(response.data)) {
          medicines = response.data;
        } else if (response.data && response.data.medicines) {
          medicines = response.data.medicines;
        }

        const statusCounts = {
          'Zerado Inativo': 0,
          'Zerado c/ Dispensação': 0,
          '4 Semanas': 0,
          '8 Semanas': 0,
          '12 Semanas': 0,
          '16 Semanas': 0,
          '16 Sem. Inativo (Alerta)': 0,
          '16-52 Semanas': 0,
          '> 52 Semanas': 0
        };

        medicines.forEach(med => {
          const status = med.status;
          const isInativo = med.isInativo || med.tp_metodo === "3.INATIVOS";
          
          // Categoria Roxo: Itens Zerados
          if (status === 0) {
            if (isInativo) {
              statusCounts['Zerado Inativo']++;
            } else {
              statusCounts['Zerado c/ Dispensação']++;
            }
          }
          // Categorias normais (0-16 semanas)
          else if (status <= 4) statusCounts['4 Semanas']++;
          else if (status <= 8) statusCounts['8 Semanas']++;
          else if (status <= 12) statusCounts['12 Semanas']++;
          else if (status <= 16) {
            if (isInativo) {
              statusCounts['16 Sem. Inativo (Alerta)']++;
            } else {
              statusCounts['16 Semanas']++;
            }
          }
          // Categoria Acima de 16 Semanas
          else if (status <= 52) statusCounts['16-52 Semanas']++;
          else statusCounts['> 52 Semanas']++;
        });

        const chartData = [
          { label: 'Zerado Inativo', value: statusCounts['Zerado Inativo'], color: '#6A1B9A' },
          { label: 'Zerado c/ Dispensação', value: statusCounts['Zerado c/ Dispensação'], color: '#8D2ABB' },
          { label: '4 Semanas', value: statusCounts['4 Semanas'], color: '#F44336' },
          { label: '8 Semanas', value: statusCounts['8 Semanas'], color: '#FF9800' },
          { label: '12 Semanas', value: statusCounts['12 Semanas'], color: '#FFC107' },
          { label: '16 Semanas', value: statusCounts['16 Semanas'], color: '#4CAF50' },
          { label: '16 Sem. Inativo (Alerta)', value: statusCounts['16 Sem. Inativo (Alerta)'], color: '#FFB300' },
          { label: '16-52 Semanas', value: statusCounts['16-52 Semanas'], color: '#64B5F6' },
          { label: '> 52 Semanas', value: statusCounts['> 52 Semanas'], color: '#1565C0' },
        ].filter(item => item.value > 0);

        setData(chartData);
      } catch (error) {
        console.error('Error fetching chart data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  return (
    <Card sx={{ 
      width: '100%',
      height: '100%', 
      minHeight: { xs: '400px', sm: '450px', md: '550px' },
      maxHeight: { xs: '500px', md: '65vh' },
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'auto'
    }}>
      <CardContent sx={{ 
        p: { xs: 2, md: 2.5 }, 
        display: 'flex', 
        flexDirection: 'column', 
        flex: 1,
        overflow: 'auto'
      }}>
        <Typography 
          variant="h5" 
          gutterBottom 
          align="center" 
          sx={{ 
            fontWeight: 'bold', 
            mb: { xs: 1, md: 2 },
            fontSize: { xs: '1.25rem', md: '1.5rem' }
          }}
        >
          CAF - Giro de Estoque
        </Typography>

        {loading ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            flex: 1,
            minHeight: '300px'
          }}>
            <Skeleton 
              variant="circular" 
              width={{ xs: 250, sm: 300 }} 
              height={{ xs: 250, sm: 300 }} 
            />
          </Box>
        ) : (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
            width: '100%',
            position: 'relative',
            overflow: 'visible'
          }}>
            <PieChart
              series={[
                {
                  data: data,
                  outerRadius: isMobile ? 90 : isTablet ? 110 : 140,
                  paddingAngle: 1,
                  cornerRadius: 5,
                  highlightScope: { faded: 'global', highlighted: 'item' },
                  arcLabel: (item) => {
                    const total = data.reduce((a, b) => a + b.value, 0);
                    const percent = (item.value / total) * 100;
                    // Only show label if percentage is significant to avoid overlap
                    return percent > 5 ? `${item.value} (${percent.toFixed(1)}%)` : '';
                  },
                  arcLabelMinAngle: 20,
                },
              ]}
              width={isMobile ? 350 : isTablet ? 400 : 450}
              height={isMobile ? 380 : isTablet ? 420 : 450}
              margin={{ 
                top: 20, 
                bottom: isMobile ? 100 : 120, 
                left: isMobile ? 10 : 20, 
                right: isMobile ? 10 : 20
              }}
              slotProps={{
                legend: {
                  direction: isMobile ? 'column' : 'row',
                  position: { vertical: 'bottom', horizontal: 'middle' },
                  padding: 0,
                  itemMarkWidth: isMobile ? 10 : 12,
                  itemMarkHeight: isMobile ? 10 : 12,
                  labelStyle: {
                    fontSize: isMobile ? 11 : isTablet ? 12 : 13,
                    fill: '#555'
                  },
                  itemGap: isMobile ? 8 : 10
                }
              }}
              sx={{
                maxWidth: '100%',
                '& .MuiChartsLegend-root': {
                  maxWidth: '100%',
                  flexWrap: 'wrap'
                }
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StockChart;