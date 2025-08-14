import { db } from '../../config/firebase';
import * as fs from 'fs';
import * as path from 'path';
import { 
  SemanaHistorico, 
  Contagens, 
  Medianas, 
  MedicamentoCalculado,
  DadosCalculados,
  AnaliseReposicao
} from './interfaces';

// Interfaces para cálculo de estoque
interface ItemMovimentacao {
  cod_sistemico_item: string;
  descricao_item: string;
  qtd_periodo_final: number;
  [key: string]: any;
}

interface DadosUnidade {
  periodo_inicio: string;
  periodo_fim: string;
  itens: ItemMovimentacao[];
}

interface EstoqueCalculado {
  descricao_item: string;
  estoque_proprio: number;
  estoque_geral: number;
  unidades_contribuindo: string[];
}

// Cache global para estoque consolidado
let estoqueConsolidadoCache: Map<string, EstoqueCalculado> | null = null;

// Exporta funções de estoque para uso em outros módulos
export { carregarEstoqueConsolidado, buscarEstoqueMedicamento };

// --- FUNÇÕES DE CÁLCULO DE ESTOQUE ---

/**
 * Carrega dados de movimentação de um arquivo JSON
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
 * Calcula o estoque consolidado para todos os medicamentos
 */
function calcularEstoqueConsolidado(
  dadosCAF: DadosUnidade,
  dadosESF3: DadosUnidade,
  dadosOlavo: DadosUnidade
): Map<string, EstoqueCalculado> {
  console.log('🔄 Calculando estoque consolidado...');
  
  const estoqueConsolidado = new Map<string, EstoqueCalculado>();
  
  // Processa CAF (estoque próprio)
  console.log('📊 Processando dados da CAF...');
  for (const item of dadosCAF.itens) {
    const estoqueItem: EstoqueCalculado = {
      descricao_item: item.descricao_item,
      estoque_proprio: item.qtd_periodo_final,
      estoque_geral: item.qtd_periodo_final, // Inicializa com o valor da CAF
      unidades_contribuindo: ['CAF']
    };
    estoqueConsolidado.set(item.descricao_item, estoqueItem);
  }
  
  // Processa ESF3 (adiciona ao estoque geral)
  console.log('📊 Processando dados da ESF3...');
  for (const item of dadosESF3.itens) {
    const estoqueExistente = estoqueConsolidado.get(item.descricao_item);
    
    if (estoqueExistente) {
      // Medicamento já existe na CAF, adiciona ao estoque geral
      estoqueExistente.estoque_geral += item.qtd_periodo_final;
      estoqueExistente.unidades_contribuindo.push('ESF3');
    } else {
      // Medicamento não existe na CAF, cria registro com estoque próprio = 0
      const estoqueItem: EstoqueCalculado = {
        descricao_item: item.descricao_item,
        estoque_proprio: 0,
        estoque_geral: item.qtd_periodo_final,
        unidades_contribuindo: ['ESF3']
      };
      estoqueConsolidado.set(item.descricao_item, estoqueItem);
    }
  }
  
  // Processa Olavo (adiciona ao estoque geral)
  console.log('📊 Processando dados da Olavo...');
  for (const item of dadosOlavo.itens) {
    const estoqueExistente = estoqueConsolidado.get(item.descricao_item);
    
    if (estoqueExistente) {
      // Medicamento já existe, adiciona ao estoque geral
      estoqueExistente.estoque_geral += item.qtd_periodo_final;
      estoqueExistente.unidades_contribuindo.push('Olavo');
    } else {
      // Medicamento não existe na CAF, cria registro com estoque próprio = 0
      const estoqueItem: EstoqueCalculado = {
        descricao_item: item.descricao_item,
        estoque_proprio: 0,
        estoque_geral: item.qtd_periodo_final,
        unidades_contribuindo: ['Olavo']
      };
      estoqueConsolidado.set(item.descricao_item, estoqueItem);
    }
  }
  
  console.log(`✅ Estoque consolidado calculado para ${estoqueConsolidado.size} medicamentos`);
  return estoqueConsolidado;
}

/**
 * Carrega e calcula o estoque consolidado (com cache)
 */
