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
import { CloudStorageService } from '../../services/CloudStorageService';

// Interfaces para cálculo de estoque
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
  [campoEstoque: string]: string | number; // Permite 'estoque_NOME': numero
}

interface ResultadoCalculos {
  medicamento: string;
  unidade: string;
  campos_calculados: {
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
  };
  sucesso: boolean;
  erro?: string;
}

// Cache global para estoque consolidado
let estoqueConsolidadoCache: Map<string, EstoqueCalculado> | null = null;

// --- FUNÇÕES DE CÁLCULO DE ESTOQUE (copiadas do validar-calculos.ts) ---

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
 * Calcula o estoque consolidado de forma dinâmica para múltiplas unidades,
 * aplicando regras de negócio específicas para a CAF e para as demais unidades.
 */
function calcularEstoqueDinamico(
  todasUnidades: DadosTodasUnidades 
): Map<string, EstoqueCalculado> {
  const estoqueAgrupado = new Map<string, EstoqueCalculado>();

  // 1. Itera sobre cada unidade para processar seus itens.
  for (const nomeUnidade in todasUnidades) {
    const dadosDaUnidade = todasUnidades[nomeUnidade];
    const nomeCampoEstoque = `estoque_${nomeUnidade}`;

    for (const item of dadosDaUnidade.itens) {
      if (!estoqueAgrupado.has(item.descricao_item)) {
        estoqueAgrupado.set(item.descricao_item, {
          descricao_item: item.descricao_item,
        });
      }

      const itemConsolidado = estoqueAgrupado.get(item.descricao_item)!;

      // 2. Aplica a regra para unidades NÃO-CAF: valor direto.
      if (nomeUnidade.toUpperCase() !== 'CAF') {
        itemConsolidado[nomeCampoEstoque] = item.qtd_periodo_final;
      }
    }
  }

  // 3. Processamento especial para a CAF.
  if (todasUnidades.CAF) {
    const dadosCAF = todasUnidades.CAF;
    const nomeCampoEstoqueCAF = 'estoque_CAF';

    for (const itemCAF of dadosCAF.itens) {
      const itemConsolidado = estoqueAgrupado.get(itemCAF.descricao_item);

      if (itemConsolidado) {
        let estoqueCalculadoCAF = itemCAF.qtd_periodo_final;

        for (const chave in itemConsolidado) {
          if (chave.startsWith('estoque_')) {
            estoqueCalculadoCAF += itemConsolidado[chave] as number;
          }
        }

        itemConsolidado[nomeCampoEstoqueCAF] = estoqueCalculadoCAF;
      }
    }
  }

  return estoqueAgrupado;
}

/**
 * Carrega dados de estoque de arquivos JSON do storage ou local
 */
async function carregarDadosEstoqueDoStorage(municipio: string): Promise<Map<string, EstoqueCalculado>> {
  if (estoqueConsolidadoCache) {
    return estoqueConsolidadoCache;
  }

  try {
    console.log(`📦 [ESTOQUE] Carregando dados de estoque para ${municipio}...`);

    const cloudStorageService = new CloudStorageService();
    
    // Lista arquivos do município no storage
    const { arquivos } = await cloudStorageService.listarArquivosPendentes(municipio);
    
    const todasUnidades: DadosTodasUnidades = {};
    
    for (const arquivo of arquivos) {
      try {
        // Extrair nome da unidade do path do arquivo
        const nomeUnidade = extrairNomeUnidadeDoPath(arquivo.path);
        
        // Processar arquivo do storage
        const resultado = await cloudStorageService.processarArquivoUpload(arquivo.path);
        
        if (resultado.sucesso && resultado.dados_processados) {
          todasUnidades[nomeUnidade] = resultado.dados_processados.conteudo;
          console.log(`📋 [ESTOQUE] Dados carregados para unidade ${nomeUnidade}`);
        }
      } catch (error) {
        console.warn(`⚠️ [ESTOQUE] Erro ao carregar arquivo ${arquivo.path}:`, error);
      }
    }

    // Se não conseguiu carregar do storage, tenta carregar dos arquivos locais (fallback para desenvolvimento)
    if (Object.keys(todasUnidades).length === 0) {
      console.log('⚠️ [ESTOQUE] Não foi possível carregar do storage, usando arquivos locais...');
      
      const caminhoCAF = path.join(__dirname, '../../../uploads/inventoryData_Palmares_CAF_2025-09-02T13-53-57-750Z.json');
      const caminhoESF3 = path.join(__dirname, '../../../uploads/inventoryData_Palmares_ESF3_2025-09-02T13-58-17-049Z.json');
      const caminhoOlavo = path.join(__dirname, '../../../uploads/inventoryData_Palmares_OLAVO_2025-09-02T13-58-34-943Z.json');
      
      if (fs.existsSync(caminhoCAF)) todasUnidades.CAF = carregarDadosUnidade(caminhoCAF);
      if (fs.existsSync(caminhoESF3)) todasUnidades.ESF3 = carregarDadosUnidade(caminhoESF3);
      if (fs.existsSync(caminhoOlavo)) todasUnidades.Olavo = carregarDadosUnidade(caminhoOlavo);
    }

    estoqueConsolidadoCache = calcularEstoqueDinamico(todasUnidades);
    
    console.log(`✅ [ESTOQUE] Estoque consolidado calculado para ${estoqueConsolidadoCache.size} itens`);
    
    return estoqueConsolidadoCache;
    
  } catch (error) {
    console.error('❌ [ESTOQUE] Erro ao carregar dados de estoque:', error);
    return new Map();
  }
}

