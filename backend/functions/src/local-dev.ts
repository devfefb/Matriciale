// functions/src/local-dev.ts

import app from './app'; // Importa a instância do seu aplicativo Express
import { config } from 'dotenv';

// Carrega as variáveis de ambiente, se ainda não estiverem carregadas pelo app.ts
config();

// Configurações específicas para desenvolvimento local
process.env.NODE_ENV = 'development';
process.env.DISABLE_AUTH = 'true';
console.log('🔧 [DEV] Modo desenvolvimento ativado - Autenticação desabilitada');

const PORT = parseInt(process.env.PORT || '3001', 10);

// Inicia o servidor apenas para desenvolvimento local
try {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`🌐 Health check: http://0.0.0.0:${PORT}/`);
  });

  server.on('error', (error: any) => {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Erro ao configurar servidor:', error);
  process.exit(1);
}

// Tratamento de erros não capturados (opcional, para robustez local)
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});