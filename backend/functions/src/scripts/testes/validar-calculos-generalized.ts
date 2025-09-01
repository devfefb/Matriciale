import * as fs from 'fs';
import * as path from 'path';
import { 
  SemanaHistorico, 
  Contagens, 
  Medianas, 
  MedicamentoCalculado,
  DadosCalculados,
  AnaliseReposicao
} from '../interfaces/interfaces-campos-calculados';
import { db } from '../../config/firebase';

/**
 * Versão generalizada do sistema de validação de cálculos
 * Aceita parâmetros dinâmicos para unidades e municípios
 */

// Interfaces base (mantidas)
interface ItemMovimentacao {
  cod_sistemico_item: string;
  descricao_item: string;
  qtd_periodo_final: number;
  [key: string]: any;
}

type DadosTodasUnidades = {
  [nomeUnidade: string]: DadosUnidade;
};

interface DadosUnidade {
  periodo_inicio: string;
  periodo_fim: string;
  itens: ItemMovimentacao[];
}

interface EstoqueCalculado {
  descricao_item: string;
  [campoEstoque: string]: string | number;
}

interface GabaritoItem {
  "NOME ITEM": string;
  "Total Geral": number | null;
  "Md04": number;
  "Md08": number;
  "Md12": number;
  "Md16": number;
  "Md26": number;
  "MdAno": number;
  "MdTt": number;
  "Máximo": number;
  "Metodo": number;
  "MetEst": number;
  "Estoque": number;
  "Reposição": number;
  "Cont04": number;
  "Cont08": number;
  "Cont12": number;
  "Cont16": number;
  "Cont26": number;
  "ContAno": number;
  "ContTt": number;
  "TP_Metodo": string;
  "Md52": number;
  "Cont52": number;
}

interface GabaritoEstrutura {
  unidade: {
    [key: string]: GabaritoItem[];
  };
}

interface ResultadoValidacao {
  medicamento: string;
  unidade: string;
  campos_corretos: string[];
  campos_incorretos: {
    campo: string;
    valor_calculado: any;
    valor_gabarito: any;
    diferenca?: number;
    percentual_erro?: number;
  }[];
  acerto: number;
}

// Configuração dinâmica de unidades
interface ConfiguracaoUnidade {
  nome: string;
  tipo: 'central' | 'esf' | 'consultorio' | 'posto' | 'outros';
  multiplicadores: {
    ordinarios: number;
    entrantes: number;
    recentes: number;
    intermitentes: number;
  };
  regraEstoque: 'soma_todas' | 'valor_proprio' | 'personalizada';
  caminhoArquivo?: string;
}

interface ConfiguracaoValidacao {
  municipio: string;
  periodo: string;
  unidades: ConfiguracaoUnidade[];
  diretorioDados: string;
  caminhoGabarito?: string;
  opcoes: {
    debug: boolean;
    salvarResultados: boolean;
    diretorioOutput: string;
  };
}

// Configurações padrão por tipo de unidade
const CONFIGURACOES_PADRAO: { [tipo: string]: Partial<ConfiguracaoUnidade> } = {
  central: {
    tipo: 'central',
    multiplicadores: {
      ordinarios: 16,
      entrantes: 16,
      recentes: 3,
      intermitentes: 3
    },
    regraEstoque: 'soma_todas'
  },
  esf: {
    tipo: 'esf',
    multiplicadores: {
      ordinarios: 4,
      entrantes: 4,
      recentes: 3,
      intermitentes: 1
    },
    regraEstoque: 'valor_proprio'
  },
  consultorio: {
    tipo: 'consultorio',
    multiplicadores: {
      ordinarios: 3,
      entrantes: 16,
      recentes: 3,
      intermitentes: 1
    },
    regraEstoque: 'valor_proprio'
  },
  outros: {
    tipo: 'outros',
    multiplicadores: {
      ordinarios: 16,
      entrantes: 16,
      recentes: 3,
      intermitentes: 1
    },
    regraEstoque: 'valor_proprio'
  }
};

// Cache global para estoque consolidado
let estoqueConsolidadoCache: Map<string, EstoqueCalculado> | null = null;

/**
 * Detecta automaticamente configuração de unidades com base nos arquivos disponíveis
 */
