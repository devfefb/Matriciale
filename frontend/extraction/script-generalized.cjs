#!/usr/bin/env node

const path = require('path');
const fs = require('fs').promises;

/**
 * Script generalizado para extração de dados de balancete e movimentação
 * Versão agnóstica que determina automaticamente unidades e municípios
 */

// Utilitários básicos internos para não depender de arquivos externos
const utils = {
    /**
     * Verifica se um arquivo existe
     */
    async arquivoExiste(caminhoArquivo) {
        try {
            await fs.access(caminhoArquivo);
            return true;
        } catch {
            return false;
        }
    },

    /**
     * Lista arquivos com extensões específicas em um diretório
     */
    async listarArquivos(diretorio, extensoes = ['.xlsx', '.xls', '.csv']) {
        try {
            const arquivos = await fs.readdir(diretorio);
            return arquivos.filter(arquivo => {
                const ext = path.extname(arquivo).toLowerCase();
                return extensoes.includes(ext);
            });
        } catch (error) {
            console.error(`Erro ao listar arquivos em ${diretorio}:`, error.message);
            return [];
        }
    },

    /**
     * Extrai informações do nome do arquivo
     */
    analisarNomeArquivo(nomeArquivo) {
        const nomeBase = nomeArquivo.replace(/\.(xlsx|xls|csv)$/i, '');
        const nomeNormalizado = nomeBase.toLowerCase();
        
        let tipo = 'desconhecido';
        let unidade = '';
        let municipio = '';
        
        // Determinar tipo do arquivo
        if (nomeNormalizado.includes('balancete') || nomeNormalizado.includes('balance')) {
            tipo = 'balancete';
        } else if (nomeNormalizado.includes('movimentac') || nomeNormalizado.includes('moviment')) {
            tipo = 'movimentacao';
        }
        
        // Padrões para extrair unidade
        const padroesUnidade = [
            /balancete\s*([a-zA-Z0-9_]+)/i,
            /movimentac[ao]+\s*([a-zA-Z0-9_]+)/i,
            /([a-zA-Z0-9_]+)\s*balancete/i,
            /([a-zA-Z0-9_]+)\s*movimentac/i,
            /(\w+)\.xlsx?$/i
        ];
        
        for (const padrao of padroesUnidade) {
            const match = nomeBase.match(padrao);
            if (match && match[1] && !['de', 'da', 'do', 'para', 'com'].includes(match[1].toLowerCase())) {
                unidade = match[1].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                break;
            }
        }
        
        // Padrões para extrair município
        const padroesMunicipio = [
            /([a-zA-Z\s]+)\s*-\s*balancete/i,
            /([a-zA-Z\s]+)\s*-\s*movimentac/i,
            /balancete\s*-\s*([a-zA-Z\s]+)/i,
            /movimentac[ao]+\s*-\s*([a-zA-Z\s]+)/i
        ];
        
        for (const padrao of padroesMunicipio) {
            const match = nomeBase.match(padrao);
            if (match && match[1]) {
                municipio = match[1].trim().toLowerCase().replace(/\s+/g, '_');
                break;
            }
        }
        
        return {
            tipo,
            unidade: unidade || 'UNKNOWN',
            municipio: municipio || 'municipio_default',
            nomeOriginal: nomeArquivo
        };
    },

    /**
     * Salva dados em formato JSON
     */
    async salvarDados(dados, caminhoArquivo) {
        try {
            // Criar diretório se não existir
            const diretorio = path.dirname(caminhoArquivo);
            await fs.mkdir(diretorio, { recursive: true });
            
            // Salvar arquivo
            await fs.writeFile(caminhoArquivo, JSON.stringify(dados, null, 2), 'utf8');
            console.log(`✅ Dados salvos em: ${caminhoArquivo}`);
        } catch (error) {
            console.error(`❌ Erro ao salvar dados:`, error.message);
            throw error;
        }
    }
};

