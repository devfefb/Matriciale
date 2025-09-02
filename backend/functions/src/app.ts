import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes';
import { errorMiddleware } from './middlewares/error';

const app = express();

// CORS configuração condicional para desenvolvimento e produção
const corsOrigins = process.env.NODE_ENV !== 'development' 
  ? ['http://localhost:3000', 'http://localhost:5173'] // Configurar domínios de produção
  : ['https://your-domain.com']; // Vite + React dev servers

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// Middleware para JSON
app.use(express.json({ limit: '50mb' }));

// Middleware para URL encoded (formulários)
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Log de todas as requisições para debug (apenas em desenvolvimento)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('📋 Headers:', req.headers);
    next();
  });
}

// Rota de teste
app.get('/', (req, res) => {
  res.json({ 
    message: 'API funcionando!',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Endpoint de saúde
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', router);

app.use(errorMiddleware);

// Apenas exportar a instância do app, não iniciar o servidor
export default app;