function detectarConfiguracaoUnidades(diretorioDados: string, municipio: string): ConfiguracaoUnidade[] {
  const unidades: ConfiguracaoUnidade[] = [];
  
  try {
    const arquivos = fs.readdirSync(diretorioDados);
    
    for (const arquivo of arquivos) {
      if (arquivo.endsWith('.json')) {
        const nomeBase = arquivo.replace('.json', '');
        const match = nomeBase.match(/movimentacoes([A-Za-z0-9_]+)$/i);
        
        if (match) {
          const nomeUnidade = match[1];
          let tipoDetectado = 'outros';
          
          // Detectar tipo baseado no nome
          const nomeNormalizado = nomeUnidade.toLowerCase();
          if (nomeNormalizado.includes('caf') || nomeNormalizado.includes('central')) {
            tipoDetectado = 'central';
          } else if (nomeNormalizado.includes('esf')) {
            tipoDetectado = 'esf';
          } else if (nomeNormalizado.includes('olavo') || nomeNormalizado.includes('consult')) {
            tipoDetectado = 'consultorio';
          }
          
          const config = {
            nome: nomeUnidade,
            ...CONFIGURACOES_PADRAO[tipoDetectado],
            caminhoArquivo: path.join(diretorioDados, arquivo)
          } as ConfiguracaoUnidade;
          
          unidades.push(config);
          console.log(`🏥 Unidade detectada: ${nomeUnidade} (tipo: ${tipoDetectado})`);
        }
      }
    }
    
    console.log(`✅ ${unidades.length} unidades detectadas automaticamente`);
    return unidades;
    
  } catch (error) {
    console.error('❌ Erro ao detectar unidades:', error);
    return [];
  }
}

/**
 * Carrega dados de uma unidade
 */
function carregarDadosUnidade(caminhoArquivo: string): DadosUnidade {
  try {
    const dados = fs.readFileSync(caminhoArquivo, 'utf8');
    return JSON.parse(dados);
  } catch (error) {
    console.error(`❌ Erro ao carregar arquivo ${caminhoArquivo}:`, error);
    throw error;
  }
}

/**
 * Calcula estoque consolidado de forma dinâmica
 */
function calcularEstoqueDinamico(
  todasUnidades: DadosTodasUnidades,
  configuracoes: ConfiguracaoUnidade[]
): Map<string, EstoqueCalculado> {
  const estoqueAgrupado = new Map<string, EstoqueCalculado>();
  
  // Encontrar unidade central para regras especiais
  const unidadeCentral = configuracoes.find(c => c.tipo === 'central');
  
  // 1. Processar unidades não-centrais primeiro
  for (const config of configuracoes) {
    if (config.tipo === 'central') continue; // Processar por último
    
    const dadosDaUnidade = todasUnidades[config.nome];
    if (!dadosDaUnidade) continue;
    
    const nomeCampoEstoque = `estoque_${config.nome}`;
    
    for (const item of dadosDaUnidade.itens) {
      if (!estoqueAgrupado.has(item.descricao_item)) {
        estoqueAgrupado.set(item.descricao_item, {
          descricao_item: item.descricao_item,
        });
      }
      
      const itemConsolidado = estoqueAgrupado.get(item.descricao_item)!;
      itemConsolidado[nomeCampoEstoque] = item.qtd_periodo_final;
    }
  }
  
  // 2. Processar unidade central (se existir)
  if (unidadeCentral && todasUnidades[unidadeCentral.nome]) {
    const dadosUnidadeCentral = todasUnidades[unidadeCentral.nome];
    const nomeCampoEstoqueCentral = `estoque_${unidadeCentral.nome}`;
    
    for (const itemCentral of dadosUnidadeCentral.itens) {
      const itemConsolidado = estoqueAgrupado.get(itemCentral.descricao_item);
      
      if (itemConsolidado) {
        if (unidadeCentral.regraEstoque === 'soma_todas') {
          // Somar estoque próprio + todas as outras unidades
          let estoqueCalculado = itemCentral.qtd_periodo_final;
          
          for (const chave in itemConsolidado) {
            if (chave.startsWith('estoque_') && chave !== nomeCampoEstoqueCentral) {
              estoqueCalculado += itemConsolidado[chave] as number;
            }
          }
          
          itemConsolidado[nomeCampoEstoqueCentral] = estoqueCalculado;
        } else {
          // Usar apenas valor próprio
          itemConsolidado[nomeCampoEstoqueCentral] = itemCentral.qtd_periodo_final;
        }
      }
    }
  }
  
  return estoqueAgrupado;
}

/**
 * Carrega estoques de unidades dinamicamente
 */
