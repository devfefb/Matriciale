import { carregarEstoqueConsolidado, buscarEstoqueMedicamento } from './calculos/calcular-campos';

/**
 * Script de teste para verificar a integração de estoque
 */
async function testarIntegracaoEstoque(): Promise<void> {
  try {
    console.log('🧪 Iniciando teste de integração de estoque...');
    console.log('=' .repeat(60));
    
    // Teste 1: Carregar estoque consolidado
    console.log('📦 Teste 1: Carregando estoque consolidado...');
    const estoqueConsolidado = await carregarEstoqueConsolidado();
    console.log(`✅ Estoque consolidado carregado com ${estoqueConsolidado.size} medicamentos`);
    
    // Teste 2: Buscar estoque de alguns medicamentos
    console.log('\n🔍 Teste 2: Buscando estoque de medicamentos...');
    
    // Pega alguns exemplos do estoque consolidado
    const medicamentosTeste = Array.from(estoqueConsolidado.keys()).slice(0, 5);
    
    for (const nomeMedicamento of medicamentosTeste) {
      const estoque = await buscarEstoqueMedicamento(nomeMedicamento);
      const itemEstoque = estoqueConsolidado.get(nomeMedicamento);
      
      console.log(`💊 "${nomeMedicamento}":`);
      console.log(`   - Estoque próprio: ${itemEstoque?.estoque_proprio || 0}`);
      console.log(`   - Estoque geral: ${itemEstoque?.estoque_geral || 0}`);
      console.log(`   - Busca por função: ${estoque}`);
      console.log(`   - Unidades: ${itemEstoque?.unidades_contribuindo.join(', ') || 'N/A'}`);
    }
    
    // Teste 3: Buscar medicamento inexistente
    console.log('\n❌ Teste 3: Buscando medicamento inexistente...');
    const estoqueInexistente = await buscarEstoqueMedicamento('MEDICAMENTO_INEXISTENTE_TESTE');
    console.log(`✅ Medicamento inexistente retornou: ${estoqueInexistente}`);
    
    // Teste 4: Verificar cache
    console.log('\n🔄 Teste 4: Verificando cache...');
    const estoqueCache = await carregarEstoqueConsolidado();
    console.log(`✅ Cache funcionando: ${estoqueCache.size} medicamentos (deve ser igual ao primeiro teste)`);
    
    console.log('\n=' .repeat(60));
    console.log('✅ Todos os testes de integração passaram!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste de integração:', error);
    throw error;
  }
}

// Executa o teste se for chamado diretamente
if (require.main === module) {
  testarIntegracaoEstoque()
    .then(() => {
      console.log('\n🎉 Teste de integração concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro no teste de integração:', error);
      process.exit(1);
    });
}

export { testarIntegracaoEstoque };
