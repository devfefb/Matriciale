import { limparMedicamentosDuplicados } from './limpar-duplicados';

/**
 * Script de atalho para executar a limpeza de medicamentos duplicados
 * 
 * Uso:
 *   npm run limpar-duplicados teste    - Modo teste (gera relatório)
 *   npm run limpar-duplicados execucao - Modo execução (remove duplicados)
 */

const modo = (process.argv[2] as 'teste' | 'execucao') || 'teste';

if (modo !== 'teste' && modo !== 'execucao') {
  console.error('❌ Uso: npm run limpar-duplicados [teste|execucao]');
  console.error('\n   Modos disponíveis:');
  console.error('   • teste    - Analisa duplicados e gera relatório (não altera o banco)');
  console.error('   • execucao - Analisa e remove medicamentos duplicados do banco');
  console.error('\n   Exemplo: npm run limpar-duplicados teste');
  process.exit(1);
}

console.log(`\n🔧 Modo selecionado: ${modo.toUpperCase()}\n`);

limparMedicamentosDuplicados(modo)
  .then(() => {
    console.log('\n✅ Operação concluída com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Erro durante a operação:', error);
    process.exit(1);
  });

