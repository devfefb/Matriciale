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

import { DadosUnidade, EstoqueCalculado } from '../interfaces/calculos';

type DadosTodasUnidades = {
  [nomeUnidade: string]: DadosUnidade;
};

let estoqueConsolidadoCache: Map<string, EstoqueCalculado> | null = null;

// --- FUNÇÕES DE ESTOQUE (copiadas do original) ---
export function carregarDadosUnidade(caminhoArquivo: string): DadosUnidade {
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
 *
 * @param todasUnidades Um objeto onde cada chave é o nome de uma unidade e o valor
 * são os dados de estoque dessa unidade.
 * @returns Um Map onde a chave é a descrição do item e o valor é o objeto de estoque calculado.
 */
export function calcularEstoqueDinamico(
  todasUnidades: DadosTodasUnidades
): Map<string, EstoqueCalculado> {
  // Mapa para agrupar todos os itens por sua descrição.
  // A chave é a 'descricao_item', o valor é o objeto de resultado parcial.
  const estoqueAgrupado = new Map<string, EstoqueCalculado>();

  // 1. Itera sobre cada unidade para processar seus itens.
  for (const nomeUnidade in todasUnidades) {
    const dadosDaUnidade = todasUnidades[nomeUnidade];
    const nomeCampoEstoque = `estoque_${nomeUnidade}`;

    for (const item of dadosDaUnidade.itens) {
      // Verifica se o item já foi adicionado ao mapa
      if (!estoqueAgrupado.has(item.descricao_item)) {
        // Se não existe, cria um novo objeto base
        estoqueAgrupado.set(item.descricao_item, {
          descricao_item: item.descricao_item,
        });
      }

      const itemConsolidado = estoqueAgrupado.get(item.descricao_item)!;

      // 2. Aplica a regra para unidades NÃO-CAF: valor direto.
      // A regra da CAF será aplicada posteriormente, pois depende dos outros.
      if (nomeUnidade.toUpperCase() !== 'CAF') {
        itemConsolidado[nomeCampoEstoque] = item.qtd_periodo_final;
      }
    }
  }

  // 3. Processamento especial para a CAF.
  // Verifica se existe uma unidade CAF nos dados de entrada.
  if (todasUnidades.CAF) {
    const dadosCAF = todasUnidades.CAF;
    const nomeCampoEstoqueCAF = 'estoque_CAF';

    for (const itemCAF of dadosCAF.itens) {
      // Pega o item correspondente que já foi processado (com os estoques das outras unidades)
      const itemConsolidado = estoqueAgrupado.get(itemCAF.descricao_item);

      if (itemConsolidado) {
        // Inicia o cálculo do estoque da CAF com seu próprio valor base.
        let estoqueCalculadoCAF = itemCAF.qtd_periodo_final;

        // Soma os valores de estoque das outras unidades para o mesmo item.
        for (const chave in itemConsolidado) {
          // A condição verifica se a chave é de um campo de estoque (ex: 'estoque_ESF3')
          // e não o próprio 'descricao_item'.
          if (chave.startsWith('estoque_')) {
            estoqueCalculadoCAF += itemConsolidado[chave] as number;
          }
        }

        // Atribui o valor final calculado ao campo de estoque da CAF.
        itemConsolidado[nomeCampoEstoqueCAF] = estoqueCalculadoCAF;
      }
    }
  }

  return estoqueAgrupado;
}

/**
 * NOVA IMPLEMENTAÇÃO: Busca dados do Cloud Storage ao invés de arquivos locais
 * Esta função busca os JSONs mais recentes de cada unidade do bucket e calcula os estoques consolidados
 */
async function calcularEstoquesUnidades(): Promise<Map<string, EstoqueCalculado>> {
  if (estoqueConsolidadoCache) {
    return estoqueConsolidadoCache;
  }

  try {
    const { bucket } = require('../../config/firebase');
    
    if (!bucket) {
      console.warn('⚠️ Cloud Storage não configurado. Retornando cache vazio.');
      return new Map();
    }

    // Buscar JSONs mais recentes de cada unidade
    const municipio = 'Palmares'; // TODO: tornar dinâmico
    const unidades = ['CAF', 'ESF3', 'Olavo']; // TODO: buscar dinamicamente
    
    const todasUnidades: DadosTodasUnidades = {};

    for (const unidade of unidades) {
      try {
        const inventoryData = await buscarInventoryDataDoBucket(municipio, unidade);
        if (inventoryData) {
          todasUnidades[unidade] = inventoryData;
          console.log(`✅ Dados carregados para ${unidade}: ${inventoryData.itens.length} itens`);
        } else {
          console.warn(`⚠️ Nenhum dado encontrado para ${unidade}`);
        }
      } catch (error) {
        console.error(`❌ Erro ao carregar dados de ${unidade}:`, error);
      }
    }

    if (Object.keys(todasUnidades).length === 0) {
      console.warn('⚠️ Nenhuma unidade com dados encontrada. Retornando cache vazio.');
      return new Map();
    }

    estoqueConsolidadoCache = calcularEstoqueDinamico(todasUnidades);

    console.log(`✅ Estoque consolidado calculado com ${estoqueConsolidadoCache.size} itens`);

    return estoqueConsolidadoCache;
  } catch (error) {
    console.error('❌ Erro ao calcular estoques das unidades:', error);
    return new Map();
  }
}

/**
 * Busca o arquivo inventoryData mais recente de uma unidade no Cloud Storage
 */
async function buscarInventoryDataDoBucket(
  municipio: string,
  unidade: string
): Promise<DadosUnidade | null> {
  try {
    const { bucket } = require('../../config/firebase');
    
    if (!bucket) {
      return null;
    }

    const prefixo = `uploads/${municipio}/${unidade}/inventoryData/`;
    
    // Listar todos os arquivos da pasta
    const [files] = await bucket.getFiles({ prefix: prefixo });

    if (files.length === 0) {
      return null;
    }

    // Filtrar apenas arquivos JSON
    const jsonFiles = files.filter((file: any) => file.name.endsWith('.json'));

    if (jsonFiles.length === 0) {
      return null;
    }

    // Ordenar por data de atualização (mais recente primeiro)
    jsonFiles.sort((a: any, b: any) => {
      const timeA = a.metadata.updated ? new Date(a.metadata.updated).getTime() : 0;
      const timeB = b.metadata.updated ? new Date(b.metadata.updated).getTime() : 0;
      return timeB - timeA;
    });

    // Pegar o arquivo mais recente
    const arquivoMaisRecente = jsonFiles[0];

    // Baixar e parsear o JSON
    const [conteudo] = await arquivoMaisRecente.download();
    const inventoryData: DadosUnidade = JSON.parse(conteudo.toString());

    return inventoryData;

  } catch (error) {
    console.error(`❌ Erro ao buscar inventoryData para ${unidade}:`, error);
    return null;
  }
}

async function buscarEstoqueMedicamento(
  nomeMedicamento: string,
  unidadeId: string
): Promise<number> { // <-- Retorna sempre um número para segurança
  try {
    const estoqueConsolidado = await calcularEstoquesUnidades();
    const estoqueItem = estoqueConsolidado.get(nomeMedicamento);

    console.log(`🔍 Buscando estoque para ${nomeMedicamento} na unidade ${unidadeId}:`, estoqueItem);

    if (estoqueItem) {
      // Constrói o nome do campo dinamicamente, ex: 'estoque_CAF' ou 'estoque_ESF3'
      const nomeCampoEstoque = `estoque_${unidadeId}`;

      // Verifica se a propriedade existe no objeto e retorna seu valor.
      // A conversão para Number() garante que o retorno seja sempre numérico.
      if (nomeCampoEstoque in estoqueItem) {
        return Number(estoqueItem[nomeCampoEstoque]);
      }
    }

    // Se o item ou o estoque específico da unidade não for encontrado, retorna 0.
    return 0;
  } catch (error) {
    console.error(`Erro ao buscar estoque para ${nomeMedicamento} na unidade ${unidadeId}:`, error);
    return 0;
  }
}

// --- FUNÇÕES DE CÁLCULO (copiadas do script original) ---
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
    // Verifica se o array é válido
    if (!Array.isArray(numeros) || numeros.length === 0) {
      return 0;
    }

    // Filtra apenas números válidos (não NaN, não undefined, não null)
    const numerosValidos = numeros.filter(n => typeof n === 'number' && !isNaN(n) && n !== null && n !== undefined);

    // Se não há números válidos, retorna 0
    if (numerosValidos.length === 0) {
      return 0;
    }

    // Calcula a mediana
    const sorted = [...numerosValidos].sort((a, b) => a - b);
    const middleIndex = Math.floor(sorted.length / 2);

    let mediana: number;
    if (sorted.length % 2 !== 0) {
      // Número ímpar de elementos - mediana é o elemento do meio
      mediana = sorted[middleIndex];
    } else {
      // Número par de elementos - mediana é a média dos dois elementos do meio
      mediana = (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
    }

    // Arredonda para 0 casas decimais (ARRED(MED(...);0))
    const medianaArredondada = Math.round(mediana);

    return medianaArredondada;

  } catch (error) {
    // Se houver qualquer erro, retorna 0 (SE(ÉERROS(...);0;...))
    console.warn('⚠️ Erro ao calcular mediana:', error);
    return 0;
  }
}

