import { inserirDadosNoFirebase } from './inserir-banco';
import { verificarVariaveisAmbiente } from './utils';

console.log('🏥 Script de Inserção de Dados de Medicamentos no Firebase');
console.log('========================================================\n');

// Verificar variáveis de ambiente
verificarVariaveisAmbiente();

console.log('✅ Variáveis de ambiente verificadas');
console.log('🚀 Iniciando processo de inserção...\n');

// Executar inserção
inserirDadosNoFirebase()
    .then(() => {
        console.log('\n🎉 Processo concluído com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erro durante o processo:', error);
        process.exit(1);
    });

