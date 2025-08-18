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

// --- FUNÇÃO DE CÁLCULO DE MEDIANAS ---

/**
 * Calcula a mediana de um array de números seguindo a lógica do Excel:
 * =SE(ÉERROS(ARRED(MED(CL2:CO2);0));0;ARRED(MED(CL2:CO2);0))
 * 
 * 1. Calcula a mediana
 * 2. Arredonda para 0 casas decimais
 * 3. Se houver erro, retorna 0
 * 4. Senão retorna o valor arredondado
 * @param {number[]} numeros - Array de números
 * @returns {number} - Mediana calculada e arredondada
 */
function calcularMediana(numeros) {
    try {
        // Verifica se o array é válido
        if (!Array.isArray(numeros) || numeros.length === 0) {
            return 0;
        }
        
        // Filtra apenas números válidos (não NaN, não undefined, não null)
        const numerosValidos = numeros.filter(n => typeof n === 'number' && !isNaN(n) && n !== null && n !== undefined);
        
        // Se não há números válidos, retorna 0
        if (numerosValidos.length === 0) {
            return 0;
        }
        
        // Calcula a mediana
        const ordenados = numerosValidos.sort((a, b) => a - b);
        const meio = Math.floor(ordenados.length / 2);
        
        let mediana;
        if (ordenados.length % 2 === 0) {
            // Número par de elementos - mediana é a média dos dois elementos do meio
            mediana = (ordenados[meio - 1] + ordenados[meio]) / 2;
        } else {
            // Número ímpar de elementos - mediana é o elemento do meio
            mediana = ordenados[meio];
        }
        
        // Arredonda para 0 casas decimais (ARRED(MED(...);0))
        const medianaArredondada = Math.round(mediana);
        
        return medianaArredondada;
        
    } catch (error) {
        // Se houver qualquer erro, retorna 0 (SE(ÉERROS(...);0;...))
        console.warn('⚠️ Erro ao calcular mediana:', error);
        return 0;
    }
}

/**
 * Calcula todas as medianas com base no histórico completo de semanas.
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {object} - Um objeto contendo todas as medianas calculadas.
 */
function calcularMedianasParaHistorico(historicoSemanas) {
    const historicoValores = historicoSemanas.map(s => s.value);

    const md52 = calcularMediana(historicoValores.slice(-52));

    let mdAno = 0;
    if (historicoSemanas.length > 0) {
        const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
        const valoresDoAno = historicoSemanas
            .filter(s => s.week.startsWith(anoMaisRecente))
            .map(s => s.value);
        mdAno = calcularMediana(valoresDoAno);
    }
    
    const md04 = calcularMediana(historicoValores.slice(-4));
    const md08 = calcularMediana(historicoValores.slice(-8));
    const md12 = calcularMediana(historicoValores.slice(-12));
    const md16 = calcularMediana(historicoValores.slice(-16));
    const md26 = calcularMediana(historicoValores.slice(-26));
    const mdTotal = calcularMediana(historicoValores);

    return {
        "Md04": md04,
        "Md08": md08,
        "Md12": md12,
        "Md16": md16,
        "Md26": md26,
        "Md52": md52,
        "MdAno": mdAno,
        "MdTt": mdTotal
    };
}

// --- FUNÇÃO DE CÁLCULO DO MÁXIMO ---

/**
 * Calcula o valor máximo do histórico de semanas
 * @param { {week: string, value: number}[] } historicoSemanas - Array de objetos com semana e valor.
 * @returns {number} - Valor máximo encontrado
 */
