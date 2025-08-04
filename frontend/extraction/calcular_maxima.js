import fs from 'fs'
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Função para calcular a máxima dos valores de semanas
function calcularMaximaSemanas(semanas) {
    if (!semanas || !Array.isArray(semanas) || semanas.length === 0) {
        return 0;
    }
    
    // Extrair todos os valores das semanas
    const valores = semanas.map(semana => {
        // Cada semana é um objeto com uma chave (ex: "2024_03") e um valor
        const valor = Object.values(semana)[0];
        return typeof valor === 'number' ? valor : 0;
    });
    
    // Retornar a máxima dos valores
    return Math.max(...valores);
}

// Função principal para processar o arquivo modelo_caf.json
function calcularMaximaModeloCaf() {
    try {
        // Caminho para o arquivo modelo_caf.json
        const caminhoArquivo = path.join(__dirname, 'data', 'modelo', 'modelo_caf.json');
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(caminhoArquivo)) {
            console.error('Arquivo modelo_caf.json não encontrado em:', caminhoArquivo);
            return;
        }
        
        // Ler o arquivo JSON
        console.log('Lendo arquivo modelo_caf.json...');
        const dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8'));
        
        let totalMedicamentos = 0;
        let medicamentosAtualizados = 0;
        
        // Percorrer todas as cidades
        dados.cidades.forEach(cidade => {
            cidade.estoques.forEach(estoque => {
                estoque.medicamentos.forEach(medicamento => {
                    totalMedicamentos++;
                    
                    // Calcular a máxima das semanas
                    const maximaCalculada = calcularMaximaSemanas(medicamento.semanas);
                    
                    // Verificar se a máxima mudou
                    if (medicamento.maximo !== maximaCalculada) {
                        console.log(`Medicamento: ${medicamento.nome} (${medicamento.cod_item})`);
                        console.log(`  Máxima anterior: ${medicamento.maximo}`);
                        console.log(`  Máxima calculada: ${maximaCalculada}`);
                        console.log(`  Valores das semanas: [${medicamento.semanas.map(s => Object.values(s)[0]).join(', ')}]`);
                        console.log('');
                        
                        // Atualizar o campo maximo
                        medicamento.maximo = maximaCalculada;
                        medicamentosAtualizados++;
                    }
                });
            });
        });
        
        // Salvar o arquivo atualizado
        console.log(`Salvando arquivo atualizado...`);
        fs.writeFileSync(caminhoArquivo, JSON.stringify(dados, null, 4), 'utf8');
        
        console.log(`\nProcessamento concluído!`);
        console.log(`Total de medicamentos processados: ${totalMedicamentos}`);
        console.log(`Medicamentos atualizados: ${medicamentosAtualizados}`);
        console.log(`Arquivo salvo em: ${caminhoArquivo}`);
        
    } catch (error) {
        console.error('Erro ao processar o arquivo:', error.message);
    }
}

// Executar a função principal
if (import.meta.url === `file://${process.argv[1]}`) {
    calcularMaximaModeloCaf();
}

export { calcularMaximaModeloCaf, calcularMaximaSemanas };