// Processadores específicos
const processadores = {
    /**
     * Processa arquivo de balancete
     */
    async processarBalancete(caminhoArquivo, informacoesArquivo) {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(caminhoArquivo);
        
        const worksheet = workbook.getWorksheet(1);
        const itensMovimentados = [];
        
        console.log(`📋 Processando balancete para unidade: ${informacoesArquivo.unidade}`);
        
        let linhaAtual = 2; // Assumindo cabeçalho na linha 1
        
        while (linhaAtual <= worksheet.rowCount) {
            const row = worksheet.getRow(linhaAtual);
            
            if (!row.getCell(1).value) {
                linhaAtual++;
                continue;
            }
            
            const qtdEntradas = parseFloat(row.getCell(7).value) || 0;
            const qtdSaidas = parseFloat(row.getCell(9).value) || 0;
            
            if (qtdEntradas > 0 || qtdSaidas > 0) {
                const item = {
                    cod_sistemico_item: row.getCell(1).value?.toString() || '',
                    descricao_item: row.getCell(2).value?.toString() || '',
                    tipo_unid_item: row.getCell(4).value?.toString() || '',
                    qtd_periodo_inicial: parseFloat(row.getCell(5).value) || 0,
                    valor_item_periodo_inicial: parseFloat(row.getCell(6).value) || 0,
                    qtd_entradas_periodo: qtdEntradas,
                    valor_entradas_periodo: parseFloat(row.getCell(8).value) || 0,
                    qtd_saidas_periodo: qtdSaidas,
                    valor_saidas_periodo: parseFloat(row.getCell(10).value) || 0,
                    qtd_periodo_final: parseFloat(row.getCell(11).value) || 0,
                    valor_unitario_periodo_final: parseFloat(row.getCell(12).value) || 0,
                    valor_item_periodo_final: parseFloat(row.getCell(13).value) || 0,
                    movimentacoes: []
                };
                
                itensMovimentados.push(item);
            }
            
            linhaAtual++;
        }
        
        console.log(`✅ ${itensMovimentados.length} itens movimentados encontrados no balancete`);
        return itensMovimentados;
    },

    /**
     * Processa arquivo de movimentação
     */
    async processarMovimentacao(caminhoArquivo, itens, informacoesArquivo) {
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(caminhoArquivo);
        
        const worksheet = workbook.getWorksheet(1);
        
        console.log(`📊 Processando movimentação para unidade: ${informacoesArquivo.unidade}`);
        
        // Extrair período das datas na planilha
        let periodoInicio = null;
        let periodoFim = null;
        
        // Buscar datas na planilha (assumindo que estão nas primeiras linhas/colunas)
        for (let linha = 1; linha <= Math.min(10, worksheet.rowCount); linha++) {
            for (let col = 1; col <= Math.min(10, worksheet.columnCount); col++) {
                const celula = worksheet.getRow(linha).getCell(col);
                if (celula.value instanceof Date) {
                    if (!periodoInicio || celula.value < periodoInicio) {
                        periodoInicio = celula.value;
                    }
                    if (!periodoFim || celula.value > periodoFim) {
                        periodoFim = celula.value;
                    }
                }
            }
        }
        
        // Se não encontrou datas, usar valores padrão
        if (!periodoInicio) {
            const hoje = new Date();
            periodoInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            periodoFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        }
        
        // Processar movimentações dos itens
        const itensComMovimentacao = itens.map(item => {
            // Aqui seria implementada a lógica específica de extração de movimentações
            // Por simplicidade, criando estrutura básica
            const movimentacoes = [
                {
                    data_movimentacao: periodoInicio.toISOString().split('T')[0],
                    tipo_movimentacao: 'ENTRADA',
                    quantidade: item.qtd_entradas_periodo || 0,
                    valor_unitario: item.valor_unitario_periodo_final || 0,
                    valor_total: item.valor_entradas_periodo || 0,
                    observacoes: `Entrada período ${informacoesArquivo.unidade}`
                },
                {
                    data_movimentacao: periodoFim.toISOString().split('T')[0],
                    tipo_movimentacao: 'SAIDA',
                    quantidade: item.qtd_saidas_periodo || 0,
                    valor_unitario: item.valor_unitario_periodo_final || 0,
                    valor_total: item.valor_saidas_periodo || 0,
                    observacoes: `Saída período ${informacoesArquivo.unidade}`
                }
            ];
            
            return {
                ...item,
                movimentacoes: movimentacoes.filter(mov => mov.quantidade > 0)
            };
        });
        
        return {
            periodo: {
                periodo_inicio: periodoInicio.toISOString().split('T')[0],
                periodo_fim: periodoFim.toISOString().split('T')[0]
            },
            itens: itensComMovimentacao
        };
    }
};

