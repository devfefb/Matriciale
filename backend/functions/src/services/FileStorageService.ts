import * as fs from 'fs';
import * as path from 'path';
import { getStorage } from 'firebase-admin/storage';
import { bucket } from '../config/firebase';

export interface StorageResult {
  success: boolean;
  path?: string;
  url?: string;
  error?: string;
}

export class FileStorageService {
  /**
   * Salva um arquivo JSON condicional baseado no NODE_ENV
   * - Em desenvolvimento: salva no sistema de arquivos local
   * - Em produção: faz upload para Firebase Storage
   */
  static async salvarArquivoJSON(
    buffer: Buffer,
    nomeArquivo: string,
    metadados?: { [key: string]: any }
  ): Promise<StorageResult> {
    const isProduction = process.env.NODE_ENV === 'production';
    
    try {
      if (isProduction) {
        return await this.salvarNoFirebaseStorage(buffer, nomeArquivo, metadados);
      } else {
        return await this.salvarLocalmente(buffer, nomeArquivo);
      }
    } catch (error) {
      console.error('❌ [FILE_STORAGE] Erro ao salvar arquivo:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Salva arquivo no Firebase Storage (produção)
   */
  private static async salvarNoFirebaseStorage(
    buffer: Buffer,
    nomeArquivo: string,
    metadados?: { [key: string]: any }
  ): Promise<StorageResult> {
    console.log(`☁️ [STORAGE] Salvando no Firebase Storage: ${nomeArquivo}`);
    
    try {
      // Verificar se o bucket está disponível
      if (!bucket) {
        throw new Error('Firebase Storage bucket não está configurado. Verifique a variável STORAGE_BUCKET_URL.');
      }

      const arquivo = bucket.file(`uploads/semanal/${nomeArquivo}`);
      
      // Metadados do arquivo
      const metadata = {
        metadata: {
          uploadedAt: new Date().toISOString(),
          environment: 'production',
          ...metadados
        },
        contentType: 'application/json'
      };

      // Upload do buffer
      await arquivo.save(buffer, {
        metadata,
        resumable: false // Para arquivos pequenos, mais eficiente
      });

      console.log(`✅ [STORAGE] Arquivo salvo no Storage: ${arquivo.name}`);

      // Gerar URL assinada (válida por 7 dias)
      const [signedUrl] = await arquivo.getSignedUrl({
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 dias
      });

      return {
        success: true,
        path: arquivo.name,
        url: signedUrl
      };

    } catch (error) {
      console.error('❌ [STORAGE] Erro no Firebase Storage:', error);
      throw error;
    }
  }

  /**
   * Salva arquivo localmente (desenvolvimento)
   */
  private static async salvarLocalmente(
    buffer: Buffer,
    nomeArquivo: string
  ): Promise<StorageResult> {
    console.log(`💾 [LOCAL] Salvando localmente: ${nomeArquivo}`);
    
    try {
      // Criar diretório de uploads se não existir
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log(`📁 [LOCAL] Diretório criado: ${uploadsDir}`);
      }

      // Caminho completo do arquivo
      const caminhoArquivo = path.join(uploadsDir, nomeArquivo);
      
      // Salvar arquivo
      fs.writeFileSync(caminhoArquivo, buffer);
      
      console.log(`✅ [LOCAL] Arquivo salvo: ${caminhoArquivo}`);

      return {
        success: true,
        path: `uploads/${nomeArquivo}`,
        url: `file://${caminhoArquivo}`
      };

    } catch (error) {
      console.error('❌ [LOCAL] Erro ao salvar localmente:', error);
      throw error;
    }
  }

  /**
   * Gera nome de arquivo único para uploads semanais
   */
  static gerarNomeArquivo(
    municipio: string,
    unidade: string,
    tipo: 'semanal' | 'onboarding' = 'semanal'
  ): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const sufixo = tipo === 'semanal' ? 'inventoryData' : 'onboarding';
    
    return `${sufixo}_${municipio}_${unidade}_${timestamp}.json`;
  }

  /**
   * Cria buffer a partir de objeto JSON
   */
  static criarBufferJSON(objeto: any): Buffer {
    const jsonString = JSON.stringify(objeto, null, 2);
    return Buffer.from(jsonString, 'utf8');
  }

  /**
   * Valida se um buffer contém JSON válido
   */
  static validarJSON(buffer: Buffer): { valido: boolean; erro?: string } {
    try {
      const jsonString = buffer.toString('utf8');
      JSON.parse(jsonString);
      return { valido: true };
    } catch (error) {
      return { 
        valido: false, 
        erro: error instanceof Error ? error.message : 'JSON inválido' 
      };
    }
  }
}
