const fs = require('fs');
const path = require('path');

// --- FUNÇÕES DE CÁLCULO CORRIGIDAS ---

/**
 * Calcula a MEDIANA de um array de números.
 * Corresponde à função MED() do Excel.
 * @param {number[]} numeros - Array de números.
 * @returns {number} - A mediana.
 */
function calcularMediana(numeros) {
    if (!numeros || numeros.length === 0) return 0;

    const sorted = [...numeros].sort((a, b) => a - b);
    const middleIndex = Math.floor(sorted.length / 2);

    if (sorted.length % 2 !== 0) {
        return sorted[middleIndex];
    }

    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}

/**
 * Calcula todas as medianas para um único medicamento com base em seu histórico de movimentações.
 * @param {number[]} historicoSaidas - Array com as quantidades de saída ordenadas por semana.
 * @returns {object} - Um objeto contendo todas as medianas calculadas.
 */
function calcularMedianasParaHistorico(historicoSaidas) {
    // O método slice(-N) pega os ÚLTIMOS N itens do array.
    const md04 = calcularMediana(historicoSaidas.slice(-4));
    const md08 = calcularMediana(historicoSaidas.slice(-8));
    const md12 = calcularMediana(historicoSaidas.slice(-12));
    const md16 = calcularMediana(historicoSaidas.slice(-16));
    const md26 = calcularMediana(historicoSaidas.slice(-26));
    const md52 = calcularMediana(historicoSaidas.slice(-52));
    const mdTotal = calcularMediana(historicoSaidas);

    return {
        "Md04": Math.round(md04),
        "Md08": Math.round(md08),
        "Md12": Math.round(md12),
        "Md16": Math.round(md16),
        "Md26": Math.round(md26),
        "Md52": Math.round(md52),
        "MdAno": Math.round(md52), // Assumindo que MdAno é igual a Md52
        "MdTt": Math.round(mdTotal)
    };
}

/**
 * Converte data no formato DD/MM/YYYY para ano e semana ISO.
 * @param {string} dataStr - Data no formato "DD/MM/YYYY".
 * @returns {string} - Ano e semana no formato "YYYY_WW".
 */
function dataParaAnoSemana(dataStr) {
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    const data = new Date(ano, mes - 1, dia);
    
    // Calcula a semana ISO
    const getWeek = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    };
    
    const semana = getWeek(data);
    return `${ano}_${semana.toString().padStart(2, '0')}`;
}

/**
 * Calcula as contagens de semanas com movimentação para um medicamento.
 * @param {Array} movimentacoes - Array de movimentações do medicamento.
 * @returns {object} - Objeto com as contagens para cada período.
 */
function calcularContagensParaMedicamento(movimentacoes) {
    // Agrupa movimentações por semana
    const movimentacoesPorSemana = new Map();
    
    for (const mov of movimentacoes) {
        if (mov.historico === "SALDO ANTERIOR") continue; // Ignora saldo anterior
        
        const anoSemana = dataParaAnoSemana(mov.data_movimentacao);
        const temMovimentacao = (mov.entradas && mov.entradas > 0) || (mov.saidas && mov.saidas > 0);
        
        if (temMovimentacao) {
            movimentacoesPorSemana.set(anoSemana, true);
        }
    }
    
    // Ordena as semanas cronologicamente
    const semanasOrdenadas = Array.from(movimentacoesPorSemana.keys())
        .sort((a, b) => {
            const [anoA, semanaA] = a.split('_').map(Number);
            const [anoB, semanaB] = b.split('_').map(Number);
            return anoA * 100 + semanaA - (anoB * 100 + semanaB);
        });
    
    // Calcula contagens para diferentes períodos
    const cont04 = Math.min(semanasOrdenadas.length, 4);
    const cont08 = Math.min(semanasOrdenadas.length, 8);
    const cont12 = Math.min(semanasOrdenadas.length, 12);
    const cont16 = Math.min(semanasOrdenadas.length, 16);
    const cont26 = Math.min(semanasOrdenadas.length, 26);
    const cont52 = Math.min(semanasOrdenadas.length, 52);
    const contTotal = semanasOrdenadas.length;
    
    return {
        "Cont04": cont04,
        "Cont08": cont08,
        "Cont12": cont12,
        "Cont16": cont16,
        "Cont26": cont26,
        "Cont52": cont52,
        "ContAno": cont52, // Assumindo que ContAno é igual a Cont52
        "ContTt": contTotal
    };
}

// --- FUNÇÕES AUXILIARES (do script original) ---

function validarIndiceSemana(indice) {
    return /^\d{4}_\d{2}$/.test(indice);
}

function criarChaveSemana(indice) {
    const [ano, semana] = indice.split('_');
    return parseInt(ano) * 100 + parseInt(semana); // Transforma "2024_08" em 202408 para ordenação
}

/**
 * Carrega os dados de inventário para calcular as contagens.
 * @returns {object} - Dados de inventário.
 */