async function calcularEstoquesUnidades(config: ConfiguracaoValidacao): Promise<Map<string, EstoqueCalculado>> {
  if (estoqueConsolidadoCache) {
    return estoqueConsolidadoCache;
  }
  
  const todasUnidades: DadosTodasUnidades = {};
  
  // Carregar dados de todas as unidades
  for (const unidadeConfig of config.unidades) {
    if (unidadeConfig.caminhoArquivo && fs.existsSync(unidadeConfig.caminhoArquivo)) {
      try {
        const dados = carregarDadosUnidade(unidadeConfig.caminhoArquivo);
        todasUnidades[unidadeConfig.nome] = dados;
        console.log(`📊 Dados carregados para ${unidadeConfig.nome}`);
      } catch (error) {
        console.warn(`⚠️ Erro ao carregar dados de ${unidadeConfig.nome}:`, error);
      }
    }
  }
  
  estoqueConsolidadoCache = calcularEstoqueDinamico(todasUnidades, config.unidades);
  
  // Salvar estoque consolidado para inspeção
  if (config.opcoes.salvarResultados) {
    const caminhoEstoque = path.join(config.opcoes.diretorioOutput, 'estoqueConsolidado.json');
    fs.writeFileSync(caminhoEstoque, JSON.stringify(Array.from(estoqueConsolidadoCache.entries()), null, 2));
    console.log(`💾 Estoque consolidado salvo em: ${caminhoEstoque}`);
  }
  
  return estoqueConsolidadoCache;
}

/**
 * Busca estoque de medicamento para unidade específica
 */
async function buscarEstoqueMedicamento(
  nomeMedicamento: string, 
  unidadeId: string,
  config: ConfiguracaoValidacao
): Promise<number> {
  try {
    const estoqueConsolidado = await calcularEstoquesUnidades(config);
    const estoqueItem = estoqueConsolidado.get(nomeMedicamento);
    
    if (config.opcoes.debug) {
      console.log(`🔍 Buscando estoque para ${nomeMedicamento} na unidade ${unidadeId}:`, estoqueItem);
    }
    
    if (estoqueItem) {
      const nomeCampoEstoque = `estoque_${unidadeId}`;
      if (nomeCampoEstoque in estoqueItem) {
        return Number(estoqueItem[nomeCampoEstoque]);
      }
    }
    
    return 0;
  } catch (error) {
    console.error(`Erro ao buscar estoque para ${nomeMedicamento} na unidade ${unidadeId}:`, error);
    return 0;
  }
}

// --- FUNÇÕES DE CÁLCULO (mantidas do original) ---
function calcularContagensParaHistorico(historicoSemanas: SemanaHistorico[]): Contagens {
  const contarUltimas = (n: number): number => {
    const ultimasNSemanas = historicoSemanas.slice(-n);
    return ultimasNSemanas.filter(s => s.value > 0).length;
  };

  const cont04 = contarUltimas(4);
  const cont08 = contarUltimas(8);
  const cont12 = contarUltimas(12);
  const cont16 = contarUltimas(16);
  const cont26 = contarUltimas(26);
  const cont52 = contarUltimas(52);

  const contTotal = historicoSemanas.filter(s => s.value > 0).length;

  let contAno = 0;
  if (historicoSemanas.length > 0) {
    const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
    contAno = historicoSemanas
      .filter(s => s.week.startsWith(anoMaisRecente) && s.value > 0)
      .length;
  }

  return {
    Cont04: cont04,
    Cont08: cont08,
    Cont12: cont12,
    Cont16: cont16,
    Cont26: cont26,
    Cont52: cont52,
    ContAno: contAno,
    ContTt: contTotal
  };
}

function calcularMaximaMedicamento(historicoSemanas: SemanaHistorico[]): number {
  const valores = historicoSemanas.map(s => s.value);
  const numerosValidos = valores.filter(v => typeof v === 'number' && !isNaN(v));

  if (numerosValidos.length === 0) {
    return 0;
  }

  return Math.max(...numerosValidos);
}

