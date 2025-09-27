#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { bucket } from '../../config/firebase';

/**
 * Script para baixar arquivos do Firebase Storage
 * Conecta ao storage e baixa todos os arquivos para a pasta local
 */

interface ArquivoStorage {
  nome: string;
  caminho: string;
  tamanho: number;
  dataModificacao: Date;
}

class StorageDownloader {
  private pastaDestino: string;

  constructor() {
    // Pasta de destino: mesma pasta do script
    this.pastaDestino = path.join(__dirname, 'downloads');
    this.criarPastaDestino();
  }

  /**
   * Cria a pasta de destino se não existir
   */
  private criarPastaDestino(): void {
    if (!fs.existsSync(this.pastaDestino)) {
      fs.mkdirSync(this.pastaDestino, { recursive: true });
      console.log(`📁 Pasta criada: ${this.pastaDestino}`);
    }
  }

  /**
   * Lista todos os arquivos no Firebase Storage
   */
  async listarArquivos(prefixo: string = 'uploads/'): Promise<ArquivoStorage[]> {
    try {
      console.log(`📋 Listando arquivos com prefixo: ${prefixo}`);
      
      if (!bucket) {
        throw new Error('Firebase Storage não está configurado');
      }

      const [files] = await bucket.getFiles({
        prefix: prefixo,
      });

      const arquivos: ArquivoStorage[] = [];

      for (const file of files) {
        const [metadata] = await file.getMetadata();
        
        // Filtrar apenas arquivos (não pastas)
        if (metadata.size && parseInt(metadata.size) > 0) {
          arquivos.push({
            nome: file.name,
            caminho: file.name,
            tamanho: parseInt(metadata.size),
            dataModificacao: new Date(metadata.timeCreated)
          });
        }
      }

      console.log(`📊 Encontrados ${arquivos.length} arquivo(s)`);
      return arquivos;

    } catch (error) {
      console.error(`❌ Erro ao listar arquivos:`, error);
      throw error;
    }
  }

  /**
   * Baixa um arquivo específico do storage
   */
  async baixarArquivo(caminhoRemoto: string): Promise<string> {
    try {
      if (!bucket) {
        throw new Error('Firebase Storage não está configurado');
      }

      const file = bucket.file(caminhoRemoto);
      
      // Criar estrutura de pastas local mantendo a hierarquia
      const caminhoLocal = path.join(this.pastaDestino, caminhoRemoto);
      const diretorioLocal = path.dirname(caminhoLocal);
      
      if (!fs.existsSync(diretorioLocal)) {
        fs.mkdirSync(diretorioLocal, { recursive: true });
      }

      // Baixar arquivo
      console.log(`⬇️ Baixando: ${caminhoRemoto}`);
      await file.download({ destination: caminhoLocal });
      
      console.log(`✅ Baixado: ${caminhoLocal}`);
      return caminhoLocal;

    } catch (error) {
      console.error(`❌ Erro ao baixar ${caminhoRemoto}:`, error);
      throw error;
    }
  }

  /**
   * Baixa todos os arquivos do storage
   */
  async baixarTodosArquivos(prefixo: string = 'uploads/'): Promise<void> {
    try {
      console.log(`🚀 Iniciando download de arquivos do Firebase Storage...`);
      
      const arquivos = await this.listarArquivos(prefixo);
      
      if (arquivos.length === 0) {
        console.log(`⚠️ Nenhum arquivo encontrado com prefixo: ${prefixo}`);
        return;
      }

      console.log(`📦 Baixando ${arquivos.length} arquivo(s)...`);
      
      for (let i = 0; i < arquivos.length; i++) {
        const arquivo = arquivos[i];
        console.log(`\n[${i + 1}/${arquivos.length}] ${arquivo.nome} (${this.formatarTamanho(arquivo.tamanho)})`);
        
        try {
          await this.baixarArquivo(arquivo.caminho);
        } catch (error) {
          console.error(`❌ Falha ao baixar ${arquivo.nome}: ${error}`);
        }
      }

      console.log(`\n🎉 Download concluído! Arquivos salvos em: ${this.pastaDestino}`);
      
    } catch (error) {
      console.error(`❌ Erro geral no download:`, error);
      throw error;
    }
  }

  /**
   * Formata tamanho em bytes para formato legível
   */
  private formatarTamanho(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Baixa arquivos de um município específico
   */
  async baixarArquivosMunicipio(municipio: string): Promise<void> {
    const prefixo = `uploads/${municipio}/`;
    console.log(`🏢 Baixando arquivos do município: ${municipio}`);
    await this.baixarTodosArquivos(prefixo);
  }

  /**
   * Baixa arquivos de uma unidade específica
   */
  async baixarArquivosUnidade(municipio: string, unidade: string): Promise<void> {
    const prefixo = `uploads/${municipio}/${unidade}/`;
    console.log(`🏥 Baixando arquivos da unidade: ${municipio}/${unidade}`);
    await this.baixarTodosArquivos(prefixo);
  }
}

/**
 * Execução principal do script
 */
async function main() {
  try {
    console.log('🔗 Conectando ao Firebase Storage...\n');
    
    const downloader = new StorageDownloader();
    
    // Verificar argumentos da linha de comando
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // Baixar todos os arquivos
      await downloader.baixarTodosArquivos();
    } else if (args.length === 1) {
      // Baixar arquivos de um município específico
      await downloader.baixarArquivosMunicipio(args[0]);
    } else if (args.length === 2) {
      // Baixar arquivos de uma unidade específica
      await downloader.baixarArquivosUnidade(args[0], args[1]);
    } else {
      console.log(`
📋 Uso do script:

  npm run ts-node src/scripts/utils/baixar-arquivos-storage.ts              # Baixar todos os arquivos
  npm run ts-node src/scripts/utils/baixar-arquivos-storage.ts Palmares     # Baixar arquivos de Palmares
  npm run ts-node src/scripts/utils/baixar-arquivos-storage.ts Palmares CAF # Baixar arquivos de Palmares/CAF

🗂️ Os arquivos serão salvos em: ${path.join(__dirname, 'downloads')}
      `);
      return;
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    process.exit(1);
  }
}

// Executar script apenas se chamado diretamente
if (require.main === module) {
  main();
}

export { StorageDownloader };

