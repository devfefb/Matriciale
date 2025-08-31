export interface UploadStatus {
  id: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalBatches: number;
  processedBatches: number;
  errors: string[];
  createdAt: Date;
  updatedAt: Date;
  statistics?: {
    totalRecords: number;
    successfulInserts: number;
    failedInserts: number;
    duplicates: number;
  };
}

export interface BatchProcessingResult {
  batchId: string;
  uploadId: string;
  status: 'success' | 'failed';
  recordsProcessed: number;
  recordsSuccess: number;
  recordsFailed: number;
  errors: string[];
  processingTime: number;
}

export interface MovimentacaoSemanaDados {
  nome_medicamento: string;
  cod_item: string;
  classificacao: string;
  semana: string;
  quantidade: number;
}

export interface UnidadeDados {
  nome_unidade: string;
  movimentacoes: MovimentacaoSemanaDados[];
}

export interface PlanilhaDados {
  cidade: string;
  unidades: UnidadeDados[];
}

export interface ProcessingOptions {
  batchSize: number;
  compression: boolean;
  validateData: boolean;
  overwriteExisting: boolean;
}

export interface UploadRequest {
  municipio: string;
  options?: Partial<ProcessingOptions>;
}

export interface UploadResponse {
  uploadId: string;
  status: string;
  message: string;
  estimatedTime?: number;
}

export interface BatchInfo {
  batchId: string;
  size: number;
  startIndex: number;
  endIndex: number;
  data: any[];
}
