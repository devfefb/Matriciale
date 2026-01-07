const fs = require('fs');
const path = require('path');

// Configuração dos arquivos
const TXT_FILE = 'a.txt';
const JSON_FILE = 'lista_CAF.json';
const OUTPUT_FILE = 'relatorio_divergencias.txt';

// Função auxiliar para limpar números
function limparNumero(str) {
    if (!str) return 0;
    let limpo = str.replace(/\./g, ''); 
    limpo = limpo.replace(',', '.');    
    return parseFloat(limpo);
}

function main() {
    try {
        console.log("Processando... Aguarde.");

        // 1. Ler Arquivos
        const rawJson = fs.readFileSync(path.join(__dirname, JSON_FILE), 'utf-8');
        const listaJson = JSON.parse(rawJson);
        const rawTxt = fs.readFileSync(path.join(__dirname, TXT_FILE), 'utf-8');
        
        // 2. Mapear TXT
        const mapTxt = new Map();
        const linhas = rawTxt.split('\n');
        
        linhas.forEach((linha) => {
            const linhaLimpa = linha.trim();
            if (!linhaLimpa || linhaLimpa.startsWith('COD_ITEM')) return;

            const cols = linhaLimpa.split(/\s+/);
            // Verifica se tem as 20 colunas (0 a 19)
            if (cols.length >= 20) {
                const cod = cols[0].trim();
                mapTxt.set(cod, {
                    Cont04: limparNumero(cols[1]),
                    Cont08: limparNumero(cols[2]),
                    Cont12: limparNumero(cols[3]),
                    Cont16: limparNumero(cols[4]),
                    Cont26: limparNumero(cols[5]),
                    Cont52: limparNumero(cols[6]),
                    ContAno: limparNumero(cols[7]),
                    ContTt: limparNumero(cols[8]),
                    TotalGeral: limparNumero(cols[9]),
                    Metodo: limparNumero(cols[10]),
                    MetEst: limparNumero(cols[11]),
                    Md04: limparNumero(cols[12]),
                    Md08: limparNumero(cols[13]),
                    Md12: limparNumero(cols[14]),
                    Md16: limparNumero(cols[15]),
                    Md26: limparNumero(cols[16]),
                    Md52: limparNumero(cols[17]),
                    MdAno: limparNumero(cols[18]),
                    MdTt: limparNumero(cols[19]),
                });
            }
        });

        // 3. Comparar
        const divergencias = [];
        let totalAnalisados = 0;

        listaJson.forEach(itemWrapper => {
            const dados = itemWrapper.dados; 
            const id = itemWrapper.id;
            const cod = dados.cod_item;

            if (mapTxt.has(cod)) {
                totalAnalisados++;
                const txt = mapTxt.get(cod);
                
                const comparacoes = {
                    'Cont04': [Number(dados.contagens?.Cont04 || 0), txt.Cont04],
                    'Cont08': [Number(dados.contagens?.Cont08 || 0), txt.Cont08],
                    'Cont12': [Number(dados.contagens?.Cont12 || 0), txt.Cont12],
                    'Cont16': [Number(dados.contagens?.Cont16 || 0), txt.Cont16],
                    'Cont26': [Number(dados.contagens?.Cont26 || 0), txt.Cont26],
                    'Cont52': [Number(dados.contagens?.Cont52 || 0), txt.Cont52],
                    'ContAno': [Number(dados.contagens?.ContAno || 0), txt.ContAno],
                    'ContTt': [Number(dados.contagens?.ContTt || 0), txt.ContTt],
                    
                    'Total Geral': [Number(dados.total_geral || 0), txt.TotalGeral],
                    'Metodo': [Number(dados.metodo || 0), txt.Metodo],
                    'MetEst': [Number(dados.met_est || 0), txt.MetEst],
                    
                    'Md04': [Number(dados.medianas?.Md04 || 0), txt.Md04],
                    'Md08': [Number(dados.medianas?.Md08 || 0), txt.Md08],
                    'Md12': [Number(dados.medianas?.Md12 || 0), txt.Md12],
                    'Md16': [Number(dados.medianas?.Md16 || 0), txt.Md16],
                    'Md26': [Number(dados.medianas?.Md26 || 0), txt.Md26],
                    'Md52': [Number(dados.medianas?.Md52 || 0), txt.Md52],
                    'MdAno': [Number(dados.medianas?.MdAno || 0), txt.MdAno],
                    'MdTt': [Number(dados.medianas?.MdTt || 0), txt.MdTt]
                };

                const camposDivergentes = [];
                for (const [campo, valores] of Object.entries(comparacoes)) {
                    // Margem de erro 0.001
                    if (Math.abs(valores[0] - valores[1]) > 0.001) {
                        camposDivergentes.push(`   -> ${campo} | JSON: ${valores[0]} | TXT: ${valores[1]}`);
                    }
                }

                if (camposDivergentes.length > 0) {
                    divergencias.push({
                        id: id,
                        cod: cod,
                        detalhes: camposDivergentes.join('\n')
                    });
                }
            }
        });

        // 4. Gerar Conteúdo do Arquivo TXT
        let conteudoArquivo = '=== RELATÓRIO DE DIVERGÊNCIAS ===\n';
        conteudoArquivo += `Data da geração: ${new Date().toLocaleString()}\n`;
        conteudoArquivo += `Total de itens analisados: ${totalAnalisados}\n`;
        conteudoArquivo += `Total de itens com divergência: ${divergencias.length}\n`;
        conteudoArquivo += '=================================\n\n';

        if (divergencias.length > 0) {
            conteudoArquivo += '--- DETALHAMENTO ---\n';
            
            divergencias.forEach((d, index) => {
                conteudoArquivo += `[${index + 1}] ID: ${d.id} | COD: ${d.cod}\n`;
                conteudoArquivo += `${d.detalhes}\n`;
                conteudoArquivo += '---------------------------------\n';
            });

            conteudoArquivo += '\n\n=== LISTA DE IDs (JSON Array) ===\n';
            const ids = divergencias.map(d => d.id);
            conteudoArquivo += JSON.stringify(ids, null, 2);
        } else {
            conteudoArquivo += "Nenhuma divergência encontrada. Todos os dados conferem.";
        }

        // 5. Salvar no disco
        fs.writeFileSync(path.join(__dirname, OUTPUT_FILE), conteudoArquivo, 'utf-8');

        console.log(`\nSucesso! O arquivo "${OUTPUT_FILE}" foi gerado na pasta do projeto.`);

    } catch (e) {
        console.error("Erro fatal:", e.message);
    }
}

main();