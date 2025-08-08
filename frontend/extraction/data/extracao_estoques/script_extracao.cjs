const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuração de entrada e saída
const PLANILHA_PATH = path.join(__dirname, 'Saída - Palmares - Base de Movimentações.xlsx');
const CLASSIFICACAO_PATH = path.join(__dirname, 'classificacao_medicamentos.json');
const OUTPUT_PATH = path.join(__dirname, 'extracao_movimentacoes_semanais.json');

// Interface para leitura do terminal
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Função para aguardar confirmação do usuário
function aguardarConfirmacao(mensagem) {
    return new Promise((resolve) => {
        rl.question(mensagem, (resposta) => {
            if (resposta.toLowerCase() === 's' || resposta.toLowerCase() === 'sim' || resposta === '') {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

// Função para carregar dados de classificação
function carregarClassificacoes() {
    try {
        const dados = fs.readFileSync(CLASSIFICACAO_PATH, 'utf8');
        const classificacoes = JSON.parse(dados);
        
        // Criar mapa para busca rápida
        const mapaClassificacoes = new Map();
        classificacoes.forEach(item => {
            const chave = `${item['NOME ITEM']}_${item['COD_ITEM']}`;
            mapaClassificacoes.set(chave, item['CLASSIFICAÇÃO']);
        });
        
        return mapaClassificacoes;
    } catch (error) {
        console.error('Erro ao carregar classificações:', error);
        return new Map();
    }
}



// Função para encontrar classificação do medicamento
function encontrarClassificacao(nomeMedicamento, codItem, mapaClassificacoes) {
    const chave = `${nomeMedicamento}_${codItem}`;
    return mapaClassificacoes.get(chave) || '10. REMUME'; // Classificação padrão
}

// Função para gerar semanas (2023_37 até 2025_21)
function gerarSemanas() {
    const semanas = [];
    
    // 2023: semanas 37-52
    for (let semana = 37; semana <= 52; semana++) {
        semanas.push(`2023_${semana.toString().padStart(2, '0')}`);
    }
    
    // 2024: semanas 01-52
    for (let semana = 1; semana <= 52; semana++) {
        semanas.push(`2024_${semana.toString().padStart(2, '0')}`);
    }
    
    // 2025: semanas 01-21
    for (let semana = 1; semana <= 21; semana++) {
        semanas.push(`2025_${semana.toString().padStart(2, '0')}`);
    }
    
    return semanas;
}

// Função para processar uma aba da planilha
function processarAba(workbook, nomeAba, nomeUnidade, mapaClassificacoes) {
    console.log(`\nProcessando aba: ${nomeAba} para unidade: ${nomeUnidade}`);
    
    try {
        const worksheet = workbook.Sheets[nomeAba];
        if (!worksheet) {
            console.error(`Aba ${nomeAba} não encontrada!`);
            return [];
        }
        
        const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`Encontradas ${dados.length} linhas na aba ${nomeAba}`);
        
        const medicamentos = [];
        const semanas = gerarSemanas();
        
        // Pular cabeçalho (primeira linha)
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            if (!linha || linha.length < 3) continue;
            
            const classificacao = linha[0];
            const nomeMedicamento = linha[1];
            const codItem = linha[2];
            
            if (!nomeMedicamento || !codItem) continue;
            
            console.log(`Processando medicamento: ${nomeMedicamento} (${codItem})`);
            
            // Criar objeto de movimentações semanais
            const movimentacoesSemanais = [];
            for (const semana of semanas) {
                // Buscar valor na coluna correspondente à semana
                // As colunas de dados começam na posição 3 (índice 3)
                const indiceColuna = semanas.indexOf(semana) + 3;
                const valor = linha[indiceColuna] || 0;
                
                movimentacoesSemanais.push({
                    [semana]: valor
                });
            }
            
            // Usar a classificação da planilha ou buscar no mapa
            const classificacaoFinal = classificacao || encontrarClassificacao(nomeMedicamento, codItem, mapaClassificacoes);
            
            medicamentos.push({
                nome: nomeMedicamento,
                cod_item: codItem.toString(),
                classificacao: classificacaoFinal,
                movimentacoes_semanais: movimentacoesSemanais
            });
        }
        
        console.log(`Processados ${medicamentos.length} medicamentos para ${nomeUnidade}`);
        return medicamentos;
        
    } catch (error) {
        console.error(`Erro ao processar aba ${nomeAba}:`, error);
        return [];
    }
}

// Função principal
async function extrairDados() {
    console.log('=== EXTRATOR DE DADOS DE ESTOQUE ===');
    console.log('Iniciando extração de dados...');
    
    try {
        // Carregar classificações
        console.log('Carregando classificações de medicamentos...');
        const mapaClassificacoes = carregarClassificacoes();
        console.log(`Carregadas ${mapaClassificacoes.size} classificações`);
        
        // Carregar planilha
        console.log('Carregando planilha Excel...');
        const workbook = XLSX.readFile(PLANILHA_PATH);
        console.log('Planilha carregada com sucesso!');
        
        // Verificar abas disponíveis
        const abasDisponiveis = workbook.SheetNames;
        console.log('Abas disponíveis:', abasDisponiveis);
        
        // Estrutura de dados final
        const dadosFinais = {
            cidades: [
                {
                    nome: "palmares_paulista",
                    unidades: []
                }
            ]
        };
        
        // Processar aba MetodologiaCAF
        console.log('\n=== PROCESSANDO ABA MetodologiaCAF ===');
        const medicamentosCAF = processarAba(workbook, 'MetodologiaCAF', 'CAF', mapaClassificacoes);
        
        dadosFinais.cidades[0].unidades.push({
            nome: 'CAF',
            medicamentos: medicamentosCAF
        });
        
        // Salvar dados parciais
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dadosFinais, null, 4));
        console.log('Dados da aba MetodologiaCAF salvos!');
        
        // Aguardar confirmação para continuar
        const continuar1 = await aguardarConfirmacao('\nDeseja continuar com a aba MetodoOlavo? (s/n): ');
        if (!continuar1) {
            console.log('Processamento interrompido pelo usuário.');
            rl.close();
            return;
        }
        
        // Processar aba MetodoOlavo
        console.log('\n=== PROCESSANDO ABA MetodoOlavo ===');
        const medicamentosOlavo = processarAba(workbook, 'MetodoOlavo', 'Olavo', mapaClassificacoes);
        
        dadosFinais.cidades[0].unidades.push({
            nome: 'Olavo',
            medicamentos: medicamentosOlavo
        });
        
        // Salvar dados parciais
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dadosFinais, null, 4));
        console.log('Dados da aba MetodoOlavo salvos!');
        
        // Aguardar confirmação para continuar
        const continuar2 = await aguardarConfirmacao('\nDeseja continuar com a aba MetodoESF3? (s/n): ');
        if (!continuar2) {
            console.log('Processamento interrompido pelo usuário.');
            rl.close();
            return;
        }
        
        // Processar aba MetodoESF3
        console.log('\n=== PROCESSANDO ABA MetodoESF3 ===');
        const medicamentosESF3 = processarAba(workbook, 'MetodoESF3', 'ESF3', mapaClassificacoes);
        
        dadosFinais.cidades[0].unidades.push({
            nome: 'ESF3',
            medicamentos: medicamentosESF3
        });
        
        // Salvar dados finais
        fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dadosFinais, null, 4));
        console.log('\n=== EXTRAÇÃO CONCLUÍDA ===');
        console.log('Dados salvos em:', OUTPUT_PATH);
        
        // Resumo final
        const totalMedicamentos = dadosFinais.cidades[0].unidades.reduce((total, unidade) => {
            return total + unidade.medicamentos.length;
        }, 0);
        
        console.log(`\nResumo da extração:`);
        console.log(`- Cidade: ${dadosFinais.cidades[0].nome}`);
        console.log(`- Unidades processadas: ${dadosFinais.cidades[0].unidades.length}`);
        dadosFinais.cidades[0].unidades.forEach(unidade => {
            console.log(`  * ${unidade.nome}: ${unidade.medicamentos.length} medicamentos`);
        });
        console.log(`- Total de medicamentos: ${totalMedicamentos}`);
        
    } catch (error) {
        console.error('Erro durante a extração:', error);
    } finally {
        rl.close();
    }
}

// Executar extração
if (require.main === module) {
    extrairDados();
}

module.exports = { extrairDados };
