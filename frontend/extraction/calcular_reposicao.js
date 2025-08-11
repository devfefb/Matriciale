import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Calcula a reposição baseado na fórmula: reposição = metest - estoque
 * @param {number} metEst - O valor do MetEst
 * @param {number} estoque - O valor do estoque atual
 * @returns {number} - O valor calculado da reposição
 */
function calcularReposicao(metEst, estoque) {
    if (typeof metEst !== 'number' || typeof estoque !== 'number') {
        throw new Error('MetEst e estoque devem ser números válidos');
    }
    
    return metEst - estoque;
}

/**
 * Processa todos os itens do inventoryData para calcular a reposição
 * @param {object} inventoryData - Dados do inventoryData.json
 * @returns {object} - Dados atualizados com reposição calculada
 */
function processarReposicao(inventoryData) {
    console.log(`🔄 Processando cálculo de reposição para ${inventoryData.itens.length} itens...`);

    let itensProcessados = 0;
    let itensComErro = 0;
    let itensSemDados = 0;

    for (let i = 0; i < inventoryData.itens.length; i++) {
        const item = inventoryData.itens[i];
        
        try {
            // Verifica se o item tem MetEst
            if (item.MetEst === undefined || typeof item.MetEst !== 'number') {
                console.warn(`⚠️  Item ${i + 1}: MetEst não encontrado ou inválido. Pulando...`);
                itensSemDados++;
                continue;
            }
            
            // Verifica se o item tem estoque
            if (item.estoque === undefined || typeof item.estoque !== 'number') {
                console.warn(`⚠️  Item ${i + 1}: Estoque não encontrado ou inválido. Pulando...`);
                itensSemDados++;
                continue;
            }

            // Calcula a reposição
            const reposicao = calcularReposicao(item.MetEst, item.estoque);
            
            // Adiciona a reposição ao item
            item.reposicao = reposicao;
            
            // Adiciona informações adicionais para análise
            item.analise_reposicao = {
                metEst: item.MetEst,
                estoque_atual: item.estoque,
                reposicao_calculada: reposicao,
                status: reposicao > 0 ? 'NECESSITA_REPOSICAO' : 'ESTOQUE_SUFICIENTE',
                percentual_cobertura: item.estoque > 0 ? ((item.estoque / item.MetEst) * 100).toFixed(2) : 0
            };
            
            itensProcessados++;
            
            // Log detalhado para os primeiros itens
            if (itensProcessados <= 5) {
                console.log(`📦 Item ${i + 1}: MetEst=${item.MetEst}, Estoque=${item.estoque}, Reposição=${reposicao}`);
            }
            
        } catch (error) {
            console.error(`❌ Erro ao processar item ${i + 1}: ${error.message}`);
            itensComErro++;
        }
    }

    console.log(`\n📊 Resumo do processamento:`);
    console.log(`✅ Itens processados com sucesso: ${itensProcessados}`);
    console.log(`⚠️  Itens sem dados suficientes: ${itensSemDados}`);
    console.log(`❌ Itens com erro: ${itensComErro}`);

    return inventoryData;
}

/**
 * Salva os dados atualizados no arquivo de saída
 * @param {object} inventoryData - Dados atualizados
 * @param {string} outputPath - Caminho do arquivo de saída
 */
function salvarDadosAtualizados(inventoryData, outputPath) {
    try {
        fs.writeFileSync(outputPath, JSON.stringify(inventoryData, null, 4), 'utf8');
        console.log(`✅ Dados salvos com sucesso em: ${outputPath}`);
    } catch (error) {
        throw new Error(`Erro ao salvar arquivo: ${error.message}`);
    }
}

/**
 * Exibe estatísticas detalhadas dos cálculos de reposição
 * @param {object} inventoryData - Dados processados
 */