async function carregarEstoqueConsolidado(): Promise<Map<string, EstoqueCalculado>> {
  if (estoqueConsolidadoCache) {
    console.log('📦 Usando cache de estoque consolidado...');
    return estoqueConsolidadoCache;
  }

  console.log('📖 Carregando dados de estoque das unidades...');
  
  // Caminhos dos arquivos JSON
  const caminhoCAF = path.join(__dirname, '../dados/2025_22/movimentacoesCAF.json');
  const caminhoESF3 = path.join(__dirname, '../dados/2025_22/movimentacoesESF3.json');
  const caminhoOlavo = path.join(__dirname, '../dados/2025_22/movimentacoesOlavo.json');
  
  // Verifica se os arquivos existem
  if (!fs.existsSync(caminhoCAF)) {
    throw new Error(`Arquivo CAF não encontrado: ${caminhoCAF}`);
  }
  if (!fs.existsSync(caminhoESF3)) {
    throw new Error(`Arquivo ESF3 não encontrado: ${caminhoESF3}`);
  }
  if (!fs.existsSync(caminhoOlavo)) {
    throw new Error(`Arquivo Olavo não encontrado: ${caminhoOlavo}`);
  }
  
  // Carrega dados das unidades
  const dadosCAF = carregarDadosUnidade(caminhoCAF);
  const dadosESF3 = carregarDadosUnidade(caminhoESF3);
  const dadosOlavo = carregarDadosUnidade(caminhoOlavo);
  
  console.log(`📊 CAF: ${dadosCAF.itens.length} itens`);
  console.log(`📊 ESF3: ${dadosESF3.itens.length} itens`);
  console.log(`📊 Olavo: ${dadosOlavo.itens.length} itens`);
  
  // Calcula estoque consolidado
  estoqueConsolidadoCache = calcularEstoqueConsolidado(dadosCAF, dadosESF3, dadosOlavo);
  
  return estoqueConsolidadoCache;
}

/**
 * Busca o estoque de um medicamento pelo nome
 */
async function buscarEstoqueMedicamento(nomeMedicamento: string): Promise<number> {
  try {
    const estoqueConsolidado = await carregarEstoqueConsolidado();
    const estoqueItem = estoqueConsolidado.get(nomeMedicamento);
    
    if (estoqueItem) {
      return estoqueItem.estoque_geral; // Retorna o estoque geral consolidado
    }
    
    console.warn(`⚠️ Estoque não encontrado para medicamento: "${nomeMedicamento}"`);
    return 0; // Retorna 0 se não encontrar
  } catch (error) {
    console.error(`❌ Erro ao buscar estoque para "${nomeMedicamento}":`, error);
    return 0; // Retorna 0 em caso de erro
  }
}

// --- FUNÇÕES DE CÁLCULO DE CONTAGEM ---

/**
 * Calcula as contagens de semanas com movimentação (valor > 0).
 */
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

// --- FUNÇÕES DE CÁLCULO DE MÁXIMO ---

/**
 * Calcula o valor máximo do histórico de semanas
 */
function calcularMaximaMedicamento(historicoSemanas: SemanaHistorico[]): number {
  const valores = historicoSemanas.map(s => s.value);
  const numerosValidos = valores.filter(v => typeof v === 'number' && !isNaN(v));

  if (numerosValidos.length === 0) {
    return 0;
  }

  return Math.max(...numerosValidos);
}

// --- FUNÇÕES DE CÁLCULO DE MEDIANAS ---

/**
 * Calcula a mediana de um array de números
 */
function calcularMediana(numeros: number[]): number {
  if (!Array.isArray(numeros) || numeros.length === 0) {
    return 0;
  }
  const numerosValidos = numeros.filter(n => typeof n === 'number' && !isNaN(n));
  if (numerosValidos.length === 0) {
    return 0;
  }
  const sorted = [...numerosValidos].sort((a, b) => a - b);
  const middleIndex = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[middleIndex];
  }
  return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}

/**
 * Calcula todas as medianas com base no histórico completo de semanas.
 */
