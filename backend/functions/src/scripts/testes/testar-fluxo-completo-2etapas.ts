/**
 * Script de teste para validar o fluxo completo em 2 etapas:
 * ETAPA 1: Buscar JSONs do Cloud Storage e inserir estoque + movimentação
 * ETAPA 2: Calcular campos restantes
 * 
 * Executar com: npx ts-node "src/scripts/testes/testar-fluxo-completo-2etapas.ts"
 */

import { atualizarCamposCalculadosNoFirestore } from './[MAIN] executar-calculos';

async function testarFluxoCompleto() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║         TESTE DO FLUXO COMPLETO EM 2 ETAPAS                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  try {
    // Teste 1: Com unidades especificadas
    console.log('📋 TESTE 1: Executando com unidades especificadas');
    console.log('─'.repeat(70));
    
    const municipio = 'Palmares';
    const unidades = ['CAF', 'Olavo', 'ESF3'];
    
    console.log(`📍 Município: ${municipio}`);
    console.log(`🏥 Unidades: ${unidades.join(', ')}\n`);

    const resultado = await atualizarCamposCalculadosNoFirestore(municipio, unidades);

    console.log('\n╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  RESULTADO DO TESTE                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    if (resultado.preparacao) {
      console.log('✅ ETAPA 1 - Preparação:');
      console.log(`   Unidades processadas: ${resultado.preparacao.unidades_processadas}`);
      console.log(`   Medicamentos atualizados: ${resultado.preparacao.medicamentos_atualizados}`);
      console.log(`   Medicamentos zerados: ${resultado.preparacao.medicamentos_zerados}`);
      console.log('');
    }

    if (resultado.calculos) {
      console.log('✅ ETAPA 2 - Cálculos:');
      console.log(`   Medicamentos processados: ${resultado.calculos.totalProcessados}`);
      console.log(`   Cálculos bem-sucedidos: ${resultado.calculos.totalSucessos}`);
      console.log(`   Erros: ${resultado.calculos.totalErros}`);
      console.log('');
    }

    // Calcular taxa de sucesso geral
    const taxaSucessoGeral = resultado.totalProcessados > 0 
      ? ((resultado.totalSucessos / resultado.totalProcessados) * 100).toFixed(2)
      : '0.00';

    console.log('📊 RESUMO GERAL:');
    console.log(`   Taxa de sucesso: ${taxaSucessoGeral}%`);
    console.log('');

    // Verificar se houve erros
    if (resultado.totalErros > 0) {
      console.log('⚠️  ATENÇÃO: Houve erros durante o processamento!');
      console.log('   Verifique os logs acima para mais detalhes.');
    }

    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║  TESTE CONCLUÍDO COM SUCESSO!                                      ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');

    // Teste 2: Sem unidades especificadas (busca automática)
    console.log('\n📋 TESTE 2: Executando com busca automática de unidades');
    console.log('─'.repeat(70));
    console.log('ℹ️  Este teste busca automaticamente as unidades disponíveis no Cloud Storage\n');

    const resultado2 = await atualizarCamposCalculadosNoFirestore(municipio);

    console.log('✅ Teste 2 concluído!');
    console.log(`📊 Unidades encontradas e processadas: ${resultado2.preparacao?.unidades_processadas || 0}\n`);

    return {
      sucesso: true,
      teste1: resultado,
      teste2: resultado2
    };

  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    console.error('\nDetalhes do erro:');
    if (error instanceof Error) {
      console.error(`   Mensagem: ${error.message}`);
      console.error(`   Stack: ${error.stack}`);
    }

    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Executar teste
if (require.main === module) {
  console.log('🚀 Iniciando testes do fluxo completo...\n');
  
  testarFluxoCompleto()
    .then((resultado) => {
      if (resultado.sucesso) {
        console.log('✅ Todos os testes foram executados com sucesso!');
        process.exit(0);
      } else {
        console.log('❌ Testes falharam!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('❌ Erro fatal ao executar testes:', error);
      process.exit(1);
    });
}

export { testarFluxoCompleto };

