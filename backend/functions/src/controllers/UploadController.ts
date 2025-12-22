import { Request, Response } from 'express';
import { MovimentacaoClassifierService } from '../services/MovimentacaoClassifierService';
import { CloudStorageService } from '../services/CloudStorageService';
import { db } from '../config/firebase';
// import { validarCalculosComGabarito } from '../scripts/testes/validar-calculos'; // DESATIVADO - Usar executar-calculos
// import { executarCalculosParaMunicipio, executarCalculosParaUnidade } from '../scripts/testes/[MAIN] executar-calculos';
import { validarCalculosComGabarito } from '../scripts/testes/validar-calculos';

export class UploadController {
  private classifierService: MovimentacaoClassifierService;
  private cloudStorageService: CloudStorageService;

  constructor() {
    this.classifierService = new MovimentacaoClassifierService();
    this.cloudStorageService = new CloudStorageService();
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
   * NOVO - Download de documento anexado
   */
  async downloadDocumento(req: Request, res: Response) {
    console.log('📥 [DOWNLOAD DOCUMENTO] Endpoint chamado');
    try {
      const { path: filePath } = req.query;
      
      if (!filePath || typeof filePath !== 'string') {
        return res.status(400).json({
          status: 'error',
          message: 'Caminho do arquivo é obrigatório'
        });
      }

      console.log(`📥 [DOWNLOAD DOCUMENTO] Arquivo solicitado: ${filePath}`);

      // Verificar se é cloud ou local
      if (CloudStorageService.isConfigured()) {
        // Cloud Storage - gerar URL de download
        const downloadUrl = await this.cloudStorageService.gerarUrlDownload(filePath);
        return res.redirect(downloadUrl);
      } else {
        // Local Storage - enviar arquivo diretamente
        const fs = require('fs');
        const path = require('path');
        
        const caminhoCompleto = path.join(__dirname, '../../../', filePath);
        console.log(`📥 [DOWNLOAD DOCUMENTO] Caminho completo: ${caminhoCompleto}`);
        
        if (!fs.existsSync(caminhoCompleto)) {
          console.error(`❌ [DOWNLOAD DOCUMENTO] Arquivo não encontrado: ${caminhoCompleto}`);
          return res.status(404).json({
            status: 'error',
            message: 'Arquivo não encontrado'
          });
        }

        const nomeArquivo = path.basename(filePath);
        const stats = fs.statSync(caminhoCompleto);
        
        console.log(`✅ [DOWNLOAD DOCUMENTO] Enviando arquivo: ${nomeArquivo} (${(stats.size / 1024).toFixed(2)} KB)`);
        
        res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', stats.size);
        
        const readStream = fs.createReadStream(caminhoCompleto);
        readStream.pipe(res);
      }
    } catch (error: any) {
      console.error('❌ [DOWNLOAD DOCUMENTO] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao fazer download do documento',
        details: error.message
      });
    }
  }

  /**
   * NOVO ENDPOINT - Executar cálculos para município
   * Permite triggerar manualmente os cálculos após upload
   */
  // async executarCalculos(req: Request, res: Response) {
  //   console.log('📋 [CALCULOS] Endpoint de cálculos chamado');
    
  //   try {
  //     const { municipio, unidade } = req.body;
      
  //     if (!municipio) {
  //       return res.status(400).json({
  //         status: 'error',
  //         message: 'Município é obrigatório'
  //       });
  //     }
      
  //     console.log(`📋 [CALCULOS] Executando cálculos para ${municipio}${unidade ? `/${unidade}` : ''}`);
      
  //     // Executar cálculos reais (em dev salva JSON, em prod salva no banco)
  //     console.log(`🔢 [CALCULOS] Executando cálculos para ${municipio}${unidade ? `/${unidade}` : ''}...`);
      
  //     let resultado;
  //     try {
  //       if (unidade) {
  //         // Executar para unidade específica
  //         resultado = await executarCalculosParaUnidade(municipio, unidade);
  //       } else {
  //         // Executar para município inteiro
  //         resultado = await executarCalculosParaMunicipio(municipio);
  //       }
        
  //       console.log(`✅ [CALCULOS] Cálculos concluídos:`, resultado);
      
  //     } catch (error) {
  //       console.error(`❌ [CALCULOS] Erro nos cálculos:`, error);
  //       return res.status(500).json({
  //         status: 'error',
  //         message: 'Erro nos cálculos',
  //         details: error instanceof Error ? error.message : 'Erro desconhecido'
  //       });
  //     }
      
