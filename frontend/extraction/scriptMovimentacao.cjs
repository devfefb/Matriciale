#!/usr/bin/env node

/**
 * Script Isolado de Processamento de Movimentação
 * Sistema Matriciale - Módulo Movimentação
 * 
 * Comando: node scriptMovimentacao.cjs
 * Processa apenas arquivos de movimentação (.pdf) com limitação de 3 páginas
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Configurações específicas para movimentação
const CONFIG = {
  inputDir: path.join(__dirname, 'data/input'),
  outputDir: path.join(__dirname, 'data/output'),
  timestamp: moment().format('YYYY-MM-DD_HH-mm-ss'),
  debugMode: process.argv.includes('--debug'),
  maxPages: 10, // Limitação específica para este script
};

// Criar estrutura de output específica para movimentação
const outputPath = path.join(CONFIG.outputDir, `${CONFIG.timestamp}_movimentacao`);
const paths = {
  base: outputPath,
  intermediarios: path.join(outputPath, 'intermediarios'),
  logs: path.join(outputPath, 'logs'),
  relatorios: path.join(outputPath, 'relatorios_movimentacao')
};

// Criar diretórios se não existirem
Object.values(paths).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Sistema de logs específico para movimentação
class MovimentacaoLogger {
  constructor() {
    this.processamentoLog = path.join(paths.logs, 'movimentacao_processamento.log');
    this.validacoesLog = path.join(paths.logs, 'movimentacao_validacoes.log');
    this.errosLog = path.join(paths.logs, 'movimentacao_erros.log');
  }

  log(level, message, logFile = 'processamento') {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `${timestamp} [MOVIMENTACAO][${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    const file = logFile === 'validacoes' ? this.validacoesLog : 
                 logFile === 'erros' ? this.errosLog : this.processamentoLog;
    
    fs.appendFileSync(file, logMessage);
  }

  info(message) { this.log('INFO', message); }
  warn(message) { this.log('WARN', message, 'validacoes'); }
  error(message) { this.log('ERROR', message, 'erros'); }
}

const logger = new MovimentacaoLogger();

// Importar processador específico com limitações
const MovimentacaoProcessorLimited = require('./utils/movimentacaoProcessorLimited.cjs');

async function processMovimentacao() {
  try {
    logger.info('=== INICIANDO PROCESSAMENTO ISOLADO DE MOVIMENTAÇÃO ===');
    logger.info(`Timestamp: ${CONFIG.timestamp}`);
    logger.info(`Input: ${CONFIG.inputDir}`);
    logger.info(`Output: ${outputPath}`);
    logger.info(`Limitação: Máximo ${CONFIG.maxPages} páginas por PDF`);

    // 1. Verificar arquivos de movimentação
    const inputFiles = fs.readdirSync(CONFIG.inputDir);
    const movimentacaoFiles = inputFiles.filter(f => f.includes('Movimentação') && f.endsWith('.pdf'));

    logger.info(`Encontrados ${movimentacaoFiles.length} arquivos de movimentação`);

    if (movimentacaoFiles.length === 0) {
      throw new Error('[MOVIMENTACAO] Nenhum arquivo de movimentação encontrado');
    }

    // Listar arquivos encontrados
    movimentacaoFiles.forEach((file, index) => {
      logger.info(`Arquivo ${index + 1}: ${file}`);
    });

    // 2. Processar Movimentações com limitação
    logger.info('Iniciando processamento dos arquivos de movimentação...');
    const movimentacaoProcessor = new MovimentacaoProcessorLimited(logger, CONFIG.maxPages);
    const movimentacaoData = await movimentacaoProcessor.processFiles(movimentacaoFiles.map(f => 
      path.join(CONFIG.inputDir, f)
    ));

    // 3. Salvar dados processados
    const outputFile = path.join(paths.intermediarios, 'movimentacao_processada.json');
    fs.writeFileSync(outputFile, JSON.stringify(movimentacaoData, null, 2));
    
    logger.info(`Movimentação processada: ${movimentacaoData.total_movimentacoes} registros`);
    logger.info(`Período: ${movimentacaoData.periodo_inicio} até ${movimentacaoData.periodo_fim}`);
    logger.info(`Dados salvos em: ${outputFile}`);

    // 4. Gerar estatísticas específicas de movimentação
    logger.info('Gerando estatísticas de movimentação...');
    const stats = {
      timestamp: new Date().toISOString(),
      tipo_processamento: 'movimentacao_isolado',
      limitacao_aplicada: `${CONFIG.maxPages} páginas por PDF`,
      duracao_processamento: moment().diff(moment(CONFIG.timestamp, 'YYYY-MM-DD_HH-mm-ss'), 'seconds') + 's',
      estatisticas: {
        total_arquivos_processados: movimentacaoFiles.length,
        total_movimentacoes: movimentacaoData.total_movimentacoes,
        total_unidades: [...new Set(movimentacaoData.movimentacoes.map(m => m.unidade))].length,
        periodo_inicio: movimentacaoData.periodo_inicio,
        periodo_fim: movimentacaoData.periodo_fim,
         tipos_movimentacao: getMovimentacaoTypes(movimentacaoData.movimentacoes),
         estatisticas_campos: getClassificationStats(movimentacaoData.movimentacoes)
      }
    };

    const statsFile = path.join(paths.relatorios, 'estatisticas_movimentacao.json');
    fs.writeFileSync(statsFile, JSON.stringify(stats, null, 2));

    logger.info('=== PROCESSAMENTO DE MOVIMENTAÇÃO CONCLUÍDO COM SUCESSO ===');
    logger.info(`Relatórios gerados em: ${paths.relatorios}`);
    logger.info(`Duração total: ${stats.duracao_processamento}`);
    logger.info(`Total de movimentações processadas: ${stats.estatisticas.total_movimentacoes}`);

    return movimentacaoData;

  } catch (error) {
    logger.error(`Erro fatal no processamento de movimentação: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
}

// Funções auxiliares para estatísticas
function getMovimentacaoTypes(movimentacoes) {
  const types = {};
  movimentacoes.forEach(mov => {
    // Classificar baseado na presença de entradas/saídas
    let type = 'Indefinido';
    if (mov.entradas && mov.entradas > 0) {
      type = 'Entrada';
    } else if (mov.saidas && mov.saidas > 0) {
      type = 'Saída';
    } else if (mov.historico && mov.historico.toUpperCase().includes('SALDO ANTERIOR')) {
      type = 'Saldo Anterior';
    }
    types[type] = (types[type] || 0) + 1;
  });
  return types;
}

function getClassificationStats(movimentacoes) {
  const stats = {
    total_com_entradas: movimentacoes.filter(m => m.entradas && m.entradas > 0).length,
    total_com_saidas: movimentacoes.filter(m => m.saidas && m.saidas > 0).length,
    total_com_documento: movimentacoes.filter(m => m.documento && m.documento.trim() !== '').length,
    total_com_requisicao: movimentacoes.filter(m => m.requisicao && m.requisicao.trim() !== '').length,
    total_com_observacao: movimentacoes.filter(m => m.observacao && m.observacao.trim() !== '').length
  };
  return stats;
}

// Executar se chamado diretamente
if (require.main === module) {
  processMovimentacao();
}

module.exports = { processMovimentacao, CONFIG, MovimentacaoLogger }; 