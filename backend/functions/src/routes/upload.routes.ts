import { Router } from 'express';
import { UploadController } from '../controllers/UploadController';

const router = Router();
const uploadController = new UploadController();

// Middleware simples para desenvolvimento - sem autenticação
router.use((req, res, next) => {
  console.log(`📋 [UPLOAD] Rota: ${req.method} ${req.path}`);
  next();
});

// ============ ROTAS PRINCIPAIS ============

/**
 * ROTA PRINCIPAL - Upload Semanal
 * Frontend envia dados JSON processados → Backend classifica → Salva no Firestore
 */
router.post('/semanal', uploadController.uploadSemanal.bind(uploadController));

/**
 * FLUXO DE PRODUÇÃO - Solicitar URLs assinadas
 * Para upload direto ao Cloud Storage
 */
router.post('/solicitar-signed-urls', uploadController.solicitarSignedUrls.bind(uploadController));

/**
 * FLUXO DE PRODUÇÃO - Processar arquivo do Cloud Storage
 * Cloud Function trigger após upload
 */
router.post('/processar-cloud-storage', uploadController.processarArquivoCloudStorage.bind(uploadController));

/**
 * NOVO - Executar cálculos manualmente
 */
router.post('/executar-calculos', uploadController.executarCalculos.bind(uploadController));

/**
 * NOVO - Upload direto local (desenvolvimento)
 */
router.post('/local-direct/:municipio/:unidade/:uploadId', uploadController.uploadLocalDirect.bind(uploadController));

/**
 * NOVO - Status do processamento
 */
router.get('/status', uploadController.statusProcessamento.bind(uploadController));

/**
 * Health Check
 */
router.get('/health', uploadController.healthCheck.bind(uploadController));

export default router;