function calcularMediana(numeros: number[]): number {
  try {
    if (!Array.isArray(numeros) || numeros.length === 0) {
      return 0;
    }
    
    const numerosValidos = numeros.filter(n => typeof n === 'number' && !isNaN(n) && n !== null && n !== undefined);
    
    if (numerosValidos.length === 0) {
      return 0;
    }
    
    const sorted = [...numerosValidos].sort((a, b) => a - b);
    const middleIndex = Math.floor(sorted.length / 2);
    
    let mediana: number;
    if (sorted.length % 2 !== 0) {
      mediana = sorted[middleIndex];
    } else {
      mediana = (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
    }
    
    return Math.round(mediana);
    
  } catch (error) {
    console.warn('⚠️ Erro ao calcular mediana:', error);
    return 0;
  }
}

function calcularMedianasParaHistorico(historicoSemanas: SemanaHistorico[]): Medianas {
  const historicoValoresComZeros = historicoSemanas.map(s => s.value);
  const historicoValoresSemZeros = historicoValoresComZeros.filter(v => v > 0);

  const md04 = calcularMediana(historicoValoresComZeros.slice(-4).filter(v => v > 0));
  const md08 = calcularMediana(historicoValoresComZeros.slice(-8).filter(v => v > 0));
  const md12 = calcularMediana(historicoValoresComZeros.slice(-12).filter(v => v > 0));
  const md16 = calcularMediana(historicoValoresComZeros.slice(-16).filter(v => v > 0));
  const md52 = calcularMediana(historicoValoresComZeros.slice(-52).filter(v => v > 0));
  const md26 = calcularMediana(historicoValoresComZeros.slice(-26).filter(v => v > 0));
  const mdTotal = calcularMediana(historicoValoresSemZeros);

  let mdAno = 0;
  if (historicoSemanas.length > 0) {
    const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
    const valoresDoAno = historicoSemanas
      .filter(s => s.week.startsWith(anoMaisRecente))
      .map(s => s.value)
      .filter(v => v > 0);
    mdAno = calcularMediana(valoresDoAno);
  }
  
  return {
    Md04: md04,
    Md08: md08,
    Md12: md12,
    Md16: md16,
    Md26: md26,
    Md52: md52,
    MdAno: mdAno,
    MdTt: mdTotal
  };
}

function calcularTPMetodo(dadosCalculados: DadosCalculados): string {
  const { contagens, semanas, totalSemanasHistorico } = dadosCalculados;

  if (contagens.ContTt === 1) {
    const ultimaSemanaHistorico = semanas[semanas.length - 1];
    if (ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
      return "5.ENTRANTES";
    }
  }

  if (contagens.Cont16 === 0) {
    return "3.INATIVOS";
  }

  const periodo = Math.min(totalSemanasHistorico);
  if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
    return "2.INTERMITENTES";
  }

  if (contagens.Cont04 > 0 && (contagens.Cont04 / 4) >= 0.5 && contagens.ContTt === contagens.Cont04) {
    return "4.RECENTES";
  }
  if (contagens.Cont08 > 0 && (contagens.Cont08 / 8) >= 0.5 && contagens.ContTt === contagens.Cont08) {
    return "4.RECENTES";
  }
  if (contagens.Cont12 > 0 && (contagens.Cont12 / 12) >= 0.5 && contagens.ContTt === contagens.Cont12) {
    return "4.RECENTES";
  }
  if (contagens.Cont16 > 0 && (contagens.Cont16 / 16) >= 0.5 && contagens.ContTt === contagens.Cont16) {
    return "4.RECENTES";
  }
  if (contagens.Cont26 > 0 && (contagens.Cont26 / 26) >= 0.5 && contagens.ContTt === contagens.Cont26) {
    return "4.RECENTES";
  }
  
  return "1.ORDINÁRIOS";
}

function calcularMetodo(dadosMedicamento: {
  medianas: Medianas;
  maximo: number;
  tp_metodo: string;
  totalGeral: number;
}): number {

  if (dadosMedicamento.tp_metodo === "3.INATIVOS") {
    return 0;
  }
  if (dadosMedicamento.tp_metodo === "5.ENTRANTES") {
    return dadosMedicamento.maximo;
  }
  if (dadosMedicamento.tp_metodo === "4.RECENTES" || dadosMedicamento.tp_metodo === "1.ORDINÁRIOS") {
    const todasAsMedianas = Object.values(dadosMedicamento.medianas);
    return Math.max(...todasAsMedianas);
  }
  if (dadosMedicamento.tp_metodo === "2.INTERMITENTES") {
    return dadosMedicamento.totalGeral / 52 ? Math.floor(dadosMedicamento.totalGeral / 52) : 1;
  }

  return 0;
}

/**
 * Calcula MetEst usando configuração dinâmica da unidade
 */
