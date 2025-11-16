import * as fs from 'fs';
import * as path from 'path';
import { MedicamentoCalculado } from '../interfaces/interfaces-campos-calculados';
import { db } from '../../config/firebase';

import { AnalisePadroes, EstatisticasCampo, EstoqueCalculado, GabaritoEstrutura, ResultadoValidacao } from '../interfaces/calculos';
import { calcularCamposParaMedicamento } from '../core/calculosService';


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

    // Obtém valor do campo calculado
    if (mapeamentoCampo.calculado.includes('.')) {
      const [objeto, propriedade] = mapeamentoCampo.calculado.split('.');
      valorCalculado = calculado[objeto]?.[propriedade];
    } else {
      valorCalculado = calculado[mapeamentoCampo.calculado];
    }

    // Obtém valor do gabarito
    valorGabarito = gabarito[mapeamentoCampo.gabarito];

    // Trata valores nulos do gabarito
    if (valorGabarito === null && valorCalculado === 0) {
      valorGabarito = 0;
    }

    // Normaliza valores para comparação
    valorCalculado = normalizarValorParaComparacao(valorCalculado, mapeamentoCampo.calculado);
    valorGabarito = normalizarValorParaComparacao(valorGabarito, mapeamentoCampo.gabarito);

    if (JSON.stringify(valorCalculado) === JSON.stringify(valorGabarito)) {
      corretos.push(mapeamentoCampo.calculado);
    } else {
      // Calcula diferença e percentual de erro para campos numéricos
      let diferenca: number | undefined;
      let percentualErro: number | undefined;

      if (typeof valorCalculado === 'number' && typeof valorGabarito === 'number') {
        diferenca = valorCalculado - valorGabarito;
        if (valorGabarito !== 0) {
          percentualErro = Math.abs((diferenca / valorGabarito) * 100);
        } else if (valorCalculado !== 0) {
          percentualErro = 100; // 100% de erro se gabarito é 0 mas calculado não
        } else {
          percentualErro = 0; // Ambos são 0
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
  // Trata valores nulos
  if (valor === null || valor === undefined) {
    return 0;
  }

  return valor;
}

function calcularTaxaAcerto(corretos: string[], total: number): number {
  return total > 0 ? (corretos.length / total) * 100 : 0;
}

// --- FUNÇÕES DE ANÁLISE DETALHADA ---
function analisarEstatisticasPorCampo(resultados: ResultadoValidacao[]): EstatisticasCampo[] {
  const estatisticasPorCampo = new Map<string, EstatisticasCampo>();

  // Inicializa estatísticas para todos os campos
  const todosCampos = [
    'contagens.Cont04', 'contagens.Cont08', 'contagens.Cont12', 'contagens.Cont16',
    'contagens.Cont26', 'contagens.Cont52', 'contagens.ContAno', 'contagens.ContTt',
    'maximo', 'medianas.Md04', 'medianas.Md08', 'medianas.Md12', 'medianas.Md16',
    'medianas.Md26', 'medianas.Md52', 'medianas.MdAno', 'medianas.MdTt',
    'tp_metodo', 'metodo', 'metEst', 'reposicao', 'totalGeral', 'estoque'
  ];

  todosCampos.forEach(campo => {
    estatisticasPorCampo.set(campo, {
      campo,
      total_verificacoes: 0,
      acertos: 0,
      erros: 0,
      taxa_acerto: 0,
      erros_detalhados: [],
      valores_mais_frequentes: []
    });
  });

  // Processa todos os resultados
  for (const resultado of resultados) {
    for (const campo of todosCampos) {
      const estatistica = estatisticasPorCampo.get(campo)!;
      estatistica.total_verificacoes++;

      const campoCorreto = resultado.campos_corretos.includes(campo);
      if (campoCorreto) {
        estatistica.acertos++;
      } else {
        estatistica.erros++;
        // Encontra o erro detalhado para este campo
        const erroDetalhado = resultado.campos_incorretos.find(e => e.campo === campo);
        if (erroDetalhado) {
          estatistica.erros_detalhados.push({
            medicamento: resultado.medicamento,
            unidade: resultado.unidade,
            valor_calculado: erroDetalhado.valor_calculado,
            valor_gabarito: erroDetalhado.valor_gabarito,
            diferenca: erroDetalhado.diferenca,
            percentual_erro: erroDetalhado.percentual_erro
          });
        }
      }
    }
  }

  // Calcula taxas de acerto e valores mais frequentes
  for (const estatistica of estatisticasPorCampo.values()) {
    estatistica.taxa_acerto = (estatistica.acertos / estatistica.total_verificacoes) * 100;

    // Calcula valores mais frequentes nos erros
    const valoresFrequencia = new Map<any, number>();
    for (const erro of estatistica.erros_detalhados) {
      const valor = erro.valor_calculado;
      valoresFrequencia.set(valor, (valoresFrequencia.get(valor) || 0) + 1);
    }

    const valoresOrdenados = Array.from(valoresFrequencia.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5); // Top 5 valores mais frequentes

    estatistica.valores_mais_frequentes = valoresOrdenados.map(([valor, quantidade]) => ({
      valor,
      quantidade,
      percentual: (quantidade / estatistica.erros) * 100
    }));
  }

  return Array.from(estatisticasPorCampo.values())
    .sort((a, b) => a.taxa_acerto - b.taxa_acerto); // Ordena por taxa de acerto (pior primeiro)
}

function analisarUnidadesProblematicas(resultados: ResultadoValidacao[]): {
  unidade: string;
  total_medicamentos: number;
  acerto_medio: number;
  campos_com_erro: string[];
}[] {
  const estatisticasUnidade = new Map<string, {
    unidade: string;
    total_medicamentos: number;
    acertos_soma: number;
    campos_com_erro: Set<string>;
  }>();

  for (const resultado of resultados) {
    const unidade = resultado.unidade;
    const estatistica = estatisticasUnidade.get(unidade) || {
      unidade,
      total_medicamentos: 0,
      acertos_soma: 0,
      campos_com_erro: new Set<string>()
    };

    estatistica.total_medicamentos++;
    estatistica.acertos_soma += resultado.acerto;

    for (const erro of resultado.campos_incorretos) {
      estatistica.campos_com_erro.add(erro.campo);
    }

    estatisticasUnidade.set(unidade, estatistica);
  }

  return Array.from(estatisticasUnidade.values())
    .map(estat => ({
      unidade: estat.unidade,
      total_medicamentos: estat.total_medicamentos,
      acerto_medio: estat.acertos_soma / estat.total_medicamentos,
      campos_com_erro: Array.from(estat.campos_com_erro)
    }))
    .sort((a, b) => a.acerto_medio - b.acerto_medio); // Ordena por acerto médio (pior primeiro)
}

function analisarMedicamentosProblematicos(resultados: ResultadoValidacao[]): {
  medicamento: string;
  unidade: string;
  acerto: number;
  campos_incorretos: string[];
}[] {
  return resultados
    .filter(r => r.acerto < 100) // Apenas medicamentos com erros
    .map(r => ({
      medicamento: r.medicamento,
      unidade: r.unidade,
      acerto: r.acerto,
      campos_incorretos: r.campos_incorretos.map(e => e.campo)
    }))
    .sort((a, b) => a.acerto - b.acerto) // Ordena por acerto (pior primeiro)
    .slice(0, 20); // Top 20 medicamentos mais problemáticos
}

function analisarDistribuicaoErros(resultados: ResultadoValidacao[]): {
  faixa_acerto: string;
  quantidade: number;
  percentual: number;
}[] {
  const faixas = [
    { min: 0, max: 20, nome: '0-20%' },
    { min: 20, max: 40, nome: '20-40%' },
    { min: 40, max: 60, nome: '40-60%' },
    { min: 60, max: 80, nome: '60-80%' },
    { min: 80, max: 99, nome: '80-99%' },
    { min: 100, max: 100, nome: '100%' }
  ];

  const distribuicao = faixas.map(faixa => {
    const quantidade = resultados.filter(r =>
      r.acerto >= faixa.min && r.acerto <= faixa.max
    ).length;

    return {
      faixa_acerto: faixa.nome,
      quantidade,
      percentual: (quantidade / resultados.length) * 100
    };
  });

  return distribuicao;
}

function gerarRelatorioDetalhado(resultados: ResultadoValidacao[]): AnalisePadroes {
  console.log('📊 Gerando análise detalhada dos padrões de erro...');

  const camposProblematicos = analisarEstatisticasPorCampo(resultados);
  const unidadesProblematicas = analisarUnidadesProblematicas(resultados);
  const medicamentosProblematicos = analisarMedicamentosProblematicos(resultados);
  const distribuicaoErros = analisarDistribuicaoErros(resultados);

  return {
    campos_mais_problematicos: camposProblematicos,
    unidades_mais_problematicas: unidadesProblematicas,
    medicamentos_mais_problematicos: medicamentosProblematicos,
    distribuicao_erros: distribuicaoErros
  };
}

function gerarRelatorioCamposSistematicos(analisePadroes: AnalisePadroes): void {
  console.log('\n🔧 ANÁLISE DE CAMPOS COM PROBLEMAS SISTEMÁTICOS:');
  console.log('='.repeat(80));

  const camposCriticos = analisePadroes.campos_mais_problematicos.filter(campo => campo.taxa_acerto < 50);

  if (camposCriticos.length === 0) {
    console.log('✅ Nenhum campo com problemas sistemáticos identificado (todos acima de 50% de acerto)');
    return;
  }

  console.log(`⚠️  ${camposCriticos.length} campos com problemas sistemáticos (taxa de acerto < 50%):`);

  for (const campo of camposCriticos) {
    console.log(`\n🚨 CAMPO CRÍTICO: ${campo.campo}`);
    console.log(`   Taxa de acerto: ${campo.taxa_acerto.toFixed(2)}%`);
    console.log(`   Total de erros: ${campo.erros}/${campo.total_verificacoes}`);

    // Analisa padrões nos erros
    const errosNumericos = campo.erros_detalhados.filter(e =>
      typeof e.valor_calculado === 'number' && typeof e.valor_gabarito === 'number'
    );

    if (errosNumericos.length > 0) {
      const diferencas = errosNumericos.map(e => e.diferenca!);
      const diferencaMedia = diferencas.reduce((a, b) => a + b, 0) / diferencas.length;
      const diferencaAbsolutaMedia = diferencas.reduce((a, b) => a + Math.abs(b), 0) / diferencas.length;

      console.log(`   Diferença média: ${diferencaMedia.toFixed(2)}`);
      console.log(`   Diferença absoluta média: ${diferencaAbsolutaMedia.toFixed(2)}`);

      // Identifica se há padrão de sempre ser maior ou menor
      const positivos = diferencas.filter(d => d > 0).length;
      const negativos = diferencas.filter(d => d < 0).length;
      const zeros = diferencas.filter(d => d === 0).length;

      if (positivos > negativos * 2) {
        console.log(`   🎯 PADRÃO: Valores calculados tendem a ser MAIORES que o gabarito (${positivos} vs ${negativos})`);
      } else if (negativos > positivos * 2) {
        console.log(`   🎯 PADRÃO: Valores calculados tendem a ser MENORES que o gabarito (${negativos} vs ${positivos})`);
      } else {
        console.log(`   🎯 PADRÃO: Valores variam sem tendência clara (${positivos} positivos, ${negativos} negativos, ${zeros} zeros)`);
      }
    }

    // Mostra exemplos específicos
    console.log(`   Exemplos de erros:`);
    campo.erros_detalhados.slice(0, 5).forEach(erro => {
      const diferenca = erro.diferenca !== undefined ? ` (dif: ${erro.diferenca})` : '';
      const percentual = erro.percentual_erro !== undefined ? ` (${erro.percentual_erro.toFixed(1)}% erro)` : '';
      console.log(`     - ${erro.medicamento} (${erro.unidade}): calc=${erro.valor_calculado}, gab=${erro.valor_gabarito}${diferenca}${percentual}`);
    });

    // Sugestões de correção baseadas no campo
    console.log(`   💡 SUGESTÕES DE CORREÇÃO:`);
    if (campo.campo.startsWith('contagens.')) {
      console.log(`     - Verificar lógica de contagem de semanas com valor > 0`);
      console.log(`     - Confirmar se está usando 49 ou 52 semanas para ESF3`);
    } else if (campo.campo.startsWith('medianas.')) {
      console.log(`     - Verificar cálculo de mediana e arredondamento`);
      console.log(`     - Confirmar seleção correta de semanas para cálculo`);
    } else if (campo.campo === 'metodo') {
      console.log(`     - Verificar mapeamento de string para número do método`);
      console.log(`     - Confirmar lógica de seleção do método`);
    } else if (campo.campo === 'metEst') {
      console.log(`     - Verificar cálculo: método * multiplicador por tipo`);
      console.log(`     - Confirmar valores dos multiplicadores`);
    } else if (campo.campo === 'reposicao') {
      console.log(`     - Verificar cálculo: metEst - estoque`);
      console.log(`     - Confirmar valores de estoque carregados`);
    } else if (campo.campo === 'estoque') {
      console.log(`     - Verificar carregamento dos dados de estoque consolidado`);
      console.log(`     - Confirmar se os arquivos JSON de estoque estão atualizados`);
      console.log(`     - Verificar se o medicamento existe nos dados de estoque das unidades`);
    }
  }
}

// --- FUNÇÃO PRINCIPAL DE VALIDAÇÃO ---
export async function validarCalculosComGabarito(): Promise<any> {
  try {
    console.log('🔍 Iniciando validação dos cálculos com gabarito...');

    // Carrega o gabarito (resolve caminho com fallback: dist → src → CWD)
    const candidatosGabarito = [
      path.join(__dirname, '../testes/gabarito/gabarito-campos-calculados.json'),
      path.join(__dirname, '../../../src/scripts/testes/gabarito/gabarito-campos-calculados.json'),
      path.join(process.cwd(), 'backend/functions/src/scripts/testes/gabarito/gabarito-campos-calculados.json'),
      path.join(process.cwd(), 'functions/src/scripts/testes/gabarito/gabarito-campos-calculados.json')
    ];
    const caminhoGabarito = candidatosGabarito.find(p => {
      const existe = fs.existsSync(p);
      console.log(`🔎 [GABARITO] Candidate: ${p} (existe? ${existe})`);
      return existe;
    });
    if (!caminhoGabarito) {
      throw new Error(`Gabarito não encontrado em nenhum dos caminhos candidatos.`);
    }

    const gabaritoData = fs.readFileSync(caminhoGabarito, 'utf8');
    const gabarito: GabaritoEstrutura = JSON.parse(gabaritoData);

    // Conta total de medicamentos no gabarito
    const totalGabarito = Object.values(gabarito.unidade).reduce((acc, unidade) => acc + unidade.length, 0);
    console.log(`📊 Gabarito carregado com ${totalGabarito} medicamentos`);

    // Busca dados do Firebase
    const municipiosSnapshot = await db.collection('municipio').get();

    const resultados: ResultadoValidacao[] = [];
    let totalProcessados = 0;
    let totalIgnoradosSemanaFaltando = 0;
    let totalSucessos = 0;

    // Estrutura para armazenar informações sobre semanas
    const semanasPorUnidade = new Map<string, Set<string>>();
    const ultimaSemanaGeral = new Set<string>();

    // Mapeamento de campos entre formato calculado e gabarito
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
        const medicamentosSnapshot = await unidadeDoc.ref.collection('medicamentos_unidade').get();

        for (const medicamentoDoc of medicamentosSnapshot.docs) {
          totalProcessados++;

          try {
            const medicamento = medicamentoDoc.data() as MedicamentoCalculado;

            // Busca no gabarito
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

            // Ignora medicamentos que não possuem a última semana requerida (2025_22)
            const semanaRequerida = '2025_22';
            const possuiSemanaRequerida = medicamento && medicamento.movimentacoes_semanais && Object.prototype.hasOwnProperty.call(medicamento.movimentacoes_semanais, semanaRequerida);
            if (!possuiSemanaRequerida) {
              totalIgnoradosSemanaFaltando++;
              console.warn(`⏭️  Ignorando ${medicamento.nome} (${unidadeDoc.id}) por ausência da semana ${semanaRequerida}`);
              continue;
            }

            // Calcula campos
            const camposCalculados = await calcularCamposParaMedicamento(
              medicamento as MedicamentoCalculado,
              unidadeDoc.id
            );
            // Compara campos usando mapeamento
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

            console.log(`✅ ${medicamento.nome} (${unidadeDoc.id}): ${acerto.toFixed(1)}% de acerto - Última semana: ${camposCalculados.ultimaSemana}`);

            // Armazena a última semana para cada medicamento
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

    // Calcula estatísticas finais
    const taxaAcertoGeral = totalProcessados > 0 ? (totalSucessos / totalProcessados) * 100 : 0;
    const acertoMedio = resultados.length > 0 ?
      resultados.reduce((acc, r) => acc + r.acerto, 0) / resultados.length : 0;

    console.log('\n🎉 Validação concluída!');
    console.log('📊 Estatísticas finais:');
    console.log(`   📦 Total processados: ${totalProcessados}`);
    console.log(`   ✅ Perfeitos (100%): ${totalSucessos}`);
    console.log(`   📈 Taxa de acerto geral: ${taxaAcertoGeral.toFixed(2)}%`);
    console.log(`   ⏭️ Ignorados por falta da semana 2025_22: ${totalIgnoradosSemanaFaltando}`);
    console.log(`   📊 Acerto médio: ${acertoMedio.toFixed(2)}%`);

    // Gera análise detalhada dos padrões
    const analisePadroes = gerarRelatorioDetalhado(resultados);

    // Análise de campos com problemas sistemáticos
    gerarRelatorioCamposSistematicos(analisePadroes);

    // Exibe resumo dos campos mais problemáticos
    console.log('\n🔍 ANÁLISE DETALHADA DOS CAMPOS MAIS PROBLEMÁTICOS:');
    console.log('='.repeat(80));

    const top5CamposProblematicos = analisePadroes.campos_mais_problematicos.slice(0, 5);
    for (const campo of top5CamposProblematicos) {
      console.log(`\n📊 Campo: ${campo.campo}`);
      console.log(`   Taxa de acerto: ${campo.taxa_acerto.toFixed(2)}%`);
      console.log(`   Erros: ${campo.erros}/${campo.total_verificacoes}`);

      if (campo.valores_mais_frequentes.length > 0) {
        console.log(`   Valores mais frequentes nos erros:`);
        campo.valores_mais_frequentes.slice(0, 3).forEach(valor => {
          console.log(`     - ${valor.valor}: ${valor.quantidade}x (${valor.percentual.toFixed(1)}%)`);
        });
      }

      // Mostra alguns exemplos de erros
      if (campo.erros_detalhados.length > 0) {
        console.log(`   Exemplos de erros:`);
        campo.erros_detalhados.slice(0, 3).forEach(erro => {
          const diferenca = erro.diferenca !== undefined ? ` (dif: ${erro.diferenca})` : '';
          const percentual = erro.percentual_erro !== undefined ? ` (${erro.percentual_erro.toFixed(1)}% erro)` : '';
          console.log(`     - ${erro.medicamento} (${erro.unidade}): calc=${erro.valor_calculado}, gab=${erro.valor_gabarito}${diferenca}${percentual}`);
        });
      }
    }

    // Exibe unidades mais problemáticas
    console.log('\n🏥 UNIDADES MAIS PROBLEMÁTICAS:');
    console.log('='.repeat(80));

    const top3UnidadesProblematicas = analisePadroes.unidades_mais_problematicas.slice(0, 3);
    for (const unidade of top3UnidadesProblematicas) {
      console.log(`\n🏥 Unidade: ${unidade.unidade}`);
      console.log(`   Acerto médio: ${unidade.acerto_medio.toFixed(2)}%`);
      console.log(`   Medicamentos: ${unidade.total_medicamentos}`);
      console.log(`   Campos com erro: ${unidade.campos_com_erro.join(', ')}`);
    }

    // Exibe distribuição de erros
    console.log('\n📈 DISTRIBUIÇÃO DOS ERROS:');
    console.log('='.repeat(80));

    for (const faixa of analisePadroes.distribuicao_erros) {
      console.log(`   ${faixa.faixa_acerto}: ${faixa.quantidade} medicamentos (${faixa.percentual.toFixed(1)}%)`);
    }

    // Exibe informações sobre as semanas utilizadas nos cálculos
    console.log('\n📅 INFORMAÇÕES SOBRE SEMANAS UTILIZADAS NOS CÁLCULOS:');
    console.log('='.repeat(80));

    // Exibe resumo das semanas por unidade
    for (const [unidade, semanas] of semanasPorUnidade) {
      if (semanas.size > 0) {
        const semanasOrdenadas = Array.from(semanas).sort();
        const semanaMaisRecente = semanasOrdenadas[semanasOrdenadas.length - 1];
        console.log(`\n🏥 Unidade: ${unidade}`);
        console.log(`   Semana mais recente: ${semanaMaisRecente}`);
        console.log(`   Total de semanas únicas: ${semanas.size}`);
        console.log(`   Faixa de semanas: ${semanasOrdenadas[0]} a ${semanaMaisRecente}`);
      }
    }

    // Exibe a semana mais recente geral
    if (ultimaSemanaGeral.size > 0) {
      const todasSemanasOrdenadas = Array.from(ultimaSemanaGeral).sort();
      const semanaMaisRecenteGeral = todasSemanasOrdenadas[todasSemanasOrdenadas.length - 1];
      console.log(`\n🌍 RESUMO GERAL:`);
      console.log(`   Semana mais recente em todo o sistema: ${semanaMaisRecenteGeral}`);
      console.log(`   Total de semanas únicas no sistema: ${ultimaSemanaGeral.size}`);
      console.log(`   Faixa geral de semanas: ${todasSemanasOrdenadas[0]} a ${semanaMaisRecenteGeral}`);
    }

    // Salva relatório detalhado
    const relatorio = {
      data_validacao: new Date().toISOString(),
      estatisticas: {
        total_processados: totalProcessados,
        perfeitos: totalSucessos,
        taxa_acerto_geral: taxaAcertoGeral,
        acerto_medio: acertoMedio,
        ignorados_semana_2025_22: totalIgnoradosSemanaFaltando
      },
      informacoes_semanas: {
        semana_mais_recente_geral: ultimaSemanaGeral.size > 0 ? Array.from(ultimaSemanaGeral).sort().pop() : 'N/A',
        total_semanas_unicas: ultimaSemanaGeral.size,
        semanas_por_unidade: Object.fromEntries(
          Array.from(semanasPorUnidade.entries()).map(([unidade, semanas]) => [
            unidade,
            {
              semana_mais_recente: Array.from(semanas).sort().pop() || 'N/A',
              total_semanas_unicas: semanas.size,
              semanas: Array.from(semanas).sort()
            }
          ])
        )
      },
      resultados_detalhados: resultados,
      analise_padroes: analisePadroes
    };

    const caminhoRelatorio = 'D:/Beets/Matriciale/Well/backend/functions/src/scripts/testes/output_validacao/relatorio-detalhado.json';
    fs.writeFileSync(caminhoRelatorio, JSON.stringify(relatorio, null, 2));
    console.log(`\n📝 Relatório detalhado salvo em: ${caminhoRelatorio}`);

    // Salva relatório resumido em formato mais legível
    const relatorioResumido = {
      data_validacao: new Date().toISOString(),
      resumo: {
        total_processados: totalProcessados,
        perfeitos: totalSucessos,
        taxa_acerto_geral: taxaAcertoGeral,
        acerto_medio: acertoMedio,
        ignorados_semana_2025_22: totalIgnoradosSemanaFaltando
      },
      informacoes_semanas: {
        semana_mais_recente_geral: ultimaSemanaGeral.size > 0 ? Array.from(ultimaSemanaGeral).sort().pop() : 'N/A',
        total_semanas_unicas: ultimaSemanaGeral.size,
        semanas_por_unidade: Object.fromEntries(
          Array.from(semanasPorUnidade.entries()).map(([unidade, semanas]) => [
            unidade,
            {
              semana_mais_recente: Array.from(semanas).sort().pop() || 'N/A',
              total_semanas_unicas: semanas.size
            }
          ])
        )
      },
      campos_mais_problematicos: analisePadroes.campos_mais_problematicos.slice(0, 10).map(campo => ({
        campo: campo.campo,
        taxa_acerto: campo.taxa_acerto,
        erros: campo.erros,
        total: campo.total_verificacoes,
        valores_mais_frequentes: campo.valores_mais_frequentes.slice(0, 3)
      })),
      unidades_mais_problematicas: analisePadroes.unidades_mais_problematicas.slice(0, 5).map(unidade => ({
        unidade: unidade.unidade,
        acerto_medio: unidade.acerto_medio,
        total_medicamentos: unidade.total_medicamentos,
        campos_com_erro: unidade.campos_com_erro
      })),
      medicamentos_mais_problematicos: analisePadroes.medicamentos_mais_problematicos.slice(0, 10).map(med => ({
        medicamento: med.medicamento,
        unidade: med.unidade,
        acerto: med.acerto,
        campos_incorretos: med.campos_incorretos
      }))
    };

    const caminhoRelatorioResumido = 'D:/Beets/Matriciale/Well/backend/functions/src/scripts/testes/output_validacao/relatorio-resumido.json';
    fs.writeFileSync(caminhoRelatorioResumido, JSON.stringify(relatorioResumido, null, 2));
    console.log(`📝 Relatório resumido salvo em: ${caminhoRelatorioResumido}`);

    return relatorioResumido;

  } catch (error) {
    console.error('💥 Erro durante a validação:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  validarCalculosComGabarito()
    .then(() => {
      console.log('\n✅ Validação executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na validação:', error);
      process.exit(1);
    });
}
