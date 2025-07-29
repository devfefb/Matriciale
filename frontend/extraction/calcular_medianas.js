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

// --- FUNÇÕES AUXILIARES (do script original) ---

function validarIndiceSemana(indice) {
    return /^\d{4}_\d{2}$/.test(indice);
}

function criarChaveSemana(indice) {
    const [ano, semana] = indice.split('_');
    return parseInt(ano) * 100 + parseInt(semana); // Transforma "2024_08" em 202408 para ordenação
}


// --- FUNÇÃO DE PROCESSAMENTO PRINCIPAL (REESTRUTURADA) ---

function processarModelo(modelo) {
    const resultado = {};

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

                // 3. Pré-calcular as medianas para cada medicamento
                const medianasCalculadas = new Map();
                for (const [nome, historico] of historicoPorMedicamento.entries()) {
                    const medianas = calcularMedianasParaHistorico(historico);
                    medianasCalculadas.set(nome, medianas);
                }

                // 4. Reconstruir o objeto de estoque com as medianas corretas
                const estoqueProcessado = {
                    ...estoque,
                    semanas: estoque.semanas.map(semana => ({
                        ...semana,
                        medicamentos: semana.medicamentos.map(medicamento => {
                            const medianas = medianasCalculadas.get(medicamento.nome);
                            return {
                                ...medicamento,
                                // Formata a saída das medianas como no modelo original
                                medianas: medianas ? Object.entries(medianas).map(([key, value]) => ({ [key]: value })) : []
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
        const modeloPath = path.join(__dirname, 'modelo_52_semanas.json'); // Usando o JSON mais recente
        const modeloData = fs.readFileSync(modeloPath, 'utf8');
        const modelo = JSON.parse(modeloData);

        console.log('Processando modelo...');
        
        // A estrutura do JSON é diferente, então acessamos a lista de semanas corretamente
        const modeloParaProcessar = {
            "palmares_paulista": {
                "CAF": [
                    {
                        "semanas": modelo.cidades[0].estoques[0].medicamentos.flatMap(med => 
                            med.semanas.map(s => {
                                const indice = Object.keys(s)[0];
                                const estoque = s[indice];
                                return {
                                    indice: indice,
                                    medicamentos: [{...med, estoque: estoque }]
                                };
                            })
                        )
                    }
                ]
            }
        };
        
        // Processar o modelo
        const resultado = processarModelo(modeloParaProcessar);
        
        const outputPath = path.join(__dirname, 'modelo_processado_com_medianas.json');
        fs.writeFileSync(outputPath, JSON.stringify(resultado, null, 4), 'utf8');

        console.log(`\nModelo processado com sucesso!`);
        console.log(`Arquivo com medianas calculadas salvo em: ${outputPath}`);
        
    } catch (error) {
        console.error('\nErro ao processar modelo:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Executa o script
main();