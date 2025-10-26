const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

/**
 * Script generalizado para extração de dados de onboarding
 * Versão agnóstica que determina automaticamente municípios e unidades das abas
 */

// Utilitários básicos
const utils = {
    /**
     * Extrai nome do município do nome do arquivo
     */
    extrairNomeMunicipio(nomeArquivo) {
        const nomeBase = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '');
        
        // Padrões comuns para extrair município
        const patterns = [
            /saída\s*-\s*([a-zA-Z\s]+)\s*-\s*base/i,
            /output\s*-\s*([a-zA-Z\s]+)\s*-\s*base/i,
            /([a-zA-Z\s]+)\s*-\s*base\s*de\s*movimentações/i,
            /([a-zA-Z\s]+)\s*-\s*movimentações/i,
            /base\s*-\s*([a-zA-Z\s]+)/i,
        ];
        
        for (const pattern of patterns) {
            const match = nomeBase.match(pattern);
            if (match && match[1]) {
                return match[1].trim().toLowerCase().replace(/\s+/g, '_');
            }
        }
        
        // Se não encontrou, usa nome base do arquivo
        return nomeBase.toLowerCase().replace(/[^a-z0-9]/g, '_');
    },

    /**
     * Mapeia nome da aba para nome da unidade
     */
    mapearAbaParaUnidade(nomeAba) {
        const nomeNormalizado = nomeAba.toLowerCase();
        
        // Mapeamentos conhecidos
        const mapeamentos = {
            'metodologiacaf': 'CAF',
            'metodocaf': 'CAF',
            'caf': 'CAF',
            'metodoolavo': 'Olavo',
            'olavo': 'Olavo',
            'metodoesf3': 'ESF3',
            'esf3': 'ESF3',
            'metodologiaesf3': 'ESF3'
        };
        
        // Verificar mapeamentos diretos
        for (const [padrao, unidade] of Object.entries(mapeamentos)) {
            if (nomeNormalizado.includes(padrao)) {
                return unidade;
            }
        }
        
        // Tentar extrair padrões genéricos
        const patterns = [
            /metodo(?:logia)?([a-zA-Z0-9]+)/i,
            /^([a-zA-Z0-9]+)$/i
        ];
        
        for (const pattern of patterns) {
            const match = nomeAba.match(pattern);
            if (match && match[1]) {
                return match[1].toUpperCase();
            }
        }
        
        // Se não conseguiu mapear, usa o nome da aba
        return nomeAba.toUpperCase().replace(/[^A-Z0-9]/g, '');
    },

    /**
     * Gera lista de semanas (configurável)
     */
    gerarSemanas(config = {}) {
        const {
            anoInicio = 2023,
            semanaInicio = 37,
            anoFim = 2025,
            semanaFim = 21
        } = config;
        
        const semanas = [];
        
        // Ano inicial (a partir da semana específica)
        if (anoInicio === 2023) {
            for (let semana = semanaInicio; semana <= 52; semana++) {
                semanas.push(`${anoInicio}_${semana.toString().padStart(2, '0')}`);
            }
        }
        
        // Anos intermediários (semanas completas)
        for (let ano = anoInicio === 2023 ? 2024 : anoInicio; ano < anoFim; ano++) {
            for (let semana = 1; semana <= 52; semana++) {
                semanas.push(`${ano}_${semana.toString().padStart(2, '0')}`);
            }
        }
        
        // Ano final (até semana específica)
        if (anoFim > anoInicio || (anoFim === anoInicio && anoInicio !== 2023)) {
            for (let semana = 1; semana <= semanaFim; semana++) {
                semanas.push(`${anoFim}_${semana.toString().padStart(2, '0')}`);
            }
        }
        
        return semanas;
    },

    /**
     * Carrega classificações de medicamentos (se existir arquivo)
     */
    carregarClassificacoes(diretorioBase) {
        const possiveisCaminhos = [
            path.join(diretorioBase, 'classificacao_medicamentos.json'),
            path.join(diretorioBase, 'auxiliar', 'classificacao_medicamentos.json'),
            path.join(diretorioBase, '..', 'classificacao_medicamentos.json')
        ];
        
        for (const caminhoTeste of possiveisCaminhos) {
            try {
                if (fs.existsSync(caminhoTeste)) {
                    console.log(`📋 Carregando classificações de: ${caminhoTeste}`);
                    const dados = fs.readFileSync(caminhoTeste, 'utf8');
                    const classificacoes = JSON.parse(dados);
                    
                    // Criar mapa para busca rápida
                    const mapaClassificacoes = new Map();
                    classificacoes.forEach(item => {
                        const chave = `${item['NOME ITEM']}_${item['COD_ITEM']}`;
                        mapaClassificacoes.set(chave, item['CLASSIFICAÇÃO']);
                    });
                    
                    console.log(`✅ ${mapaClassificacoes.size} classificações carregadas`);
                    return mapaClassificacoes;
                }
            } catch (error) {
                console.warn(`⚠️ Erro ao carregar classificações de ${caminhoTeste}:`, error.message);
            }
        }
        
        console.log('📋 Nenhum arquivo de classificações encontrado, usando classificação padrão');
        return new Map();
    },

    /**
     * Encontra classificação do medicamento
     */
    encontrarClassificacao(nomeMedicamento, codItem, mapaClassificacoes) {
        const chave = `${nomeMedicamento}_${codItem}`;
        return mapaClassificacoes.get(chave) || '10. REMUME';
    }
};

