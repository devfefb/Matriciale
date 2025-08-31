// Insere a semana 22 apenas para fins de teste

import { inserirMovimentacoesSemanais } from './inserir-semana';
import { verificarVariaveisAmbiente } from '../utils/utils';

console.log('📊 Script de Inserção de Movimentações Semanais');
console.log('==============================================\n');

// Verificar variáveis de ambiente
verificarVariaveisAmbiente();

console.log('✅ Variáveis de ambiente verificadas');
console.log('🚀 Iniciando processo de inserção de movimentações...\n');

// Executar inserção
inserirMovimentacoesSemanais()
    .then(() => {
        console.log('\n🎉 Processo concluído com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erro durante o processo:', error);
        process.exit(1);
    });
