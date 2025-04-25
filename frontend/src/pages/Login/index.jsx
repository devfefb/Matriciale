import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TextField,
  Button,
  Typography,
  Box,
  Link as MuiLink,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await signIn(formData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Função para verificar se os campos estão preenchidos
  const isFormFilled = formData.email.trim() !== '' && formData.password.trim() !== '';

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#fff',
      }}
    >
      <Box
        sx={{
          flex: '0 0 45%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 64px',
          backgroundColor: '#f5f5f5',
          maxWidth: '800px',
        }}
      >
        <Box sx={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              color: '#0D92F4',
              fontWeight: 'bold',
              marginBottom: 1,
              lineHeight: 1.2,
              fontSize: '2.5rem',
            }}
          >
            Bem-vindo<br />à Well!
          </Typography>
          
          <Typography
            sx={{
              color: '#FF0000',
              marginBottom: 4,
              fontSize: '1rem',
            }}
          >
            Sentimos sua falta!
          </Typography>

          <form onSubmit={handleSubmit}>
            <Box sx={{ mb: 2 }}>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  mb: 1,
                  color: '#666',
                }}
              >
                Email
              </Typography>
              <TextField
                required
                fullWidth
                id="email"
                name="email"
                placeholder="Digite seu e-mail"
                value={formData.email}
                onChange={handleChange}
                variant="outlined"
                sx={{
                  backgroundColor: '#fff',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#ddd',
                    },
                  },
                }}
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography
                component="label"
                sx={{
                  display: 'block',
                  mb: 1,
                  color: '#666',
                }}
              >
                Senha
              </Typography>
              <TextField
                required
                fullWidth
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={handleChange}
                variant="outlined"
                sx={{
                  backgroundColor: '#fff',
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#ddd',
                    },
                  },
                }}
              />
            </Box>

            {error && (
              <Typography color="error" align="center" sx={{ mt: 2 }}>
                {error}
              </Typography>
            )}

            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={!isFormFilled}
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                backgroundColor: isFormFilled ? '#0D92F4' : '#E6EEF8',
                color: isFormFilled ? '#fff' : '#0D92F4',
                '&:hover': {
                  backgroundColor: isFormFilled ? '#001a4d' : '#d5e3f7',
                },
                '&:disabled': {
                  backgroundColor: '#E6EEF8',
                  color: '#0D92F4',
                  opacity: 0.7,
                },
                transition: 'all 0.3s ease',
              }}
            >
              ENTRAR
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography component="span" sx={{ color: '#666' }}>
                Esqueceu sua senha?{' '}
              </Typography>
              <MuiLink
                component={Link}
                to="/forgot-password"
                sx={{
                  color: '#0D92F4',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Clique aqui!
              </MuiLink>
            </Box>
          </form>
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
          p: 4,
        }}
      >
        <img
          src="/src/assets/img/wellft-removebg-preview.png"
          alt="Matriciale Logo"
          style={{
            maxWidth: '600px',
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </Box>
    </Box>
  );
}