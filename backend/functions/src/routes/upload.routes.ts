import { Router } from 'express';
import { UploadController } from '../controllers/UploadController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();
const uploadController = new UploadController();

// Middleware de autenticação para todas as rotas
router.use(authMiddleware);

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

export default router;
