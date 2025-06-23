#!/usr/bin/env node

/**
 * Sistema de Análise de Reposição de Estoque Farmacêutico
 * Metodologia Matriciale
 * 
 * Comando: node script.js
 * Processa arquivos em data/input/ e gera relatórios em data/output/
 */

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const moment = require('moment');

// Configurações globais
const CONFIG = {
  inputDir: path.join(__dirname, 'data/input'),
  outputDir: path.join(__dirname, 'data/output'),
  timestamp: moment().format('YYYY-MM-DD_HH-mm-ss'),
  debugMode: process.argv.includes('--debug'),
};

// Criar estrutura de output
const outputPath = path.join(CONFIG.outputDir, `${CONFIG.timestamp}_processamento`);
const paths = {
  base: outputPath,
  intermediarios: path.join(outputPath, 'intermediarios'),
  logs: path.join(outputPath, 'logs'),
  relatorios: path.join(outputPath, 'relatorios_finais'),
  estatisticas: path.join(outputPath, 'estatisticas')
};

// Criar diretórios se não existirem
Object.values(paths).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Sistema de logs
class Logger {
  constructor() {
    this.processamentoLog = path.join(paths.logs, 'processamento.log');
    this.validacoesLog = path.join(paths.logs, 'validacoes.log');
    this.errosLog = path.join(paths.logs, 'erros.log');
  }

  log(level, message, logFile = 'processamento') {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const logMessage = `${timestamp} [${level}] ${message}\n`;
    
    console.log(logMessage.trim());
    
    const file = logFile === 'validacoes' ? this.validacoesLog : 
                 logFile === 'erros' ? this.errosLog : this.processamentoLog;
    
    fs.appendFileSync(file, logMessage);
  }

  info(message) { this.log('INFO', message); }
  warn(message) { this.log('WARN', message, 'validacoes'); }
  error(message) { this.log('ERROR', message, 'erros'); }
}

const logger = new Logger();

// Importar utilitários
const BalanceteProcessor = require('./utils/balanceteProcessor.cjs');
const MovimentacaoProcessor = require('./utils/movimentacaoProcessor.cjs');
const DataSynthesizer = require('./utils/dataSynthesizer.cjs');
const MatricialeAnalyzer = require('./utils/matricialeAnalyzer.cjs');
const ReportGenerator = require('./utils/reportGenerator.cjs');

