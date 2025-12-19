import * as fs from 'fs';
import * as path from 'path';
import { DadosCompletos } from '../interfaces/interfaces-campos-banco';

// Função para converter movimentações semanais para o formato do Firestore
export function processarMovimentacoes(movimentacoes: { [key: string]: number }[]): { [key: string]: number } {
  const movimentacoesMap: { [key: string]: number } = {};
  
  movimentacoes.forEach(mov => {
    const chave = Object.keys(mov)[0];
    const valor = mov[chave];
    movimentacoesMap[chave] = valor;
  });
  
  return movimentacoesMap;
}

// Função para carregar dados do arquivo JSON
export function carregarDados(): DadosCompletos {
  const caminhoArquivo = path.join(__dirname, './dados/extracao_movimentacoes_semanais.json');
  
  if (!fs.existsSync(caminhoArquivo)) {
    throw new Error(`Arquivo não encontrado: ${caminhoArquivo}`);
  }
  
  const dados = JSON.parse(fs.readFileSync(caminhoArquivo, 'utf8')) as DadosCompletos;
  
  if (!dados.cidades || !Array.isArray(dados.cidades)) {
    throw new Error('Estrutura do JSON inválida: campo "cidades" não encontrado ou não é um array');
  }
  
  return dados;
}

// Função para verificar variáveis de ambiente
export function verificarVariaveisAmbiente(): void {
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não configuradas:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Configure as variáveis de ambiente no arquivo .env');
    process.exit(1);
  }
}

/**
 * Calcula o próximo índice ano_semana baseado no último índice existente
 * Formato: YYYY_WW (ex: 2025_22)
 * 
 * @param movimentacoesSemanais - Objeto com as movimentações semanais existentes
 * @returns string - Próximo índice no formato YYYY_WW
 */
export function calcularProximoIndiceAnoSemana(movimentacoesSemanais: { [key: string]: number }): string {
  const indices = Object.keys(movimentacoesSemanais);
  
  // Se não houver índices, usar a data atual
  if (indices.length === 0) {
    const agora = new Date();
    const ano = agora.getFullYear();
    const semana = calcularNumeroSemanaDoAno(agora);
    return `${ano}_${String(semana).padStart(2, '0')}`;
  }

  // Ordenar índices para pegar o mais recente
  const indicesOrdenados = indices.sort();
  const ultimoIndice = indicesOrdenados[indicesOrdenados.length - 1];
  
  // Parse do último índice (formato: YYYY_WW)
  const [anoStr, semanaStr] = ultimoIndice.split('_');
  let ano = parseInt(anoStr);
  let semana = parseInt(semanaStr);
  
  // Incrementar semana
  semana++;
  
  // Se ultrapassar 52 semanas, incrementar ano e resetar semana
  if (semana > 52) {
    ano++;
    semana = 1;
  }
  
  return `${ano}_${String(semana).padStart(2, '0')}`;
}

/**
 * Calcula o número da semana do ano para uma data específica
 * 
 * @param data - Data para calcular a semana
 * @returns number - Número da semana (1-52)
 */
export function calcularNumeroSemanaDoAno(data: Date): number {
  const primeiroJaneiro = new Date(data.getFullYear(), 0, 1);
  const diasDoAno = Math.floor((data.getTime() - primeiroJaneiro.getTime()) / (24 * 60 * 60 * 1000));
  const numeroSemana = Math.ceil((diasDoAno + primeiroJaneiro.getDay() + 1) / 7);
  return numeroSemana;
}

/**
 * Calcula o índice ano_semana baseado em um período de datas
 * 
 * @param periodoInicio - Data de início no formato DD/MM/YYYY
 * @param periodoFim - Data de fim no formato DD/MM/YYYY
 * @returns string - Índice no formato YYYY_WW
 */
export function calcularIndiceAnoSemanaPorPeriodo(periodoInicio: string, periodoFim: string): string {
  try {
    // Parse da data de fim (formato DD/MM/YYYY)
    const [dia, mes, ano] = periodoFim.split('/').map(n => parseInt(n));
    const dataFim = new Date(ano, mes - 1, dia);
    
    // Calcular número da semana do ano
    const numeroSemana = calcularNumeroSemanaDoAno(dataFim);
    
    return `${ano}_${String(numeroSemana).padStart(2, '0')}`;
    
  } catch (error) {
    console.error('Erro ao calcular índice ano_semana por período:', error);
    // Fallback: usar data atual
    const agora = new Date();
    const ano = agora.getFullYear();
    const semana = calcularNumeroSemanaDoAno(agora);
    return `${ano}_${String(semana).padStart(2, '0')}`;
  }
}