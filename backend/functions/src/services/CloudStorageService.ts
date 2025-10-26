/**
 * Serviço para Cloud Storage e Signed URLs conforme arquitetura de produção
 * Implementa o fluxo: Frontend → Signed URL → Cloud Storage → Cloud Function
 */

import { bucket } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';

export interface SignedUrlRequest {
  nome_arquivo: string;
  municipio: string;
  unidade: string;
  tipo_arquivo: 'inventoryData' | 'onboarding' | 'attachments';
  tamanho_estimado?: number;
}

export interface SignedUrlResponse {
  upload_url: string;
  arquivo_path: string;
  expires_at: string;
  upload_id: string;
}

export interface CloudStorageMetadata {
  municipio: string;
  unidade: string;
  tipo_arquivo: string;
  upload_id: string;
  data_upload: string;
  tamanho_arquivo?: number;
  versao_processamento: string;
}

export class CloudStorageService {
  
  /**
   * Gera URL assinada para upload direto ao Cloud Storage
   * Implementa o passo 2 do fluxo de produção conforme instructions.md
   */
  async gerarSignedUrlUpload(request: SignedUrlRequest): Promise<SignedUrlResponse> {
    try {
      console.log(`🔗 [SIGNED URL] Gerando URL para: ${request.municipio}/${request.unidade}/${request.nome_arquivo}`);
      
      // Verificar se o bucket está disponível
      if (!bucket) {
        throw new Error('Cloud Storage não está configurado (modo desenvolvimento local)');
      }
      
      // 1. Gerar ID único para o upload
      const uploadId = uuidv4();
      
      // 2. Construir caminho do arquivo
      const arquivoPath = this.construirCaminhoArquivo(request, uploadId);
      
      // 3. Configurar metadados
      const metadata: CloudStorageMetadata = {
        municipio: request.municipio,
        unidade: request.unidade,
        tipo_arquivo: request.tipo_arquivo,
        upload_id: uploadId,
        data_upload: new Date().toISOString(),
        tamanho_arquivo: request.tamanho_estimado,
        versao_processamento: '2.0.0'
      };
      
      // 4. Gerar URL assinada
      const file = bucket.file(arquivoPath);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutos para upload
      
      const conteudoTipo = request.tipo_arquivo === 'inventoryData' ? 'application/json' : 'application/octet-stream';

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: expiresAt,
        contentType: conteudoTipo,
        metadata: {
          metadata: metadata
        }
      });
      
      console.log(`✅ [SIGNED URL] URL gerada: ${arquivoPath} (expira em 30min)`);
      console.log(`🔗 [SIGNED URL] URL completa: ${signedUrl}`);
      
