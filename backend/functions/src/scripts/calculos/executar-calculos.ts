import { calcularCamposTodosMedicamentos } from "./calcular-campos";

/**
 * Script principal para executar o cálculo de campos com integração de estoque
 */
async function executarCalculos(): Promise<void> {
  try {
    console.log('🚀 Iniciando execução do script de cálculos com estoque...');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    console.log('=' .repeat(80));
    
    // Executa o cálculo de campos para todos os medicamentos
    await calcularCamposTodosMedicamentos();
    
    console.log('=' .repeat(80));
    console.log('✅ Script de cálculos executado com sucesso!');
    console.log('📅 Data/Hora final:', new Date().toLocaleString('pt-BR'));
    
  } catch (error) {
    console.error('❌ Erro durante a execução do script:', error);
    throw error;
  }
}

// Executa o script se for chamado diretamente
if (require.main === module) {
  executarCalculos()
    .then(() => {
      console.log('\n🎉 Processamento concluído com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal no processamento:', error);
      process.exit(1);
    });
}

export { executarCalculos };