/**
 * Processa uma aba da planilha de forma genérica
 */
function processarAba(workbook, nomeAba, nomeUnidade, mapaClassificacoes, opcoes = {}) {
    console.log(`\n📊 Processando aba: ${nomeAba} para unidade: ${nomeUnidade}`);
    
    try {
        const worksheet = workbook.Sheets[nomeAba];
        if (!worksheet) {
            console.error(`❌ Aba ${nomeAba} não encontrada!`);
            return [];
        }
        
        const dados = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log(`📝 Encontradas ${dados.length} linhas na aba ${nomeAba}`);
        
        if (dados.length < 2) {
            console.warn(`⚠️ Aba ${nomeAba} tem dados insuficientes (menos de 2 linhas)`);
            return [];
        }
        
        const medicamentos = [];
        const semanas = utils.gerarSemanas(opcoes.configSemanas);
        
        console.log(`📅 Processando ${semanas.length} semanas: ${semanas[0]} até ${semanas[semanas.length - 1]}`);
        
        // Detectar estrutura da planilha
        const cabecalho = dados[0];
        let colunasDetectadas = {
            classificacao: 0,
            nomeMedicamento: 1,
            codItem: 2,
            dadosIniciam: 3
        };
        
        // Tentar detectar automaticamente as colunas
        if (Array.isArray(cabecalho)) {
            for (let i = 0; i < cabecalho.length; i++) {
                const valor = cabecalho[i];
                if (typeof valor === 'string') {
                    const valorNorm = valor.toLowerCase();
                    if (valorNorm.includes('classif')) {
                        colunasDetectadas.classificacao = i;
                    } else if (valorNorm.includes('nome') || valorNorm.includes('item') || valorNorm.includes('medicamento')) {
                        colunasDetectadas.nomeMedicamento = i;
                    } else if (valorNorm.includes('cod') || valorNorm.includes('código')) {
                        colunasDetectadas.codItem = i;
                    }
                }
            }
        }
        
        console.log(`🔍 Estrutura detectada - Classificação: col ${colunasDetectadas.classificacao}, Nome: col ${colunasDetectadas.nomeMedicamento}, Código: col ${colunasDetectadas.codItem}`);
        
        // Processar dados (pular cabeçalho)
        let medicamentosProcessados = 0;
        
        for (let i = 1; i < dados.length; i++) {
            const linha = dados[i];
            if (!linha || linha.length < 3) continue;
            
            const classificacao = linha[colunasDetectadas.classificacao];
            const nomeMedicamento = linha[colunasDetectadas.nomeMedicamento];
            const codItem = linha[colunasDetectadas.codItem];
            
            if (!nomeMedicamento || !codItem) {
                continue;
            }
            
            if (opcoes.debug) {
                console.log(`🔍 Processando: ${nomeMedicamento} (${codItem})`);
            }
            
            // Criar objeto de movimentações semanais
            const movimentacoesSemanais = {};
            let totalMovimentacao = 0;
            
            for (let j = 0; j < semanas.length; j++) {
                const indiceColuna = colunasDetectadas.dadosIniciam + j;
                const valor = parseFloat(linha[indiceColuna]) || 0;
                movimentacoesSemanais[semanas[j]] = valor;
                totalMovimentacao += valor;
            }
            
            // Usar classificação da planilha ou buscar no mapa
            const classificacaoFinal = classificacao || 
                utils.encontrarClassificacao(nomeMedicamento, codItem, mapaClassificacoes);
            
            medicamentos.push({
                nome: nomeMedicamento.toString().trim(),
                cod_item: codItem.toString().trim(),
                classificacao: classificacaoFinal,
                movimentacoes_semanais: movimentacoesSemanais,
                total_movimentacao: totalMovimentacao,
                metadados: {
                    linha_original: i + 1,
                    unidade: nomeUnidade,
                    aba_origem: nomeAba
                }
            });
            
            medicamentosProcessados++;
        }
        
        console.log(`✅ ${medicamentosProcessados} medicamentos processados para ${nomeUnidade}`);
        return medicamentos;
        
    } catch (error) {
        console.error(`❌ Erro ao processar aba ${nomeAba}:`, error.message);
        return [];
    }
}