function exibirEstatisticas(inventoryData) {
    console.log(`\n📈 ESTATÍSTICAS DO CÁLCULO DE REPOSIÇÃO`);
    console.log('=' .repeat(60));
    
    const estatisticas = {
        totalItens: inventoryData.itens.length,
        itensComReposicao: 0,
        itensNecessitamReposicao: 0,
        itensEstoqueSuficiente: 0,
        distribuicaoReposicao: {
            negativa: 0,
            zero: 0,
            baixa: 0,      // 0 < reposição <= 10
            media: 0,      // 10 < reposição <= 50
            alta: 0        // reposição > 50
        },
        valoresReposicao: {
            min: Infinity,
            max: -Infinity,
            total: 0,
            totalPositivo: 0,
            totalNegativo: 0
        },
        percentualCobertura: {
            min: Infinity,
            max: -Infinity,
            total: 0
        }
    };

    for (const item of inventoryData.itens) {
        if (item.reposicao !== undefined) {
            estatisticas.itensComReposicao++;
            
            // Conta por status
            if (item.analise_reposicao.status === 'NECESSITA_REPOSICAO') {
                estatisticas.itensNecessitamReposicao++;
            } else {
                estatisticas.itensEstoqueSuficiente++;
            }
            
            // Distribuição por faixa de reposição
            if (item.reposicao < 0) {
                estatisticas.distribuicaoReposicao.negativa++;
            } else if (item.reposicao === 0) {
                estatisticas.distribuicaoReposicao.zero++;
            } else if (item.reposicao <= 10) {
                estatisticas.distribuicaoReposicao.baixa++;
            } else if (item.reposicao <= 50) {
                estatisticas.distribuicaoReposicao.media++;
            } else {
                estatisticas.distribuicaoReposicao.alta++;
            }
            
            // Estatísticas dos valores
            estatisticas.valoresReposicao.min = Math.min(estatisticas.valoresReposicao.min, item.reposicao);
            estatisticas.valoresReposicao.max = Math.max(estatisticas.valoresReposicao.max, item.reposicao);
            estatisticas.valoresReposicao.total += item.reposicao;
            
            if (item.reposicao > 0) {
                estatisticas.valoresReposicao.totalPositivo += item.reposicao;
            } else if (item.reposicao < 0) {
                estatisticas.valoresReposicao.totalNegativo += item.reposicao;
            }
            
            // Estatísticas de percentual de cobertura
            if (item.analise_reposicao.percentual_cobertura > 0) {
                estatisticas.percentualCobertura.min = Math.min(estatisticas.percentualCobertura.min, parseFloat(item.analise_reposicao.percentual_cobertura));
                estatisticas.percentualCobertura.max = Math.max(estatisticas.percentualCobertura.max, parseFloat(item.analise_reposicao.percentual_cobertura));
                estatisticas.percentualCobertura.total += parseFloat(item.analise_reposicao.percentual_cobertura);
            }
        }
    }

    // Exibe estatísticas gerais
    console.log(`📊 Total de itens: ${estatisticas.totalItens}`);
    console.log(`✅ Itens com reposição calculada: ${estatisticas.itensComReposicao}`);
    console.log(`🔄 Itens que necessitam reposição: ${estatisticas.itensNecessitamReposicao}`);
    console.log(`✅ Itens com estoque suficiente: ${estatisticas.itensEstoqueSuficiente}`);
    
    if (estatisticas.itensComReposicao > 0) {
        // Estatísticas de reposição
        const mediaReposicao = estatisticas.valoresReposicao.total / estatisticas.itensComReposicao;
        const mediaReposicaoPositiva = estatisticas.itensNecessitamReposicao > 0 ? 
            estatisticas.valoresReposicao.totalPositivo / estatisticas.itensNecessitamReposicao : 0;
        
        console.log(`\n📈 ESTATÍSTICAS DE REPOSIÇÃO:`);
        console.log(`   Mínimo: ${estatisticas.valoresReposicao.min}`);
        console.log(`   Máximo: ${estatisticas.valoresReposicao.max}`);
        console.log(`   Média geral: ${mediaReposicao.toFixed(2)}`);
        console.log(`   Média dos que precisam: ${mediaReposicaoPositiva.toFixed(2)}`);
        console.log(`   Total positivo: ${estatisticas.valoresReposicao.totalPositivo}`);
        console.log(`   Total negativo: ${estatisticas.valoresReposicao.totalNegativo}`);
        
        // Distribuição por faixa
        console.log(`\n📊 DISTRIBUIÇÃO POR FAIXA DE REPOSIÇÃO:`);
        console.log(`   Negativa (estoque > MetEst): ${estatisticas.distribuicaoReposicao.negativa}`);
        console.log(`   Zero (estoque = MetEst): ${estatisticas.distribuicaoReposicao.zero}`);
        console.log(`   Baixa (0 < reposição ≤ 10): ${estatisticas.distribuicaoReposicao.baixa}`);
        console.log(`   Média (10 < reposição ≤ 50): ${estatisticas.distribuicaoReposicao.media}`);
        console.log(`   Alta (reposição > 50): ${estatisticas.distribuicaoReposicao.alta}`);
        
        // Estatísticas de cobertura
        if (estatisticas.percentualCobertura.total > 0) {
            const mediaCobertura = estatisticas.percentualCobertura.total / estatisticas.itensComReposicao;
            console.log(`\n📊 ESTATÍSTICAS DE COBERTURA:`);
            console.log(`   Cobertura mínima: ${estatisticas.percentualCobertura.min.toFixed(2)}%`);
            console.log(`   Cobertura máxima: ${estatisticas.percentualCobertura.max.toFixed(2)}%`);
            console.log(`   Cobertura média: ${mediaCobertura.toFixed(2)}%`);
        }
    }
}

