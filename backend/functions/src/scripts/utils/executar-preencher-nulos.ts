import { preencherSemana2025_22 } from './preencher-nulos';
import { verificarVariaveisAmbiente } from './utils';

console.log('🔧 Script de Preenchimento da Semana 2025_22');
console.log('============================================\n');

// Verificar variáveis de ambiente
verificarVariaveisAmbiente();

console.log('✅ Variáveis de ambiente verificadas');
console.log('🚀 Iniciando processo de preenchimento...\n');

// Executar preenchimento
preencherSemana2025_22()
    .then(() => {
        console.log('\n🎉 Processo concluído com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erro durante o processo:', error);
        process.exit(1);
    });
