#!/usr/bin/env node

/**
 * Script executável simples para baixar arquivos do Firebase Storage
 * Uso: npm run download ou npm run download Palmares ou npm run download Palmares CAF
 */

import { StorageDownloader } from './baixar-arquivos-storage';

async function executar() {
  console.log('🔄 Iniciando download do Firebase Storage...\n');
  
  const downloader = new StorageDownloader();
  
  // Baixar todos os arquivos do storage
  await downloader.baixarTodosArquivos();
  
  console.log('\n✅ Download concluído com sucesso!');
}

// Executar
executar().catch(error => {
  console.error('❌ Erro:', error);
  process.exit(1);
});

