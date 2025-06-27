#!/usr/bin/env node

/**
 * Script Isolado de Processamento de Balancete
 * Sistema Matriciale - Módulo Balancete
 * 
 * Comando: node scriptBalancete.cjs
 * Processa apenas arquivos de balancete (.xlsx) com limitação de 50 linhas
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Configurações específicas para balancete
const CONFIG = {
  inputDir: path.join(__dirname, 'data/input'),
  outputDir: path.join(__dirname, 'data/output'),
  timestamp: moment().format('YYYY-MM-DD_HH-mm-ss'),
  debugMode: process.argv.includes('--debug'),
  maxRows: 50, // Limitação específica para este script
};

// Criar estrutura de output específica para balancete
const outputPath = path.join(CONFIG.outputDir, `${CONFIG.timestamp}_balancete`);
const paths = {
  base: outputPath,
  intermediarios: path.join(outputPath, 'intermediarios'),
  logs: path.join(outputPath, 'logs'),
  relatorios: path.join(outputPath, 'relatorios_balancete')
};

// Criar diretórios se não existirem
Object.values(paths).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Sistema de logs específico para balancete
class BalanceteLogger {
  constructor() {
    this.processamentoLog = path.join(paths.logs, 'balancete_processamento.log');
    this.validacoesLog = path.join(paths.logs, 'balancete_validacoes.log');
    this.errosLog = path.join(paths.logs, 'balancete_erros.log');
  }

  log(level, message, logFile = 'processamento') {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `${timestamp} [BALANCETE][${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    const file = logFile === 'validacoes' ? this.validacoesLog : 
                 logFile === 'erros' ? this.errosLog : this.processamentoLog;
    
    fs.appendFileSync(file, logMessage);
  }

  info(message) { this.log('INFO', message); }
  warn(message) { this.log('WARN', message, 'validacoes'); }
  error(message) { this.log('ERROR', message, 'erros'); }
}

const logger = new BalanceteLogger();

// Importar processador específico com limitações
const BalanceteProcessorLimited = require('./utils/balanceteProcessorLimited.cjs');

async function processBalancete() {
  try {
    logger.info('=== INICIANDO PROCESSAMENTO ISOLADO DE BALANCETE ===');
    logger.info(`Timestamp: ${CONFIG.timestamp}`);
    logger.info(`Input: ${CONFIG.inputDir}`);
    logger.info(`Output: ${outputPath}`);
    logger.info(`Limitação: Máximo ${CONFIG.maxRows} linhas por planilha`);

    // 1. Verificar arquivos de balancete
    const inputFiles = fs.readdirSync(CONFIG.inputDir);
    const balanceteFiles = inputFiles.filter(f => f.includes('Balancete') && f.endsWith('.xlsx'));

    logger.info(`Encontrados ${balanceteFiles.length} arquivos de balancete`);

    if (balanceteFiles.length === 0) {
      throw new Error('[BALANCETE] Nenhum arquivo de balancete encontrado');
    }

    // Listar arquivos encontrados
    balanceteFiles.forEach((file, index) => {
      logger.info(`Arquivo ${index + 1}: ${file}`);
    });

    // 2. Processar Balancetes com limitação
    logger.info('Iniciando processamento dos arquivos de balancete...');
    const balanceteProcessor = new BalanceteProcessorLimited(logger, CONFIG.maxRows);
    const balanceteData = await balanceteProcessor.processFiles(balanceteFiles.map(f => 
      path.join(CONFIG.inputDir, f)
    ));

    // 3. Salvar dados processados
    const outputFile = path.join(paths.intermediarios, 'balancete_processado.json');
    fs.writeFileSync(outputFile, JSON.stringify(balanceteData, null, 2));
    
    logger.info(`Balancete processado: ${balanceteData.total_registros} registros`);
    logger.info(`Dados salvos em: ${outputFile}`);

    // 4. Gerar estatísticas específicas de balancete
    logger.info('Gerando estatísticas de balancete...');
    const stats = {
      timestamp: new Date().toISOString(),
      tipo_processamento: 'balancete_isolado',
      limitacao_aplicada: `${CONFIG.maxRows} linhas por planilha`,
      duracao_processamento: moment().diff(moment(CONFIG.timestamp, 'YYYY-MM-DD_HH-mm-ss'), 'seconds') + 's',
      estatisticas: {
        total_arquivos_processados: balanceteFiles.length,
        total_registros: balanceteData.total_registros,
        total_unidades: [...new Set(balanceteData.itens.map(i => i.unidade))].length,
        classificacoes: getClassificationStats(balanceteData.itens),
        valor_total_estoque: balanceteData.itens.reduce((sum, item) => sum + (item.valor_item_periodo_final || 0), 0),
        itens_por_unidade: getItemsByUnit(balanceteData.itens),
        valor_medio_item: balanceteData.itens.length > 0 ? 
          balanceteData.itens.reduce((sum, item) => sum + (item.val_unit_periodo_final || 0), 0) / balanceteData.itens.length : 0
      }
    };

    const statsFile = path.join(paths.relatorios, 'estatisticas_balancete.json');
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));

    logger.info('=== PROCESSAMENTO DE BALANCETE CONCLUÍDO COM SUCESSO ===');
    logger.info(`Relatórios gerados em: ${paths.relatorios}`);
    logger.info(`Duração total: ${stats.duracao_processamento}`);
    logger.info(`Total de itens processados: ${stats.estatisticas.total_registros}`);
    logger.info(`Valor total do estoque: R$ ${stats.estatisticas.valor_total_estoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);

    return balanceteData;

  } catch (error) {
    logger.error(`Erro fatal no processamento de balancete: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Funções auxiliares para estatísticas
function getClassificationStats(itens) {
  const classifications = {};
  itens.forEach(item => {
    const classification = item.classificacao || 'Não Classificado';
    classifications[classification] = (classifications[classification] || 0) + 1;
  });
  return classifications;
}

function getItemsByUnit(itens) {
  const units = {};
  itens.forEach(item => {
    const unit = item.unidade || 'Unidade Desconhecida';
    units[unit] = (units[unit] || 0) + 1;
  });
  return units;
}

// Executar se chamado diretamente
if (require.main === module) {
  processBalancete();
}

module.exports = { processBalancete, CONFIG, BalanceteLogger }; 