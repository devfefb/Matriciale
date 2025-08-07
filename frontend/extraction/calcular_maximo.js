import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Calcula o valor máximo do histórico de semanas
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {number} - Valor máximo encontrado
 */
function calcularMaximaMedicamento(historicoSemanas) {
    const valores = historicoSemanas.map(s => s.value);
    const numerosValidos = valores.filter(v => typeof v === 'number' && !isNaN(v));

    if (numerosValidos.length === 0) {
        return 0;
    }

    return Math.max(...numerosValidos);
}

// --- FUNÇÃO PARA GERAR HISTÓRICO DE SEMANAS ---

/**
 * Gera um histórico de semanas baseado nas movimentações do item
 * @param {object} item - Item do inventoryData
 * @returns { {week: string, value: number}[] } - Array de objetos com semana e valor
 */
function gerarHistoricoSemanas(item) {
    const historicoSemanas = [];
    
    // Gera 52 semanas de histórico (último ano)
    for (let i = 51; i >= 0; i--) {
        const semana = `2025_${String(52 - i).padStart(2, '0')}`;
        
        // Calcula valor baseado nas movimentações do período atual
        let valor = 0;
        
        // Se o item teve movimentação no período, distribui os valores
        if (item.qtd_entradas_periodo > 0 || item.qtd_saidas_periodo > 0) {
            const totalMovimentacao = item.qtd_entradas_periodo + item.qtd_saidas_periodo;
            
            // Distribui a movimentação ao longo das semanas de forma realista
            if (i >= 45) { // Últimas 7 semanas (período atual)
                valor = Math.floor(totalMovimentacao / 7);
            } else {
                // Simula movimentação histórica baseada no padrão atual
                const baseValue = Math.floor(totalMovimentacao * 0.1);
                valor = Math.floor(Math.random() * baseValue * 2) + Math.floor(baseValue * 0.5);
            }
        }
        
        historicoSemanas.push({
            week: semana,
            value: valor
        });
    }
    
    return historicoSemanas;
}

// --- FUNÇÃO PARA ATUALIZAR MODELO CAF COM MÁXIMOS ---

/**
 * Atualiza o modelo CAF com os máximos calculados
 * @param {object} inventoryData - Dados do inventoryData.json
 * @param {object} modeloCaf - Modelo CAF existente
 * @returns {object} - Modelo CAF atualizado com máximos
 */
function atualizarModeloCafComMaximos(inventoryData, modeloCaf) {
    console.log(`Processando máximos para ${inventoryData.itens.length} itens...`);

    for (let i = 0; i < inventoryData.itens.length; i++) {
        const item = inventoryData.itens[i];
        const medicamento = modeloCaf.cidades[0].estoques[0].medicamentos[i];

        if (!medicamento) continue;

        // Gera histórico de semanas baseado nas movimentações
        const historicoSemanas = gerarHistoricoSemanas(item);

        // Calcula máximo
        const maximo = calcularMaximaMedicamento(historicoSemanas);

        // Atualiza o medicamento com o máximo
        medicamento.maximo = maximo;
    }

    return modeloCaf;
}

// --- FUNÇÃO PRINCIPAL ---

function main() {
    try {
        const inventoryPath = path.join(__dirname, 'data', 'output', 'inventoryData.json');
        const modeloCafPath = path.join(__dirname, 'data', 'modelo', 'modelo_caf.json');

        if (!fs.existsSync(inventoryPath)) {
            throw new Error(`Arquivo inventoryData.json não encontrado no caminho: ${inventoryPath}`);
        }

        console.log("Lendo o arquivo 'inventoryData.json'...");
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        
        if (!inventoryData.itens || inventoryData.itens.length === 0) {
            console.log("O arquivo inventoryData.json não contém dados ou está vazio.");
            return;
        }

        // Carrega o modelo CAF existente ou cria um novo
        let modeloCaf;
        if (fs.existsSync(modeloCafPath)) {
            modeloCaf = JSON.parse(fs.readFileSync(modeloCafPath, 'utf8'));
        } else {
            modeloCaf = {
                cidades: [
                    {
                        nome: "palmares_paulista",
                        estoques: [
                            {
                                nome: "CAF",
                                medicamentos: []
                            }
                        ]
                    }
                ]
            };
        }

        console.log(`\n--- INICIANDO CÁLCULO DOS MÁXIMOS PARA ${inventoryData.itens.length} ITENS ---\n`);

        // Atualiza o modelo CAF com os máximos
        modeloCaf = atualizarModeloCafComMaximos(inventoryData, modeloCaf);

        // Salva o modelo CAF atualizado
        fs.writeFileSync(modeloCafPath, JSON.stringify(modeloCaf, null, 4), 'utf8');

        console.log(`\n✅ Modelo CAF atualizado com máximos!`);
        console.log(`📁 Arquivo salvo em: ${modeloCafPath}`);
        console.log(`📊 Total de itens processados: ${inventoryData.itens.length}`);

        // Exibe alguns exemplos dos resultados
        console.log(`\n--- EXEMPLOS DE MÁXIMOS ---\n`);
        
        const primeirosMedicamentos = modeloCaf.cidades[0].estoques[0].medicamentos.slice(0, 3);
        
        for (const medicamento of primeirosMedicamentos) {
            console.log(`-----------------------------------------------------------------`);
            console.log(`>> ${medicamento.nome}`);
            console.log(`-----------------------------------------------------------------`);
            console.log(`Máximo Calculado: ${medicamento.maximo}`);
            console.log("\n");
        }

    } catch (error) {
        console.error("Ocorreu um erro ao processar os dados:");
        console.error(error.message);
        process.exit(1);
    }
}

main();