// --- FUNÇÃO PRINCIPAL ---

function main() {
    try {
        // Tenta primeiro o arquivo com MetEst, depois o original
        let inventoryPath = path.join(__dirname, 'data', 'output', 'inventoryData_com_MetEst.json');
        let outputPath = path.join(__dirname, 'data', 'output', 'inventoryData_com_Reposicao.json');
        
        // Se não existir o arquivo com MetEst, usa o original
        if (!fs.existsSync(inventoryPath)) {
            inventoryPath = path.join(__dirname, 'data', 'output', 'inventoryData.json');
            console.log(`⚠️  Arquivo com MetEst não encontrado. Usando arquivo original: ${inventoryPath}`);
        }

        // Verifica se o arquivo de entrada existe
        if (!fs.existsSync(inventoryPath)) {
            throw new Error(`Arquivo inventoryData.json não encontrado no caminho: ${inventoryPath}`);
        }

        console.log("📖 Lendo arquivo de dados...");
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        
        if (!inventoryData.itens || inventoryData.itens.length === 0) {
            throw new Error("O arquivo não contém dados ou está vazio.");
        }

        console.log(`\n🚀 INICIANDO CÁLCULO DE REPOSIÇÃO PARA ${inventoryData.itens.length} ITENS`);
        console.log("=" .repeat(60));

        // Processa o cálculo da reposição
        const dadosAtualizados = processarReposicao(inventoryData);

        // Salva os dados atualizados
        salvarDadosAtualizados(dadosAtualizados, outputPath);

        // Exibe estatísticas
        exibirEstatisticas(dadosAtualizados);

        console.log(`\n🎉 Processamento concluído com sucesso!`);
        console.log(`📁 Arquivo de entrada: ${inventoryPath}`);
        console.log(`📁 Arquivo com reposição: ${outputPath}`);

    } catch (error) {
        console.error("❌ Ocorreu um erro ao processar os dados:");
        console.error(error.message);
        process.exit(1);
    }
}

// Executa o script se for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { calcularReposicao, processarReposicao };