function calcularMetEst(tpMetodo: string, metodo: number, unidadeId: string, maximo: number, configuracoes: ConfiguracaoUnidade[]): number {
  const configUnidade = configuracoes.find(c => c.nome === unidadeId);
  
  if (!configUnidade) {
    console.warn(`⚠️ Configuração não encontrada para unidade ${unidadeId}, usando valores padrão`);
    return metodo * 16; // Padrão genérico
  }

  const mult = configUnidade.multiplicadores;

  switch (tpMetodo) {
    case "1.ORDINÁRIOS":
      return metodo * mult.ordinarios;
    case "2.INTERMITENTES":
      return maximo * mult.intermitentes;
    case "3.INATIVOS": 
      return 0;
    case "5.ENTRANTES": 
      return metodo * mult.entrantes;
    case "4.RECENTES": 
      return maximo * mult.recentes;
    default: 
      return metodo * mult.ordinarios;
  }
}

function calcularReposicao(metEst: number, estoque: number): number {
  if (typeof metEst !== 'number' || typeof estoque !== 'number') {
    throw new Error('MetEst e estoque devem ser números válidos');
  }
  return (metEst - estoque);
}

function converterMovimentacoesParaHistorico(movimentacoes: { [key: string]: number }): SemanaHistorico[] {
  const historico: SemanaHistorico[] = [];
  const semanas = Object.keys(movimentacoes).sort();
  
  for (const semana of semanas) {
    historico.push({
      week: semana,
      value: movimentacoes[semana]
    });
  }
  
  return historico;
}

/**
 * Calcula campos de medicamento usando configuração dinâmica
 */
async function calcularCamposMedicamentoGeneralizado(
  medicamento: MedicamentoCalculado, 
  unidadeId: string,
  config: ConfiguracaoValidacao
): Promise<{
  contagens: Contagens;
  maximo: number;
  medianas: Medianas;
  tp_metodo: string;
  metodo: number;
  metEst: number;
  reposicao: number;
  analise_reposicao: AnaliseReposicao;
  totalGeral: number;
  estoque: number;
  ultimaSemana: string;
}> {
  const historicoSemanas = converterMovimentacoesParaHistorico(medicamento.movimentacoes_semanais);
  const totalGeral = historicoSemanas.reduce((acc, curr) => acc + curr.value, 0);
  
  if (historicoSemanas.length === 0) {
    throw new Error(`Medicamento sem movimentações: ${medicamento.nome}`);
  }
  
  const contagens = calcularContagensParaHistorico(historicoSemanas);
  const maximo = calcularMaximaMedicamento(historicoSemanas);
  const medianas = calcularMedianasParaHistorico(historicoSemanas);
  
  const dadosCalculados: DadosCalculados = {
    contagens,
    semanas: historicoSemanas,
    totalSemanasHistorico: historicoSemanas.length
  };
  const tp_metodo = calcularTPMetodo(dadosCalculados);
  
  const metodo = calcularMetodo({
    medianas,
    maximo,
    tp_metodo,
    totalGeral
  });

  const metEst = calcularMetEst(tp_metodo, metodo, unidadeId, maximo, config.unidades);
  const estoque = await buscarEstoqueMedicamento(medicamento.nome, unidadeId, config);
  const reposicao = calcularReposicao(metEst, estoque);
  
  const analise_reposicao: AnaliseReposicao = {
    metEst,
    estoque_atual: estoque,
    reposicao_calculada: reposicao,
    status: reposicao > 0 ? 'NECESSITA_REPOSICAO' : 'ESTOQUE_SUFICIENTE',
    percentual_cobertura: estoque > 0 ? ((estoque / metEst) * 100).toFixed(2) : '0'
  };

  const ultimaSemana = historicoSemanas.length > 0 ? historicoSemanas[historicoSemanas.length - 1].week : 'N/A';

  return {
    contagens,
    maximo,
    medianas,
    tp_metodo,
    metodo,
    metEst,
    reposicao,
    analise_reposicao,
    totalGeral,
    estoque,
    ultimaSemana
  };
}