function calcularMaximo(historicoSemanas) {
    const valores = historicoSemanas.map(s => s.value);
    const numerosValidos = valores.filter(v => typeof v === 'number' && !isNaN(v));
    
    if (numerosValidos.length === 0) {
        return 0;
    }
    
    return Math.max(...numerosValidos);
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

// --- FUNÇÃO PRINCIPAL DE CÁLCULO DO MÉTODO ---

/**
 * Calcula o MÉTODO baseado no TP_Metodo e outras informações
 * @param {object} dadosMedicamento - Dados do medicamento incluindo TP_Metodo, medianas, máximo, etc.
 * @returns {number} - Valor do MÉTODO calculado
 */
function calcularMetodo(dadosMedicamento) {
    const { TP_Metodo, medianas, maximo, historicoSemanas } = dadosMedicamento;

    switch (TP_Metodo) {
        case "ENTRANTES":
            // MÉTODO é IGUAL ao próprio quantitativo da única ocorrência(entrada ou saída)
            const ocorrenciasComValor = historicoSemanas.filter(s => s.value > 0);
            if (ocorrenciasComValor.length === 1) {
                return ocorrenciasComValor[0].value;
            }
            return 0;

        case "INATIVOS":
            // MÉTODO é IGUAL a 0
            return 0;

        case "INTERMITENTES":
            // MÉTODO é IGUAL ao campo "Máximo". Se o resultado for menor do que 1, então arredondar para 1
            const metodoIntermitentes = maximo;
            return metodoIntermitentes < 1 ? 1 : metodoIntermitentes;

        case "ORDINÁRIOS":
        case "RECENTES":
            // MÉTODO é IGUAL a maior quantidade entre as 8 medianas calculadas "Md04" até "MdTt"
            const medianasArray = [
                medianas.Md04,
                medianas.Md08,
                medianas.Md12,
                medianas.Md16,
                medianas.Md26,
                medianas.Md52,
                medianas.MdAno,
                medianas.MdTt
            ];
            return Math.max(...medianasArray);

        default:
            console.warn(`TP_Metodo desconhecido: ${TP_Metodo}. Retornando 0.`);
            return 0;
    }
}

// -- FUNÇÃO DE CÁLCULO DO METEST ---

function calcularMetest(dadosMedicamento) {
    const { metodo , TP_metodo} = dadosMedicamento;
    if(TP_metodo === "RECENTES" || TP_metodo == "INTERMITENTE"){
        return metodo*3; 
    } else {
        return metodo*16;
    }
}

function calcularReposicao(dadosMedicamento) {
    const { estoque , metest} = dadosMedicamento;
    if(estoque > metest){
        return 0;
    } else {
        return metest - estoque;
    }
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

// --- FUNÇÃO PARA GERAR MODELO CAF ---

/**
 * Gera o modelo CAF com os cálculos baseados no inventoryData
 * @param {object} inventoryData - Dados do inventoryData.json
 * @returns {object} - Modelo CAF com cálculos
 */
function gerarModeloCaf(inventoryData) {
    const modeloCaf = {
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

    console.log(`Processando ${inventoryData.itens.length} itens...`);

    for (const item of inventoryData.itens) {
        // Gera histórico de semanas baseado nas movimentações
        const historicoSemanas = gerarHistoricoSemanas(item);

        // Calcula contagens
        const contagens = calcularContagensParaHistorico(historicoSemanas);

        // Calcula medianas
        const medianas = calcularMedianasParaHistorico(historicoSemanas);

        // Calcula máximo
        const maximo = calcularMaximo(historicoSemanas);

        // Calcula TP_Metodo
        const dadosParaCalculo = {
            contagens: contagens,
            semanas: historicoSemanas,
            totalSemanasHistorico: historicoSemanas.length
        };
        const tp_metodo = calcularTPMetodo(dadosParaCalculo);

        // Calcula MÉTODO
        const dadosParaMetodo = {
            TP_Metodo: tp_metodo,
            medianas: medianas,
            maximo: maximo,
            historicoSemanas: historicoSemanas
        };
        const metodo = calcularMetodo(dadosParaMetodo);

        // Calcula estoque atual e total geral
        const estoque_atual = item.qtd_periodo_final;
        const total_geral = item.qtd_periodo_inicial + item.qtd_entradas_periodo;

        // Calcula reposição (estoque atual - método)
        const reposicao = Math.max(0, metodo - estoque_atual);

        // Gera semanas para o modelo
        const semanas = historicoSemanas.map(semana => ({
            [semana.week]: semana.value
        }));

        // Cria objeto do medicamento
        const medicamento = {
            cod_item: parseInt(item.cod_sistemico_item.replace(/\./g, '')),
            nome: item.descricao_item,
            classificacao: "10.REMUME", // Classificação padrão
            TP_metodo: tp_metodo,
            estoque_atual: estoque_atual,
            total_geral: total_geral,
            maximo: maximo,
            metodo: metodo,
            metest: metodo * 2, // Valor estatístico (pode ser ajustado)
            reposicao: reposicao,
            semanas: semanas
        };

        modeloCaf.cidades[0].estoques[0].medicamentos.push(medicamento);
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

        console.log(`\n--- INICIANDO CÁLCULO DO MÉTODO PARA ${inventoryData.itens.length} ITENS ---\n`);

        // Gera o modelo CAF
        const modeloCaf = gerarModeloCaf(inventoryData);

        // Salva o modelo CAF atualizado
        fs.writeFileSync(modeloCafPath, JSON.stringify(modeloCaf, null, 4), 'utf8');

        console.log(`\n✅ Modelo CAF atualizado com sucesso!`);
        console.log(`📁 Arquivo salvo em: ${modeloCafPath}`);
        console.log(`📊 Total de medicamentos processados: ${modeloCaf.cidades[0].estoques[0].medicamentos.length}`);

        // Exibe alguns exemplos dos resultados
        console.log(`\n--- EXEMPLOS DE RESULTADOS ---\n`);
        
        const primeirosMedicamentos = modeloCaf.cidades[0].estoques[0].medicamentos.slice(0, 3);
        
        for (const medicamento of primeirosMedicamentos) {
            console.log(`-----------------------------------------------------------------`);
            console.log(`>> ${medicamento.nome}`);
            console.log(`-----------------------------------------------------------------`);
            console.log(`TP_Metodo: ${medicamento.TP_metodo}`);
            console.log(`Método: ${medicamento.metodo}`);
            console.log(`Máximo: ${medicamento.maximo}`);
            console.log(`Estoque Atual: ${medicamento.estoque_atual}`);
            console.log(`Reposição: ${medicamento.reposicao}`);
            console.log(`\n`);
        }

    } catch (error) {
        console.error("Ocorreu um erro ao processar os dados:");
        console.error(error.message);
        process.exit(1);
    }
}

main(); 