const fs = require('fs');
const path = require('path');

// Configuração dos nomes dos arquivos
const TXT_FILE = 'a.txt';
const JSON_FILE = 'lista_CAF.json';

// Função auxiliar para limpar números (Formato BR: 1.000,00 -> JS: 1000.00)
function limparNumero(str) {
    if (!str) return 0;
    // Remove pontos de milhar
    let limpo = str.replace(/\./g, '');
    // Troca vírgula decimal por ponto
    limpo = limpo.replace(',', '.');
    return parseFloat(limpo);
}

function main() {
    try {
        console.log("Iniciando comparação...");

        // 1. Ler arquivos
        const rawJson = fs.readFileSync(path.join(__dirname, JSON_FILE), 'utf-8');
        const listaJson = JSON.parse(rawJson);
        const rawTxt = fs.readFileSync(path.join(__dirname, TXT_FILE), 'utf-8');
        
        // 2. Mapear o TXT
        // Estrutura do Map: { 'COD_ITEM': { estoque: 100, metEst: 50 } }
        const mapTxt = new Map();
        const linhas = rawTxt.split('\n');
        
        linhas.forEach((linha) => {
            const linhaLimpa = linha.trim();
            // Pula cabeçalho ou linhas vazias
            if (!linhaLimpa || linhaLimpa.startsWith('COD_ITEM')) return;

            // Divide por espaços/tabs
            const colunas = linhaLimpa.split(/\s+/);

            // Agora esperamos pelo menos 3 colunas: COD, ESTOQUE, METEST
            if (colunas.length >= 3) {
                const codItem = colunas[0].trim();
                const estoqueTxt = limparNumero(colunas[1]); // Coluna 2
                const metEstTxt = limparNumero(colunas[2]);  // Coluna 3
                
                mapTxt.set(codItem, {
                    estoque: estoqueTxt,
                    metEst: metEstTxt
                });
            }
        });

        // 3. Comparar
        const divergencias = [];
        let totalAnalisados = 0;

        listaJson.forEach(itemJson => {
            const cod = itemJson.cod_item;
            
            if (mapTxt.has(cod)) {
                totalAnalisados++;
                const dadosTxt = mapTxt.get(cod);

                // Valores do JSON
                const estJson = Number(itemJson.estoque);
                const metJson = Number(itemJson.met_est);

                // Verifica se ALGUM valor difere
                const difEstoque = estJson !== dadosTxt.estoque;
                const difMetEst = metJson !== dadosTxt.metEst;

                if (difEstoque || difMetEst) {
                    divergencias.push({
                        ID_JSON: itemJson.id, // O ID solicitado
                        CODIGO: cod,
                        STATUS: 'DIVERGENTE',
                        // Detalhes para debug (opcional, ajuda a ver onde errou)
                        EST_JSON: estJson,
                        EST_TXT: dadosTxt.estoque,
                        MET_JSON: metJson,
                        MET_TXT: dadosTxt.metEst
                    });
                }
            }
        });

        // 4. Exibir Resultados
        console.log(`\nItens analisados (cruzados): ${totalAnalisados}`);
        console.log(`Divergências encontradas: ${divergencias.length}`);

        if (divergencias.length > 0) {
            console.log('\n--- LISTA DE DIVERGÊNCIAS (IDs) ---');
            // Exibe tabela detalhada
            console.table(divergencias.map(d => ({
                ID: d.ID_JSON,
                COD: d.CODIGO,
                'Dif Estoque?': d.EST_JSON !== d.EST_TXT ? 'SIM' : 'NÃO',
                'Dif MetEst?': d.MET_JSON !== d.MET_TXT ? 'SIM' : 'NÃO'
            })));

            console.log('\n--- APENAS OS IDs (para copiar) ---');
            const soIds = divergencias.map(d => d.ID_JSON);
            console.log(JSON.stringify(soIds, null, 2));
        } else {
            console.log("Sucesso! Todos os itens cruzados possuem valores idênticos.");
        }

    } catch (erro) {
        console.error("Erro:", erro.message);
    }
}

main();