/**
 * Calcula todas as medianas espelhando a lógica do Excel (inclui zeros, ignora nulos).
 * Mantém a opção de alternar entre 49 e 52 semanas para o cálculo principal.
 */
/**
 * Calcula todas as medianas com a lógica de negócio dupla e definitiva.
 * Mantém a opção de alternar entre 49 e 52 semanas.
 */
function calcularMedianasParaHistorico(historicoSemanas: SemanaHistorico[]): Medianas {

  const historicoValoresComZeros = historicoSemanas.map(s => s.value);

  const historicoValoresSemZeros = historicoValoresComZeros.filter(v => v > 0);

  const md04 = calcularMediana(historicoValoresComZeros.slice(-4).filter(v => v > 0)); // Inclui zeros, mas ignora nulos
  const md08 = calcularMediana(historicoValoresComZeros.slice(-8).filter(v => v > 0));
  const md12 = calcularMediana(historicoValoresComZeros.slice(-12).filter(v => v > 0));
  const md16 = calcularMediana(historicoValoresComZeros.slice(-16).filter(v => v > 0));

  // --- Cálculos de MAGNITUDE (usam o dataset SEM ZEROS) ---
  // O nome da propriedade no retorno continua Md52, mesmo que o cálculo possa usar 49 semanas.
  const md52 = calcularMediana(historicoValoresComZeros.slice(-52).filter(v => v > 0));
  const md26 = calcularMediana(historicoValoresComZeros.slice(-26).filter(v => v > 0));
  const mdTotal = calcularMediana(historicoValoresSemZeros);

  let mdAno = 0;
  if (historicoSemanas.length > 0) {
    const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
    const valoresDoAno = historicoSemanas
      .filter(s => s.week.startsWith(anoMaisRecente))
      .map(s => s.value)
      .filter(v => v > 0); // Magnitude do ano também filtra zeros
    mdAno = calcularMediana(valoresDoAno);
  }

  // O retorno usa a sua função `calcularMediana` que já faz o arredondamento.
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
  //=SE(E(DD2=1;DI2=1;CO2<>"");"5.ENTRANTES";
  if (contagens.Cont04 === 1 && contagens.Cont52 === 1 && ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
    return "5.ENTRANTES";
  }

  //SE(E(DD2<>0;DD2/DIREITA($DD$1;1)>=0,5;DI2=DD2);"4.RECENTES";
  //SE(E(DE2<>0;DE2/DIREITA($DE$1;1)>=0,5;DI2=DE2);"4.RECENTES";
  //SE(E(DF2<>0;DF2/DIREITA($DF$1;2)>=0,5;DI2=DF2);"4.RECENTES";
  //SE(E(DG2<>0;DG2/DIREITA($DG$1;2)>=0,5;DI2=DG2);"4.RECENTES";
  //SE(E(DH2<>0;DH2/DIREITA($DH$1;2)>=0,5;DI2=DH2);"4.RECENTES";
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

  //SE(E(DD2=0;DE2=0;DF2=0;DG2=0);"3.INATIVOS";
  if (contagens.Cont16 === 0) {
    return "3.INATIVOS";
  }

  //SE(DI2/DIREITA($DI$1;2)<0,5;"2.INTERMITENTES";
  const periodo = Math.min(semanas.length, 52);
  if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
    return "2.INTERMITENTES";
  }

  //"1.ORDINÁRIOS"))))))))
  return "1.ORDINÁRIOS";
}

