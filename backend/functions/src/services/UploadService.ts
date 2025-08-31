import * as XLSX from 'xlsx';
import { createHash } from 'crypto';
import { db } from '../config/firebase';
import { 
  UploadStatus, 
  BatchProcessingResult, 
  PlanilhaDados, 
  ProcessingOptions,
  BatchInfo,
  MovimentacaoSemanaDados,
  UnidadeDados
} from '../interfaces/Upload';
import { processarMovimentacoes } from '../scripts/utils/utils';

export class UploadService {
  private uploads: Map<string, UploadStatus> = new Map();
  private readonly defaultOptions: ProcessingOptions = {
    batchSize: 200,
    compression: true,
    validateData: true,
    overwriteExisting: false
  };

  /**
   * Gera ID único para upload
   */
  private generateUploadId(): string {
    return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Carrega classificações de medicamentos
   */
  private async carregarClassificacoes(): Promise<Map<string, string>> {
    // Para esta implementação, vamos usar uma classificação padrão
    // Em produção, isso seria carregado de um arquivo ou banco
    return new Map();
  }

  /**
   * Gera semanas do período 2023_37 até 2025_21
   */
  private gerarSemanas(): string[] {
    const semanas = [];
    
    // 2023: semanas 37-52
    for (let semana = 37; semana <= 52; semana++) {
      semanas.push(`2023_${semana.toString().padStart(2, '0')}`);
    }
    
    // 2024: semanas 01-52
    for (let semana = 1; semana <= 52; semana++) {
      semanas.push(`2024_${semana.toString().padStart(2, '0')}`);
    }
    
    // 2025: semanas 01-21
    for (let semana = 1; semana <= 21; semana++) {
      semanas.push(`2025_${semana.toString().padStart(2, '0')}`);
    }
    
    return semanas;
  }

  /**
   * Extrai dados da planilha Excel
   */
  private async extrairDadosPlanilha(
    buffer: Buffer, 
    filename: string,
    municipio: string
  ): Promise<PlanilhaDados> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const semanas = this.gerarSemanas();
      const mapaClassificacoes = await this.carregarClassificacoes();
      
      const unidades: UnidadeDados[] = [];
      
      // Mapear nomes das abas para nomes das unidades
      const abaParaUnidade: { [key: string]: string } = {
        'MetodologiaCAF': 'CAF',
        'MetodoOlavo': 'Olavo',
        'MetodoESF3': 'ESF3'
      };
      
      for (const [nomeAba, nomeUnidade] of Object.entries(abaParaUnidade)) {
        if (workbook.SheetNames.includes(nomeAba)) {
          const dados = this.processarAba(workbook, nomeAba, nomeUnidade, semanas, mapaClassificacoes);
          if (dados.movimentacoes.length > 0) {
            unidades.push(dados);
          }
        }
      }
      
      return {
        cidade: municipio,
        unidades
      };
    } catch (error) {
      throw new Error(`Erro ao processar planilha ${filename}: ${error}`);
    }
  }

  /**
   * Processa uma aba específica da planilha
   */
  private processarAba(
    workbook: XLSX.WorkBook,
    nomeAba: string,
    nomeUnidade: string,
    semanas: string[],
    mapaClassificacoes: Map<string, string>
  ): UnidadeDados {
    const worksheet = workbook.Sheets[nomeAba];
    if (!worksheet) {
      return { nome_unidade: nomeUnidade, movimentacoes: [] };
    }

    const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const movimentacoes: MovimentacaoSemanaDados[] = [];

    // Pular cabeçalho (primeira linha)
    for (let i = 1; i < dados.length; i++) {
      const linha = dados[i];
      if (!linha || linha.length < 3) continue;

      const classificacao = linha[0] || '10. REMUME';
      const nomeMedicamento = linha[1];
      const codItem = linha[2];

      if (!nomeMedicamento || !codItem) continue;

      // Processar cada semana
      for (let j = 0; j < semanas.length; j++) {
        const indiceColuna = j + 3; // Colunas de dados começam na posição 3
        const valor = linha[indiceColuna] || 0;
        
        if (valor !== 0) { // Só incluir movimentações com valor diferente de zero
          movimentacoes.push({
            nome_medicamento: nomeMedicamento,
            cod_item: codItem.toString(),
            classificacao: classificacao,
            semana: semanas[j],
            quantidade: Number(valor) || 0
          });
        }
      }
    }

    return {
      nome_unidade: nomeUnidade,
      movimentacoes
    };
  }

  /**
   * Divide dados em lotes para processamento
   */
  private criarLotes(dados: MovimentacaoSemanaDados[], batchSize: number): BatchInfo[] {
    const lotes: BatchInfo[] = [];
    
    for (let i = 0; i < dados.length; i += batchSize) {
      const lote = dados.slice(i, i + batchSize);
      lotes.push({
        batchId: `batch_${i / batchSize + 1}`,
        size: lote.length,
        startIndex: i,
        endIndex: Math.min(i + batchSize - 1, dados.length - 1),
        data: lote
      });
    }
    
    return lotes;
  }

  /**
   * Busca medicamento pelo nome e código
   */
  private async buscarMedicamento(
    unidadeRef: FirebaseFirestore.DocumentReference,
    nomeMedicamento: string,
    codItem: string
  ): Promise<FirebaseFirestore.DocumentSnapshot | null> {
    try {
      // Buscar por nome primeiro
      const queryPorNome = await unidadeRef
        .collection('medicamentos_unidade')
        .where('nome', '==', nomeMedicamento)
        .limit(1)
        .get();

      if (!queryPorNome.empty) {
        return queryPorNome.docs[0];
      }

      // Se não encontrou por nome, buscar por código
      const queryPorCodigo = await unidadeRef
        .collection('medicamentos_unidade')
        .where('cod_item', '==', codItem)
        .limit(1)
        .get();

      if (!queryPorCodigo.empty) {
        return queryPorCodigo.docs[0];
      }

      return null;
    } catch (error) {
      console.error(`Erro ao buscar medicamento ${nomeMedicamento}:`, error);
      return null;
    }
  }

  /**
   * Insere movimentação semanal em um medicamento
   */
  private async inserirMovimentacaoSemanal(
    medicamentoRef: FirebaseFirestore.DocumentReference,
    semana: string,
    quantidade: number
  ): Promise<boolean> {
    try {
      const doc = await medicamentoRef.get();
      if (!doc.exists) {
        return false;
      }

      const medicamento = doc.data();
      const movimentacoesAtuais = medicamento?.movimentacoes_semanais || {};

      // Adiciona ou atualiza a movimentação da semana
      movimentacoesAtuais[semana] = quantidade;

      // Atualiza o documento
      await medicamentoRef.update({
        movimentacoes_semanais: movimentacoesAtuais,
        data_atualizacao: new Date()
      });

      return true;
    } catch (error) {
      console.error(`Erro ao inserir movimentação:`, error);
      return false;
    }
  }

  /**
   * Processa um lote de dados
   */
  private async processarLote(
    lote: BatchInfo,
    uploadId: string,
    municipio: string,
    nomeUnidade: string
  ): Promise<BatchProcessingResult> {
    const startTime = Date.now();
    const resultado: BatchProcessingResult = {
      batchId: lote.batchId,
      uploadId,
      status: 'success',
      recordsProcessed: lote.size,
      recordsSuccess: 0,
      recordsFailed: 0,
      errors: [],
      processingTime: 0
    };

    try {
      // Buscar referências do município e unidade
      const municipioRef = db.collection('municipio').doc(municipio);
      const municipioDoc = await municipioRef.get();
      
      if (!municipioDoc.exists) {
        throw new Error(`Município ${municipio} não encontrado`);
      }

      const unidadeRef = municipioRef.collection('unidades').doc(nomeUnidade);
      const unidadeDoc = await unidadeRef.get();
      
      if (!unidadeDoc.exists) {
        throw new Error(`Unidade ${nomeUnidade} não encontrada`);
      }

      // Processar cada movimentação do lote
      for (const movimentacao of lote.data as MovimentacaoSemanaDados[]) {
        try {
          // Buscar medicamento
          const medicamentoDoc = await this.buscarMedicamento(
            unidadeRef,
            movimentacao.nome_medicamento,
            movimentacao.cod_item
          );

          if (medicamentoDoc) {
            // Inserir movimentação
            const sucesso = await this.inserirMovimentacaoSemanal(
              medicamentoDoc.ref,
              movimentacao.semana,
              movimentacao.quantidade
            );

            if (sucesso) {
              resultado.recordsSuccess++;
            } else {
              resultado.recordsFailed++;
              resultado.errors.push(`Falha ao inserir movimentação para ${movimentacao.nome_medicamento}`);
            }
          } else {
            resultado.recordsFailed++;
            resultado.errors.push(`Medicamento não encontrado: ${movimentacao.nome_medicamento}`);
          }
        } catch (error) {
          resultado.recordsFailed++;
          resultado.errors.push(`Erro ao processar ${movimentacao.nome_medicamento}: ${error}`);
        }
      }

      resultado.processingTime = Date.now() - startTime;
      
      if (resultado.recordsFailed > 0) {
        resultado.status = 'failed';
      }

      return resultado;
    } catch (error) {
      resultado.status = 'failed';
      resultado.recordsFailed = lote.size;
      resultado.errors.push(`Erro crítico no lote: ${error}`);
      resultado.processingTime = Date.now() - startTime;
      
      return resultado;
    }
  }

  /**
   * Atualiza status do upload
   */
  private atualizarStatus(uploadId: string, updates: Partial<UploadStatus>): void {
    const upload = this.uploads.get(uploadId);
    if (upload) {
      Object.assign(upload, updates, { updatedAt: new Date() });
      this.uploads.set(uploadId, upload);
    }
  }

  /**
   * Inicia processo de upload
   */
  async iniciarUpload(
    buffer: Buffer,
    filename: string,
    municipio: string,
    options: Partial<ProcessingOptions> = {}
  ): Promise<string> {
    const uploadId = this.generateUploadId();
    const processOptions = { ...this.defaultOptions, ...options };

    // Criar status inicial
    const status: UploadStatus = {
      id: uploadId,
      filename,
      status: 'pending',
      progress: 0,
      totalBatches: 0,
      processedBatches: 0,
      errors: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.uploads.set(uploadId, status);

    // Processar arquivo em background
    this.processarArquivo(uploadId, buffer, filename, municipio, processOptions)
      .catch(error => {
        console.error(`Erro no upload ${uploadId}:`, error);
        this.atualizarStatus(uploadId, {
          status: 'failed',
          errors: [error.message]
        });
      });

    return uploadId;
  }

  /**
   * Processa arquivo completo
   */
  private async processarArquivo(
    uploadId: string,
    buffer: Buffer,
    filename: string,
    municipio: string,
    options: ProcessingOptions
  ): Promise<void> {
    try {
      this.atualizarStatus(uploadId, { status: 'processing' });

      // Extrair dados da planilha
      const dadosPlanilha = await this.extrairDadosPlanilha(buffer, filename, municipio);
      
      let totalMovimentacoes = 0;
      const resultados: BatchProcessingResult[] = [];

      // Processar cada unidade
      for (const unidade of dadosPlanilha.unidades) {
        if (unidade.movimentacoes.length === 0) continue;

        // Criar lotes para a unidade
        const lotes = this.criarLotes(unidade.movimentacoes, options.batchSize);
        totalMovimentacoes += unidade.movimentacoes.length;

        this.atualizarStatus(uploadId, {
          totalBatches: this.uploads.get(uploadId)!.totalBatches + lotes.length
        });

        // Processar lotes sequencialmente
        for (const lote of lotes) {
          const resultado = await this.processarLote(
            lote,
            uploadId,
            municipio,
            unidade.nome_unidade
          );
          
          resultados.push(resultado);
          
          this.atualizarStatus(uploadId, {
            processedBatches: this.uploads.get(uploadId)!.processedBatches + 1,
            progress: Math.round(
              (this.uploads.get(uploadId)!.processedBatches / 
               this.uploads.get(uploadId)!.totalBatches) * 100
            )
          });

          // Pequena pausa entre lotes para não sobrecarregar
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      // Calcular estatísticas finais
      const statistics = {
        totalRecords: totalMovimentacoes,
        successfulInserts: resultados.reduce((sum, r) => sum + r.recordsSuccess, 0),
        failedInserts: resultados.reduce((sum, r) => sum + r.recordsFailed, 0),
        duplicates: 0
      };

      const allErrors = resultados.flatMap(r => r.errors);

      this.atualizarStatus(uploadId, {
        status: allErrors.length > 0 ? 'failed' : 'completed',
        progress: 100,
        statistics,
        errors: allErrors
      });

    } catch (error) {
      this.atualizarStatus(uploadId, {
        status: 'failed',
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      });
    }
  }

  /**
   * Obtém status do upload
   */
  getStatus(uploadId: string): UploadStatus | null {
    return this.uploads.get(uploadId) || null;
  }

  /**
   * Lista todos os uploads
   */
  getAllUploads(): UploadStatus[] {
    return Array.from(this.uploads.values());
  }

  /**
   * Cancela upload
   */
  cancelUpload(uploadId: string): boolean {
    const upload = this.uploads.get(uploadId);
    if (upload && upload.status === 'processing') {
      this.atualizarStatus(uploadId, { status: 'failed', errors: ['Upload cancelado pelo usuário'] });
      return true;
    }
    return false;
  }
}