function carregarInventoryData() {
    try {
        const inventoryPath = path.join(__dirname, 'data', 'output', 'inventoryData.json');
        const inventoryData = fs.readFileSync(inventoryPath, 'utf8');
        return JSON.parse(inventoryData);
    } catch (error) {
        console.warn('Aviso: Não foi possível carregar inventoryData.json. As contagens serão calculadas apenas com base no modelo.');
        return null;
    }
}

/**
 * Encontra as movimentações de um medicamento específico no inventoryData.
 * @param {string} nomeMedicamento - Nome do medicamento.
 * @param {object} inventoryData - Dados de inventário.
 * @returns {Array|null} - Array de movimentações ou null se não encontrado.
 */
function encontrarMovimentacoesMedicamento(nomeMedicamento, inventoryData) {
    if (!inventoryData || !inventoryData.itens) return null;
    
    // Busca por nome do medicamento (pode ser necessário ajustar a lógica de busca)
    const item = inventoryData.itens.find(item => 
        item.descricao_item && 
        item.descricao_item.toLowerCase().includes(nomeMedicamento.toLowerCase())
    );
    
    return item ? item.movimentacoes : null;
}

// --- FUNÇÃO DE PROCESSAMENTO PRINCIPAL (REESTRUTURADA) ---

function processarModelo(modelo) {
    const resultado = {};
    const inventoryData = carregarInventoryData();

    // Itera sobre cada cidade e cada tipo de estoque
    for (const cidade in modelo) {
        resultado[cidade] = {};
        for (const tipoEstoque in modelo[cidade]) {
            const estoquesOriginais = modelo[cidade][tipoEstoque];
            const estoquesProcessados = [];

            for (const estoque of estoquesOriginais) {
                // 1. Coletar e ordenar todas as semanas do estoque
                const semanasOrdenadas = estoque.semanas
                    .filter(s => s.indice && validarIndiceSemana(s.indice))
                    .sort((a, b) => criarChaveSemana(a.indice) - criarChaveSemana(b.indice));

                // 2. Agrupar o histórico de saídas por medicamento
                const historicoPorMedicamento = new Map();
                for (const semana of semanasOrdenadas) {
                    for (const med of semana.medicamentos) {
                        if (!historicoPorMedicamento.has(med.nome)) {
                            historicoPorMedicamento.set(med.nome, []);
                        }
                        // Usamos o campo "estoque" como valor da movimentação da semana
                        historicoPorMedicamento.get(med.nome).push(med.estoque || 0);
                    }
                }

                // 3. Pré-calcular as medianas e contagens para cada medicamento
                const medianasCalculadas = new Map();
                const contagensCalculadas = new Map();
                
                for (const [nome, historico] of historicoPorMedicamento.entries()) {
                    const medianas = calcularMedianasParaHistorico(historico);
                    medianasCalculadas.set(nome, medianas);
                    
                    // Calcula contagens baseado no inventoryData se disponível
                    const movimentacoes = encontrarMovimentacoesMedicamento(nome, inventoryData);
                    const contagens = calcularContagensParaMedicamento(movimentacoes || []);
                    contagensCalculadas.set(nome, contagens);
                }

                // 4. Reconstruir o objeto de estoque com as medianas e contagens corretas
                const estoqueProcessado = {
                    ...estoque,
                    semanas: estoque.semanas.map(semana => ({
                        ...semana,
                        medicamentos: semana.medicamentos.map(medicamento => {
                            const medianas = medianasCalculadas.get(medicamento.nome);
                            const contagens = contagensCalculadas.get(medicamento.nome);
                            
                            return {
                                ...medicamento,
                                // Formata a saída das medianas como no modelo original
                                medianas: medianas ? Object.entries(medianas).map(([key, value]) => ({ [key]: value })) : [],
                                // Adiciona as contagens calculadas
                                contagens: contagens ? Object.entries(contagens).map(([key, value]) => ({ [key]: value })) : []
                            };
                        })
                    }))
                };
                estoquesProcessados.push(estoqueProcessado);
            }
            resultado[cidade][tipoEstoque] = estoquesProcessados;
        }
    }
    return resultado;
}

// --- FUNÇÃO DE EXECUÇÃO ---

function main() {
    try {
        const modeloPath = path.join(__dirname, 'data', 'modelo', 'modelo.json');
        const modeloData = fs.readFileSync(modeloPath, 'utf8');
        const modelo = JSON.parse(modeloData);

        console.log('Processando modelo...');
        
        // Processar o modelo
        const resultado = processarModelo(modelo);
        
        const outputPath = path.join(__dirname, 'modelo_processado_com_medianas_e_contagens.json');
        fs.writeFileSync(outputPath, JSON.stringify(resultado, null, 4), 'utf8');

        console.log(`\nModelo processado com sucesso!`);
        console.log(`Arquivo com medianas e contagens calculadas salvo em: ${outputPath}`);
        
    } catch (error) {
        console.error('\nErro ao processar modelo:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Executa o script
main();