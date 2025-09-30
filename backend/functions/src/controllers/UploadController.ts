import { Request, Response } from 'express';
import { MovimentacaoClassifierService } from '../services/MovimentacaoClassifierService';
import { CloudStorageService } from '../services/CloudStorageService';
import { db } from '../config/firebase';
// import { validarCalculosComGabarito } from '../scripts/testes/validar-calculos'; // DESATIVADO - Usar executar-calculos
import { executarCalculosParaMunicipio, executarCalculosParaUnidade } from '../scripts/testes/executar-calculos';
import { validarCalculosComGabarito } from '../scripts/testes/validar-calculos';

export class UploadController {
  private classifierService: MovimentacaoClassifierService;
  private cloudStorageService: CloudStorageService;

  constructor() {
    this.classifierService = new MovimentacaoClassifierService();
    this.cloudStorageService = new CloudStorageService();
  }

  /**
   * ⚠️ DEPRECIADO - Upload Semanal (dados JSON processados)
   * 
   * ESTE ENDPOINT SERÁ REMOVIDO EM BREVE!
   * Use: POST /solicitar-signed-urls + upload direto ao storage
   * 
   * Problema: JSON no corpo da requisição não é adequado para Cloud Functions serverless
   * Solução: Usar signed URLs para upload direto ao storage
   */
  async uploadSemanal(req: Request, res: Response) {
    console.log('⚠️ [UPLOAD SEMANAL DEPRECIADO] Endpoint chamado - USE SIGNED URLs!');
    
    try {
      const { 
        tipo, 
        municipio, 
        data_processamento, 
        arquivos // Array de { nome_arquivo, content: object }
      } = req.body;
      
      console.log('📊 [UPLOAD SEMANAL] Dados recebidos:', {
        tipo,
        municipio,
        total_arquivos: arquivos ? arquivos.length : 0,
        arquivos_nomes: arquivos ? arquivos.map((a: any) => a.nome_arquivo) : []
      });

      if (!arquivos || !Array.isArray(arquivos) || arquivos.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Nenhum arquivo processado foi enviado'
        });
      }

      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Nome do município é obrigatório'
        });
      }

      console.log('🔄 [UPLOAD SEMANAL] ETAPA 1: Salvando arquivos no storage...');
      
      const resultados: any[] = [];
      const arquivosSalvos: string[] = [];
      
      // ETAPA 1: Salvar cada arquivo no storage
      for (const arquivo of arquivos) {
        const { nome_arquivo, content } = arquivo;
        
        if (!nome_arquivo || !content) {
          console.log(`❌ [UPLOAD SEMANAL] Arquivo inválido:`, arquivo);
          continue;
        }

        console.log(`💾 [UPLOAD SEMANAL] Salvando no storage: ${nome_arquivo}`);
        
        // Validar conteúdo do inventoryData
        if (!content.periodo_inicio || !content.periodo_fim || !content.itens) {
          console.log(`❌ [UPLOAD SEMANAL] Formato inválido do inventoryData: ${nome_arquivo}`);
          continue;
        }

        console.log(`📅 [UPLOAD SEMANAL] Período: ${content.periodo_inicio} a ${content.periodo_fim}`);
        console.log(`📦 [UPLOAD SEMANAL] Itens: ${content.itens.length}`);

        // Extrair nome da unidade do arquivo
        const nomeUnidade = this.extrairNomeUnidadeDoArquivo(nome_arquivo);
        
        // Salvar no storage (local ou cloud)
        const resultadoSalvamento = await this.salvarArquivoNoStorage(
          content, 
          municipio, 
          nomeUnidade, 
          nome_arquivo
        );
        
        if (resultadoSalvamento.sucesso) {
          console.log(`✅ [UPLOAD SEMANAL] Arquivo salvo no storage: ${resultadoSalvamento.arquivo_path}`);
          arquivosSalvos.push(resultadoSalvamento.arquivo_path!);
          
          resultados.push({
            unidade: nomeUnidade,
            arquivo_original: nome_arquivo,
            arquivo_storage: resultadoSalvamento.arquivo_path,
            periodo: `${content.periodo_inicio} a ${content.periodo_fim}`,
            total_itens: content.itens.length,
            status: 'SALVO_STORAGE'
          });
        } else {
          console.log(`❌ [UPLOAD SEMANAL] Falha ao salvar no storage: ${resultadoSalvamento.erro}`);
          
          resultados.push({
            unidade: nomeUnidade,
            arquivo_original: nome_arquivo,
            periodo: `${content.periodo_inicio} a ${content.periodo_fim}`,
            total_itens: content.itens.length,
            status: 'ERRO_STORAGE',
            erro: resultadoSalvamento.erro
          });
        }
      }
      
      // ETAPA 2: Processar arquivos salvos e atualizar banco em background
      console.log(`🔄 [UPLOAD SEMANAL] ETAPA 2: Processando ${arquivosSalvos.length} arquivos do storage...`);
      
      // Processa em background sem bloquear resposta
      this.processarArquivosDoStorageEmBackground(municipio, arquivosSalvos)
        .then((resultadoProcessamento) => {
          console.log(`✅ [UPLOAD SEMANAL] Processamento em background concluído:`, resultadoProcessamento);
        })
        .catch((error) => {
          console.error(`❌ [UPLOAD SEMANAL] Erro no processamento em background:`, error);
        });
      
      const response = {
        status: 'success',
        message: `⚠️ DEPRECIADO: Upload semanal iniciado - ${resultados.length} arquivo(s) salvos no storage`,
        data: {
          municipio,
          arquivos_processados: resultados.length,
          arquivos_salvos_storage: arquivosSalvos.length,
          environment: process.env.NODE_ENV || 'development',
          storage_type: CloudStorageService.isConfigured() ? 'cloud_storage' : 'local_storage',
          resultados,
          processamento_status: 'EM_BACKGROUND',
          timestamp: new Date().toISOString(),
          WARNING: 'ESTE ENDPOINT SERÁ REMOVIDO! Use POST /solicitar-signed-urls + upload direto ao storage',
          metodo_recomendado: 'SIGNED_URLS_STORAGE_DIRETO'
        }
      };

      console.log('✅ [UPLOAD SEMANAL] Primeira etapa concluída (storage):', response.data);
      return res.status(200).json(response);

    } catch (error: any) {
      console.error('❌ [UPLOAD SEMANAL] Erro completo:', error);
      
      return res.status(500).json({
        status: 'error',
        message: 'Erro no upload semanal',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * NOVO FLUXO - Solicitar URLs assinadas (funciona em dev e produção)
   * Em desenvolvimento: retorna URLs para upload local
   * Em produção: retorna URLs do Cloud Storage
   */
  async solicitarSignedUrls(req: Request, res: Response) {
    console.log('🔗 [SIGNED URLS] Endpoint chamado');
    
    try {
      const { municipio, arquivos } = req.body;
      
      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Município é obrigatório'
        });
      }
      
      if (!arquivos || !Array.isArray(arquivos) || arquivos.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Lista de arquivos é obrigatória'
        });
      }
      
      console.log(`🔗 [SIGNED URLS] Gerando URLs para ${arquivos.length} arquivo(s) do município ${municipio}`);
      
      if (CloudStorageService.isConfigured()) {
        // PRODUÇÃO: usar Cloud Storage
        console.log('☁️ [SIGNED URLS] Modo produção - gerando URLs do Cloud Storage');
        const urlsAssinadas = await this.cloudStorageService.gerarMultiplasSignedUrls(arquivos);
        
        return res.status(200).json({
          status: 'success',
          message: 'URLs assinadas geradas com sucesso (Cloud Storage)',
          data: {
            municipio,
            total_arquivos: urlsAssinadas.length,
            urls: urlsAssinadas,
            environment: 'production',
            storage_type: 'cloud_storage'
          }
        });
        
      } else {
        // DESENVOLVIMENTO: simular URLs locais
        console.log('💾 [SIGNED URLS] Modo desenvolvimento - gerando URLs locais');
        const urlsLocais = arquivos.map((arquivo: any, index: number) => {
          const uploadId = `local_${Date.now()}_${index}`;
          const nomeUnidade = this.extrairNomeUnidadeDoArquivo(arquivo.nome_arquivo);
          
            return {
            nome_arquivo: arquivo.nome_arquivo,
            upload_url: arquivo.tipo_arquivo === 'attachments'
              ? `/api/upload/local-direct-attachment/${municipio}/${nomeUnidade}/${uploadId}`
              : `/api/upload/local-direct/${municipio}/${nomeUnidade}/${uploadId}`,
            arquivo_path: `storage/uploads/${municipio}/${nomeUnidade}/${arquivo.tipo_arquivo === 'attachments' ? 'attachments' : 'inventoryData'}/${uploadId}_${arquivo.nome_arquivo}`,
            upload_id: uploadId,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 ano
            tipo_storage: 'local'
            };
        });
        
        return res.status(200).json({
          status: 'success',
          message: 'URLs locais geradas com sucesso (Desenvolvimento)',
          data: {
            municipio,
            total_arquivos: urlsLocais.length,
            urls: urlsLocais,
            environment: 'development',
            storage_type: 'local_storage'
          }
        });
      }
      
    } catch (error: any) {
      console.error('❌ [SIGNED URLS] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao gerar URLs assinadas',
        details: error.message
      });
    }
  }

  /**
   * FLUXO DE PRODUÇÃO - Processar arquivo do Cloud Storage (Cloud Function trigger)
   */
  async processarArquivoCloudStorage(req: Request, res: Response) {
    console.log('☁️ [CLOUD FUNCTION] Trigger de processamento chamado');
    
    try {
      const { arquivo_path, municipio } = req.body;
      
      if (!arquivo_path) {
        return res.status(400).json({
          status: 'error',
          message: 'Caminho do arquivo é obrigatório'
        });
      }
      
      // Ler arquivo do Cloud Storage
      const resultadoLeitura = await this.cloudStorageService.processarArquivoUpload(arquivo_path);
      
      if (!resultadoLeitura.sucesso) {
        throw new Error(resultadoLeitura.erro);
      }
      
      // Processar dados
      const inventoryData = resultadoLeitura.dados_processados?.conteudo;
      const metadata = resultadoLeitura.dados_processados?.metadata;
      
      const municipioFinal = municipio || metadata?.municipio || 'Palmares';
      
      const processamentoFirestore = await this.processarDadosParaFirestore(inventoryData, municipioFinal);
      
      if (!processamentoFirestore.sucesso) {
        throw new Error(processamentoFirestore.erro);
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Arquivo processado com sucesso',
        data: {
          arquivo_path,
          municipio: municipioFinal,
          medicamentos_processados: processamentoFirestore.medicamentos_processados,
          semana_calculada: processamentoFirestore.semana_calculada,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error('❌ [CLOUD FUNCTION] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro no processamento do arquivo',
        details: error.message
      });
    }
  }

  /**
   * NOVO ENDPOINT - Upload direto local (desenvolvimento)
   * Recebe dados JSON diretamente e salva no storage local
   */
  async uploadLocalDirect(req: Request, res: Response) {
    console.log('📁 [UPLOAD LOCAL] Endpoint chamado');
    
    try {
      const { municipio, unidade, uploadId } = req.params;
      const inventoryData = req.body;
      
      console.log(`📁 [UPLOAD LOCAL] Upload direto para: ${municipio}/${unidade}/${uploadId}`);
      
      if (!inventoryData || typeof inventoryData !== 'object') {
        return res.status(400).json({
          status: 'error',
          message: 'Dados do inventoryData são obrigatórios'
        });
      }
      
      // Validar estrutura básica
      if (!inventoryData.periodo_inicio || !inventoryData.periodo_fim || !inventoryData.itens) {
        return res.status(400).json({
          status: 'error',
          message: 'Estrutura do inventoryData inválida (faltam periodo_inicio, periodo_fim ou itens)'
        });
      }
      
      // Salvar arquivo localmente
      const nomeArquivo = `${uploadId}_inventoryData${unidade}.json`;
      const resultadoSalvamento = await this.salvarArquivoNoStorage(
        inventoryData,
        municipio,
        unidade,
        nomeArquivo
      );
      
      if (!resultadoSalvamento.sucesso) {
        throw new Error(resultadoSalvamento.erro);
      }
      
      console.log(`✅ [UPLOAD LOCAL] Arquivo salvo: ${resultadoSalvamento.arquivo_path}`);
      
      // Triggerar processamento em background (simula Cloud Function trigger)
      console.log(`🚀 [STORAGE TRIGGER] Simulando trigger de Cloud Function para: ${resultadoSalvamento.arquivo_path}`);
      this.processarArquivosDoStorageEmBackground(municipio, [resultadoSalvamento.arquivo_path!])
        .then((resultado) => {
          console.log(`✅ [STORAGE TRIGGER] Processamento automático concluído:`, resultado);
        })
        .catch((error) => {
          console.error(`❌ [STORAGE TRIGGER] Erro no processamento automático:`, error);
        });
      
      return res.status(200).json({
        status: 'success',
        message: 'Upload local realizado com sucesso',
        data: {
          municipio,
          unidade,
          upload_id: uploadId,
          arquivo_path: resultadoSalvamento.arquivo_path,
          periodo: `${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`,
          total_itens: inventoryData.itens.length,
          processamento_status: 'EM_BACKGROUND',
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error('❌ [UPLOAD LOCAL] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro no upload local',
        details: error.message
      });
    }
  }

  /**
   * NOVO ENDPOINT - Upload direto local de anexo (desenvolvimento)
   * Recebe arquivo binário e salva em storage local na pasta attachments
   */
  async uploadLocalDirectAttachment(req: Request, res: Response) {
    console.log('📎 [UPLOAD LOCAL ATTACHMENT] Endpoint chamado');
    console.log('📎 [UPLOAD LOCAL ATTACHMENT] Headers:', {
      'content-type': req.headers['content-type'],
      'x-filename': req.headers['x-filename'],
      'content-length': req.headers['content-length']
    });
    
    try {
      const { municipio, unidade, uploadId } = req.params;
      const nomeArquivo = req.headers['x-filename'] as string || `${uploadId}_attachment`;
      const tipo = req.headers['content-type'] as string || 'application/octet-stream';

      console.log(`📎 [UPLOAD LOCAL ATTACHMENT] Params: municipio=${municipio}, unidade=${unidade}, uploadId=${uploadId}`);
      console.log(`📎 [UPLOAD LOCAL ATTACHMENT] Arquivo: ${nomeArquivo}, tipo: ${tipo}`);

      // O express.raw middleware coloca os dados em req.body como Buffer
      let raw: Buffer | undefined;
      
      if (Buffer.isBuffer(req.body)) {
        raw = req.body;
        console.log(`📎 [UPLOAD LOCAL ATTACHMENT] Body é Buffer (${raw.length} bytes)`);
      } else if ((req as any).rawBody) {
        raw = (req as any).rawBody;
        console.log(`📎 [UPLOAD LOCAL ATTACHMENT] Usando rawBody (${raw.length} bytes)`);
      } else {
        console.error('❌ [UPLOAD LOCAL ATTACHMENT] Body não é Buffer:', typeof req.body);
        console.error('❌ [UPLOAD LOCAL ATTACHMENT] Body content:', req.body);
        return res.status(400).json({ 
          status: 'error', 
          message: 'Corpo binário é obrigatório',
          debug: {
            bodyType: typeof req.body,
            isBuffer: Buffer.isBuffer(req.body),
            hasRawBody: !!(req as any).rawBody
          }
        });
      }

      if (!raw || raw.length === 0) {
        console.error('❌ [UPLOAD LOCAL ATTACHMENT] Buffer vazio ou undefined');
        return res.status(400).json({ 
          status: 'error', 
          message: 'Arquivo vazio ou dados inválidos',
          debug: {
            hasBuffer: !!raw,
            bufferLength: raw?.length || 0
          }
        });
      }

      const fs = require('fs');
      const path = require('path');

      const dirBase = path.join(__dirname, '../../../storage/uploads', municipio, unidade, 'attachments');
      console.log(`📁 [UPLOAD LOCAL ATTACHMENT] Criando diretório: ${dirBase}`);
      
      if (!fs.existsSync(dirBase)) {
        fs.mkdirSync(dirBase, { recursive: true });
        console.log(`✅ [UPLOAD LOCAL ATTACHMENT] Diretório criado: ${dirBase}`);
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const nomeArquivoLimpo = nomeArquivo.replace(/[^a-zA-Z0-9._-]/g, '_');
      const nomeFinal = `${timestamp}_${nomeArquivoLimpo}`;
      const caminhoCompleto = path.join(dirBase, nomeFinal);

      console.log(`💾 [UPLOAD LOCAL ATTACHMENT] Salvando em: ${caminhoCompleto}`);
      fs.writeFileSync(caminhoCompleto, raw);
      console.log(`✅ [UPLOAD LOCAL ATTACHMENT] Arquivo salvo com sucesso (${raw.length} bytes)`);

      const arquivoPath = `storage/uploads/${municipio}/${unidade}/attachments/${nomeFinal}`;
      console.log(`📄 [UPLOAD LOCAL ATTACHMENT] Path relativo: ${arquivoPath}`);

      return res.status(200).json({
        status: 'success',
        message: 'Anexo salvo com sucesso',
        data: {
          municipio,
          unidade,
          upload_id: uploadId,
          arquivo_path: arquivoPath,
          arquivo_nome: nomeFinal,
          content_type: tipo,
          tamanho_bytes: raw.length,
          tamanho_kb: (raw.length / 1024).toFixed(2),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('❌ [UPLOAD LOCAL ATTACHMENT] Erro:', error);
      console.error('❌ [UPLOAD LOCAL ATTACHMENT] Stack:', error.stack);
      return res.status(500).json({ 
        status: 'error', 
        message: 'Erro no upload local de anexo', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  /**
   * NOVO - Listar documentos anexados (attachments)
   */
  async listarDocumentos(req: Request, res: Response) {
    try {
      const { municipio } = req.query;
      const { arquivos, total } = await this.cloudStorageService.listarDocumentos(municipio as string | undefined);
      return res.status(200).json({
        status: 'success',
        data: { arquivos, total, municipio: municipio || null, timestamp: new Date().toISOString() }
      });
    } catch (error: any) {
      console.error('❌ [LISTAR DOCUMENTOS] Erro:', error);
      return res.status(500).json({ status: 'error', message: 'Erro ao listar documentos', details: error.message });
    }
  }

  /**
   * ENDPOINT DE HEALTH CHECK
   */
  async healthCheck(req: Request, res: Response) {
    console.log('💚 [HEALTH] Endpoint de saúde chamado');
    res.json({
      status: 'success',
      message: 'Upload service está funcionando',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: [
        '🚀 POST /api/upload/solicitar-signed-urls - NOVO: Gerar URLs para upload direto (RECOMENDADO)',
        '📁 POST /api/upload/local-direct/:municipio/:unidade/:uploadId - NOVO: Upload direto local',
        '⚠️ POST /api/upload/semanal - DEPRECIADO: Upload com JSON no corpo (SERÁ REMOVIDO)',
        '🔢 POST /api/upload/executar-calculos - Executar cálculos manualmente',
        '📊 GET /api/upload/status - Status do processamento',
        '☁️ POST /api/upload/processar-cloud-storage - Processar Cloud Storage (produção)',
        '💚 GET /api/upload/health - Health check'
      ],
      fluxo_recomendado: [
        '1. POST /solicitar-signed-urls → Obter URLs de upload',
        '2. PUT signed_url → Enviar JSON diretamente para storage',
        '3. Trigger automático → Processamento em background',
        '4. POST /executar-calculos → Executar cálculos (opcional)'
      ]
    });
  }

  /**
   * NOVO ENDPOINT - Executar cálculos para município
   * Permite triggerar manualmente os cálculos após upload
   */
  async executarCalculos(req: Request, res: Response) {
    console.log('📋 [CALCULOS] Endpoint de cálculos chamado');
    
    try {
      const { municipio, unidade } = req.body;
      
      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Município é obrigatório'
        });
      }
      
      console.log(`📋 [CALCULOS] Executando cálculos para ${municipio}${unidade ? `/${unidade}` : ''}`);
      
      // Executar cálculos reais (em dev salva JSON, em prod salva no banco)
      console.log(`🔢 [CALCULOS] Executando cálculos para ${municipio}${unidade ? `/${unidade}` : ''}...`);
      
      let resultado;
      try {
        if (unidade) {
          // Executar para unidade específica
          resultado = await executarCalculosParaUnidade(municipio, unidade);
        } else {
          // Executar para município inteiro
          resultado = await executarCalculosParaMunicipio(municipio);
        }
        
        console.log(`✅ [CALCULOS] Cálculos concluídos:`, resultado);
      
      } catch (error) {
        console.error(`❌ [CALCULOS] Erro nos cálculos:`, error);
        return res.status(500).json({
          status: 'error',
          message: 'Erro nos cálculos',
          details: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
      
      // Retornar resultado real dos cálculos
      return res.status(200).json({
        status: 'success',
        message: 'Cálculos executados com sucesso',
        data: {
          municipio,
          unidade: unidade || 'TODAS',
          total_processados: resultado.total_processados || 0,
          total_sucesso: resultado.total_sucesso || 0,
          total_erros: resultado.total_erros || 0,
          taxa_sucesso: resultado.total_processados > 0 ? 
            Math.round((resultado.total_sucesso / resultado.total_processados) * 100) : 100,
          observacao: process.env.NODE_ENV === 'development' ? 
            'Modo desenvolvimento - cálculos salvos em JSON local' : 
            'Modo produção - cálculos salvos no banco',
          arquivos_gerados: resultado.arquivos_gerados || [],
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error('❌ [CALCULOS] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao executar cálculos',
        details: error.message
      });
    }
  }

  /**
   * ENDPOINT - Status do processamento
   * Permite verificar o status dos uploads e processamentos
   */
  async statusProcessamento(req: Request, res: Response) {
    console.log('📋 [STATUS] Endpoint de status chamado');
    
    try {
      const { municipio } = req.query;
      
      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Município é obrigatório'
        });
      }
      
      // Lista arquivos no storage
      const { arquivos } = await this.cloudStorageService.listarArquivosPendentes(municipio as string);
      
      // Busca informações das unidades no banco
      const municipioRef = db.collection('municipio').doc(municipio as string);
      const unidadesSnapshot = await municipioRef.collection('unidades').get();
      
      const unidades = [];
      for (const unidadeDoc of unidadesSnapshot.docs) {
        const unidadeData = unidadeDoc.data();
        const medicamentosSnapshot = await unidadeDoc.ref.collection('medicamentos_unidade').get();
        
        const medicamentosComCalculos = medicamentosSnapshot.docs.filter(doc => {
          const data = doc.data();
          return data.status_calculo === 'CALCULADO';
        }).length;
        
        unidades.push({
          nome: unidadeDoc.id,
          total_medicamentos: medicamentosSnapshot.size,
          medicamentos_com_calculos: medicamentosComCalculos,
          ultima_atualizacao: unidadeData.ultima_atualizacao,
          ultima_semana_processada: unidadeData.ultima_semana_processada
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: {
          municipio,
          arquivos_storage: arquivos.length,
          arquivos_detalhes: arquivos,
          unidades,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error: any) {
      console.error('❌ [STATUS] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao buscar status',
        details: error.message
      });
    }
  }

  /**
   * NOVO - Verificar completude dos JSONs no storage (bucket/local)
   * Garante que TODAS as unidades cadastradas possuem um arquivo JSON presente no storage
   */
  async checkCompleteness(req: Request, res: Response) {
    console.log('📦 [CHECK COMPLETENESS] Endpoint chamado');
    try {
      const { municipio } = req.query;

      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Município é obrigatório'
        });
      }

      console.log(`📍 [CHECK COMPLETENESS] Município: ${municipio}`);

      // 1) Buscar unidades cadastradas no Firestore
      const municipioRef = db.collection('municipio').doc(String(municipio));
      const unidadesSnapshot = await municipioRef.collection('unidades').get();
      const expectedUnits = unidadesSnapshot.docs.map(doc => doc.id);

      console.log(`🏥 [CHECK COMPLETENESS] Unidades esperadas (${expectedUnits.length}):`, expectedUnits);

      if (expectedUnits.length === 0) {
        return res.status(200).json({
          status: 'success',
          data: {
            municipio,
            complete: false,
            expected_units: [],
            units_with_files: [],
            missing_units: [],
            arquivos_storage: 0,
            message: 'Nenhuma unidade cadastrada encontrada no município'
          }
        });
      }

      // 2) Verificar arquivos por unidade respeitando o caminho inventoryData
      const isCloud = CloudStorageService.isConfigured();
      console.log(`☁️ [CHECK COMPLETENESS] CloudStorage habilitado? ${isCloud}`);

      const unitsWithFiles: string[] = [];
      let totalArquivosVistos = 0;

      if (isCloud) {
        // CLOUD: usar lista do bucket e filtrar pelo prefixo específico de inventoryData
        const { arquivos } = await this.cloudStorageService.listarArquivosPendentes(String(municipio));
        totalArquivosVistos = arquivos.length;
        console.log(`📂 [CHECK COMPLETENESS] Arquivos no bucket para ${municipio}: ${arquivos.length}`);
        console.log(`🧾 [CHECK COMPLETENESS] Amostra de caminhos (até 10):`, arquivos.slice(0, 10).map(a => a.path));

        for (const unidade of expectedUnits) {
          const prefixCloud = `uploads/${municipio}/${unidade}/inventoryData/`;
          const prefixCloudLower = prefixCloud.toLowerCase();
          console.log(`🔧 [CHECK COMPLETENESS] Unidade ${unidade} → prefixo (orig): '${prefixCloud}', (lower): '${prefixCloudLower}'`);
          const matches = arquivos
            .filter((a: any) => typeof a.path === 'string' && a.path.toLowerCase().startsWith(prefixCloudLower))
            .filter((a: any) => a.path.toLowerCase().endsWith('.json'))
            .map((a: any) => a.path);
          const hasJson = matches.length > 0;
          console.log(`🔎 [CHECK COMPLETENESS] Unidade ${unidade} → prefixo '${prefixCloud}' → encontrados: ${matches.length}`);
          if (matches.length > 0) {
            console.log(`   ↳ Primeiros arquivos:`, matches.slice(0, 5));
          }
          if (hasJson) {
            unitsWithFiles.push(unidade);
          }
        }
      } else {
        // LOCAL: verificar diretamente o filesystem no caminho inventoryData
        const fs = require('fs');
        const path = require('path');
        for (const unidade of expectedUnits) {
          const dirInventory = path.join(
            __dirname,
            '../../../storage/uploads',
            String(municipio),
            unidade,
            'inventoryData'
          );
          let hasJson = false;
          const exists = fs.existsSync(dirInventory) && fs.statSync(dirInventory).isDirectory();
          console.log(`🗂️ [CHECK COMPLETENESS][LOCAL] Unidade ${unidade} → ${dirInventory} (existe? ${exists})`);
          if (exists) {
            const files = fs.readdirSync(dirInventory);
            totalArquivosVistos += files.length;
            const jsons = files.filter((f: string) => f.toLowerCase().endsWith('.json'));
            hasJson = jsons.length > 0;
            console.log(`   ↳ Arquivos: ${files.length} | JSONs: ${jsons.length} | Amostra:`, jsons.slice(0, 5));
          }
          if (hasJson) {
            unitsWithFiles.push(unidade);
          }
        }
      }

      // 3) Encontrar unidades faltantes
      const expectedUpper = expectedUnits.map(u => u.toString());
      const presentUpper = new Set(unitsWithFiles.map(u => u.toString()));
      const missingUnits = expectedUpper.filter(u => !presentUpper.has(u));

      const complete = missingUnits.length === 0 && expectedUpper.length > 0;

      console.log(`✅ [CHECK COMPLETENESS] Resultado → complete=${complete} | com arquivos (${unitsWithFiles.length}):`, unitsWithFiles);
      if (!complete) {
        console.log(`⚠️ [CHECK COMPLETENESS] Unidades faltantes (${missingUnits.length}):`, missingUnits);
      }

      return res.status(200).json({
        status: 'success',
        data: {
          municipio,
          complete,
          expected_units: expectedUpper,
          units_with_files: unitsWithFiles,
          missing_units: missingUnits,
          arquivos_storage: totalArquivosVistos,
          caminho_padrao: 'uploads/{municipio}/{unidade}/inventoryData/*.json',
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('❌ [CHECK COMPLETENESS] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao verificar completude',
        details: error.message
      });
    }
  }

  /**
   * NOVO - Disparar validação com gabarito (somente leitura, não altera banco)
   */
  async validarCalculos(req: Request, res: Response) {
    console.log('🧪 [VALIDAR CALCULOS] Endpoint chamado');
    try {
      const resultado = await validarCalculosComGabarito();
      return res.status(200).json({
        status: 'success',
        message: 'Validação executada com sucesso',
        data: resultado,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('❌ [VALIDAR CALCULOS] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao validar cálculos',
        details: error.message
      });
    }
  }

  // ============ MÉTODOS PRIVADOS (CORE DO SISTEMA) ============

  /**
   * Processa dados do inventoryData para estrutura Firestore conforme instructions.md
   * ESTE É O CORAÇÃO DO SISTEMA!
   */
  private async processarDadosParaFirestore(
    inventoryData: any, 
    municipio: string
  ): Promise<{
    sucesso: boolean;
    erro?: string;
    medicamentos_processados?: number;
    semana_calculada?: string;
  }> {
    try {
      console.log(`⚠️ [FIRESTORE DESATIVADO] Simulando processamento para ${municipio}/${inventoryData.unidade}`);
      
      // 1. Extrair nome da unidade
      const nomeUnidade = inventoryData.unidade || inventoryData.unidade_info?.nome || 'DESCONHECIDO';
      
      // 2. Calcular semana baseada no período (sem salvar)
      const semanaCalculada = this.calcularSemanaMovimentacao(
        inventoryData.periodo_inicio, 
        inventoryData.periodo_fim
      );
      
      console.log(`📅 [FIRESTORE DESATIVADO] Semana calculada: ${semanaCalculada}`);
      console.log(`💾 [FIRESTORE DESATIVADO] Total itens: ${inventoryData.itens?.length || 0}`);
      console.log(`⚠️ [FIRESTORE DESATIVADO] BANCO NÃO FOI MODIFICADO - apenas simulação`);
      
      // Simular salvamento bem-sucedido sem tocar no banco
      return {
        sucesso: true,
        medicamentos_processados: inventoryData.itens?.length || 0,
        semana_calculada: semanaCalculada
      };
      
    } catch (error) {
      console.error(`❌ [FIRESTORE DESATIVADO] Erro na simulação:`, error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Calcula a semana de movimentação baseada no período
   * Formato: YYYY_WW (ex: 2025_22)
   */
  private calcularSemanaMovimentacao(periodoInicio: string, periodoFim: string): string {
    try {
      // Parse da data de fim (formato DD/MM/YYYY)
      const [dia, mes, ano] = periodoFim.split('/').map(n => parseInt(n));
      const dataFim = new Date(ano, mes - 1, dia);
      
      // Calcular número da semana do ano
      const primeiroJaneiro = new Date(ano, 0, 1);
      const diasDoAno = Math.floor((dataFim.getTime() - primeiroJaneiro.getTime()) / (24 * 60 * 60 * 1000));
      const numeroSemana = Math.ceil((diasDoAno + primeiroJaneiro.getDay() + 1) / 7);
      
      return `${ano}_${String(numeroSemana).padStart(2, '0')}`;
      
    } catch (error) {
      console.error('Erro ao calcular semana:', error);
      // Fallback: usar data atual
      const agora = new Date();
      const ano = agora.getFullYear();
      const semana = Math.ceil((agora.getTime() - new Date(ano, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      return `${ano}_${String(semana).padStart(2, '0')}`;
    }
  }

  /**
   * TEMPORARIAMENTE DESATIVADO - Salva dados no Firestore
   * Durante desenvolvimento, apenas simula o salvamento
   */
  private async salvarDadosFirestore(
    municipio: string,
    nomeUnidade: string,
    dadosProcessados: any,
    semanaCalculada: string
  ): Promise<{
    sucesso: boolean;
    erro?: string;
    medicamentos_salvos?: number;
  }> {
    try {
      console.log(`⚠️ [FIRESTORE DESATIVADO] Simulando salvamento: ${municipio}/${nomeUnidade}`);
      console.log(`📅 [FIRESTORE DESATIVADO] Semana: ${semanaCalculada}`);
      
      // Simular contagem de medicamentos sem salvar
      const medicamentosSimulados = dadosProcessados?.inventory_processado?.itens?.length || 0;
      
      console.log(`⚠️ [FIRESTORE DESATIVADO] BANCO NÃO MODIFICADO - ${medicamentosSimulados} medicamentos simulados`);
      
      return {
        sucesso: true,
        medicamentos_salvos: medicamentosSimulados
      };
      
    } catch (error) {
      console.error(`❌ [FIRESTORE DESATIVADO] Erro na simulação:`, error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro na simulação'
      };
    }
  }

  /**
   * Salva arquivo JSON no storage (local ou cloud)
   */
  private async salvarArquivoNoStorage(
    content: any,
    municipio: string,
    unidade: string,
    nomeArquivo: string
  ): Promise<{
    sucesso: boolean;
    arquivo_path?: string;
    erro?: string;
  }> {
    try {
      console.log(`💾 [STORAGE] Salvando arquivo: ${municipio}/${unidade}/${nomeArquivo}`);
      
      if (CloudStorageService.isConfigured()) {
        // Usar Cloud Storage
        console.log('☁️ [STORAGE] Usando Cloud Storage');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const nomeArquivoLimpo = nomeArquivo.replace(/[^a-zA-Z0-9.-]/g, '_');
        const arquivoPath = `uploads/${municipio}/${unidade}/inventoryData/${timestamp}_${nomeArquivoLimpo}`;
        
        // TODO: Implementar salvamento direto no Cloud Storage
        // Por enquanto, salva localmente como fallback
        return await this.salvarArquivoLocalmente(content, municipio, unidade, nomeArquivo);
        
      } else {
        // Usar armazenamento local
        console.log('💾 [STORAGE] Usando armazenamento local');
        return await this.salvarArquivoLocalmente(content, municipio, unidade, nomeArquivo);
      }
      
    } catch (error) {
      console.error(`❌ [STORAGE] Erro ao salvar arquivo:`, error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }
  
  /**
   * Salva arquivo no sistema de arquivos local
   */
  private async salvarArquivoLocalmente(
    content: any,
    municipio: string,
    unidade: string,
    nomeArquivo: string
  ): Promise<{
    sucesso: boolean;
    arquivo_path?: string;
    erro?: string;
  }> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Criar diretório se não existir
      const dirStorage = path.join(__dirname, '../../../storage/uploads', municipio, unidade);
      if (!fs.existsSync(dirStorage)) {
        fs.mkdirSync(dirStorage, { recursive: true });
      }
      
      // Gerar nome único do arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const nomeArquivoFinal = `${timestamp}_${nomeArquivo}`;
      const caminhoCompleto = path.join(dirStorage, nomeArquivoFinal);
      
      // Salvar arquivo
      fs.writeFileSync(caminhoCompleto, JSON.stringify(content, null, 2), 'utf8');
      
      const arquivoPath = `storage/uploads/${municipio}/${unidade}/${nomeArquivoFinal}`;
      
      console.log(`✅ [STORAGE] Arquivo salvo localmente: ${arquivoPath}`);
      
      return {
        sucesso: true,
        arquivo_path: arquivoPath
      };
      
    } catch (error) {
      console.error(`❌ [STORAGE] Erro ao salvar localmente:`, error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro no salvamento local'
      };
    }
  }
  
  /**
   * Processa arquivos do storage em background
   */
  private async processarArquivosDoStorageEmBackground(
    municipio: string,
    arquivosPaths: string[]
  ): Promise<{
    sucesso: boolean;
    arquivos_processados: number;
    resultados: any[];
    erro?: string;
  }> {
    try {
      console.log(`🚀 [BACKGROUND] Iniciando processamento de ${arquivosPaths.length} arquivos`);
      
      const resultados = [];
      
      // Processar cada arquivo
      for (const arquivoPath of arquivosPaths) {
        try {
          console.log(`🔄 [BACKGROUND] Processando: ${arquivoPath}`);
          
          // Ler arquivo (local ou cloud)
          const dadosArquivo = await this.lerArquivoDoStorage(arquivoPath);
          
          if (dadosArquivo.sucesso && dadosArquivo.content) {
            // Extrair unidade do path
            const unidade = this.extrairUnidadeDoPath(arquivoPath);
            
            // Processar e salvar no Firestore
            const processamento = await this.processarDadosParaFirestore(
              dadosArquivo.content, 
              municipio
            );
            
            if (processamento.sucesso) {
              console.log(`✅ [BACKGROUND] Processado: ${arquivoPath} - ${processamento.medicamentos_processados} medicamentos`);
              
              resultados.push({
                arquivo: arquivoPath,
                unidade,
                status: 'PROCESSADO',
                medicamentos: processamento.medicamentos_processados,
                semana: processamento.semana_calculada
              });
            } else {
              console.log(`❌ [BACKGROUND] Erro no processamento: ${arquivoPath} - ${processamento.erro}`);
              
              resultados.push({
                arquivo: arquivoPath,
                unidade,
                status: 'ERRO_PROCESSAMENTO',
                erro: processamento.erro
              });
            }
          } else {
            console.log(`❌ [BACKGROUND] Erro na leitura: ${arquivoPath} - ${dadosArquivo.erro}`);
            
            resultados.push({
              arquivo: arquivoPath,
              status: 'ERRO_LEITURA',
              erro: dadosArquivo.erro
            });
          }
          
        } catch (error) {
          console.error(`❌ [BACKGROUND] Erro ao processar ${arquivoPath}:`, error);
          
          resultados.push({
            arquivo: arquivoPath,
            status: 'ERRO_GERAL',
            erro: error instanceof Error ? error.message : 'Erro desconhecido'
          });
        }
      }
      
      // Executar cálculos para o município (em desenvolvimento salva JSON, em produção salva no banco)
      console.log(`📋 [BACKGROUND] Executando CÁLCULOS para ${municipio}...`);
      
      try {
        // Executar cálculos - em development mode salva em JSON, em production salva no banco
        const resultadoCalculos = await executarCalculosParaMunicipio(municipio);
        console.log(`✅ [BACKGROUND] Cálculos concluídos:`, resultadoCalculos);
      } catch (error) {
        console.warn(`⚠️ [BACKGROUND] Erro nos cálculos (não crítico):`, error);
      }
      
      console.log(`✅ [BACKGROUND] Processamento completo concluído para ${municipio}`);
      console.log(`   Arquivos processados: ${resultados.length}`);
      console.log(`   Status: APENAS SALVAMENTO NO STORAGE (banco não modificado)`);
      
      return {
        sucesso: true,
        arquivos_processados: resultados.length,
        resultados: [
          ...resultados,
          {
            tipo: 'CALCULOS_EXECUTADOS',
            status: 'BANCO_NAO_MODIFICADO_EM_DEV',
            observacao: 'JSON salvo no storage e cálculos executados (em dev salva JSON, em prod salva no banco)'
          }
        ]
      };
      
    } catch (error) {
      console.error(`❌ [BACKGROUND] Erro no processamento em background:`, error);
      return {
        sucesso: false,
        arquivos_processados: 0,
        resultados: [],
        erro: error instanceof Error ? error.message : 'Erro no processamento'
      };
    }
  }
  
  /**
   * Lê arquivo do storage (local ou cloud)
   */
  private async lerArquivoDoStorage(arquivoPath: string): Promise<{
    sucesso: boolean;
    content?: any;
    erro?: string;
  }> {
    try {
      if (arquivoPath.startsWith('storage/')) {
        // Arquivo local
        const fs = require('fs');
        const path = require('path');
        
        const caminhoCompleto = path.join(__dirname, '../../../', arquivoPath);
        
        if (!fs.existsSync(caminhoCompleto)) {
          throw new Error(`Arquivo não encontrado: ${caminhoCompleto}`);
        }
        
        const dados = fs.readFileSync(caminhoCompleto, 'utf8');
        const content = JSON.parse(dados);
        
        return { sucesso: true, content };
        
      } else {
        // Arquivo no cloud storage
        const resultado = await this.cloudStorageService.processarArquivoUpload(arquivoPath);
        
        if (resultado.sucesso && resultado.dados_processados) {
          return { 
            sucesso: true, 
            content: resultado.dados_processados.conteudo 
          };
        } else {
          return {
            sucesso: false,
            erro: resultado.erro || 'Erro ao ler do cloud storage'
          };
        }
      }
      
    } catch (error) {
      console.error(`❌ [STORAGE] Erro ao ler arquivo ${arquivoPath}:`, error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro na leitura'
      };
    }
  }
  
  /**
   * Extrai nome da unidade do path do arquivo
   */
  private extrairUnidadeDoPath(arquivoPath: string): string {
    // storage/uploads/municipio/unidade/arquivo.json
    const parts = arquivoPath.split('/');
    if (parts.length >= 4) {
      return parts[3]; // unidade
    }
    
    // Fallback: extrair do nome do arquivo
    return this.extrairNomeUnidadeDoArquivo(arquivoPath);
  }

  /**
   * Extrai nome da unidade do arquivo de inventoryData
   */
  private extrairNomeUnidadeDoArquivo(nomeArquivo: string): string {
    console.log(`🔍 [EXTRAÇÃO] Extraindo unidade de: ${nomeArquivo}`);
    
    const patterns = [
      /inventoryData([A-Za-z0-9]+)\.json$/i,
      /inventory[-_]?([A-Za-z0-9]+)\.json$/i,
      /([A-Za-z0-9]+)[-_]?inventory\.json$/i,
      /([A-Za-z0-9]+)\.json$/i
    ];
    
    for (const pattern of patterns) {
      const match = nomeArquivo.match(pattern);
      if (match && match[1] && match[1].length >= 1) {
        const unidade = match[1].toUpperCase().trim();
        console.log(`✅ [EXTRAÇÃO] Unidade encontrada: ${unidade}`);
        return unidade;
      }
    }
    
    const fallback = nomeArquivo.replace(/\.(json|xlsx|xls|csv)$/i, '').toUpperCase() || 'DESCONHECIDO';
    console.log(`⚠️ [EXTRAÇÃO] Usando fallback: ${fallback}`);
    return fallback;
  }
}