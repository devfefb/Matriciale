import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- FUNÇÃO DE CÁLCULO DE CONTAGEM ---

/**
 * Calcula as contagens de semanas com movimentação (valor > 0).
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {object} - Um objeto contendo todas as contagens calculadas.
 */
function calcularContagensParaHistorico(historicoSemanas) {
    const contarUltimas = (n) => {
        const ultimasNSemanas = historicoSemanas.slice(-n);
        return ultimasNSemanas.filter(s => s.value > 0).length;
    };

    const cont04 = contarUltimas(4);
    const cont08 = contarUltimas(8);
    const cont12 = contarUltimas(12);
    const cont16 = contarUltimas(16);
    const cont26 = contarUltimas(26);
    const cont52 = contarUltimas(52);

    const contTotal = historicoSemanas.filter(s => s.value > 0).length;

    let contAno = 0;
    if (historicoSemanas.length > 0) {
        const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
        contAno = historicoSemanas
            .filter(s => s.week.startsWith(anoMaisRecente) && s.value > 0)
            .length;
    }

    return {
        "Cont04": cont04,
        "Cont08": cont08,
        "Cont12": cont12,
        "Cont16": cont16,
        "Cont26": cont26,
        "Cont52": cont52,
        "ContAno": contAno,
        "ContTt": contTotal
    };
}

// --- FUNÇÃO DE CLASSIFICAÇÃO TP_METODO ---

/**
 * Calcula o TP_metodo baseado nas contagens de ocorrências semanais
 * @param {object} dadosCalculados - Objeto contendo as propriedades 'contagens' e 'semanas'.
 * @returns {string} - Classificação do TP_metodo
 */
function calcularTPMetodo(dadosCalculados) {
    const { contagens, semanas, totalSemanasHistorico } = dadosCalculados;

    // --- REGRA 1: ENTRANTES ---
    if (contagens.ContTt === 1) {
        const ultimaSemanaHistorico = semanas[semanas.length - 1];
        if (ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
            return "ENTRANTES";
        }
    }

    // --- REGRA 2: INTERMITENTES ---
    const periodo = Math.min(totalSemanasHistorico, 52);
    if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
        return "INTERMITENTES";
    }

    // --- REGRA 3: INATIVOS ---
    if (contagens.Cont16 === 0) {
        return "INATIVOS";
    }

    // --- REGRA 4: RECENTES ---
    if (contagens.Cont04 > 0 && (contagens.Cont04 / 4) >= 0.5 && contagens.ContTt === contagens.Cont04) {
        return "RECENTES";
    }
    if (contagens.Cont08 > 0 && (contagens.Cont08 / 8) >= 0.5 && contagens.ContTt === contagens.Cont08) {
        return "RECENTES";
    }
    if (contagens.Cont12 > 0 && (contagens.Cont12 / 12) >= 0.5 && contagens.ContTt === contagens.Cont12) {
        return "RECENTES";
    }
    if (contagens.Cont16 > 0 && (contagens.Cont16 / 16) >= 0.5 && contagens.ContTt === contagens.Cont16) {
        return "RECENTES";
    }
    if (contagens.Cont26 > 0 && (contagens.Cont26 / 26) >= 0.5 && contagens.ContTt === contagens.Cont26) {
        return "RECENTES";
    }
    
    // --- REGRA 5: ORDINÁRIOS (padrão) ---
    return "ORDINÁRIOS";
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

// --- FUNÇÃO PARA ATUALIZAR MODELO CAF COM TP_METODO ---

/**
 * Atualiza o modelo CAF com os TP_metodo calculados
 * @param {object} inventoryData - Dados do inventoryData.json
 * @param {object} modeloCaf - Modelo CAF existente
 * @returns {object} - Modelo CAF atualizado com TP_metodo
 */
function atualizarModeloCafComTPMetodo(inventoryData, modeloCaf) {
    console.log(`Processando TP_metodo para ${inventoryData.itens.length} itens...`);

    for (let i = 0; i < inventoryData.itens.length; i++) {
        const item = inventoryData.itens[i];
        const medicamento = modeloCaf.cidades[0].estoques[0].medicamentos[i];

        if (!medicamento) continue;

        // Gera histórico de semanas baseado nas movimentações
        const historicoSemanas = gerarHistoricoSemanas(item);

        // Calcula contagens
        const contagens = calcularContagensParaHistorico(historicoSemanas);

        // Calcula TP_metodo
        const dadosParaCalculo = {
            contagens: contagens,
            semanas: historicoSemanas,
            totalSemanasHistorico: historicoSemanas.length
        };
        const tp_metodo = calcularTPMetodo(dadosParaCalculo);

        // Atualiza o medicamento com o TP_metodo
        medicamento.TP_metodo = tp_metodo;
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

        console.log(`\n--- INICIANDO CLASSIFICAÇÃO DO TP_METODO PARA ${inventoryData.itens.length} ITENS ---\n`);

        // Atualiza o modelo CAF com os TP_metodo
        modeloCaf = atualizarModeloCafComTPMetodo(inventoryData, modeloCaf);

        // Salva o modelo CAF atualizado
        fs.writeFileSync(modeloCafPath, JSON.stringify(modeloCaf, null, 4), 'utf8');

        console.log(`\n✅ Modelo CAF atualizado com TP_metodo!`);
        console.log(`📁 Arquivo salvo em: ${modeloCafPath}`);
        console.log(`📊 Total de itens processados: ${inventoryData.itens.length}`);

        // Exibe alguns exemplos dos resultados
        console.log(`\n--- EXEMPLOS DE TP_METODO ---\n`);
        
        const primeirosMedicamentos = modeloCaf.cidades[0].estoques[0].medicamentos.slice(0, 3);
        
        for (const medicamento of primeirosMedicamentos) {
            console.log(`-----------------------------------------------------------------`);
            console.log(`>> ${medicamento.nome}`);
            console.log(`-----------------------------------------------------------------`);
            console.log(`TP_Metodo: ${medicamento.TP_metodo}`);
            console.log("\n");
        }

    } catch (error) {
        console.error("Ocorreu um erro ao processar os dados:");
        console.error(error.message);
        process.exit(1);
    }
}

main();