function extrairNomeUnidadeDoPath(arquivoPath: string): string {
  // Extrai nome da unidade do path: uploads/municipio/unidade/tipo/arquivo
  const parts = arquivoPath.split('/');
  if (parts.length >= 3) {
    return parts[2]; // unidade
  }
  
  // Fallback: extrai do nome do arquivo
  const nomeArquivo = parts[parts.length - 1];
  const patterns = [
    /inventoryData.*?([A-Za-z0-9]+)_\d{4}-\d{2}-\d{2}/i,
    /inventory.*?([A-Za-z0-9]+)\./i,
    /([A-Za-z0-9]+).*inventory/i,
  ];
  
  for (const pattern of patterns) {
    const match = nomeArquivo.match(pattern);
    if (match && match[1]) {
      return match[1].toUpperCase();
    }
  }
  
  return 'DESCONHECIDO';
}

async function buscarEstoqueMedicamento(
  nomeMedicamento: string, 
  unidadeId: string,
  municipio: string
): Promise<number> {
  try {
    const estoqueConsolidado = await carregarDadosEstoqueDoStorage(municipio);
    const estoqueItem = estoqueConsolidado.get(nomeMedicamento);

    if (estoqueItem) {
      const nomeCampoEstoque = `estoque_${unidadeId}`;
      if (nomeCampoEstoque in estoqueItem) {
        return Number(estoqueItem[nomeCampoEstoque]);
      }
    }
    
    return 0;
  } catch (error) {
    console.error(`❌ [ESTOQUE] Erro ao buscar estoque para ${nomeMedicamento} na unidade ${unidadeId}:`, error);
    return 0;
  }
}

// --- FUNÇÕES DE CÁLCULO (copiadas do validar-calculos.ts) ---

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
    
    const medianaArredondada = Math.round(mediana);
    
    return medianaArredondada;
    
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
  const { contagens, semanas } = dadosCalculados;

  const ultimaSemanaHistorico = semanas[semanas.length - 1];
  
  if (contagens.Cont04 === 1 && contagens.Cont52 === 1 && ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
    return "5.ENTRANTES";
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

  if (contagens.Cont16 === 0) {
    return "3.INATIVOS";
  }

  const periodo = Math.min(semanas.length, 52);
  if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
    return "2.INTERMITENTES";
  }

  return "1.ORDINÁRIOS";
}

function calcularMetodo(dadosMedicamento: {
  historicoSemanas: SemanaHistorico[];
  medianas: Medianas;
  contagens: Contagens;
  maximo: number;
  tp_metodo: string;
  totalGeral: number;
}): number {

  if (dadosMedicamento.tp_metodo === "3.INATIVOS") {
    return 0;
  }
  if (dadosMedicamento.tp_metodo === "5.ENTRANTES") {
    return dadosMedicamento.historicoSemanas[dadosMedicamento.historicoSemanas.length - 1].value;
  }
  if (dadosMedicamento.tp_metodo === "4.RECENTES" || dadosMedicamento.tp_metodo === "1.ORDINÁRIOS") {
    const todasAsMedianas = Object.values(dadosMedicamento.medianas);
    return Math.max(...todasAsMedianas);
  }

  if (dadosMedicamento.tp_metodo === "2.INTERMITENTES") {
    return Math.round(dadosMedicamento.totalGeral / 52);
  }

  return 0;
}

