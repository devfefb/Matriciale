import { onRequest } from 'firebase-functions/v2/https';
import app from './app'; // Importa a instância do seu aplicativo Express

export const api = onRequest({
  timeoutSeconds: 540, // 9 minutos - máximo para Cloud Functions Gen 2
  memory: "2GiB", // Aumentado para suportar uploads maiores
  maxInstances: 10, // Aumentado para melhor throughput
  cors: true,
  concurrency: 50, // Reduzido para uploads mais estáveis
  // Configurações específicas para upload
  invoker: 'public', // Permite invocação pública
  region: 'us-central1' // Região específica para melhor performance
}, app);