/**
 * Função principal para extração de dados de onboarding
 */
async function extrairDadosOnboarding(caminhoArquivo, opcoes = {}) {
    console.log('=== EXTRATOR DE DADOS DE ONBOARDING (AGNÓSTICO) ===');
    console.log(`📂 Arquivo: ${caminhoArquivo}`);
    
    const {
        municipioNome = null,
        diretorioSaida = null,
        autoProcessar = true,
        debug = false,
        configSemanas = {}
    } = opcoes;
    
    try {
        // Verificar se arquivo existe
        if (!fs.existsSync(caminhoArquivo)) {
            throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
        }
        
        // Extrair município do nome do arquivo se não fornecido
        const nomeArquivo = path.basename(caminhoArquivo);
        const municipioDetectado = municipioNome || utils.extrairNomeMunicipio(nomeArquivo);
        
        console.log(`🏢 Município: ${municipioDetectado}`);
        
        // Carregar classificações (opcional)
        const diretorioBase = path.dirname(caminhoArquivo);
        const mapaClassificacoes = utils.carregarClassificacoes(diretorioBase);
        
        // Carregar planilha
        console.log('📖 Carregando planilha Excel...');
        const workbook = XLSX.readFile(caminhoArquivo);
        console.log('✅ Planilha carregada com sucesso!');
        
        // Verificar abas disponíveis
        const abasDisponiveis = workbook.SheetNames;
        console.log(`📋 Abas disponíveis (${abasDisponiveis.length}):`, abasDisponiveis);
        
        // Estrutura de dados final
        const dadosFinais = {
            municipio: municipioDetectado,
            data_processamento: new Date().toISOString(),
            arquivo_origem: nomeArquivo,
            total_abas_processadas: 0,
            total_medicamentos: 0,
            unidades: [],
            metadados: {
                semanas_configuradas: utils.gerarSemanas(configSemanas).length,
                primeira_semana: utils.gerarSemanas(configSemanas)[0],
                ultima_semana: utils.gerarSemanas(configSemanas).slice(-1)[0],
                abas_originais: abasDisponiveis
            }
        };
        
        // Processar cada aba
        for (const nomeAba of abasDisponiveis) {
            try {
                const nomeUnidade = utils.mapearAbaParaUnidade(nomeAba);
                
                console.log(`\n🏥 Aba: ${nomeAba} → Unidade: ${nomeUnidade}`);
                
                if (!autoProcessar) {
                    // Em modo manual, poderia aguardar confirmação aqui
                    console.log(`⏸️ Processamento manual ativado para aba ${nomeAba}`);
                }
                
                const medicamentos = processarAba(workbook, nomeAba, nomeUnidade, mapaClassificacoes, {
                    debug,
                    configSemanas
                });
                
                if (medicamentos.length > 0) {
                    dadosFinais.unidades.push({
                        nome: nomeUnidade,
                        aba_origem: nomeAba,
                        total_medicamentos: medicamentos.length,
                        medicamentos: medicamentos
                    });
                    
                    dadosFinais.total_abas_processadas++;
                    dadosFinais.total_medicamentos += medicamentos.length;
                    
                    console.log(`✅ Unidade ${nomeUnidade}: ${medicamentos.length} medicamentos`);
                } else {
                    console.log(`⚠️ Unidade ${nomeUnidade}: nenhum medicamento encontrado`);
                }
                
            } catch (error) {
                console.error(`❌ Erro ao processar aba ${nomeAba}:`, error.message);
            }
        }
        
        // Salvar resultados
        if (diretorioSaida) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const nomeArquivoSaida = `onboarding_${municipioDetectado}_${timestamp}.json`;
            const caminhoSaida = path.join(diretorioSaida, nomeArquivoSaida);
            
            // Criar diretório se não existir
            if (!fs.existsSync(diretorioSaida)) {
                fs.mkdirSync(diretorioSaida, { recursive: true });
            }
            
            fs.writeFileSync(caminhoSaida, JSON.stringify(dadosFinais, null, 2));
            console.log(`💾 Dados salvos em: ${caminhoSaida}`);
        }
        
        // Resumo final
        console.log('\n=== RESUMO DA EXTRAÇÃO ===');
        console.log(`🏢 Município: ${dadosFinais.municipio}`);
        console.log(`📊 Abas processadas: ${dadosFinais.total_abas_processadas}/${abasDisponiveis.length}`);
        console.log(`💊 Total de medicamentos: ${dadosFinais.total_medicamentos}`);
        console.log(`🏥 Unidades processadas:`);
        
        dadosFinais.unidades.forEach(unidade => {
            console.log(`   • ${unidade.nome}: ${unidade.total_medicamentos} medicamentos`);
        });
        
        if (dadosFinais.metadados.semanas_configuradas > 0) {
            console.log(`📅 Período: ${dadosFinais.metadados.primeira_semana} até ${dadosFinais.metadados.ultima_semana} (${dadosFinais.metadados.semanas_configuradas} semanas)`);
        }
        
        return dadosFinais;
        
    } catch (error) {
        console.error('💥 Erro durante a extração:', error.message);
        throw error;
    }
}

