import { main } from './atualizar-movimentacoes';

/**
 * Script de atalho para executar a atualização de movimentações
 * 
 * Uso:
 *   npm run atualizar-movimentacoes teste    - Modo teste (gera JSON)
 *   npm run atualizar-movimentacoes execucao - Modo execução (atualiza banco)
 */

const modo = process.argv[2] as 'teste' | 'execucao' || 'teste';

if (modo !== 'teste' && modo !== 'execucao') {
  console.error('❌ Uso: npm run atualizar-movimentacoes [teste|execucao]');
  console.error('\n   Modos disponíveis:');
  console.error('   • teste    - Lê a planilha e salva em JSON (não altera o banco)');
  console.error('   • execucao - Lê a planilha e atualiza o banco de dados');
  console.error('\n   Exemplo: npm run atualizar-movimentacoes teste');
  process.exit(1);
}

console.log(`\n🔧 Modo selecionado: ${modo.toUpperCase()}\n`);

main(modo)
  .then(() => {
    console.log('\n✅ Operação concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a operação:', error);
    process.exit(1);
  });