  //     // Retornar resultado real dos cálculos
  //     return res.status(200).json({
  //       status: 'success',
  //       message: 'Cálculos executados com sucesso',
  //       data: {
  //         municipio,
  //         unidade: unidade || 'TODAS',
  //         total_processados: resultado.total_processados || 0,
  //         total_sucesso: resultado.total_sucesso || 0,
  //         total_erros: resultado.total_erros || 0,
  //         taxa_sucesso: resultado.total_processados > 0 ? 
  //           Math.round((resultado.total_sucesso / resultado.total_processados) * 100) : 100,
  //         observacao: process.env.NODE_ENV === 'development' ? 
  //           'Modo desenvolvimento - cálculos salvos em JSON local' : 
  //           'Modo produção - cálculos salvos no banco',
  //         arquivos_gerados: resultado.arquivos_gerados || [],
  //         timestamp: new Date().toISOString()
  //       }
  //     });
      
  //   } catch (error: any) {
  //     console.error('❌ [CALCULOS] Erro:', error);
  //     return res.status(500).json({
  //       status: 'error',
  //       message: 'Erro ao executar cálculos',
  //       details: error.message
  //     });
  //   }
  // }

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

  /**
   * NOVO - Executar cálculos manualmente
   * Executa os cálculos de campos calculados para um município
   */
  async executarCalculos(req: Request, res: Response) {
    console.log('🧮 [EXECUTAR CALCULOS] Endpoint chamado');
    
    try {
      const { municipio } = req.body;
      
      // Validar parâmetro
      if (!municipio) {
        return res.status(400).json({
          status: 'error',
          message: 'Parâmetro "municipio" é obrigatório',
          exemplo: { municipio: 'Palmares' }
        });
      }

      console.log(`🧮 Iniciando cálculos para município: ${municipio}`);
      
      // Importar e executar função de cálculos
      const { atualizarCamposCalculadosNoFirestore } = require('../scripts/core/[MAIN] executar-calculos');

      // 1) Buscar unidades cadastradas no Firestore
      const municipioRef = db.collection('municipio').doc(String(municipio));
      const unidadesSnapshot = await municipioRef.collection('unidades').get();
      const nomesUnidades = unidadesSnapshot.docs.map(doc => doc.id);

      const resultado = await atualizarCamposCalculadosNoFirestore(municipio, nomesUnidades as string[]);
      
      console.log(`✅ Cálculos concluídos com sucesso!`);
      console.log(`📊 Total processados: ${resultado.totalProcessados}`);
      console.log(`✅ Sucessos: ${resultado.totalSucessos}`);
      console.log(`❌ Erros: ${resultado.totalErros}`);
      
      // Preparar resposta detalhada
      const responseData: any = {
        municipio,
        total_processados: resultado.totalProcessados,
        total_sucessos: resultado.totalSucessos,
        total_erros: resultado.totalErros,
        taxa_sucesso: `${((resultado.totalSucessos / resultado.totalProcessados) * 100).toFixed(2)}%`
      };

      // Se houver informações detalhadas das etapas, incluir na resposta
      if (resultado.preparacao) {
        responseData.etapa_1_preparacao = {
          unidades_processadas: resultado.preparacao.unidades_processadas,
          medicamentos_atualizados: resultado.preparacao.medicamentos_atualizados,
          medicamentos_zerados: resultado.preparacao.medicamentos_zerados
        };
      }

      if (resultado.calculos) {
        responseData.etapa_2_calculos = {
          medicamentos_processados: resultado.calculos.totalProcessados,
          calculos_bem_sucedidos: resultado.calculos.totalSucessos,
          erros: resultado.calculos.totalErros
        };
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Cálculos executados com sucesso (2 etapas: preparação + cálculos)',
        data: responseData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error: any) {
      console.error('❌ [EXECUTAR CALCULOS] Erro:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Erro ao executar cálculos',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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
      console.log(`💾 [FIRESTORE ATIVO] Processando dados para ${municipio}/${inventoryData.unidade}`);
      
      // Importar função de atualização
      const { atualizarEstoqueEMovimentacaoSemanal } = require('../scripts/inserir_semanas/atualizar-estoque-movimentacao');
      
      // Chamar função de atualização
      const resultado = await atualizarEstoqueEMovimentacaoSemanal(inventoryData, municipio);
      
      if (!resultado.sucesso) {
        throw new Error(resultado.erro || 'Erro ao atualizar dados no Firestore');
      }
      
      console.log(`✅ [FIRESTORE ATIVO] Dados salvos com sucesso!`);
      console.log(`📊 Medicamentos atualizados: ${resultado.medicamentos_atualizados}`);
      console.log(`📊 Medicamentos zerados: ${resultado.medicamentos_zerados}`);
      console.log(`📅 Semana calculada: ${resultado.semana_calculada}`);
      
      return {
        sucesso: true,
        medicamentos_processados: resultado.medicamentos_atualizados + resultado.medicamentos_zerados,
        semana_calculada: resultado.semana_calculada
      };
      
    } catch (error) {
      console.error(`❌ [FIRESTORE ATIVO] Erro ao processar dados:`, error);
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