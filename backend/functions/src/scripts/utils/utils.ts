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
