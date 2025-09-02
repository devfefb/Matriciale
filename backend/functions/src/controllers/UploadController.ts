import { Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { UploadService } from '../services/UploadService';
import { FileStorageService } from '../services/FileStorageService';
import { UploadRequest, ProcessingOptions } from '../interfaces/Upload';
import { db } from '../config/firebase';

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
        fileSize: 50 * 1024 * 1024, // 50MB máximo por arquivo
        files: 10, // Máximo 10 arquivos
      },
      fileFilter: (req, file, cb) => {
        console.log(`🔍 [MULTER] Verificando arquivo: ${file.originalname}, MIME: ${file.mimetype}`);
        
        const allowedTypes = [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
          'application/vnd.ms-excel', // .xls
          'text/csv', // .csv
          'application/csv', // .csv alternativo
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          console.log(`✅ [MULTER] Arquivo aceito: ${file.originalname}`);
          cb(null, true);
        } else {
          console.log(`❌ [MULTER] Arquivo rejeitado: ${file.originalname} (${file.mimetype})`);
          cb(null, false);
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
   * Middleware do multer para múltiplos uploads
   */
  getMultipleUploadMiddleware() {
    return this.getMulterConfig().array('arquivos', 10); // Máximo 10 arquivos
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

  /**
   * Endpoint para upload semanal (dados JSON otimizado)
   */
  async uploadSemanal(req: Request, res: Response) {
    console.log('🚀 [UPLOAD SEMANAL] Endpoint chamado!');
    console.log('📋 [UPLOAD SEMANAL] Headers:', req.headers);
    console.log('🔗 [UPLOAD SEMANAL] URL:', req.url);
    console.log('⚡ [UPLOAD SEMANAL] Method:', req.method);
    
    try {
      // Nova estrutura otimizada: recebemos metadados + array de arquivos JSON
      const { 
        tipo, 
        municipio, 
        data_processamento, 
        arquivos // Array de { nome_arquivo, content: object }
      } = req.body;
      
      console.log('📊 [UPLOAD SEMANAL] Dados recebidos:', {
        tipo,
        municipio,
        data_processamento,
        total_arquivos: arquivos ? arquivos.length : 0,
        arquivos_nomes: arquivos ? arquivos.map((a: any) => a.nome_arquivo) : []
      });

      if (!arquivos || !Array.isArray(arquivos) || arquivos.length === 0) {
        console.log('❌ [UPLOAD SEMANAL] Nenhum arquivo processado enviado');
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

      console.log('🔄 [UPLOAD SEMANAL] Iniciando processamento dos arquivos JSON...');
      
      const resultados: any[] = [];
      const arquivosSalvos: string[] = [];
      
      // Processar cada arquivo
      for (const arquivo of arquivos) {
        const { nome_arquivo, content } = arquivo;
        
        if (!nome_arquivo || !content) {
          console.log(`❌ [UPLOAD SEMANAL] Arquivo inválido:`, arquivo);
          continue;
        }

        console.log(`⚙️ [UPLOAD SEMANAL] Processando arquivo: ${nome_arquivo}`);
        
        // Validar conteúdo do inventoryData
        if (!content.periodo_inicio || !content.periodo_fim || !content.itens) {
          console.log(`❌ [UPLOAD SEMANAL] Formato inválido do inventoryData: ${nome_arquivo}`);
          continue;
        }

        console.log(`📅 [UPLOAD SEMANAL] Período: ${content.periodo_inicio} a ${content.periodo_fim}`);
        console.log(`📦 [UPLOAD SEMANAL] Itens: ${content.itens.length}`);
        
        // Criar buffer do JSON
        const buffer = FileStorageService.criarBufferJSON(content);
        
        // Validar JSON
        const validacao = FileStorageService.validarJSON(buffer);
        if (!validacao.valido) {
          console.log(`❌ [UPLOAD SEMANAL] JSON inválido em ${nome_arquivo}: ${validacao.erro}`);
          continue;
        }

        // Extrair nome da unidade do arquivo
        const nomeUnidade = this.extrairNomeUnidadeDoArquivo(nome_arquivo);
        
        // Gerar nome de arquivo único
        const nomeArquivoFinal = FileStorageService.gerarNomeArquivo(
          municipio, 
          nomeUnidade, 
          'semanal'
        );

        console.log(`📋 [UPLOAD SEMANAL] Arquivo: ${nome_arquivo} → Unidade: ${nomeUnidade} → Arquivo final: ${nomeArquivoFinal}`);

        // Salvar arquivo usando FileStorageService (condicional baseado em NODE_ENV)
        const resultadoSalvamento = await FileStorageService.salvarArquivoJSON(
          buffer,
          nomeArquivoFinal,
          {
            municipio,
            unidade: nomeUnidade,
            periodo_inicio: content.periodo_inicio,
            periodo_fim: content.periodo_fim,
            total_itens: content.itens.length,
            arquivo_original: nome_arquivo
          }
        );

        if (resultadoSalvamento.success) {
          console.log(`✅ [UPLOAD SEMANAL] Arquivo salvo: ${resultadoSalvamento.path}`);
          
          resultados.push({
            unidade: nomeUnidade,
            arquivo_original: nome_arquivo,
            arquivo_salvo: resultadoSalvamento.path,
            url: resultadoSalvamento.url,
            periodo: `${content.periodo_inicio} a ${content.periodo_fim}`,
            total_itens: content.itens.length
          });

          arquivosSalvos.push(nomeArquivoFinal);

          // Salvar metadados no Firestore
          await this.salvarMetadadosFirestore(
            municipio,
            nomeUnidade,
            {
              arquivo_path: resultadoSalvamento.path,
              arquivo_url: resultadoSalvamento.url,
              periodo_inicio: content.periodo_inicio,
              periodo_fim: content.periodo_fim,
              total_itens: content.itens.length,
              data_upload: new Date(),
              status: 'processado'
            }
          );

        } else {
          console.log(`❌ [UPLOAD SEMANAL] Falha ao salvar: ${resultadoSalvamento.error}`);
        }
      }

      const response = {
        status: 'success',
        message: `Upload semanal processado com sucesso - ${resultados.length} arquivo(s) salvos`,
        data: {
          municipio,
          arquivos_processados: resultados.length,
          arquivos_gerados: arquivosSalvos,
          environment: process.env.NODE_ENV || 'development',
          storage_type: process.env.NODE_ENV === 'production' ? 'firebase_storage' : 'local_filesystem',
          resultados,
          timestamp: new Date().toISOString()
        }
      };

      console.log('✅ [UPLOAD SEMANAL] Processamento concluído:', response.data);
      return res.status(200).json(response);

    } catch (error: any) {
      console.error('❌ [UPLOAD SEMANAL] Erro completo:', error);
      console.error('❌ [UPLOAD SEMANAL] Stack trace:', error.stack);
      
      const errorResponse = {
        status: 'error',
        message: 'Erro no upload semanal',
        details: error.message,
        timestamp: new Date().toISOString()
      };
      
      console.log('📤 [UPLOAD SEMANAL] Enviando resposta de erro:', errorResponse);
      
      return res.status(500).json(errorResponse);
    }
  }

  /**
   * Endpoint para upload de onboarding
   */
  async uploadOnboarding(req: Request, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          message: 'Nenhum arquivo foi enviado'
        });
      }

      const { municipio = 'municipio_teste' } = req.body;

      console.log('🏢 [UPLOAD ONBOARDING] Iniciando processamento...');
      console.log(`📁 Município: ${municipio}`);
      console.log(`📄 Arquivo: ${req.file.originalname}`);

      // Processar usando script de onboarding generalizado
      const dadosProcessados = await this.processarUploadOnboarding(req.file, municipio);

      // Salvar em test-input para file-watcher processar
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const nomeArquivo = `onboarding-${municipio}-${timestamp}.json`;
      const caminhoTestInput = path.resolve(process.cwd(), 'test-input', nomeArquivo);

      // Garantir que diretório existe
      const diretorioTestInput = path.dirname(caminhoTestInput);
      if (!fs.existsSync(diretorioTestInput)) {
        fs.mkdirSync(diretorioTestInput, { recursive: true });
      }

      fs.writeFileSync(caminhoTestInput, JSON.stringify(dadosProcessados, null, 2));

      console.log(`💾 [UPLOAD ONBOARDING] Dados salvos em: ${caminhoTestInput}`);
      console.log('👁️ [UPLOAD ONBOARDING] File-watcher detectará e processará automaticamente');

      return res.status(200).json({
        status: 'success',
        message: 'Upload onboarding processado com sucesso',
        data: {
          municipio,
          arquivo_gerado: nomeArquivo,
          caminho: caminhoTestInput,
          total_medicamentos: dadosProcessados.total_medicamentos || 0,
          unidades: dadosProcessados.unidades?.map((u: any) => u.nome) || [],
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      console.error('❌ [UPLOAD ONBOARDING] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro no upload onboarding',
        details: error.message
      });
    }
  }

  /**
   * Extrai nome da unidade do arquivo
   */
  private extrairNomeUnidade(nomeArquivo: string): string {
    const nomeBase = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '');
    
    const patterns = [
      /movimentac[ao]?[es]?[-_]?([A-Za-z0-9]+)/i,
      /balancete[-_]?([A-Za-z0-9]+)/i,
      /([A-Za-z0-9]+)[-_]?movimentac/i,
      /([A-Za-z0-9]+)[-_]?balancete/i,
      /([A-Za-z0-9]+)$/i
    ];
    
    for (const pattern of patterns) {
      const match = nomeBase.match(pattern);
      if (match && match[1] && match[1].length >= 2) {
        return match[1].toUpperCase().trim();
      }
    }
    
    return nomeBase.replace(/[^A-Za-z0-9]/g, '').toUpperCase() || 'DESCONHECIDO';
  }

  /**
   * Extrai nome da unidade do arquivo de inventoryData
   */
  private extrairNomeUnidadeDoArquivo(nomeArquivo: string): string {
    console.log(`🔍 [EXTRAÇÃO] Extraindo unidade de: ${nomeArquivo}`);
    
    // Padrões específicos para arquivos inventoryData
    const patterns = [
      /inventoryData([A-Za-z0-9]+)\.json$/i,  // inventoryDataCAF.json
      /inventory[-_]?([A-Za-z0-9]+)\.json$/i, // inventory_CAF.json
      /([A-Za-z0-9]+)[-_]?inventory\.json$/i, // CAF_inventory.json
      /([A-Za-z0-9]+)\.json$/i                // CAF.json
    ];
    
    for (const pattern of patterns) {
      const match = nomeArquivo.match(pattern);
      if (match && match[1] && match[1].length >= 1) {
        const unidade = match[1].toUpperCase().trim();
        console.log(`✅ [EXTRAÇÃO] Unidade encontrada: ${unidade}`);
        return unidade;
      }
    }
    
    // Fallback: usar nome base sem extensão
    const fallback = nomeArquivo.replace(/\.(json|xlsx|xls|csv)$/i, '').toUpperCase() || 'DESCONHECIDO';
    console.log(`⚠️ [EXTRAÇÃO] Usando fallback: ${fallback}`);
    return fallback;
  }

  /**
   * Salva metadados do upload no Firestore
   */
  private async salvarMetadadosFirestore(
    municipio: string,
    unidade: string,
    metadados: any
  ): Promise<void> {
    try {
      const municipioRef = db.collection('municipio').doc(municipio);
      const unidadeRef = municipioRef.collection('unidades').doc(unidade);
      
      // Verificar se município existe
      const municipioDoc = await municipioRef.get();
      if (!municipioDoc.exists) {
        console.log(`📍 [FIRESTORE] Criando município: ${municipio}`);
        await municipioRef.set({
          nome: municipio,
          data_criacao: new Date(),
          status: 'ativo'
        });
      }

      // Verificar se unidade existe
      const unidadeDoc = await unidadeRef.get();
      if (!unidadeDoc.exists) {
        console.log(`🏥 [FIRESTORE] Criando unidade: ${unidade}`);
        await unidadeRef.set({
          nome: unidade,
          municipio: municipio,
          data_criacao: new Date(),
          status: 'ativo'
        });
      }

      // Salvar dados do upload na subcoleção de uploads
      const uploadRef = unidadeRef.collection('uploads').doc();
      await uploadRef.set({
        ...metadados,
        id: uploadRef.id,
        data_upload: new Date()
      });

      console.log(`✅ [FIRESTORE] Metadados salvos: ${municipio}/${unidade}/${uploadRef.id}`);

    } catch (error) {
      console.error('❌ [FIRESTORE] Erro ao salvar metadados:', error);
      // Não lançar erro para não interromper o upload
    }
  }

  /**
   * Determina tipo do arquivo
   */
  private determinarTipoArquivo(nomeArquivo: string): string {
    const nome = nomeArquivo.toLowerCase();
    if (nome.includes('movimentac') || nome.includes('moviment')) {
      return 'movimentacao';
    } else if (nome.includes('balancete') || nome.includes('balance')) {
      return 'balancete';
    }
    return 'desconhecido';
  }

  /**
   * Processa upload semanal usando scripts generalizados
   */
  private async processarUploadSemanal(
    arquivosPorUnidade: { [unidade: string]: { [tipo: string]: Express.Multer.File } },
    municipio: string
  ): Promise<any> {
    const XLSX = require('xlsx');
    
    const resultados: any = {
      tipo: 'semanal',
      municipio,
      data_processamento: new Date().toISOString(),
      unidades: {}
    };

    for (const [unidade, arquivos] of Object.entries(arquivosPorUnidade)) {
      console.log(`⚙️ [UPLOAD SEMANAL] Processando unidade: ${unidade}`);
      
      const dadosUnidade: any = {
        unidade,
        arquivos_processados: []
      };

      // Processar balancete se existir
      if (arquivos.balancete) {
        console.log(`📊 [UPLOAD SEMANAL] Processando balancete: ${arquivos.balancete.originalname}`);
        const workbook = XLSX.read(arquivos.balancete.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        dadosUnidade.balancete = {
          arquivo: arquivos.balancete.originalname,
          linhas_processadas: jsonData.length,
          itens: jsonData.slice(1).map((linha: any, index: number) => ({
            id: index + 1,
            descricao_item: linha[0] || '',
            saldo_anterior: linha[1] || 0,
            entradas: linha[2] || 0,
            saidas: linha[3] || 0,
            saldo_atual: linha[4] || 0
          }))
        };
        dadosUnidade.arquivos_processados.push('balancete');
      }

      // Processar movimentação se existir
      if (arquivos.movimentacao) {
        console.log(`📈 [UPLOAD SEMANAL] Processando movimentação: ${arquivos.movimentacao.originalname}`);
        const workbook = XLSX.read(arquivos.movimentacao.buffer, { type: 'buffer' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        dadosUnidade.movimentacao = {
          arquivo: arquivos.movimentacao.originalname,
          linhas_processadas: jsonData.length,
          itens: jsonData.slice(1).map((linha: any, index: number) => ({
            id: index + 1,
            descricao_item: linha[0] || '',
            quantidade: linha[1] || 0,
            valor: linha[2] || 0
          }))
        };
        dadosUnidade.arquivos_processados.push('movimentacao');
      }

      resultados.unidades[unidade] = dadosUnidade;
    }

    console.log(`✅ [UPLOAD SEMANAL] Processamento concluído: ${Object.keys(resultados.unidades).length} unidades`);
    return resultados;
  }

  /**
   * Processa upload onboarding usando scripts generalizados
   */
  private async processarUploadOnboarding(file: Express.Multer.File, municipio: string): Promise<any> {
    const XLSX = require('xlsx');
    
    console.log(`📖 [UPLOAD ONBOARDING] Lendo planilha: ${file.originalname}`);
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    
    const resultados: any = {
      tipo: 'onboarding',
      municipio,
      data_processamento: new Date().toISOString(),
      arquivo_origem: file.originalname,
      total_medicamentos: 0,
      unidades: []
    };

    // Mapeamento de abas para unidades
    const mapeamentoAbas: { [key: string]: string } = {
      'MetodologiaCAF': 'CAF',
      'MetodoOlavo': 'Olavo',
      'MetodoESF3': 'ESF3'
    };

    console.log(`📋 [UPLOAD ONBOARDING] Abas disponíveis: ${workbook.SheetNames.join(', ')}`);

    for (const nomeAba of workbook.SheetNames) {
      const nomeUnidade = mapeamentoAbas[nomeAba] || nomeAba.toUpperCase();
      
      console.log(`⚙️ [UPLOAD ONBOARDING] Processando aba: ${nomeAba} → Unidade: ${nomeUnidade}`);
      
      const worksheet = workbook.Sheets[nomeAba];
      if (!worksheet) continue;
      
      const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      if (dados.length < 2) continue;

      const medicamentos: any[] = [];
      
      // Processar dados (implementação simplificada)
      for (let i = 1; i < dados.length; i++) {
        const linha = dados[i] as any[];
        if (!linha || linha.length < 3) continue;
        
        const classificacao = linha[0] || '10. REMUME';
        const nomeMedicamento = linha[1];
        const codItem = linha[2];
        
        if (!nomeMedicamento || !codItem) continue;
        
        medicamentos.push({
          nome: nomeMedicamento.toString().trim(),
          cod_item: codItem.toString().trim(),
          classificacao: classificacao,
          // Estrutura simplificada - na implementação real usar script generalizado
          movimentacoes_semanais: {}
        });
      }

      if (medicamentos.length > 0) {
        resultados.unidades.push({
          nome: nomeUnidade,
          aba_origem: nomeAba,
          total_medicamentos: medicamentos.length,
          medicamentos: medicamentos
        });
        
        resultados.total_medicamentos += medicamentos.length;
      }
      
      console.log(`✅ [UPLOAD ONBOARDING] Unidade ${nomeUnidade}: ${medicamentos.length} medicamentos`);
    }

    console.log(`🎉 [UPLOAD ONBOARDING] Processamento concluído: ${resultados.total_medicamentos} medicamentos`);
    return resultados;
  }
}
