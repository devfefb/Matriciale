import { reprocessarNaoEncontrados } from './reprocessar-nao-encontrados';

/**
 * Script de atalho para reprocessar itens não encontrados
 * 
 * Uso:
 *   npm run reprocessar-nao-encontrados                     - Usa arquivo mais recente
 *   npm run reprocessar-nao-encontrados [caminho/arquivo]   - Usa arquivo específico
 */

const caminhoArquivo = process.argv[2];

console.log('\n🔄 Iniciando reprocessamento...\n');

if (caminhoArquivo) {
  console.log(`📁 Arquivo especificado: ${caminhoArquivo}\n`);
}

reprocessarNaoEncontrados(caminhoArquivo)
  .then(() => {
    console.log('\n✅ Reprocessamento concluído!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante reprocessamento:', error);
    process.exit(1);
  });

