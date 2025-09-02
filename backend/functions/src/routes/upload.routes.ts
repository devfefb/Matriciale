import { Router } from 'express';
import { UploadController } from '../controllers/UploadController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const uploadController = new UploadController();

// Middleware de autenticação seletivo
router.use((req, res, next) => {
  console.log(`🔍 [AUTH] Verificando rota: ${req.path} (${req.method})`);
  
  // Verificar se estamos em modo de desenvolvimento
  const isDevelopment = process.env.NODE_ENV === 'development' || process.env.DISABLE_AUTH === 'true';
  
  // Rotas que não precisam de autenticação durante desenvolvimento
  const publicRoutes = ['/semanal', '/onboarding', '/health'];
  
  if (isDevelopment && publicRoutes.includes(req.path)) {
    console.log(`🔓 [AUTH] Modo desenvolvimento - Pulando autenticação para: ${req.path}`);
    return next();
  }
  
  if (publicRoutes.includes(req.path)) {
    console.log(`🔓 [AUTH] Rota pública - Pulando autenticação para: ${req.path}`);
    return next();
  }
  
  console.log(`🔒 [AUTH] Aplicando autenticação para rota: ${req.path}`);
  return authMiddleware(req, res, next);
});

// Upload de planilha Excel
router.post(
  '/upload',
  uploadController.getUploadMiddleware(),
  uploadController.uploadPlanilha.bind(uploadController)
);

// Upload em lotes para arquivos grandes
router.post(
  '/batch',
  uploadController.getUploadMiddleware(),
  uploadController.uploadBatch.bind(uploadController)
);

// Verificar status de upload específico
router.get(
  '/status/:uploadId',
  uploadController.getStatus.bind(uploadController)
);

// Listar todos os uploads
router.get(
  '/list',
  uploadController.listUploads.bind(uploadController)
);

// Cancelar upload
router.delete(
  '/cancel/:uploadId',
  uploadController.cancelUpload.bind(uploadController)
);

// Estatísticas de uploads
router.get(
  '/stats',
  uploadController.getUploadStats.bind(uploadController)
);

// Upload semanal (dados JSON processados)
router.post(
  '/semanal',
  uploadController.uploadSemanal.bind(uploadController)
);

// Upload onboarding (arquivo único massivo)
router.post(
  '/onboarding',
  uploadController.getUploadMiddleware(),
  uploadController.uploadOnboarding.bind(uploadController)
);

// Endpoint de teste/saúde
router.get('/health', (req, res) => {
  console.log('💚 [HEALTH] Endpoint de saúde chamado');
  res.json({
    status: 'success',
    message: 'Upload service está funcionando',
    timestamp: new Date().toISOString(),
    routes: ['/upload', '/batch', '/semanal', '/onboarding', '/health']
  });
});

export default router;
