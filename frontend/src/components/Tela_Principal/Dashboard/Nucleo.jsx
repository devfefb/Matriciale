import React from 'react';
import { Box, Grid } from '@mui/material';
import PriorityTasks from './PriorityTasks';
import StockChart from './StockChart';
import ScheduledTasks from './ScheduledTasks';
import { TaskProvider } from './TaskContext';

const Nucleo = () => {
  return (
    <TaskProvider>
      <Box
        sx={{
          p: 3,
          width: '80%',
          minHeight: 'calc(100vh - 64px)',
          marginLeft: '20%'
        }}
      >
        <Grid container spacing={3} alignItems="stretch">
          {/* 1st Half: Pie Chart */}
          <Grid item xs={12} md={6}>
            <StockChart />
          </Grid>

          {/* 2nd Half: Scheduled Tasks + Priority Tasks */}
          <Grid item xs={12} md={6} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ mb: 3 }}>
              <ScheduledTasks />
            </Box>
            <Box sx={{ flex: 1 }}>
              <PriorityTasks />
            </Box>
          </Grid>
        </Grid>
      </Box>
    </TaskProvider>
  );
};

export default Nucleo;