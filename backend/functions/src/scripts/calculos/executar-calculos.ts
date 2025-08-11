import { verificarVariaveisAmbiente } from "../utils";
import { calcularCamposTodosMedicamentos } from "./calcular-campos";

console.log('🧮 Script de Cálculo de Campos para Medicamentos');
console.log('===============================================\n');

// Verificar variáveis de ambiente
verificarVariaveisAmbiente();

console.log('✅ Variáveis de ambiente verificadas');
console.log('�� Iniciando processo de cálculos...\n');

// Executar cálculos
calcularCamposTodosMedicamentos()
    .then(() => {
        console.log('\n�� Processo concluído com sucesso!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Erro durante o processo:', error);
        process.exit(1);
    });