      return {
        upload_url: signedUrl,
        arquivo_path: arquivoPath,
        expires_at: expiresAt.toISOString(),
        upload_id: uploadId
      };
      
    } catch (error) {
      console.error(`❌ [SIGNED URL] Erro ao gerar URL:`, error);
      throw new Error(`Falha ao gerar URL assinada: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Gera URL assinada para download de arquivo
   */
  async gerarUrlDownload(arquivoPath: string): Promise<string> {
    try {
      console.log(`📥 [DOWNLOAD URL] Gerando URL para: ${arquivoPath}`);
      
      if (!bucket) {
        throw new Error('Cloud Storage não está configurado');
      }

      const file = bucket.file(arquivoPath);
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutos para download

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt
      });

      console.log(`✅ [DOWNLOAD URL] URL gerada (expira em 15min)`);
      return signedUrl;
    } catch (error) {
      console.error(`❌ [DOWNLOAD URL] Erro:`, error);
      throw new Error(`Falha ao gerar URL de download: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
  
  /**
   * Processa arquivo após upload (Cloud Storage ou local)
   * Implementa o passo 3 do fluxo de produção (Cloud Function trigger)
   */
  async processarArquivoUpload(arquivoPath: string): Promise<{
    sucesso: boolean;
    dados_processados?: any;
    erro?: string;
  }> {
    try {
      console.log(`📥 [STORAGE] Processando arquivo: ${arquivoPath}`);
      
      if (arquivoPath.startsWith('storage/')) {
        // Arquivo local
        console.log(`💾 [STORAGE] Processando arquivo local`);
        return await this.processarArquivoLocal(arquivoPath);
      }
      
      // Arquivo no Cloud Storage
      console.log(`☁️ [STORAGE] Processando arquivo do Cloud Storage`);
      
      if (!bucket) {
        throw new Error('Cloud Storage não está configurado');
      }
      
      // 1. Ler arquivo do Cloud Storage
      const file = bucket.file(arquivoPath);
      const [exists] = await file.exists();
      
      if (!exists) {
        throw new Error(`Arquivo não encontrado: ${arquivoPath}`);
      }
      
      // 2. Download do conteúdo
      const [conteudo] = await file.download();
      const dadosJson = JSON.parse(conteudo.toString());
      
      // 3. Extrair metadados do arquivo
      const [metadata] = await file.getMetadata();
      const metadataCustom = metadata.metadata || {};
      
      console.log(`📋 [CLOUD STORAGE] Metadados:`, metadataCustom);
      
      // 4. Retornar dados para processamento
      return {
        sucesso: true,
        dados_processados: {
          conteudo: dadosJson,
          metadata: metadataCustom,
          arquivo_path: arquivoPath,
          tamanho: metadata.size
        }
      };
      
    } catch (error) {
      console.error(`❌ [STORAGE] Erro ao processar arquivo:`, error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro no processamento'
      };
    }
  }
  
  /**
   * Processa arquivo do armazenamento local
   */
  private async processarArquivoLocal(arquivoPath: string): Promise<{
    sucesso: boolean;
    dados_processados?: any;
    erro?: string;
  }> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const caminhoCompleto = path.join(__dirname, '../../../', arquivoPath);
      
      if (!fs.existsSync(caminhoCompleto)) {
        throw new Error(`Arquivo local não encontrado: ${caminhoCompleto}`);
      }
      
      const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
      const dadosJson = JSON.parse(conteudo);
      const stats = fs.statSync(caminhoCompleto);
      
      // Extrair metadados do path
      const parts = arquivoPath.split('/');
      const metadata = {
        municipio: parts.length > 3 ? parts[2] : 'Desconhecido',
        unidade: parts.length > 4 ? parts[3] : 'Desconhecida',
        tipo_arquivo: 'inventoryData',
        data_upload: stats.mtime.toISOString(),
        versao_processamento: '2.0.0'
      };
      
      console.log(`📋 [STORAGE LOCAL] Metadados:`, metadata);
      
      return {
        sucesso: true,
        dados_processados: {
          conteudo: dadosJson,
          metadata: metadata,
          arquivo_path: arquivoPath,
          tamanho: stats.size
        }
      };
      
    } catch (error) {
      console.error(`❌ [STORAGE LOCAL] Erro ao processar arquivo local:`, error);
      return {
        sucesso: false,
        erro: error instanceof Error ? error.message : 'Erro no processamento local'
      };
    }
  }
  
  /**
   * Lista arquivos pendentes de processamento (Cloud Storage ou local)
   */
  async listarArquivosPendentes(municipio?: string): Promise<{
    arquivos: Array<{
      path: string;
      nome: string;
      municipio: string;
      unidade: string;
      data_upload: string;
      tamanho: number;
    }>;
    total: number;
  }> {
    try {
      console.log(`📂 [STORAGE] Listando arquivos pendentes para ${municipio || 'todos municípios'}...`);
      
      if (!bucket) {
        // Usar armazenamento local
        console.log(`💾 [STORAGE] Usando armazenamento local`);
        return await this.listarArquivosLocais(municipio);
      }
      
      // Usar Cloud Storage
      console.log(`☁️ [STORAGE] Usando Cloud Storage`);
      
      // Prefixo para filtrar arquivos
      const prefix = municipio ? `uploads/${municipio}/` : 'uploads/';
      
      // IMPORTANTE: não usar delimiter para permitir retorno de subpastas como 'inventoryData/'
      const [files] = await bucket.getFiles({
        prefix: prefix
      });
      
      const arquivos = [];
      
      for (const file of files) {
        try {
          const [metadata] = await file.getMetadata();
          const metadataCustom = metadata.metadata || {};
          
          arquivos.push({
            path: file.name,
            nome: file.name.split('/').pop() || '',
            municipio: metadataCustom.municipio || 'Desconhecido',
            unidade: metadataCustom.unidade || 'Desconhecida',
            data_upload: metadataCustom.data_upload || metadata.timeCreated,
            tamanho: parseInt(metadata.size) || 0
          });
          
        } catch (error) {
          console.warn(`⚠️ Erro ao ler metadados de ${file.name}:`, error);
        }
      }
      
      console.log(`📂 [CLOUD STORAGE] Encontrados ${arquivos.length} arquivos`);
      
      return {
        arquivos: arquivos.sort((a, b) => new Date(b.data_upload).getTime() - new Date(a.data_upload).getTime()),
        total: arquivos.length
      };
      
    } catch (error) {
      console.error(`❌ [STORAGE] Erro ao listar arquivos:`, error);
      return { arquivos: [], total: 0 };
    }
  }
  
  /**
   * Lista arquivos do armazenamento local
   */
  private async listarArquivosLocais(municipio?: string): Promise<{
    arquivos: Array<{
      path: string;
      nome: string;
      municipio: string;
      unidade: string;
      data_upload: string;
      tamanho: number;
    }>;
    total: number;
  }> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dirBase = path.join(__dirname, '../../../storage/uploads');
      
      if (!fs.existsSync(dirBase)) {
        console.log(`⚠️ [STORAGE] Diretório local não existe: ${dirBase}`);
        return { arquivos: [], total: 0 };
      }
      
      const arquivos: any[] = [];
      
      // Listar municípios
      const municipios = municipio ? [municipio] : fs.readdirSync(dirBase).filter((item: string) => {
        return fs.statSync(path.join(dirBase, item)).isDirectory();
      });
      
      for (const mun of municipios) {
        const dirMunicipio = path.join(dirBase, mun);
        
        if (!fs.existsSync(dirMunicipio)) continue;
        
        // Listar unidades
        const unidades = fs.readdirSync(dirMunicipio).filter((item: string) => {
          return fs.statSync(path.join(dirMunicipio, item)).isDirectory();
        });
        
        for (const unidade of unidades) {
          const dirUnidade = path.join(dirMunicipio, unidade);
          
          // Listar arquivos JSON
          const arquivosUnidade = fs.readdirSync(dirUnidade).filter((item: string) => {
            return item.endsWith('.json') && fs.statSync(path.join(dirUnidade, item)).isFile();
          });
          
          for (const arquivo of arquivosUnidade) {
            const caminhoArquivo = path.join(dirUnidade, arquivo);
            const stats = fs.statSync(caminhoArquivo);
            
            arquivos.push({
              path: `storage/uploads/${mun}/${unidade}/${arquivo}`,
              nome: arquivo,
              municipio: mun,
              unidade: unidade,
              data_upload: stats.mtime.toISOString(),
              tamanho: stats.size
            });
          }
        }
      }
      
      console.log(`📂 [STORAGE LOCAL] Encontrados ${arquivos.length} arquivos`);
      
      return {
        arquivos: arquivos.sort((a, b) => new Date(b.data_upload).getTime() - new Date(a.data_upload).getTime()),
        total: arquivos.length
      };
      
    } catch (error) {
      console.error(`❌ [STORAGE LOCAL] Erro ao listar arquivos locais:`, error);
      return { arquivos: [], total: 0 };
    }
  }
  
  /**
   * Remove arquivo após processamento
   */
  async removerArquivoProcessado(arquivoPath: string): Promise<boolean> {
    try {
      console.log(`🗑️ [CLOUD STORAGE] Removendo arquivo processado: ${arquivoPath}`);
      
      if (!bucket) {
        console.log(`⚠️ [CLOUD STORAGE] Bucket não configurado, arquivo não removido`);
        return false;
      }
      
      const file = bucket.file(arquivoPath);
      await file.delete();
      
      console.log(`✅ [CLOUD STORAGE] Arquivo removido: ${arquivoPath}`);
      return true;
      
    } catch (error) {
      console.error(`❌ [CLOUD STORAGE] Erro ao remover arquivo:`, error);
      return false;
    }
  }
  
  /**
   * Constrói caminho do arquivo no Cloud Storage
   */
  private construirCaminhoArquivo(request: SignedUrlRequest, uploadId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const nomeArquivoLimpo = request.nome_arquivo.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `uploads/${request.municipio}/${request.unidade}/${request.tipo_arquivo}/${timestamp}_${uploadId}_${nomeArquivoLimpo}`;
  }

  /**
   * Lista documentos anexados (attachments) no Cloud Storage ou local
   */
  async listarDocumentos(municipio?: string): Promise<{
    arquivos: Array<{
      path: string;
      nome: string;
      municipio: string;
      unidade: string;
      data_upload: string;
      tamanho: number;
    }>;
    total: number;
  }> {
    try {
      if (!bucket) {
        return await this.listarDocumentosLocais(municipio);
      }

      const prefix = municipio ? `uploads/${municipio}/` : 'uploads/';
      const [files] = await bucket.getFiles({ prefix });

      const arquivos: any[] = [];
      for (const file of files) {
        if (!file.name.includes('/attachments/')) continue;
        try {
          const [metadata] = await file.getMetadata();
          const metadataCustom = metadata.metadata || {};
          arquivos.push({
            path: file.name,
            nome: file.name.split('/').pop() || '',
            municipio: metadataCustom.municipio || 'Desconhecido',
            unidade: metadataCustom.unidade || 'Desconhecida',
            data_upload: metadataCustom.data_upload || metadata.timeCreated,
            tamanho: parseInt(metadata.size) || 0
          });
        } catch (_) {
          // ignore single file errors
        }
      }

      return {
        arquivos: arquivos.sort((a, b) => new Date(b.data_upload).getTime() - new Date(a.data_upload).getTime()),
        total: arquivos.length
      };
    } catch (error) {
      console.error('❌ [STORAGE] Erro ao listar documentos:', error);
      return { arquivos: [], total: 0 };
    }
  }

  /**
   * Lista documentos anexados no armazenamento local
   */
  private async listarDocumentosLocais(municipio?: string): Promise<{
    arquivos: Array<{
      path: string;
      nome: string;
      municipio: string;
      unidade: string;
      data_upload: string;
      tamanho: number;
    }>;
    total: number;
  }> {
    try {
      const fs = require('fs');
      const path = require('path');

      const dirBase = path.join(__dirname, '../../../storage/uploads');
      console.log(`📁 [LISTAR DOCS LOCAIS] Dir base: ${dirBase}`);
      console.log(`📁 [LISTAR DOCS LOCAIS] Município filtro: ${municipio || 'TODOS'}`);
      
      if (!fs.existsSync(dirBase)) {
        console.log(`⚠️ [LISTAR DOCS LOCAIS] Diretório base não existe: ${dirBase}`);
        return { arquivos: [], total: 0 };
      }

      const arquivos: any[] = [];
      const municipios = municipio ? [municipio] : fs.readdirSync(dirBase).filter((item: string) => fs.statSync(path.join(dirBase, item)).isDirectory());
      console.log(`📁 [LISTAR DOCS LOCAIS] Municípios a processar: ${municipios.join(', ')}`);

      for (const mun of municipios) {
        const dirMunicipio = path.join(dirBase, mun);
        if (!fs.existsSync(dirMunicipio)) continue;

        const unidades = fs.readdirSync(dirMunicipio).filter((item: string) => fs.statSync(path.join(dirMunicipio, item)).isDirectory());
        console.log(`📁 [LISTAR DOCS LOCAIS] Município ${mun} - Unidades: ${unidades.join(', ')}`);
        
        for (const unidade of unidades) {
          const dirAttachments = path.join(dirMunicipio, unidade, 'attachments');
          if (!fs.existsSync(dirAttachments)) {
            console.log(`⚠️ [LISTAR DOCS LOCAIS] ${mun}/${unidade} - Pasta attachments não existe`);
            continue;
          }

          const files = fs.readdirSync(dirAttachments).filter((item: string) => fs.statSync(path.join(dirAttachments, item)).isFile());
          console.log(`📎 [LISTAR DOCS LOCAIS] ${mun}/${unidade}/attachments - ${files.length} arquivo(s)`);
          
          for (const fileName of files) {
            const caminhoArquivo = path.join(dirAttachments, fileName);
            const stats = fs.statSync(caminhoArquivo);
            arquivos.push({
              path: `storage/uploads/${mun}/${unidade}/attachments/${fileName}`,
              nome: fileName,
              municipio: mun,
              unidade: unidade,
              data_upload: stats.mtime.toISOString(),
              tamanho: stats.size
            });
            console.log(`   ✅ ${fileName} (${(stats.size / 1024).toFixed(2)} KB)`);
          }
        }
      }

      console.log(`📊 [LISTAR DOCS LOCAIS] Total de documentos encontrados: ${arquivos.length}`);
      
      return {
        arquivos: arquivos.sort((a, b) => new Date(b.data_upload).getTime() - new Date(a.data_upload).getTime()),
        total: arquivos.length
      };
    } catch (error) {
      console.error('❌ [STORAGE LOCAL] Erro ao listar documentos locais:', error);
      return { arquivos: [], total: 0 };
    }
  }
  
  /**
   * Verifica se Cloud Storage está configurado
   */
  static isConfigured(): boolean {
    return bucket !== null;
  }
  
  /**
   * Gera URL assinada para múltiplos arquivos
   */
  async gerarMultiplasSignedUrls(requests: SignedUrlRequest[]): Promise<SignedUrlResponse[]> {
    console.log(`🔗 [SIGNED URL] Gerando ${requests.length} URLs assinadas`);
    
    const resultados = [];
    
    for (const request of requests) {
      try {
        const resultado = await this.gerarSignedUrlUpload(request);
        resultados.push(resultado);
      } catch (error) {
        console.error(`❌ [SIGNED URL] Erro em ${request.nome_arquivo}:`, error);
        throw error; // Falha rápida
      }
    }
    
    console.log(`✅ [SIGNED URL] ${resultados.length} URLs geradas com sucesso`);
    return resultados;
  }
}