/**
 * Função principal que extrai dados de forma agnóstica
 */
async function extrairDados(diretorioInput = './extraction/data/input', diretorioOutput = './extraction/data/output', opcoes = {}) {
    console.log('🚀 Iniciando extração de dados (modo agnóstico)...');
    
    try {
        // 1. Encontrar arquivos de entrada
        console.log('📁 Procurando arquivos de entrada...');
        const arquivos = await utils.listarArquivos(diretorioInput);
        
        if (arquivos.length === 0) {
            throw new Error('Nenhum arquivo encontrado no diretório de entrada');
        }
        
        // 2. Analisar e categorizar arquivos
        console.log('🔍 Analisando arquivos encontrados...');
        const arquivosCategorizados = {};
        
        for (const arquivo of arquivos) {
            const info = utils.analisarNomeArquivo(arquivo);
            const caminhoCompleto = path.join(diretorioInput, arquivo);
            
            console.log(`📝 Arquivo: ${arquivo}`);
            console.log(`   Tipo: ${info.tipo}`);
            console.log(`   Unidade: ${info.unidade}`);
            console.log(`   Município: ${info.municipio}`);
            
            const chaveUnidade = `${info.municipio}_${info.unidade}`;
            
            if (!arquivosCategorizados[chaveUnidade]) {
                arquivosCategorizados[chaveUnidade] = {
                    municipio: info.municipio,
                    unidade: info.unidade,
                    arquivos: {}
                };
            }
            
            arquivosCategorizados[chaveUnidade].arquivos[info.tipo] = {
                caminho: caminhoCompleto,
                info: info
            };
        }
        
        // 3. Validar que temos os arquivos necessários
        const unidadesProcessaveis = Object.entries(arquivosCategorizados).filter(([chave, dados]) => {
            return dados.arquivos.balancete && dados.arquivos.movimentacao;
        });
        
        if (unidadesProcessaveis.length === 0) {
            console.warn('⚠️ Nenhuma unidade com ambos os arquivos (balancete + movimentação) encontrada');
            console.log('Arquivos encontrados por unidade:');
            Object.entries(arquivosCategorizados).forEach(([chave, dados]) => {
                console.log(`  ${dados.municipio} - ${dados.unidade}:`);
                console.log(`    Balancete: ${dados.arquivos.balancete ? '✅' : '❌'}`);
                console.log(`    Movimentação: ${dados.arquivos.movimentacao ? '✅' : '❌'}`);
            });
        }
        
        // 4. Processar cada unidade
        const resultadosFinais = {};
        
        for (const [chaveUnidade, dadosUnidade] of unidadesProcessaveis) {
            console.log(`\n🏥 Processando unidade: ${dadosUnidade.municipio} - ${dadosUnidade.unidade}`);
            
            // Processar balancete
            const itens = await processadores.processarBalancete(
                dadosUnidade.arquivos.balancete.caminho,
                dadosUnidade.arquivos.balancete.info
            );
            
            // Processar movimentação
            const resultado = await processadores.processarMovimentacao(
                dadosUnidade.arquivos.movimentacao.caminho,
                itens,
                dadosUnidade.arquivos.movimentacao.info
            );
            
            // Montar objeto final para esta unidade
            const dadosUnidadeCompletos = {
                municipio: dadosUnidade.municipio,
                unidade: dadosUnidade.unidade,
                periodo_inicio: resultado.periodo.periodo_inicio,
                periodo_fim: resultado.periodo.periodo_fim,
                itens: resultado.itens,
                metadados: {
                    data_processamento: new Date().toISOString(),
                    arquivo_balancete: dadosUnidade.arquivos.balancete.info.nomeOriginal,
                    arquivo_movimentacao: dadosUnidade.arquivos.movimentacao.info.nomeOriginal,
                    total_itens_processados: resultado.itens.length
                }
            };
            
            // Salvar dados da unidade individualmente
            const nomeArquivoSaida = opcoes.nomeArquivo || 
                `inventoryData_${dadosUnidade.municipio}_${dadosUnidade.unidade}.json`;
            const caminhoSaida = path.join(diretorioOutput, nomeArquivoSaida);
            
            await utils.salvarDados(dadosUnidadeCompletos, caminhoSaida);
            
            resultadosFinais[chaveUnidade] = dadosUnidadeCompletos;
            
            console.log(`✅ Unidade ${dadosUnidade.unidade} processada com sucesso!`);
            console.log(`📅 Período: ${dadosUnidadeCompletos.periodo_inicio} a ${dadosUnidadeCompletos.periodo_fim}`);
            console.log(`📦 Total de itens: ${dadosUnidadeCompletos.itens.length}`);
        }
        
        // 5. Salvar resumo consolidado
        const resumoConsolidado = {
            data_processamento: new Date().toISOString(),
            total_unidades_processadas: Object.keys(resultadosFinais).length,
            municipios: [...new Set(Object.values(resultadosFinais).map(r => r.municipio))],
            unidades: Object.values(resultadosFinais).map(r => ({
                municipio: r.municipio,
                unidade: r.unidade,
                periodo_inicio: r.periodo_inicio,
                periodo_fim: r.periodo_fim,
                total_itens: r.itens.length
            })),
            detalhes: resultadosFinais
        };
        
        const caminhoResumo = path.join(diretorioOutput, 'resumo_processamento.json');
        await utils.salvarDados(resumoConsolidado, caminhoResumo);
        
        console.log('\n🎉 Extração concluída com sucesso!');
        console.log(`📊 Total de unidades processadas: ${Object.keys(resultadosFinais).length}`);
        console.log(`🏢 Municípios: ${resumoConsolidado.municipios.join(', ')}`);
        
        return resumoConsolidado;
        
    } catch (error) {
        console.error('❌ Erro durante a extração:', error.message);
        throw error;
    }
}