/**
 * Função para executar o script com argumentos de linha de comando
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help')) {
        console.log(`
Uso: node script_extracao_generalized.cjs <arquivo> [opções]

Argumentos:
  <arquivo>                 Caminho para a planilha de onboarding

Opções:
  --municipio <nome>        Nome do município (se não detectável do arquivo)
  --output <pasta>          Diretório de saída (padrão: mesmo diretório do arquivo)
  --debug                   Ativa logs detalhados
  --manual                  Aguarda confirmação antes de processar cada aba
  --semanas-inicio <ano>    Ano de início (padrão: 2023)
  --semanas-fim <ano>       Ano de fim (padrão: 2025)
  --help                    Mostra esta ajuda

Exemplos:
  node script_extracao_generalized.cjs planilha.xlsx
  node script_extracao_generalized.cjs dados.xlsx --municipio "sao_paulo" --debug
  node script_extracao_generalized.cjs arquivo.xlsx --output ./resultados --manual
        `);
        process.exit(0);
    }
    
    const caminhoArquivo = args[0];
    const opcoes = {
        debug: args.includes('--debug'),
        autoProcessar: !args.includes('--manual'),
        configSemanas: {}
    };
    
    // Parse argumentos
    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--municipio':
                opcoes.municipioNome = args[i + 1];
                i++;
                break;
            case '--output':
                opcoes.diretorioSaida = args[i + 1];
                i++;
                break;
            case '--semanas-inicio':
                opcoes.configSemanas.anoInicio = parseInt(args[i + 1]);
                i++;
                break;
            case '--semanas-fim':
                opcoes.configSemanas.anoFim = parseInt(args[i + 1]);
                i++;
                break;
        }
    }
    
    // Definir diretório de saída padrão
    if (!opcoes.diretorioSaida) {
        opcoes.diretorioSaida = path.dirname(caminhoArquivo);
    }
    
    try {
        const dados = await extrairDadosOnboarding(caminhoArquivo, opcoes);
        
        console.log('\n🎉 Extração concluída com sucesso!');
        
        if (opcoes.debug) {
            console.log('\n📋 Dados extraídos (resumo):');
            console.log(JSON.stringify({
                municipio: dados.municipio,
                total_medicamentos: dados.total_medicamentos,
                unidades: dados.unidades.map(u => ({
                    nome: u.nome,
                    total_medicamentos: u.total_medicamentos
                }))
            }, null, 2));
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Falha na execução:', error.message);
        if (opcoes.debug) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Executar se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = { 
    extrairDadosOnboarding,
    utils,
    processarAba
};