function calcularMedianasParaHistorico(historicoSemanas: SemanaHistorico[]): Medianas {
  const historicoValores = historicoSemanas.map(s => s.value);

  const md52 = calcularMediana(historicoValores.slice(-52));

  let mdAno = 0;
  if (historicoSemanas.length > 0) {
    const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
    const valoresDoAno = historicoSemanas
      .filter(s => s.week.startsWith(anoMaisRecente))
      .map(s => s.value);
    mdAno = calcularMediana(valoresDoAno);
  }
  
  const md04 = calcularMediana(historicoValores.slice(-4));
  const md08 = calcularMediana(historicoValores.slice(-8));
  const md12 = calcularMediana(historicoValores.slice(-12));
  const md16 = calcularMediana(historicoValores.slice(-16));
  const md26 = calcularMediana(historicoValores.slice(-26));
  const mdTotal = calcularMediana(historicoValores);

  return {
    Md04: Math.round(md04),
    Md08: Math.round(md08),
    Md12: Math.round(md12),
    Md16: Math.round(md16),
    Md26: Math.round(md26),
    Md52: Math.round(md52),
    MdAno: Math.round(mdAno),
    MdTt: Math.round(mdTotal)
  };
}

// --- FUNÇÕES DE CÁLCULO DE TP_METODO ---

/**
 * Calcula o TP_metodo baseado nas contagens de ocorrências semanais
 */
function calcularTPMetodo(dadosCalculados: DadosCalculados): string {
  const { contagens, semanas, totalSemanasHistorico } = dadosCalculados;

  // --- REGRA 1: ENTRANTES ---
  if (contagens.ContTt === 1) {
    const ultimaSemanaHistorico = semanas[semanas.length - 1];
    if (ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
      return "ENTRANTES";
    }
  }

  // --- REGRA 2: INTERMITENTES ---
  const periodo = Math.min(totalSemanasHistorico, 52);
  if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
    return "INTERMITENTES";
  }

  // --- REGRA 3: INATIVOS ---
  if (contagens.Cont16 === 0) {
    return "INATIVOS";
  }

  // --- REGRA 4: RECENTES ---
  if (contagens.Cont04 > 0 && (contagens.Cont04 / 4) >= 0.5 && contagens.ContTt === contagens.Cont04) {
    return "RECENTES";
  }
  if (contagens.Cont08 > 0 && (contagens.Cont08 / 8) >= 0.5 && contagens.ContTt === contagens.Cont08) {
    return "RECENTES";
  }
  if (contagens.Cont12 > 0 && (contagens.Cont12 / 12) >= 0.5 && contagens.ContTt === contagens.Cont12) {
    return "RECENTES";
  }
  if (contagens.Cont16 > 0 && (contagens.Cont16 / 16) >= 0.5 && contagens.ContTt === contagens.Cont16) {
    return "RECENTES";
  }
  if (contagens.Cont26 > 0 && (contagens.Cont26 / 26) >= 0.5 && contagens.ContTt === contagens.Cont26) {
    return "RECENTES";
  }
  
  // --- REGRA 5: ORDINÁRIOS (padrão) ---
  return "ORDINÁRIOS";
}

// --- FUNÇÕES DE CÁLCULO DE MÉTODO ---

/**
 * Calcula o método baseado nos dados do medicamento
 */
function calcularMetodo(dadosMedicamento: {
  contagens: Contagens;
  medianas: Medianas;
  maximo: number;
  tp_metodo: string;
}): string {
  const { contagens, medianas, maximo, tp_metodo } = dadosMedicamento;

  // --- REGRA 1: MÉTODO A (ALTA FREQUÊNCIA) ---
  if (contagens.Cont52 >= 26) {
    return "MÉTODO A";
  }

  // --- REGRA 2: MÉTODO B (MÉDIA FREQUÊNCIA) ---
  if (contagens.Cont52 >= 13 && contagens.Cont52 < 26) {
    return "MÉTODO B";
  }

  // --- REGRA 3: MÉTODO C (BAIXA FREQUÊNCIA) ---
  if (contagens.Cont52 >= 1 && contagens.Cont52 < 13) {
    return "MÉTODO C";
  }

  // --- REGRA 4: MÉTODO D (SEM MOVIMENTAÇÃO) ---
  if (contagens.Cont52 === 0) {
    return "MÉTODO D";
  }

  // --- PADRÃO ---
  return "MÉTODO C";
}