// --- FUNÇÕES DE COMPARAÇÃO (mantidas do original) ---
function compararCamposComMapeamento(
  calculado: any, 
  gabarito: any, 
  mapeamento: { calculado: string; gabarito: string }[]
): { corretos: string[], incorretos: { campo: string; valor_calculado: any; valor_gabarito: any; diferenca?: number; percentual_erro?: number }[] } {
  const corretos: string[] = [];
  const incorretos: { campo: string; valor_calculado: any; valor_gabarito: any; diferenca?: number; percentual_erro?: number }[] = [];

  for (const mapeamentoCampo of mapeamento) {
    let valorCalculado: any;
    let valorGabarito: any;

    if (mapeamentoCampo.calculado.includes('.')) {
      const [objeto, propriedade] = mapeamentoCampo.calculado.split('.');
      valorCalculado = calculado[objeto]?.[propriedade];
    } else {
      valorCalculado = calculado[mapeamentoCampo.calculado];
    }

    valorGabarito = gabarito[mapeamentoCampo.gabarito];

    if (valorGabarito === null && valorCalculado === 0) {
      valorGabarito = 0;
    }

    valorCalculado = normalizarValorParaComparacao(valorCalculado, mapeamentoCampo.calculado);
    valorGabarito = normalizarValorParaComparacao(valorGabarito, mapeamentoCampo.gabarito);

    if (JSON.stringify(valorCalculado) === JSON.stringify(valorGabarito)) {
      corretos.push(mapeamentoCampo.calculado);
    } else {
      let diferenca: number | undefined;
      let percentualErro: number | undefined;
      
      if (typeof valorCalculado === 'number' && typeof valorGabarito === 'number') {
        diferenca = valorCalculado - valorGabarito;
        if (valorGabarito !== 0) {
          percentualErro = Math.abs((diferenca / valorGabarito) * 100);
        } else if (valorCalculado !== 0) {
          percentualErro = 100;
        } else {
          percentualErro = 0;
        }
      }

      incorretos.push({
        campo: mapeamentoCampo.calculado,
        valor_calculado: valorCalculado,
        valor_gabarito: valorGabarito,
        diferenca,
        percentual_erro: percentualErro
      });
    }
  }

  return { corretos, incorretos };
}

function normalizarValorParaComparacao(valor: any, campo: string): any {
  if (valor === null || valor === undefined) {
    return 0;
  }
  return valor;
}

function calcularTaxaAcerto(corretos: string[], total: number): number {
  return total > 0 ? (corretos.length / total) * 100 : 0;
}

/**
 * Função principal de validação generalizada
 */