/*
  5.ENTRANTES =SE(E(DD2=1;DI2=1;CO2<>"");CO2;
  4.RECENTES SE(E(DD2<>0;DD2/DIREITA($DD$1;1)>=0,5;DI2=DD2);MÁXIMO(CQ2:CX2);
  4.RECENTES SE(E(DE2<>0;DE2/DIREITA($DE$1;1)>=0,5;DI2=DE2);MÁXIMO(CQ2:CX2);
  4.RECENTES SE(E(DF2<>0;DF2/DIREITA($DF$1;2)>=0,5;DI2=DF2);MÁXIMO(CQ2:CX2);
  4.RECENTES SE(E(DG2<>0;DG2/DIREITA($DG$1;2)>=0,5;DI2=DG2);MÁXIMO(CQ2:CX2);
  4.RECENTES SE(E(DH2<>0;DH2/DIREITA($DH$1;2)>=0,5;DI2=DH2);MÁXIMO(CQ2:CX2);
  3.INATIVOS SE(E(DD2=0;DE2=0;DF2=0;DG2=0);0;
  2.INTERMITENTES SE(DI2/DIREITA($DI$1;2)<0,5;ARRED(CP2/DIREITA($DI$1;2);0);
  1.ORDINÁRIOS MÁXIMO(CQ2:CX2)))))))))
*/
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

  //SE(DI2/DIREITA($DI$1;2)<0,5;ARRED(CP2/DIREITA($DI$1;2);0);
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


// --- FUNÇÃO PRINCIPAL DE CÁLCULO (O "Motor") ---
/**
 * Calcula todos os campos para um único medicamento.
 * Esta é a função principal que será consumida pelos outros scripts.
 */
export async function calcularCamposParaMedicamento(
  medicamento: MedicamentoCalculado,
  unidadeId: string
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
  // Esta função é exatamente a sua 'calcularCamposMedicamentoSemSalvar'
  // Apenas renomeei para clareza e a exportei.

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
  // const estoque = await buscarEstoqueMedicamento(medicamento.nome, unidadeId);
  const estoque = medicamento.estoque;
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