/// <reference types="node" />
import { processarEstoqueCAF } from './processamento-estoque/processar-estoque';

/**
 * Script principal para executar o processamento de estoque da CAF
 */
async function main() {
  try {
    console.log('🏥 SISTEMA DE PROCESSAMENTO DE ESTOQUE - CAF');
    console.log('=' .repeat(50));
    console.log('📋 Regras de processamento:');
    console.log('   • estoque_proprio: valor individual da CAF');
    console.log('   • estoque_geral: soma consolidada de todas as unidades');
    console.log('   • Processamento por último (após todas as outras unidades)');
    console.log('=' .repeat(50));
    
    // Executa o processamento de estoque da CAF
    await processarEstoqueCAF();
    
    console.log('\n🎉 Processamento concluído com sucesso!');
    console.log('📊 Os campos estoque_proprio e estoque_geral foram atualizados na CAF');
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error);
    process.exit(1);
  }
}

// Executa o script
main();
