import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ThemeProvider,
  CssBaseline,
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import api from '../../../services/api';
import ptBR from 'date-fns/locale/pt-BR';
import Header from '../../../components/Header';
import Sidebar from '../../../components/Sidebar';
import theme from '../../../theme/theme';

const EVENT_TYPES = [
  { label: 'Atraso na Entrega', color: '#FF0000', bgColor: '#FFE5E5' },
  { label: 'Estoque Baixo', color: '#FFA500', bgColor: '#FFF3E0' },
  { label: 'Agendamento', color: '#4CAF50', bgColor: '#E8F5E9' },
  { label: 'Reunião', color: '#2196F3', bgColor: '#E3F2FD' },
];

const CriarTarefa = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const getMunicipio = () => {
    const email = user?.email?.toLowerCase();
    if (!email) return null;

    const PALMARES = ['gustavo.moraes@beetsjr.com.br'];
    const PIRANGI = ['andre.ricardo.goncales@gmail.com'];

    if (PALMARES.includes(email)) return 'Palmares';
    if (PIRANGI.includes(email)) return 'Pirangi';

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const municipio = getMunicipio();
    if (!municipio) {
      alert('Usuário não tem permissão para criar tarefas');
      return;
    }

    try {
      const selectedEventType = EVENT_TYPES.find(type => type.label === selectedType);
      if (!selectedEventType) throw new Error('Tipo de evento inválido');

      const taskData = {
        label: description,
        color: selectedEventType.color,
        bgColor: selectedEventType.bgColor,
        date: selectedDate.toISOString(),
        municipio,
      };

      await api.post('/tasks', taskData);
      navigate('/calendar');
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      alert('Erro ao criar tarefa. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Header />
      <div style={{
        display: 'flex'
      }}>
        <Sidebar />
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  Criar Nova Tarefa
                </Typography>

                <form onSubmit={handleSubmit}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel>Tipo de Tarefa</InputLabel>
                    <Select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      required
                    >
                      {EVENT_TYPES.map((type) => (
                        <MenuItem key={type.label} value={type.label}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth margin="normal">
                    <LocalizationProvider dateAdapter={AdapterDateFns} locale={ptBR}>
                      <DatePicker
                        label="Data"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        format="dd/MM/yyyy"
                      />
                    </LocalizationProvider>
                  </FormControl>

                  <TextField
                    fullWidth
                    margin="normal"
                    label="Descrição"
                    multiline
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  />

                  <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      type="submit"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Criando...' : 'Criar Tarefa'}
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/calendar')}
                      disabled={isLoading}
                    >
                      Cancelar
                    </Button>
                  </Box>
                </form>
              </CardContent>
            </Card>
          </Box>
        </ThemeProvider>
      </div>
    </>

  );
};

export default CriarTarefa;