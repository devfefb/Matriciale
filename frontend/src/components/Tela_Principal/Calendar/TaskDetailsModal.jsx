import React from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Paper
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TaskDetailsModal = ({ task, open, onClose }) => {
  if (!task) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="task-details-modal"
    >
      <Paper
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 400 },
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 3,
          borderRadius: 2,
          outline: 'none',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: 2 
        }}>
          <Typography variant="h6" component="h2">
            Detalhes da Tarefa
          </Typography>
          <IconButton 
            onClick={onClose}
            size="small"
            sx={{ mt: -1, mr: -1 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Box 
          sx={{ 
            p: 2, 
            borderRadius: 1,
            bgcolor: task.bgColor,
            borderLeft: `8px solid ${task.color}`,
            mb: 2
          }}
        >
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 500,
              wordBreak: 'break-word'
            }}
          >
            {task.label}
          </Typography>
        </Box>

        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          Data: {format(new Date(task.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </Typography>
      </Paper>
    </Modal>
  );
};

export default TaskDetailsModal;