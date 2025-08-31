import { Request, Response } from 'express';
import multer from 'multer';
import { UploadService } from '../services/UploadService';
import { UploadRequest, ProcessingOptions } from '../interfaces/Upload';

export class UploadController {
  private uploadService: UploadService;

  constructor() {
    this.uploadService = new UploadService();
  }

  /**
   * Configuração do multer para upload em memória
   */
  private getMulterConfig() {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB máximo
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Apenas arquivos Excel (.xlsx, .xls) são permitidos'), false);
        }
      },
    });
  }

  /**
   * Middleware do multer para upload único
   */
  getUploadMiddleware() {
    return this.getMulterConfig().single('planilha');
  }

  /**
   * Endpoint para upload de planilha
   */
  async uploadPlanilha(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'Nenhum arquivo foi enviado'
        });
      }

      const { municipio, options } = req.body as UploadRequest;

      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Nome do município é obrigatório'
        });
      }

      // Validar opções se fornecidas
      const processOptions: Partial<ProcessingOptions> = {};
      if (options) {
        if (options.batchSize && (options.batchSize < 10 || options.batchSize > 1000)) {
          return res.status(400).json({
            status: 'error',
            message: 'Tamanho do lote deve estar entre 10 e 1000'
          });
        }
        Object.assign(processOptions, options);
      }

      const uploadId = await this.uploadService.iniciarUpload(
        req.file.buffer,
        req.file.originalname,
        municipio,
        processOptions
      );

      return res.status(202).json({
        status: 'success',
        message: 'Upload iniciado com sucesso',
        uploadId,
        estimatedTime: Math.ceil(req.file.size / (1024 * 1024)) * 30 // Estimativa: 30s por MB
      });

    } catch (error: any) {
      console.error('Erro no upload:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Endpoint para verificar status do upload
   */
  async getStatus(req: Request, res: Response) {
    try {
      const { uploadId } = req.params;

      if (!uploadId) {
        return res.status(400).json({
          status: 'error',
          message: 'ID do upload é obrigatório'
        });
      }

      const uploadStatus = this.uploadService.getStatus(uploadId);

      if (!uploadStatus) {
        return res.status(404).json({
          status: 'error',
          message: 'Upload não encontrado'
        });
      }

      return res.json({
        status: 'success',
        data: uploadStatus
      });

    } catch (error: any) {
      console.error('Erro ao obter status:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Endpoint para listar todos os uploads
   */
  async listUploads(req: Request, res: Response) {
    try {
      const uploads = this.uploadService.getAllUploads();

      return res.json({
        status: 'success',
        data: uploads,
        count: uploads.length
      });

    } catch (error: any) {
      console.error('Erro ao listar uploads:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Endpoint para cancelar upload
   */
  async cancelUpload(req: Request, res: Response) {
    try {
      const { uploadId } = req.params;

      if (!uploadId) {
        return res.status(400).json({
          status: 'error',
          message: 'ID do upload é obrigatório'
        });
      }

      const cancelled = this.uploadService.cancelUpload(uploadId);

      if (!cancelled) {
        return res.status(400).json({
          status: 'error',
          message: 'Não foi possível cancelar o upload'
        });
      }

      return res.json({
        status: 'success',
        message: 'Upload cancelado com sucesso'
      });

    } catch (error: any) {
      console.error('Erro ao cancelar upload:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Endpoint para upload em lotes (para arquivos muito grandes)
   */
  async uploadBatch(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'Nenhum arquivo foi enviado'
        });
      }

      const { municipio, batchSize = 100 } = req.body;

      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Nome do município é obrigatório'
        });
      }

      // Usar tamanho de lote menor para arquivos grandes
      const adaptiveBatchSize = req.file.size > 10 * 1024 * 1024 ? 50 : batchSize;

      const uploadId = await this.uploadService.iniciarUpload(
        req.file.buffer,
        req.file.originalname,
        municipio,
        { 
          batchSize: adaptiveBatchSize,
          compression: true,
          validateData: true 
        }
      );

      return res.status(202).json({
        status: 'success',
        message: 'Upload em lotes iniciado com sucesso',
        uploadId,
        batchSize: adaptiveBatchSize,
        estimatedTime: Math.ceil(req.file.size / (1024 * 1024)) * 45 // Estimativa: 45s por MB para lotes
      });

    } catch (error: any) {
      console.error('Erro no upload em lotes:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        details: error.message
      });
    }
  }

  /**
   * Endpoint para obter estatísticas de upload
   */
  async getUploadStats(req: Request, res: Response) {
    try {
      const uploads = this.uploadService.getAllUploads();
      
      const stats = {
        total: uploads.length,
        pending: uploads.filter(u => u.status === 'pending').length,
        processing: uploads.filter(u => u.status === 'processing').length,
        completed: uploads.filter(u => u.status === 'completed').length,
        failed: uploads.filter(u => u.status === 'failed').length,
        totalRecordsProcessed: uploads.reduce((sum, u) => sum + (u.statistics?.totalRecords || 0), 0),
        totalSuccessfulInserts: uploads.reduce((sum, u) => sum + (u.statistics?.successfulInserts || 0), 0),
        totalErrors: uploads.reduce((sum, u) => sum + u.errors.length, 0)
      };

      return res.json({
        status: 'success',
        data: stats
      });

    } catch (error: any) {
      console.error('Erro ao obter estatísticas:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro interno do servidor',
        details: error.message
      });
    }
  }
}