// --- FUNÇÕES DE CÁLCULO DE MÉTODO NUMÉRICO ---

/**
 * Extrai o número do método baseado na string do método
 */
function extrairNumeroMetodo(metodoString: string): number {
  switch (metodoString) {
    case "MÉTODO A":
      return 1;
    case "MÉTODO B":
      return 2;
    case "MÉTODO C":
      return 3;
    case "MÉTODO D":
      return 4;
    default:
      console.warn(`Método desconhecido: ${metodoString}. Usando método C (3).`);
      return 3;
  }
}

// --- FUNÇÕES DE CÁLCULO DE METEST ---

/**
 * Calcula o MetEst baseado no TP_Metodo e no valor do campo Metodo
 */
function calcularMetEst(tpMetodo: string, metodo: number): number {
  switch (tpMetodo) {
    case "ORDINÁRIOS":
      return metodo * 16;
    case "INTERMITENTES":
      return metodo * 3;
    case "INATIVOS":
      return metodo * 16;
    case "ENTRANTES":
      return metodo * 16;
    case "RECENTES":
      return metodo * 3;
    default:
      console.warn(`TP_Metodo desconhecido: ${tpMetodo}. Usando multiplicador padrão 16.`);
      return metodo * 16;
  }
}

// --- FUNÇÕES DE CÁLCULO DE REPOSIÇÃO ---

/**
 * Calcula a reposição baseado na fórmula: reposição = metest - estoque
 */
function calcularReposicao(metEst: number, estoque: number): number {
  if (typeof metEst !== 'number' || typeof estoque !== 'number') {
    throw new Error('MetEst e estoque devem ser números válidos');
  }
  
  return metEst - estoque;
}

// --- FUNÇÃO PARA CONVERTER MOVIMENTAÇÕES PARA HISTÓRICO ---

/**
 * Converte movimentações semanais do Firebase para formato de histórico
 */
function converterMovimentacoesParaHistorico(movimentacoes: { [key: string]: number }): SemanaHistorico[] {
  const historico: SemanaHistorico[] = [];
  
  // Ordena as semanas cronologicamente
  const semanas = Object.keys(movimentacoes).sort();
  
  for (const semana of semanas) {
    historico.push({
      week: semana,
      value: movimentacoes[semana]
    });
  }
  
  return historico;
}

// --- FUNÇÃO PARA CALCULAR TODOS OS CAMPOS DE UM MEDICAMENTO ---

/**
 * Calcula todos os campos para um medicamento
 */
