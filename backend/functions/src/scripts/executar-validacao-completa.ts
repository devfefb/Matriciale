import { validarCalculosComGabarito } from './calculos/validar-calculos';
import { gerarComparacaoDetalhada } from './auxiliar/comparar/gerar-comparacao-detalhada';

async function executarValidacaoCompleta(): Promise<void> {
  try {
    console.log('🚀 Iniciando validação completa dos cálculos...');
    console.log('=' .repeat(80));
    
    // Passo 1: Executa validação principal
    console.log('\n📊 PASSO 1: Executando validação principal...');
    await validarCalculosComGabarito();
    
    // Passo 2: Gera comparação detalhada
    console.log('\n📊 PASSO 2: Gerando comparação detalhada...');
    await gerarComparacaoDetalhada();
    
    console.log('\n🎉 VALIDAÇÃO COMPLETA CONCLUÍDA!');
    console.log('=' .repeat(80));
    console.log('\n📋 RELATÓRIOS GERADOS:');
    console.log('   📊 relatorio-validacao.json - Relatório completo com análise de padrões');
    console.log('   📊 relatorio-resumido.json - Relatório resumido para análise rápida');
    console.log('   📊 comparacao-detalhada.json - Comparação lado a lado em JSON');
    console.log('   📊 comparacao-detalhada.csv - Comparação lado a lado em CSV (para Excel)');
    console.log('\n💡 PRÓXIMOS PASSOS:');
    console.log('   1. Analise os campos mais problemáticos no relatório resumido');
    console.log('   2. Use o arquivo CSV para análise detalhada em Excel');
    console.log('   3. Identifique padrões de erro nos campos sistemáticos');
    console.log('   4. Ajuste os cálculos baseado nos padrões identificados');
    
  } catch (error) {
    console.error('\n❌ Erro durante a validação completa:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarValidacaoCompleta()
    .then(() => {
      console.log('\n✅ Validação completa executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na validação completa:', error);
      process.exit(1);
    });
}

export { executarValidacaoCompleta };
