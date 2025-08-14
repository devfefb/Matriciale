import { validarCalculosComGabarito } from './validar-calculos';

/**
 * Script principal para executar a validação dos cálculos com gabarito
 */
async function executarValidacao(): Promise<void> {
  try {
    console.log('🚀 Iniciando validação dos cálculos com gabarito...');
    console.log('📅 Data/Hora:', new Date().toLocaleString('pt-BR'));
    console.log('=' .repeat(80));
    
    // Executa a validação
    await validarCalculosComGabarito();
    
    console.log('=' .repeat(80));
    console.log('✅ Validação executada com sucesso!');
    console.log('📅 Data/Hora final:', new Date().toLocaleString('pt-BR'));
    
  } catch (error) {
    console.error('❌ Erro durante a validação:', error);
    throw error;
  }
}

// Executa o script se for chamado diretamente
if (require.main === module) {
  executarValidacao()
    .then(() => {
      console.log('\n🎉 Validação concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Erro fatal na validação:', error);
      process.exit(1);
    });
}

export { executarValidacao };