async function calcularCamposMedicamento(medicamentoRef: FirebaseFirestore.DocumentReference): Promise<void> {
  try {
    const doc = await medicamentoRef.get();
    if (!doc.exists) {
      console.log(`❌ Medicamento não encontrado: ${medicamentoRef.id}`);
      return;
    }

    const medicamento = doc.data() as MedicamentoCalculado;
    
    // Converte movimentações para histórico
    const historicoSemanas = converterMovimentacoesParaHistorico(medicamento.movimentacoes_semanais);

    // somar todos os valores do objeto de movimentações semanais
    const totalGeral = historicoSemanas.reduce((acc, curr) => acc + curr.value, 0);
    
    if (historicoSemanas.length === 0) {
      console.log(`⚠️ Medicamento sem movimentações: ${medicamento.nome}`);
      return;
    }

    // Calcula contagens
    const contagens = calcularContagensParaHistorico(historicoSemanas);
    
    // Calcula máximo
    const maximo = calcularMaximaMedicamento(historicoSemanas);
    
    // Calcula medianas
    const medianas = calcularMedianasParaHistorico(historicoSemanas);
    
    // Calcula TP_metodo
    const dadosCalculados: DadosCalculados = {
      contagens,
      semanas: historicoSemanas,
      totalSemanasHistorico: historicoSemanas.length
    };
    const tp_metodo = calcularTPMetodo(dadosCalculados);
    
    // Calcula método
    const metodoString = calcularMetodo({
      contagens,
      medianas,
      maximo,
      tp_metodo
    });

    // Extrai o número do método (ex: "MÉTODO A" -> 1, "MÉTODO B" -> 2, etc.)
    const metodoNumero = extrairNumeroMetodo(metodoString);

    // Calcula MetEst
    const metEst = calcularMetEst(String(tp_metodo), metodoNumero);

    // Busca estoque atual do medicamento
    const estoque = await buscarEstoqueMedicamento(medicamento.nome);
    const reposicao = calcularReposicao(metEst, estoque);
    
    // Cria análise de reposição
    const analise_reposicao: AnaliseReposicao = {
      metEst,
      estoque_atual: estoque,
      reposicao_calculada: reposicao,
      status: reposicao > 0 ? 'NECESSITA_REPOSICAO' : 'ESTOQUE_SUFICIENTE',
      percentual_cobertura: estoque > 0 ? ((estoque / metEst) * 100).toFixed(2) : '0'
    };

    // Atualiza o documento com os campos calculados
    await medicamentoRef.update({
      contagens,
      maximo,
      medianas,
      tp_metodo,
      metodo: metodoString,
      metEst,
      reposicao,
      analise_reposicao,
      totalGeral,
      data_atualizacao: new Date()
    });

    console.log(`✅ ${medicamento.nome} - Contagens: ${contagens.Cont52}, Máximo: ${maximo}, TP: ${tp_metodo}, Método: ${metodoString}, MetEst: ${metEst}, Estoque: ${estoque}, Reposição: ${reposicao}`);
    
  } catch (error) {
    console.error(`❌ Erro ao calcular campos para medicamento ${medicamentoRef.id}:`, error);
  }
}

// --- FUNÇÃO PRINCIPAL ---

export async function calcularCamposTodosMedicamentos(): Promise<void> {
  try {
    console.log('🚀 Iniciando cálculo de campos para todos os medicamentos...');
    
    // Pré-carrega o estoque consolidado
    console.log('📦 Pré-carregando dados de estoque...');
    await carregarEstoqueConsolidado();
    
    // Busca todos os municípios
    const municipiosSnapshot = await db.collection('municipio').get();
    
    let totalProcessados = 0;
    let totalSucessos = 0;
    let totalErros = 0;
    
    for (const municipioDoc of municipiosSnapshot.docs) {
      const municipio = municipioDoc.data();
      console.log(`\n🏛️ Processando município: ${municipio.nome}`);
      
      // Busca todas as unidades do município
      const unidadesSnapshot = await municipioDoc.ref.collection('unidades').get();
      
      for (const unidadeDoc of unidadesSnapshot.docs) {
        const unidade = unidadeDoc.data();
        console.log(`🏥 Processando unidade: ${unidade.nome}`);
        
        // Busca todos os medicamentos da unidade
        const medicamentosSnapshot = await unidadeDoc.ref.collection('medicamentos_unidade').get();
        
        console.log(`💊 Processando ${medicamentosSnapshot.docs.length} medicamentos...`);
        
        for (const medicamentoDoc of medicamentosSnapshot.docs) {
          totalProcessados++;
          
          try {
            await calcularCamposMedicamento(medicamentoDoc.ref);
            totalSucessos++;
          } catch (error) {
            console.error(`❌ Erro ao processar medicamento ${medicamentoDoc.id}:`, error);
            totalErros++;
          }
        }
      }
    }
    
    console.log('\n🎉 Processamento concluído!');
    console.log(`📊 Resumo final:`);
    console.log(`   📦 Total processados: ${totalProcessados}`);
    console.log(`   ✅ Sucessos: ${totalSucessos}`);
    console.log(`   ❌ Erros: ${totalErros}`);
    console.log(`   📈 Taxa de sucesso: ${((totalSucessos / totalProcessados) * 100).toFixed(2)}%`);
    
  } catch (error) {
    console.error('💥 Erro fatal durante o processamento:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  calcularCamposTodosMedicamentos()
    .then(() => {
      console.log('\n✅ Script executado com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na execução do script:', error);
      process.exit(1);
    });
}