export async function validarCalculosGeneralizado(config: ConfiguracaoValidacao): Promise<void> {
  try {
    console.log('🔍 Iniciando validação generalizada de cálculos...');
    console.log(`🏢 Município: ${config.municipio}`);
    console.log(`📅 Período: ${config.periodo}`);
    console.log(`🏥 Unidades: ${config.unidades.map(u => u.nome).join(', ')}`);
    
    // Carregar gabarito
    const caminhoGabarito = config.caminhoGabarito || 
      path.join(__dirname, '../../../test-gabaritos/gabarito-campos-calculados.json');
      
    if (!fs.existsSync(caminhoGabarito)) {
      throw new Error(`Gabarito não encontrado: ${caminhoGabarito}`);
    }
    
    const gabaritoData = fs.readFileSync(caminhoGabarito, 'utf8');
    const gabarito: GabaritoEstrutura = JSON.parse(gabaritoData);
    
    const totalGabarito = Object.values(gabarito.unidade).reduce((acc, unidade) => acc + unidade.length, 0);
    console.log(`📊 Gabarito carregado com ${totalGabarito} medicamentos`);
    
    // Buscar dados do Firebase
    const municipiosSnapshot = await db.collection('municipio').get();
    
    const resultados: ResultadoValidacao[] = [];
    let totalProcessados = 0;
    let totalSucessos = 0;
    
    const semanasPorUnidade = new Map<string, Set<string>>();
    const ultimaSemanaGeral = new Set<string>();
    
    // Mapeamento de campos
    const mapeamentoCampos = [
      { calculado: 'contagens.Cont04', gabarito: 'Cont04' },
      { calculado: 'contagens.Cont08', gabarito: 'Cont08' },
      { calculado: 'contagens.Cont12', gabarito: 'Cont12' },
      { calculado: 'contagens.Cont16', gabarito: 'Cont16' },
      { calculado: 'contagens.Cont26', gabarito: 'Cont26' },
      { calculado: 'contagens.Cont52', gabarito: 'Cont52' },
      { calculado: 'contagens.ContAno', gabarito: 'ContAno' },
      { calculado: 'contagens.ContTt', gabarito: 'ContTt' },
      { calculado: 'maximo', gabarito: 'Máximo' },
      { calculado: 'medianas.Md04', gabarito: 'Md04' },
      { calculado: 'medianas.Md08', gabarito: 'Md08' },
      { calculado: 'medianas.Md12', gabarito: 'Md12' },
      { calculado: 'medianas.Md16', gabarito: 'Md16' },
      { calculado: 'medianas.Md26', gabarito: 'Md26' },
      { calculado: 'medianas.Md52', gabarito: 'Md52' },
      { calculado: 'medianas.MdAno', gabarito: 'MdAno' },
      { calculado: 'medianas.MdTt', gabarito: 'MdTt' },
      { calculado: 'tp_metodo', gabarito: 'TP_Metodo' },
      { calculado: 'metodo', gabarito: 'Metodo' },
      { calculado: 'metEst', gabarito: 'MetEst' },
      { calculado: 'reposicao', gabarito: 'Reposição' },
      { calculado: 'totalGeral', gabarito: 'Total Geral' },
      { calculado: 'estoque', gabarito: 'Estoque' }
    ];
    
    for (const municipioDoc of municipiosSnapshot.docs) {
      const unidadesSnapshot = await municipioDoc.ref.collection('unidades').get();
      
      for (const unidadeDoc of unidadesSnapshot.docs) {
        // Verificar se a unidade está na configuração
        const configUnidade = config.unidades.find(u => u.nome === unidadeDoc.id);
        if (!configUnidade) {
          if (config.opcoes.debug) {
            console.log(`⏭️ Pulando unidade não configurada: ${unidadeDoc.id}`);
          }
          continue;
        }
        
        const medicamentosSnapshot = await unidadeDoc.ref.collection('medicamentos_unidade').get();
        
        for (const medicamentoDoc of medicamentosSnapshot.docs) {
          totalProcessados++;
          
          try {
            const medicamento = medicamentoDoc.data() as MedicamentoCalculado;
            
            // Buscar no gabarito
            const medicamentosUnidade = gabarito.unidade[unidadeDoc.id];
            if (!medicamentosUnidade) {
              console.warn(`⚠️ Unidade não encontrada no gabarito: ${unidadeDoc.id}`);
              continue;
            }
            
            const gabaritoItem = medicamentosUnidade.find(g => 
              g["NOME ITEM"] === medicamento.nome
            );
            
            if (!gabaritoItem) {
              console.warn(`⚠️ Medicamento não encontrado no gabarito: ${medicamento.nome} (${unidadeDoc.id})`);
              continue;
            }
            
            // Calcular campos usando configuração dinâmica
            const camposCalculados = await calcularCamposMedicamentoGeneralizado(medicamento, unidadeDoc.id, config);
            
            // Comparar campos
            const { corretos, incorretos } = compararCamposComMapeamento(camposCalculados, gabaritoItem, mapeamentoCampos);
            
            const acerto = calcularTaxaAcerto(corretos, mapeamentoCampos.length);
            
            const resultado: ResultadoValidacao = {
              medicamento: medicamento.nome,
              unidade: unidadeDoc.id,
              campos_corretos: corretos,
              campos_incorretos: incorretos,
              acerto
            };
            
            resultados.push(resultado);
            
            if (acerto === 100) {
              totalSucessos++;
            }
            
            if (config.opcoes.debug) {
              console.log(`✅ ${medicamento.nome} (${unidadeDoc.id}): ${acerto.toFixed(1)}% de acerto - Última semana: ${camposCalculados.ultimaSemana}`);
            }
            
            // Armazenar informações de semanas
            if (!semanasPorUnidade.has(unidadeDoc.id)) {
              semanasPorUnidade.set(unidadeDoc.id, new Set());
            }
            semanasPorUnidade.get(unidadeDoc.id)!.add(camposCalculados.ultimaSemana);
            ultimaSemanaGeral.add(camposCalculados.ultimaSemana);
            
          } catch (error) {
            console.error(`❌ Erro ao processar medicamento ${medicamentoDoc.id}:`, error);
          }
        }
      }
    }
    
    // Calcular estatísticas finais
    const taxaAcertoGeral = totalProcessados > 0 ? (totalSucessos / totalProcessados) * 100 : 0;
    const acertoMedio = resultados.length > 0 ? 
      resultados.reduce((acc, r) => acc + r.acerto, 0) / resultados.length : 0;
    
    console.log('\n🎉 Validação concluída!');
    console.log('📊 Estatísticas finais:');
    console.log(`   📦 Total processados: ${totalProcessados}`);
    console.log(`   ✅ Perfeitos (100%): ${totalSucessos}`);
    console.log(`   📈 Taxa de acerto geral: ${taxaAcertoGeral.toFixed(2)}%`);
    console.log(`   📊 Acerto médio: ${acertoMedio.toFixed(2)}%`);
    
    // Salvar resultados se solicitado
    if (config.opcoes.salvarResultados) {
      const relatorio = {
        configuracao: config,
        data_validacao: new Date().toISOString(),
        estatisticas: {
          total_processados: totalProcessados,
          perfeitos: totalSucessos,
          taxa_acerto_geral: taxaAcertoGeral,
          acerto_medio: acertoMedio
        },
        resultados_detalhados: resultados
      };
      
      const caminhoRelatorio = path.join(config.opcoes.diretorioOutput, `relatorio-validacao-${config.municipio}-${Date.now()}.json`);
      fs.writeFileSync(caminhoRelatorio, JSON.stringify(relatorio, null, 2));
      console.log(`📝 Relatório salvo em: ${caminhoRelatorio}`);
    }
    
  } catch (error) {
    console.error('💥 Erro durante a validação:', error);
    throw error;
  }
}

