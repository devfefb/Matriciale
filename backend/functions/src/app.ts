import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { router } from './routes';
import { errorMiddleware } from './middlewares/error';

const app = express();

app.use(cors({
  origin: 'http://localhost:3000', // Permitir apenas o frontend
  credentials: true
}));

// Middleware para JSON
app.use(express.json({ limit: '50mb' }));

// Middleware para URL encoded (formulários)
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Log de todas as requisições para debug
app.use((req, res, next) => {
  console.log(`📨 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('📋 Headers:', req.headers);
  next();
});

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Servidor funcionando!' });
});

app.use('/api', router);

app.use(errorMiddleware);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
}); 

export default app