import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Define a URL do seu bucket a partir das variáveis de ambiente.
const STORAGE_BUCKET_URL = ''; // TODO: configurar quando tiver um bucket ativo

if (!admin.apps.length) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  try {
    if (isDevelopment) {
      // --- AMBIENTE DE DESENVOLVIMENTO LOCAL ---
      // Usa um arquivo de chave de serviço para autenticar.
      console.log('🔧 Inicializando Firebase em modo de Desenvolvimento...');
      
      // O caminho aponta para duas pastas acima e depois para o arquivo.
      // Ajuste se a estrutura do seu projeto for diferente.
      const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: STORAGE_BUCKET_URL,
      });
      console.log('🔥 Firebase Admin inicializado com Service Account (Local).');

    } else {
      // --- AMBIENTE DE PRODUÇÃO (CLOUD FUNCTIONS) ---
      // Usa as credenciais padrão fornecidas pelo ambiente do Google Cloud.
      console.log('🚀 Inicializando Firebase em modo de Produção...');

      if (!STORAGE_BUCKET_URL) {
        throw new Error('A variável de ambiente STORAGE_BUCKET_URL é obrigatória em produção.');
      }
      
      admin.initializeApp({
        storageBucket: STORAGE_BUCKET_URL,
      });
      console.log('🔥 Firebase Admin inicializado com credenciais de produção.');
    }
  } catch (error: any) {
    console.error('❌ Erro fatal ao inicializar o Firebase Admin SDK:', error.message);
    if (error.code === 'MODULE_NOT_FOUND') {
      console.error('👉 Verifique se o arquivo "serviceAccountKey.json" está no caminho correto para o ambiente de desenvolvimento.');
    }
    process.exit(1); // Encerra a aplicação se o Firebase não puder ser iniciado.
  }
}

// Exporta os serviços do Firebase para serem usados em outras partes da aplicação
export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();

// Exporta a instância principal do bucket para facilitar o acesso
export const bucket = storage.bucket();

// Exporta o namespace 'admin' para acesso a funcionalidades que não estão nos módulos (ex: admin.firestore.Timestamp)
export { admin };

console.log(`✅ Serviços Firebase prontos. Bucket: ${bucket.name}`);