/**
 * Função para criar configuração automaticamente com base no diretório
 */
function criarConfiguracaoAutomatica(
  municipio: string,
  diretorioDados: string,
  opcoes: Partial<ConfiguracaoValidacao['opcoes']> = {}
): ConfiguracaoValidacao {
  
  const unidades = detectarConfiguracaoUnidades(diretorioDados, municipio);
  
  if (unidades.length === 0) {
    throw new Error('Nenhuma unidade detectada no diretório especificado');
  }
  
  const config: ConfiguracaoValidacao = {
    municipio,
    periodo: new Date().toISOString().split('T')[0],
    unidades,
    diretorioDados,
    opcoes: {
      debug: false,
      salvarResultados: true,
      diretorioOutput: path.resolve('test-output'),
      ...opcoes
    }
  };
  
  return config;
}

/**
 * Função para compatibilidade com a versão anterior
 */
export async function validarCalculosComGabarito(): Promise<void> {
  const diretorioDados = path.join(__dirname, '../dados/2025_22');
  const config = criarConfiguracaoAutomatica('palmares_paulista', diretorioDados, { debug: true });
  
  await validarCalculosGeneralizado(config);
}

// Função principal para execução como script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Validação Generalizada de Cálculos

Uso: node validar-calculos-generalized.js [opções]

Opções:
  --municipio <nome>        Nome do município
  --dados <pasta>          Diretório com dados das unidades
  --gabarito <arquivo>     Caminho do arquivo gabarito
  --output <pasta>         Diretório de saída
  --debug                  Ativa logs detalhados
  --auto                   Detecta configuração automaticamente
  --help                   Mostra esta ajuda

Exemplo:
  node validar-calculos-generalized.js --municipio sao_paulo --dados ./dados --debug
    `);
    process.exit(0);
  }
  
  let municipio = 'municipio_teste';
  let diretorioDados = path.join(__dirname, '../dados/2025_22');
  let opcoes: Partial<ConfiguracaoValidacao['opcoes']> = {};
  let caminhoGabarito: string | undefined;
  
  // Parse argumentos
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--municipio':
        municipio = args[i + 1];
        i++;
        break;
      case '--dados':
        diretorioDados = path.resolve(args[i + 1]);
        i++;
        break;
      case '--gabarito':
        caminhoGabarito = path.resolve(args[i + 1]);
        i++;
        break;
      case '--output':
        opcoes.diretorioOutput = path.resolve(args[i + 1]);
        i++;
        break;
      case '--debug':
        opcoes.debug = true;
        break;
      case '--auto':
        // Modo automático - usar detecção padrão
        break;
    }
  }
  
  try {
    console.log('🚀 Iniciando validação generalizada...');
    
    const config = criarConfiguracaoAutomatica(municipio, diretorioDados, opcoes);
    if (caminhoGabarito) {
      config.caminhoGabarito = caminhoGabarito;
    }
    
    await validarCalculosGeneralizado(config);
    
    console.log('✅ Validação executada com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro na validação:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { 
  ConfiguracaoValidacao, 
  ConfiguracaoUnidade, 
  criarConfiguracaoAutomatica
};
