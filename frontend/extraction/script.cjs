#!/usr/bin/env node

const path = require('path');
const { processarBalancete } = require('./utils/balanceteUtils.cjs');
const { processarMovimentacao } = require('./utils/movimentacaoUtils.cjs');
const { encontrarArquivosEntrada, validarArquivos, salvarDados } = require('./utils/fileUtils.cjs');

/**
 * Função principal que extrai dados das planilhas balancete e movimentacao
 * @param {string} diretorioInput - Diretório contendo os arquivos de entrada
 * @param {string} diretorioOutput - Diretório para salvar o arquivo de saída
 * @returns {Object} Objeto inventoryData com os dados extraídos
 */
async function extrairDados(diretorioInput = './extraction/data/input', diretorioOutput = './extraction/data/output') {
    console.log('🚀 Iniciando extração de dados...');
    
    try {
        // 1. Encontrar arquivos de entrada
        console.log('📁 Procurando arquivos de entrada...');
        const arquivos = await encontrarArquivosEntrada(diretorioInput);
        
        // 2. Validar arquivos encontrados
        console.log('✅ Validando arquivos...');
        const validacao = await validarArquivos(arquivos);
        
        if (!validacao.valido) {
            throw new Error(`Erro na validação dos arquivos:\n${validacao.erros.join('\n')}`);
        }
        
        console.log(`📊 Arquivo balancete encontrado: ${path.basename(arquivos.balancete)}`);
        console.log(`📈 Arquivo movimentacao encontrado: ${path.basename(arquivos.movimentacao)}`);
        
        // 3. Processar planilha balancete
        console.log('📋 Processando planilha balancete...');
        const itens = await processarBalancete(arquivos.balancete);
        console.log(`✅ ${itens.length} itens movimentados encontrados no balancete`);
        
        // 4. Processar planilha movimentacao
        console.log('📊 Processando planilha movimentacao...');
        const resultado = await processarMovimentacao(arquivos.movimentacao, itens);
        
        // 5. Montar objeto final
        const inventoryData = {
            periodo_inicio: resultado.periodo.periodo_inicio,
            periodo_fim: resultado.periodo.periodo_fim,
            itens: resultado.itens
        };
        
        console.log(`📅 Período de apuração: ${inventoryData.periodo_inicio} a ${inventoryData.periodo_fim}`);
        console.log(`📦 Total de itens processados: ${inventoryData.itens.length}`);
        
        // 6. Salvar resultado (especificar unidade)
        const arquivoSaida = path.join(diretorioOutput, 'inventoryData.json');
        await salvarDados(inventoryData, arquivoSaida);
        
        console.log('🎉 Extração concluída com sucesso!');
        
        return inventoryData;
        
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
    const isDebug = args.includes('--debug');
    const isTest = args.includes('--test');
    
    if (isDebug) {
        console.log('🐛 Modo debug ativado');
    }
    
    if (isTest) {
        console.log('🧪 Modo teste ativado');
    }
    
    try {
        const dados = await extrairDados();
        
        if (isDebug || isTest) {
            console.log('\n📋 Resumo dos dados extraídos:');
            console.log(`- Período: ${dados.periodo_inicio} a ${dados.periodo_fim}`);
            console.log(`- Itens: ${dados.itens.length}`);
            
            if (dados.itens.length > 0) {
                const primeiroItem = dados.itens[0];
                console.log(`- Primeiro item: ${primeiroItem.descricao_item}`);
                console.log(`- Movimentações do primeiro item: ${primeiroItem.movimentacoes.length}`);
            }
        }
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Falha na execução:', error.message);
        process.exit(1);
    }
}

// Executar se for chamado diretamente
if (require.main === module) {
    main();
}

module.exports = {
    extrairDados
};