function calcularMetEst(tpMetodo: string, metodo: number, unidade: String, maximo: number): number {
  switch (tpMetodo) {
    case "1.ORDINÁRIOS":
      if (unidade === 'ESF3') return metodo * 4;
      else if (unidade === 'Olavo') return metodo * 3;
      else return metodo * 16;
    case "2.INTERMITENTES":
      if (unidade === 'CAF') return maximo * 3;
      else return maximo;
    case "3.INATIVOS": return 0;
    case "5.ENTRANTES": 
      if ('ESF3' === unidade) return metodo * 4;
      return metodo * 16;
    case "4.RECENTES": return maximo * 3;
    default: return metodo * 16;
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
 * Calcula a semana de movimentação baseada no período (cópia local)
 * Formato: YYYY_WW (ex: 2025_22)
 */
function calcularSemanaMovimentacaoLocal(periodoInicio: string, periodoFim: string): string {
  try {
    // Parse da data de fim (formato DD/MM/YYYY)
    const [dia, mes, ano] = periodoFim.split('/').map(n => parseInt(n));
    const dataFim = new Date(ano, mes - 1, dia);
    
    // Calcular número da semana do ano
    const primeiroJaneiro = new Date(ano, 0, 1);
    const diasDoAno = Math.floor((dataFim.getTime() - primeiroJaneiro.getTime()) / (24 * 60 * 60 * 1000));
    const numeroSemana = Math.ceil((diasDoAno + primeiroJaneiro.getDay() + 1) / 7);
    
    return `${ano}_${String(numeroSemana).padStart(2, '0')}`;
    
  } catch (error) {
    console.error('Erro ao calcular semana:', error);
    // Fallback: usar data atual
    const agora = new Date();
    const ano = agora.getFullYear();
    const semana = Math.ceil((agora.getTime() - new Date(ano, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
    return `${ano}_${String(semana).padStart(2, '0')}`;
  }
}

// --- FUNÇÃO PRINCIPAL PARA CALCULAR CAMPOS ---

async function calcularCamposMedicamento(
  medicamento: MedicamentoCalculado, 
  unidadeId: string,
  municipio: string
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
    historicoSemanas,
    medianas,
    contagens,
    maximo,
    tp_metodo,
    totalGeral
  });

  const metEst = calcularMetEst(tp_metodo, metodo, unidadeId, maximo);
  const estoque = await buscarEstoqueMedicamento(medicamento.nome, unidadeId, municipio);
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

// --- NOVA LÓGICA DE MOVIMENTAÇÃO SEMANAL ---

/**
 * Atualiza a movimentação semanal de um medicamento seguindo as regras:
 * - Se o índice ano_semana não existe, cria e atribui o valor
 * - Se já existe, cria um novo campo com sufixo _2, _3, etc.
 */
function atualizarMovimentacaoSemanal(
  movimentacoesAtuais: { [key: string]: number },
  anoSemana: string,
  novoValor: number
): { [key: string]: number } {
  const movimentacoesAtualizadas = { ...movimentacoesAtuais };
  
  // Cenário 1: Índice livre
  if (!movimentacoesAtualizadas[anoSemana]) {
    movimentacoesAtualizadas[anoSemana] = novoValor;
    console.log(`📅 [MOVIMENTAÇÃO] ${anoSemana}: ${novoValor} (novo índice)`);
    return movimentacoesAtualizadas;
  }
  
  // Cenário 2: Índice já ocupado - encontrar próximo sufixo disponível
  let sufixo = 2;
  let chaveAlternativa = `${anoSemana}_${sufixo}`;
  
  while (movimentacoesAtualizadas[chaveAlternativa]) {
    sufixo++;
    chaveAlternativa = `${anoSemana}_${sufixo}`;
  }
  
  movimentacoesAtualizadas[chaveAlternativa] = novoValor;
  console.log(`📅 [MOVIMENTAÇÃO] ${anoSemana} já ocupado, usando ${chaveAlternativa}: ${novoValor}`);
  
  return movimentacoesAtualizadas;
}

/**
 * Registra valor 0 para medicamentos não encontrados
 */
function registrarMedicamentoNaoEncontrado(
  movimentacoesAtuais: { [key: string]: number },
  anoSemana: string
): { [key: string]: number } {
  return atualizarMovimentacaoSemanal(movimentacoesAtuais, anoSemana, 0);
}

// --- FUNÇÃO PARA SALVAR CAMPOS CALCULADOS NO BANCO ---

async function salvarCamposCalculadosNoFirestore(
  municipio: string,
  unidadeId: string,
  medicamentoId: string,
  camposCalculados: any,
  novaMovimentacao: { anoSemana: string; valor: number }
): Promise<{ sucesso: boolean; erro?: string; arquivo_json?: string }> {
  try {
    const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    
    if (isDevelopment) {
      // MODO DESENVOLVIMENTO: Salvar em JSON local
      console.log(`💾 [DEV JSON] Salvando campos calculados em JSON: ${municipio}/${unidadeId}/${medicamentoId}`);
      
      // Preparar dados com movimentação atualizada (simulada)
      const movimentacoesSimuladas = {
        [`${novaMovimentacao.anoSemana}`]: novaMovimentacao.valor
      };
      
      const dadosCalculados = {
        // Dados básicos do medicamento
        nome: camposCalculados.nome,
        cod_item: medicamentoId,
        
        // CAMPO PRINCIPAL: Movimentações semanais com nova lógica
        movimentacoes_semanais: movimentacoesSimuladas,
        
        // Campos calculados principais
        contagens: camposCalculados.contagens,
        maximo: camposCalculados.maximo,
        medianas: camposCalculados.medianas,
        tp_metodo: camposCalculados.tp_metodo,
        metodo: camposCalculados.metodo,
        metEst: camposCalculados.metEst,
        reposicao: camposCalculados.reposicao,
        analise_reposicao: camposCalculados.analise_reposicao,
        totalGeral: camposCalculados.totalGeral,
        estoque: camposCalculados.estoque,
        
        // Metadados de cálculo
        ultima_atualizacao_calculos: new Date().toISOString(),
        versao_calculo: '2.0.0',
        ultima_semana_calculo: camposCalculados.ultimaSemana,
        
        // Status do medicamento
        status_calculo: 'CALCULADO',
        
        // Metadados da unidade
        unidade: unidadeId,
        municipio: municipio
      };
      
      // Criar diretório se não existir
      const outputDir = path.join(__dirname, '../../../output_calculos_dev');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      // Salvar em arquivo JSON
      const nomeArquivo = `${municipio}_${unidadeId}_${medicamentoId}_${Date.now()}.json`;
      const caminhoArquivo = path.join(outputDir, nomeArquivo);
      
      fs.writeFileSync(caminhoArquivo, JSON.stringify(dadosCalculados, null, 2), 'utf8');
      
      console.log(`✅ [DEV JSON] Campos calculados salvos em: ${caminhoArquivo}`);
      console.log(`📅 [DEV JSON] Movimentação ${novaMovimentacao.anoSemana}: ${novaMovimentacao.valor}`);
      
      return { 
        sucesso: true, 
        arquivo_json: caminhoArquivo 
      };
      
    } else {
      // MODO PRODUÇÃO: Salvar no Firestore
      console.log(`💾 [FIRESTORE] Salvando campos calculados: ${municipio}/${unidadeId}/${medicamentoId}`);
      
      const medicamentoRef = db
        .collection('municipio')
        .doc(municipio)
        .collection('unidades')
        .doc(unidadeId)
        .collection('medicamentos_unidade')
        .doc(medicamentoId);

      // Buscar documento atual para obter movimentações existentes
      const medicamentoDoc = await medicamentoRef.get();
      const dadosAtuais = medicamentoDoc.exists ? medicamentoDoc.data() : {};
      
      // Aplicar nova lógica de movimentação semanal
      const movimentacoesAtuais = dadosAtuais?.movimentacoes_semanais || {};
      const movimentacoesAtualizadas = atualizarMovimentacaoSemanal(
        movimentacoesAtuais,
        novaMovimentacao.anoSemana,
        novaMovimentacao.valor
      );

      // Preparar dados para salvar
      const dadosParaSalvar = {
        // Dados básicos do medicamento (se não existir ainda)
        nome: camposCalculados.nome || dadosAtuais.nome,
        cod_item: medicamentoId,
        
        // CAMPO PRINCIPAL: Movimentações semanais com nova lógica
        movimentacoes_semanais: movimentacoesAtualizadas,
        
        // Campos calculados principais
        contagens: camposCalculados.contagens,
        maximo: camposCalculados.maximo,
        medianas: camposCalculados.medianas,
        tp_metodo: camposCalculados.tp_metodo,
        metodo: camposCalculados.metodo,
        metEst: camposCalculados.metEst,
        reposicao: camposCalculados.reposicao,
        analise_reposicao: camposCalculados.analise_reposicao,
        totalGeral: camposCalculados.totalGeral,
        estoque: camposCalculados.estoque,
        
        // Metadados de cálculo
        ultima_atualizacao_calculos: new Date(),
        versao_calculo: '2.0.0',
        ultima_semana_calculo: camposCalculados.ultimaSemana,
        
        // Status do medicamento
        status_calculo: 'CALCULADO',
        
        // Metadados da unidade
        unidade: unidadeId,
        municipio: municipio
      };

      await medicamentoRef.set(dadosParaSalvar, { merge: true });
      
      console.log(`✅ [FIRESTORE] Campos calculados salvos para ${medicamentoId}`);
      console.log(`📅 [FIRESTORE] Movimentação ${novaMovimentacao.anoSemana}: ${novaMovimentacao.valor}`);
      
      return { sucesso: true };
    }
    
  } catch (error) {
    console.error(`❌ [SALVAR] Erro ao salvar campos calculados:`, error);
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// --- FUNÇÃO PRINCIPAL DE EXECUÇÃO DOS CÁLCULOS ---

/**
 * Processa dados de um arquivo JSON do storage e atualiza movimentações/cálculos
 */
export async function processarArquivoComNovaLogica(
  municipio: string,
  arquivoPath: string
): Promise<{
  sucesso: boolean;
  medicamentos_processados: number;
  medicamentos_nao_encontrados: string[];
  erro?: string;
}> {
  try {
    console.log(`📁 [PROCESSAR ARQUIVO] Iniciando: ${arquivoPath}`);
    
    // 1. Ler arquivo do storage
    const cloudStorageService = new (require('../../services/CloudStorageService')).CloudStorageService();
    const resultadoLeitura = await cloudStorageService.processarArquivoUpload(arquivoPath);
    
    if (!resultadoLeitura.sucesso || !resultadoLeitura.dados_processados) {
      throw new Error(`Erro ao ler arquivo: ${resultadoLeitura.erro}`);
    }
    
    const inventoryData = resultadoLeitura.dados_processados.conteudo;
    const unidadeId = inventoryData.unidade || 'DESCONHECIDA';
    
    console.log(`🏥 [PROCESSAR ARQUIVO] Unidade: ${unidadeId}`);
    console.log(`📊 [PROCESSAR ARQUIVO] Itens no arquivo: ${inventoryData.itens?.length || 0}`);
    
    // 2. Calcular semana baseada no período
    const semanaCalculada = calcularSemanaMovimentacaoLocal(
      inventoryData.periodo_inicio,
      inventoryData.periodo_fim
    );
    
    console.log(`📅 [PROCESSAR ARQUIVO] Semana calculada: ${semanaCalculada}`);
    
    // 3. Processar cada medicamento do arquivo
    let medicamentosProcessados = 0;
    const medicamentosNaoEncontrados: string[] = [];
    
    for (const item of inventoryData.itens || []) {
      try {
        const medicamentoId = item.cod_sistemico_item || item.cod_item;
        const valorMovimentacao = item.movimentacao_semanal_calculada || 0;
        
        console.log(`💊 [PROCESSAR ARQUIVO] Processando: ${item.descricao_item} (${medicamentoId})`);
        
        // Buscar medicamento no banco
        const medicamentoRef = db
          .collection('municipio')
          .doc(municipio)
          .collection('unidades')
          .doc(unidadeId)
          .collection('medicamentos_unidade')
          .doc(medicamentoId);
        
        const medicamentoDoc = await medicamentoRef.get();
        
        if (medicamentoDoc.exists) {
          // Medicamento encontrado - calcular campos e atualizar
          const medicamentoData = medicamentoDoc.data() as MedicamentoCalculado;
          
          const camposCalculados = await calcularCamposMedicamento(
            medicamentoData,
            unidadeId,
            municipio
          );
          
          // Salvar com nova lógica de movimentação
          const resultadoSalvamento = await salvarCamposCalculadosNoFirestore(
            municipio,
            unidadeId,
            medicamentoId,
            { ...camposCalculados, nome: item.descricao_item },
            { anoSemana: semanaCalculada, valor: valorMovimentacao }
          );
          
          if (resultadoSalvamento.sucesso) {
            medicamentosProcessados++;
            console.log(`✅ [PROCESSAR ARQUIVO] ${item.descricao_item}: atualizado`);
          } else {
            console.error(`❌ [PROCESSAR ARQUIVO] Erro ao salvar ${item.descricao_item}: ${resultadoSalvamento.erro}`);
          }
          
        } else {
          // Medicamento não encontrado - registrar valor 0
          console.warn(`⚠️ [PROCESSAR ARQUIVO] Medicamento não encontrado: ${item.descricao_item}`);
          medicamentosNaoEncontrados.push(item.descricao_item);
          
          // Criar documento com valor 0
          const movimentacoesIniciais = registrarMedicamentoNaoEncontrado({}, semanaCalculada);
          
          await medicamentoRef.set({
            nome: item.descricao_item,
            cod_item: medicamentoId,
            movimentacoes_semanais: movimentacoesIniciais,
            unidade: unidadeId,
            municipio: municipio,
            status_calculo: 'NAO_ENCONTRADO_REGISTRADO_ZERO',
            data_criacao: new Date()
          });
          
          console.log(`📝 [PROCESSAR ARQUIVO] Criado com valor 0: ${item.descricao_item}`);
        }
        
      } catch (error) {
        console.error(`❌ [PROCESSAR ARQUIVO] Erro ao processar item ${item.descricao_item}:`, error);
      }
    }
    
    console.log(`🎉 [PROCESSAR ARQUIVO] Concluído: ${medicamentosProcessados} processados, ${medicamentosNaoEncontrados.length} não encontrados`);
    
    return {
      sucesso: true,
      medicamentos_processados: medicamentosProcessados,
      medicamentos_nao_encontrados: medicamentosNaoEncontrados
    };
    
  } catch (error) {
    console.error(`💥 [PROCESSAR ARQUIVO] Erro:`, error);
    return {
      sucesso: false,
      medicamentos_processados: 0,
      medicamentos_nao_encontrados: [],
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

export async function executarCalculosParaMunicipio(municipio: string): Promise<{
  sucesso: boolean;
  total_processados: number;
  total_sucesso: number;
  total_erros: number;
  resultados: ResultadoCalculos[];
  arquivos_gerados?: string[];
  erro?: string;
}> {
  try {
    console.log(`🚀 [CÁLCULOS] Iniciando cálculos para município: ${municipio}`);
    
    // Limpar cache de estoque para garantir dados atualizados
    estoqueConsolidadoCache = null;
    
    const resultados: ResultadoCalculos[] = [];
    const arquivosGerados: string[] = [];
    let totalProcessados = 0;
    let totalSucesso = 0;
    let totalErros = 0;
    
    // Buscar dados do Firebase para o município
    const municipioRef = db.collection('municipio').doc(municipio);
    const municipioDoc = await municipioRef.get();
    
    if (!municipioDoc.exists) {
      throw new Error(`Município não encontrado: ${municipio}`);
    }
    
    const unidadesSnapshot = await municipioRef.collection('unidades').get();
    
    for (const unidadeDoc of unidadesSnapshot.docs) {
      console.log(`🏥 [CÁLCULOS] Processando unidade: ${unidadeDoc.id}`);
      
      const medicamentosSnapshot = await unidadeDoc.ref.collection('medicamentos_unidade').get();
      
      for (const medicamentoDoc of medicamentosSnapshot.docs) {
        totalProcessados++;
        
        try {
          const medicamento = medicamentoDoc.data() as MedicamentoCalculado;
          
          // Verificar se o medicamento tem movimentações
          if (!medicamento.movimentacoes_semanais || Object.keys(medicamento.movimentacoes_semanais).length === 0) {
            console.warn(`⚠️ [CÁLCULOS] Medicamento sem movimentações: ${medicamento.nome} (${unidadeDoc.id})`);
            totalErros++;
            
            resultados.push({
              medicamento: medicamento.nome,
              unidade: unidadeDoc.id,
              campos_calculados: {} as any,
              sucesso: false,
              erro: 'Medicamento sem movimentações semanais'
            });
            continue;
          }
          
          // Calcular campos
          console.log(`📊 [CÁLCULOS] Calculando ${medicamento.nome} (${unidadeDoc.id})...`);
          const camposCalculados = await calcularCamposMedicamento(medicamento, unidadeDoc.id, municipio);
          
          // Para execução manual, apenas atualizar campos calculados sem nova movimentação
          const resultadoSalvamento = await salvarCamposCalculadosNoFirestore(
            municipio,
            unidadeDoc.id,
            medicamentoDoc.id,
            camposCalculados,
            { anoSemana: camposCalculados.ultimaSemana, valor: 0 } // Valor 0 para não alterar movimentações
          );
          
          if (resultadoSalvamento.sucesso) {
            totalSucesso++;
            
            // Se foi gerado arquivo JSON, adicionar à lista
            if (resultadoSalvamento.arquivo_json) {
              arquivosGerados.push(resultadoSalvamento.arquivo_json);
            }
            
            console.log(`✅ [CÁLCULOS] ${medicamento.nome} (${unidadeDoc.id}): Sucesso - TP: ${camposCalculados.tp_metodo}, Reposição: ${camposCalculados.reposicao}`);
            
            resultados.push({
              medicamento: medicamento.nome,
              unidade: unidadeDoc.id,
              campos_calculados: camposCalculados,
              sucesso: true
            });
          } else {
            totalErros++;
            console.error(`❌ [CÁLCULOS] Erro ao salvar ${medicamento.nome}: ${resultadoSalvamento.erro}`);
            
            resultados.push({
              medicamento: medicamento.nome,
              unidade: unidadeDoc.id,
              campos_calculados: camposCalculados,
              sucesso: false,
              erro: resultadoSalvamento.erro
            });
          }
          
        } catch (error) {
          totalErros++;
          const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
          console.error(`❌ [CÁLCULOS] Erro ao processar medicamento ${medicamentoDoc.id}:`, mensagemErro);
          
          resultados.push({
            medicamento: medicamentoDoc.id,
            unidade: unidadeDoc.id,
            campos_calculados: {} as any,
            sucesso: false,
            erro: mensagemErro
          });
        }
      }
    }
    
    console.log(`🎉 [CÁLCULOS] Processamento concluído para ${municipio}:`);
    console.log(`   📦 Total processados: ${totalProcessados}`);
    console.log(`   ✅ Sucessos: ${totalSucesso}`);
    console.log(`   ❌ Erros: ${totalErros}`);
    console.log(`   📊 Taxa de sucesso: ${totalProcessados > 0 ? ((totalSucesso / totalProcessados) * 100).toFixed(2) : 0}%`);
    console.log(`   📁 Arquivos JSON gerados: ${arquivosGerados.length}`);
    
    return {
      sucesso: true,
      total_processados: totalProcessados,
      total_sucesso: totalSucesso,
      total_erros: totalErros,
      resultados,
      arquivos_gerados: arquivosGerados
    };
    
  } catch (error) {
    console.error(`💥 [CÁLCULOS] Erro durante execução dos cálculos:`, error);
    return {
      sucesso: false,
      total_processados: 0,
      total_sucesso: 0,
      total_erros: 0,
      resultados: [],
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// --- FUNÇÃO AUXILIAR PARA EXECUTAR CÁLCULOS DE UNIDADE ESPECÍFICA ---

export async function executarCalculosParaUnidade(
  municipio: string, 
  unidadeId: string
): Promise<{
  sucesso: boolean;
  total_processados: number;
  total_sucesso: number;
  total_erros: number;
  resultados: ResultadoCalculos[];
  erro?: string;
}> {
  try {
    console.log(`🚀 [CÁLCULOS] Iniciando cálculos para unidade: ${municipio}/${unidadeId}`);
    
    // Limpar cache de estoque para garantir dados atualizados
    estoqueConsolidadoCache = null;
    
    const resultados: ResultadoCalculos[] = [];
    let totalProcessados = 0;
    let totalSucesso = 0;
    let totalErros = 0;
    
    const unidadeRef = db
      .collection('municipio')
      .doc(municipio)
      .collection('unidades')
      .doc(unidadeId);
      
    const unidadeDoc = await unidadeRef.get();
    
    if (!unidadeDoc.exists) {
      throw new Error(`Unidade não encontrada: ${municipio}/${unidadeId}`);
    }
    
    const medicamentosSnapshot = await unidadeRef.collection('medicamentos_unidade').get();
    
    for (const medicamentoDoc of medicamentosSnapshot.docs) {
      totalProcessados++;
      
      try {
        const medicamento = medicamentoDoc.data() as MedicamentoCalculado;
        
        if (!medicamento.movimentacoes_semanais || Object.keys(medicamento.movimentacoes_semanais).length === 0) {
          console.warn(`⚠️ [CÁLCULOS] Medicamento sem movimentações: ${medicamento.nome}`);
          totalErros++;
          
          resultados.push({
            medicamento: medicamento.nome,
            unidade: unidadeId,
            campos_calculados: {} as any,
            sucesso: false,
            erro: 'Medicamento sem movimentações semanais'
          });
          continue;
        }
        
        console.log(`📊 [CÁLCULOS] Calculando ${medicamento.nome}...`);
        const camposCalculados = await calcularCamposMedicamento(medicamento, unidadeId, municipio);
        
        const resultadoSalvamento = await salvarCamposCalculadosNoFirestore(
          municipio,
          unidadeId,
          medicamentoDoc.id,
          camposCalculados,
          { anoSemana: camposCalculados.ultimaSemana, valor: 0 } // Valor 0 para não alterar movimentações
        );
        
        if (resultadoSalvamento.sucesso) {
          totalSucesso++;
          console.log(`✅ [CÁLCULOS] ${medicamento.nome}: Sucesso - TP: ${camposCalculados.tp_metodo}, Reposição: ${camposCalculados.reposicao}`);
          
          resultados.push({
            medicamento: medicamento.nome,
            unidade: unidadeId,
            campos_calculados: camposCalculados,
            sucesso: true
          });
        } else {
          totalErros++;
          console.error(`❌ [CÁLCULOS] Erro ao salvar ${medicamento.nome}: ${resultadoSalvamento.erro}`);
          
          resultados.push({
            medicamento: medicamento.nome,
            unidade: unidadeId,
            campos_calculados: camposCalculados,
            sucesso: false,
            erro: resultadoSalvamento.erro
          });
        }
        
      } catch (error) {
        totalErros++;
        const mensagemErro = error instanceof Error ? error.message : 'Erro desconhecido';
        console.error(`❌ [CÁLCULOS] Erro ao processar medicamento ${medicamentoDoc.id}:`, mensagemErro);
        
        resultados.push({
          medicamento: medicamentoDoc.id,
          unidade: unidadeId,
          campos_calculados: {} as any,
          sucesso: false,
          erro: mensagemErro
        });
      }
    }
    
    console.log(`🎉 [CÁLCULOS] Processamento concluído para ${municipio}/${unidadeId}:`);
    console.log(`   📦 Total processados: ${totalProcessados}`);
    console.log(`   ✅ Sucessos: ${totalSucesso}`);
    console.log(`   ❌ Erros: ${totalErros}`);
    
    return {
      sucesso: true,
      total_processados: totalProcessados,
      total_sucesso: totalSucesso,
      total_erros: totalErros,
      resultados
    };
    
  } catch (error) {
    console.error(`💥 [CÁLCULOS] Erro durante execução dos cálculos para unidade:`, error);
    return {
      sucesso: false,
      total_processados: 0,
      total_sucesso: 0,
      total_erros: 0,
      resultados: [],
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const municipio = process.argv[2] || 'Palmares';
  const unidade = process.argv[3]; // Opcional
  
  const executarFunc = unidade 
    ? executarCalculosParaUnidade(municipio, unidade)
    : executarCalculosParaMunicipio(municipio);
    
  executarFunc
    .then((resultado) => {
      console.log('\n✅ Cálculos executados com sucesso!');
      console.log(`📊 Resumo: ${resultado.total_sucesso}/${resultado.total_processados} sucessos`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução dos cálculos:', error);
      process.exit(1);
    });
}
