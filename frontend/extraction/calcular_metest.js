import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Calcula o MetEst baseado no TP_Metodo e no valor do campo Metodo
 * @param {string} tpMetodo - O tipo de método (ORDINARIO, INTERMITENTE, INATIVO, ENTRANTES, RECENTES)
 * @param {number} metodo - O valor do campo Metodo
 * @returns {number} - O valor calculado do MetEst
 */
function calcularMetEst(tpMetodo, metodo) {
    switch (tpMetodo) {
        case "ORDINARIO":
            return metodo * 16;
        case "INTERMITENTE":
            return metodo * 3;
        case "INATIVO":
            return metodo * 16;
        case "ENTRANTES":
            return metodo * 16;
        case "RECENTES":
            return metodo * 3;
        default:
            console.warn(`TP_Metodo desconhecido: ${tpMetodo}. Usando multiplicador padrão 16.`);
            return metodo * 16;
    }
}

/**
 * Processa todos os itens do inventoryData para calcular o MetEst
 * @param {object} inventoryData - Dados do inventoryData.json
 * @returns {object} - Dados atualizados com MetEst calculado
 */
function processarMetEst(inventoryData) {
    console.log(`Processando MetEst para ${inventoryData.itens.length} itens...`);

    for (let i = 0; i < inventoryData.itens.length; i++) {
        const item = inventoryData.itens[i];
        
        // Verifica se o item tem TP_Metodo e Metodo
        if (!item.TP_Metodo) {
            console.warn(`Item ${i + 1} não possui TP_Metodo definido. Pulando...`);
            continue;
        }
        
        if (typeof item.Metodo !== 'number') {
            console.warn(`Item ${i + 1} não possui campo Metodo válido. Pulando...`);
            continue;
        }

        // Calcula o MetEst
        const metEst = calcularMetEst(item.TP_Metodo, item.Metodo);
        
        // Adiciona o MetEst ao item
        item.MetEst = metEst;
        
        console.log(`Item ${i + 1}: TP_Metodo=${item.TP_Metodo}, Metodo=${item.Metodo}, MetEst=${metEst}`);
    }

    return inventoryData;
}

/**
 * Salva os dados atualizados no arquivo inventoryData.json
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
 * Exibe estatísticas dos cálculos realizados
 * @param {object} inventoryData - Dados processados
 */
function exibirEstatisticas(inventoryData) {
    console.log(`\n--- ESTATÍSTICAS DO CÁLCULO METEST ---`);
    
    const estatisticas = {
        totalItens: inventoryData.itens.length,
        itensComMetEst: 0,
        distribuicaoTPMetodo: {},
        distribuicaoMetEst: {
            min: Infinity,
            max: -Infinity,
            total: 0
        }
    };

    for (const item of inventoryData.itens) {
        if (item.MetEst !== undefined) {
            estatisticas.itensComMetEst++;
            
            // Conta distribuição por TP_Metodo
            if (item.TP_Metodo) {
                estatisticas.distribuicaoTPMetodo[item.TP_Metodo] = 
                    (estatisticas.distribuicaoTPMetodo[item.TP_Metodo] || 0) + 1;
            }
            
            // Calcula estatísticas do MetEst
            estatisticas.distribuicaoMetEst.min = Math.min(estatisticas.distribuicaoMetEst.min, item.MetEst);
            estatisticas.distribuicaoMetEst.max = Math.max(estatisticas.distribuicaoMetEst.max, item.MetEst);
            estatisticas.distribuicaoMetEst.total += item.MetEst;
        }
    }

    console.log(`📊 Total de itens: ${estatisticas.totalItens}`);
    console.log(`✅ Itens com MetEst calculado: ${estatisticas.itensComMetEst}`);
    
    if (estatisticas.itensComMetEst > 0) {
        const media = estatisticas.distribuicaoMetEst.total / estatisticas.itensComMetEst;
        console.log(`📈 MetEst - Mínimo: ${estatisticas.distribuicaoMetEst.min}`);
        console.log(`📈 MetEst - Máximo: ${estatisticas.distribuicaoMetEst.max}`);
        console.log(`📈 MetEst - Média: ${media.toFixed(2)}`);
        
        console.log(`\n--- DISTRIBUIÇÃO POR TP_METODO ---`);
        for (const [tpMetodo, quantidade] of Object.entries(estatisticas.distribuicaoTPMetodo)) {
            console.log(`${tpMetodo}: ${quantidade} itens`);
        }
    }
}

// --- FUNÇÃO PRINCIPAL ---

function main() {
    try {
        const inventoryPath = path.join(__dirname, 'data', 'output', 'inventoryData.json');
        const outputPath = path.join(__dirname, 'data', 'output', 'inventoryData_com_MetEst.json');

        // Verifica se o arquivo de entrada existe
        if (!fs.existsSync(inventoryPath)) {
            throw new Error(`Arquivo inventoryData.json não encontrado no caminho: ${inventoryPath}`);
        }

        console.log("📖 Lendo o arquivo 'inventoryData.json'...");
        const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
        
        if (!inventoryData.itens || inventoryData.itens.length === 0) {
            throw new Error("O arquivo inventoryData.json não contém dados ou está vazio.");
        }

        console.log(`\n🚀 INICIANDO CÁLCULO DO METEST PARA ${inventoryData.itens.length} ITENS`);
        console.log("=" .repeat(60));

        // Processa o cálculo do MetEst
        const dadosAtualizados = processarMetEst(inventoryData);

        // Salva os dados atualizados
        salvarDadosAtualizados(dadosAtualizados, outputPath);

        // Exibe estatísticas
        exibirEstatisticas(dadosAtualizados);

        console.log(`\n🎉 Processamento concluído com sucesso!`);
        console.log(`📁 Arquivo original: ${inventoryPath}`);
        console.log(`📁 Arquivo com MetEst: ${outputPath}`);

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

export { calcularMetEst, processarMetEst };