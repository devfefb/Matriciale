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
          'INATIVOS ZERADOS': 0,
          'ZERADOS COM DISPENSAÇÕES': 0,
          'ATÉ UM MÊS DE ESTOQUE': 0,
          'ATÉ DOIS MESES DE ESTOQUE': 0,
          'ATÉ TRÊS MESES DE ESTOQUE': 0,
          'ATÉ QUATRO MESES DE ESTOQUE': 0,
          'ATÉ DOZE MESES DE ESTOQUE': 0,
          'ACIMA DE DOZE MESES DE ESTOQUE': 0,
          'INATIVOS COM ESTOQUES': 0
        };

        medicines.forEach(med => {
          const status = med.status;
          const isInativo = med.isInativo || med.tp_metodo === "3.INATIVOS";
          
          // Categoria: Itens Zerados
          if (status === 0) {
            if (isInativo) {
              statusCounts['INATIVOS ZERADOS']++;
            } else {
              statusCounts['ZERADOS COM DISPENSAÇÕES']++;
            }
          }
          // Categorias por meses de estoque (1 mês = 4 semanas)
          // ATÉ UM MÊS (até 4 semanas)
          else if (status <= 4) {
            if (isInativo) {
              statusCounts['INATIVOS COM ESTOQUES']++;
            } else {
              statusCounts['ATÉ UM MÊS DE ESTOQUE']++;
            }
          }
          // ATÉ DOIS MESES (5-8 semanas)
          else if (status <= 8) {
            if (isInativo) {
              statusCounts['INATIVOS COM ESTOQUES']++;
            } else {
              statusCounts['ATÉ DOIS MESES DE ESTOQUE']++;
            }
          }
          // ATÉ TRÊS MESES (9-12 semanas)
          else if (status <= 12) {
            if (isInativo) {
              statusCounts['INATIVOS COM ESTOQUES']++;
            } else {
              statusCounts['ATÉ TRÊS MESES DE ESTOQUE']++;
            }
          }
          // ATÉ QUATRO MESES (13-16 semanas)
          else if (status <= 16) {
            if (isInativo) {
              statusCounts['INATIVOS COM ESTOQUES']++;
            } else {
              statusCounts['ATÉ QUATRO MESES DE ESTOQUE']++;
            }
          }
          // ATÉ DOZE MESES (17-52 semanas)
          else if (status <= 52) {
            if (isInativo) {
              statusCounts['INATIVOS COM ESTOQUES']++;
            } else {
              statusCounts['ATÉ DOZE MESES DE ESTOQUE']++;
            }
          }
          // ACIMA DE DOZE MESES (> 52 semanas)
          else {
            if (isInativo) {
              statusCounts['INATIVOS COM ESTOQUES']++;
            } else {
              statusCounts['ACIMA DE DOZE MESES DE ESTOQUE']++;
            }
          }
        });

        const chartData = [
          { label: 'INATIVOS ZERADOS', value: statusCounts['INATIVOS ZERADOS'], color: '#CC99FF' },
          { label: 'ZERADOS COM DISPENSAÇÕES', value: statusCounts['ZERADOS COM DISPENSAÇÕES'], color: '#C00000' },
          { label: 'ATÉ UM MÊS DE ESTOQUE', value: statusCounts['ATÉ UM MÊS DE ESTOQUE'], color: '#FF0000' },
          { label: 'ATÉ DOIS MESES DE ESTOQUE', value: statusCounts['ATÉ DOIS MESES DE ESTOQUE'], color: '#FF9900' },
          { label: 'ATÉ TRÊS MESES DE ESTOQUE', value: statusCounts['ATÉ TRÊS MESES DE ESTOQUE'], color: '#00CC00' },
          { label: 'ATÉ QUATRO MESES DE ESTOQUE', value: statusCounts['ATÉ QUATRO MESES DE ESTOQUE'], color: '#008000' },
          { label: 'ATÉ DOZE MESES DE ESTOQUE', value: statusCounts['ATÉ DOZE MESES DE ESTOQUE'], color: '#0000FF' },
          { label: 'ACIMA DE DOZE MESES DE ESTOQUE', value: statusCounts['ACIMA DE DOZE MESES DE ESTOQUE'], color: '#000099' },
          { label: 'INATIVOS COM ESTOQUES', value: statusCounts['INATIVOS COM ESTOQUES'], color: '#6600CC' },
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