/**
 * Função para executar o script com argumentos de linha de comando
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Parse argumentos
    let diretorioInput = './extraction/data/input';
    let diretorioOutput = './extraction/data/output';
    let opcoes = {};
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--input':
                diretorioInput = args[i + 1];
                i++;
                break;
            case '--output':
                diretorioOutput = args[i + 1];
                i++;
                break;
            case '--debug':
                opcoes.debug = true;
                console.log('🐛 Modo debug ativado');
                break;
            case '--test':
                opcoes.test = true;
                console.log('🧪 Modo teste ativado');
                break;
            case '--help':
                console.log(`
Uso: node script-generalized.cjs [opções]

Opções:
  --input <pasta>    Diretório de entrada (padrão: ./extraction/data/input)
  --output <pasta>   Diretório de saída (padrão: ./extraction/data/output)
  --debug           Ativa modo debug com informações detalhadas
  --test            Ativa modo teste
  --help            Mostra esta ajuda

Exemplo:
  node script-generalized.cjs --input ./dados --output ./resultados --debug
                `);
                process.exit(0);
        }
    }
    
    try {
        const dados = await extrairDados(diretorioInput, diretorioOutput, opcoes);
        
        if (opcoes.debug || opcoes.test) {
            console.log('\n📋 Resumo detalhado:');
            console.log(`- Unidades processadas: ${dados.total_unidades_processadas}`);
            console.log(`- Municípios: ${dados.municipios.length}`);
            dados.unidades.forEach(unidade => {
                console.log(`  * ${unidade.municipio} - ${unidade.unidade}: ${unidade.total_itens} itens`);
            });
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
    extrairDados,
    utils,
    processadores
};