async function main() {
  try {
  //  logger.info('Iniciando processamento do Sistema Matriciale');
  //  logger.info(`Timestamp: ${CONFIG.timestamp}`);
  //  logger.info(`Input: ${CONFIG.inputDir}`);
  //  logger.info(`Output: ${outputPath}`);

    // 1. Verificar arquivos de entrada
    const inputFiles = fs.readdirSync(CONFIG.inputDir);
    const balanceteFiles = inputFiles.filter(f => f.includes('Balancete') && f.endsWith('.xlsx'));
    const movimentacaoFiles = inputFiles.filter(f => f.includes('Movimentação') && f.endsWith('.pdf'));

  //  logger.info(`Encontrados ${balanceteFiles.length} arquivos de balancete`);
  //  logger.info(`Encontrados ${movimentacaoFiles.length} arquivos de movimentação`);

    if (balanceteFiles.length === 0 || movimentacaoFiles.length === 0) {
      throw new Error('Arquivos de entrada insuficientes');
    }

    // 2. Processar Balancetes
  //  logger.info('Processando arquivos de balancete...');
    const balanceteProcessor = new BalanceteProcessor(logger);
    const balanceteData = await balanceteProcessor.processFiles(balanceteFiles.map(f => 
      path.join(CONFIG.inputDir, f)
    ));

    // Salvar dados intermediários
    fs.writeFileSync(
      path.join(paths.intermediarios, 'balancete_processado.json'),
      JSON.stringify(balanceteData, null, 2)
    );
  //  logger.info(`Balancete processado: ${balanceteData.total_registros} registros`);

    // 3. Processar Movimentações
  //  logger.info('Processando arquivos de movimentação...');
    const movimentacaoProcessor = new MovimentacaoProcessor(logger);
    const movimentacaoData = await movimentacaoProcessor.processFiles(movimentacaoFiles.map(f => 
      path.join(CONFIG.inputDir, f)
    ));

    // Salvar dados intermediários
    fs.writeFileSync(
      path.join(paths.intermediarios, 'movimentacao_processada.json'),
      JSON.stringify(movimentacaoData, null, 2)
    );
  //  logger.info(`Movimentação processada: ${movimentacaoData.total_movimentacoes} registros`);

    // 4. Gerar dados sintéticos
  //  logger.info('Gerando dados sintéticos...');
    const synthesizer = new DataSynthesizer(logger);
    const syntheticData = synthesizer.generateHistoricalData(movimentacaoData);

    fs.writeFileSync(
      path.join(paths.intermediarios, 'dados_sinteticos.json'),
      JSON.stringify(syntheticData, null, 2)
    );
  //  logger.info(`Dados sintéticos gerados: ${syntheticData.total_movimentacoes_sinteticas} registros`);

    // 5. Consolidar dados
  //  logger.info('Consolidando dados reais e sintéticos...');
    const consolidatedData = {
      timestamp: new Date().toISOString(),
      movimentacoes: [...syntheticData.movimentacoes_sinteticas, ...movimentacaoData.movimentacoes]
        .sort((a, b) => new Date(a.data_movimentacao) - new Date(b.data_movimentacao))
    };

    fs.writeFileSync(
      path.join(paths.intermediarios, 'base_consolidada.json'),
      JSON.stringify(consolidatedData, null, 2)
    );

    // 6. Aplicar metodologia Matriciale
  //  logger.info('Aplicando metodologia de análise...');
    const analyzer = new MatricialeAnalyzer(logger);
    const metrics = analyzer.calculateMetrics(consolidatedData, balanceteData);

    fs.writeFileSync(
      path.join(paths.intermediarios, 'metricas_calculadas.json'),
      JSON.stringify(metrics, null, 2)
    );
  //  logger.info(`Métricas calculadas para ${metrics.itens.length} itens`);

    // 7. Gerar relatórios Excel
  //  logger.info('Gerando relatórios Excel...');
    const reportGenerator = new ReportGenerator(logger);
    await reportGenerator.generateReports(metrics, paths.relatorios, CONFIG.timestamp);

    // 8. Gerar estatísticas finais
  //  logger.info('Gerando estatísticas finais...');
    const stats = {
      timestamp: new Date().toISOString(),
      duracao_processamento: moment().diff(moment(CONFIG.timestamp, 'YYYY-MM-DD_HH-mm-ss'), 'seconds') + 's',
      estatisticas: {
        total_itens_processados: metrics.itens.length,
        total_movimentacoes: consolidatedData.movimentacoes.length,
        total_farmacias: [...new Set(movimentacaoData.movimentacoes.map(m => m.unidade))].length,
        periodo_analise: '52 semanas',
        dados_sinteticos_gerados: syntheticData.total_movimentacoes_sinteticas,
        itens_com_reposicao: metrics.itens.filter(i => i.reposicao > 0).length,
        valor_reposicao_total: metrics.itens.reduce((sum, i) => sum + (i.reposicao * i.valor_unitario || 0), 0)
      }
    };

    fs.writeFileSync(
      path.join(paths.estatisticas, 'resumo_processamento.json'),
      JSON.stringify(stats, null, 2)
    );

  //  logger.info('Processamento concluído com sucesso!');
  //  logger.info(`Relatórios gerados em: ${paths.relatorios}`);
  //  logger.info(`Duração total: ${stats.duracao_processamento}`);

  } catch (error) {
  //  logger.error(`Erro fatal: ${error.message}`);
  //  logger.error(error.stack);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG, Logger }; 