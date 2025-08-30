import * as fs from 'fs';
import * as path from 'path';
import { validarCalculosComGabarito } from '../../calculos/validar-calculos';

interface ComparacaoDetalhada {
  medicamento: string;
  unidade: string;
  campos: {
    nome: string;
    valor_calculado: any;
    valor_gabarito: any;
    diferenca?: number;
    percentual_erro?: number;
    status: 'correto' | 'incorreto';
  }[];
  acerto_geral: number;
}

async function gerarComparacaoDetalhada(): Promise<void> {
  try {
    console.log('🔍 Gerando comparação detalhada lado a lado...');
    
    // Carrega o relatório de validação
    const caminhoRelatorio = path.join(__dirname, '../../calculos/output_validacao/relatorio-validacao.json');
    if (!fs.existsSync(caminhoRelatorio)) {
      console.log('⚠️ Relatório de validação não encontrado. Executando validação primeiro...');
      await validarCalculosComGabarito();
    }
    
    const relatorioData = fs.readFileSync(caminhoRelatorio, 'utf8');
    const relatorio = JSON.parse(relatorioData);
    
    const resultados = relatorio.resultados_detalhados;
    
    // Mapeamento de campos
    const mapeamentoCampos = [
      { calculado: 'contagens.Cont04', gabarito: 'Cont04', nome: 'Contagem 4 semanas' },
      { calculado: 'contagens.Cont08', gabarito: 'Cont08', nome: 'Contagem 8 semanas' },
      { calculado: 'contagens.Cont12', gabarito: 'Cont12', nome: 'Contagem 12 semanas' },
      { calculado: 'contagens.Cont16', gabarito: 'Cont16', nome: 'Contagem 16 semanas' },
      { calculado: 'contagens.Cont26', gabarito: 'Cont26', nome: 'Contagem 26 semanas' },
      { calculado: 'contagens.Cont52', gabarito: 'Cont52', nome: 'Contagem 52 semanas' },
      { calculado: 'contagens.ContAno', gabarito: 'ContAno', nome: 'Contagem ano' },
      { calculado: 'contagens.ContTt', gabarito: 'ContTt', nome: 'Contagem total' },
      { calculado: 'maximo', gabarito: 'Máximo', nome: 'Máximo' },
      { calculado: 'medianas.Md04', gabarito: 'Md04', nome: 'Mediana 4 semanas' },
      { calculado: 'medianas.Md08', gabarito: 'Md08', nome: 'Mediana 8 semanas' },
      { calculado: 'medianas.Md12', gabarito: 'Md12', nome: 'Mediana 12 semanas' },
      { calculado: 'medianas.Md16', gabarito: 'Md16', nome: 'Mediana 16 semanas' },
      { calculado: 'medianas.Md26', gabarito: 'Md26', nome: 'Mediana 26 semanas' },
      { calculado: 'medianas.Md52', gabarito: 'Md52', nome: 'Mediana 52 semanas' },
      { calculado: 'medianas.MdAno', gabarito: 'MdAno', nome: 'Mediana ano' },
      { calculado: 'medianas.MdTt', gabarito: 'MdTt', nome: 'Mediana total' },
      { calculado: 'tp_metodo', gabarito: 'TP_Metodo', nome: 'Tipo método' },
      { calculado: 'metodo', gabarito: 'Metodo', nome: 'Método' },
      { calculado: 'metEst', gabarito: 'MetEst', nome: 'MetEst' },
      { calculado: 'reposicao', gabarito: 'Reposição', nome: 'Reposição' },
      { calculado: 'totalGeral', gabarito: 'Total Geral', nome: 'Total Geral' }
    ];
    
    // Carrega o gabarito para obter valores detalhados
    const caminhoGabarito = path.join(__dirname, './gabarito/gabarito-campos-calculados.json');
    const gabaritoData = fs.readFileSync(caminhoGabarito, 'utf8');
    const gabarito = JSON.parse(gabaritoData);
    
    const comparacoes: ComparacaoDetalhada[] = [];
    
    // Processa cada resultado
    for (const resultado of resultados) {
      const medicamentosUnidade = gabarito.unidade[resultado.unidade];
      if (!medicamentosUnidade) continue;
      
      const gabaritoItem = medicamentosUnidade.find(g => g["NOME ITEM"] === resultado.medicamento);
      if (!gabaritoItem) continue;
      
      const campos: ComparacaoDetalhada['campos'] = [];
      
      for (const mapeamento of mapeamentoCampos) {
        const erroDetalhado = resultado.campos_incorretos.find(e => e.campo === mapeamento.calculado);
        const campoCorreto = resultado.campos_corretos.includes(mapeamento.calculado);
        
        if (campoCorreto) {
          // Campo correto - obtém valor do gabarito
          const valorGabarito = gabaritoItem[mapeamento.gabarito];
          campos.push({
            nome: mapeamento.nome,
            valor_calculado: valorGabarito, // Se está correto, é igual ao gabarito
            valor_gabarito: valorGabarito,
            status: 'correto'
          });
        } else if (erroDetalhado) {
          // Campo incorreto
          campos.push({
            nome: mapeamento.nome,
            valor_calculado: erroDetalhado.valor_calculado,
            valor_gabarito: erroDetalhado.valor_gabarito,
            diferenca: erroDetalhado.diferenca,
            percentual_erro: erroDetalhado.percentual_erro,
            status: 'incorreto'
          });
        }
      }
      
      comparacoes.push({
        medicamento: resultado.medicamento,
        unidade: resultado.unidade,
        campos,
        acerto_geral: resultado.acerto
      });
    }
    
    // Filtra apenas medicamentos com problemas para análise
    const medicamentosComProblemas = comparacoes.filter(c => c.acerto_geral < 100);
    
    // Agrupa por unidade para facilitar análise
    const agrupadoPorUnidade = new Map<string, ComparacaoDetalhada[]>();
    for (const comparacao of medicamentosComProblemas) {
      const unidade = comparacao.unidade;
      if (!agrupadoPorUnidade.has(unidade)) {
        agrupadoPorUnidade.set(unidade, []);
      }
      agrupadoPorUnidade.get(unidade)!.push(comparacao);
    }
    
    // Gera relatório detalhado
    const relatorioDetalhado = {
      data_geracao: new Date().toISOString(),
      total_medicamentos_com_problemas: medicamentosComProblemas.length,
      agrupado_por_unidade: Object.fromEntries(agrupadoPorUnidade),
      campos_mapeamento: mapeamentoCampos.map(m => ({
        calculado: m.calculado,
        gabarito: m.gabarito,
        nome: m.nome
      }))
    };
    
    const caminhoComparacao = path.join(__dirname, '../../calculos/output_validacao/comparacao-detalhada.json');
    fs.writeFileSync(caminhoComparacao, JSON.stringify(relatorioDetalhado, null, 2));
    
    // Gera relatório em formato CSV para análise em Excel
    let csvContent = 'Medicamento,Unidade,Acerto Geral,';
    csvContent += mapeamentoCampos.map(m => `${m.nome} (Calc),${m.nome} (Gab),${m.nome} (Dif),${m.nome} (Status)`).join(',');
    csvContent += '\n';
    
    for (const comparacao of medicamentosComProblemas) {
      csvContent += `"${comparacao.medicamento}","${comparacao.unidade}",${comparacao.acerto_geral.toFixed(2)},`;
      
      for (const mapeamento of mapeamentoCampos) {
        const campo = comparacao.campos.find(c => c.nome === mapeamento.nome);
        if (campo) {
          csvContent += `"${campo.valor_calculado}","${campo.valor_gabarito}","${campo.diferenca || ''}","${campo.status}",`;
        } else {
          csvContent += ',,,,'; // Campo não encontrado
        }
      }
      csvContent += '\n';
    }
    
    const caminhoCSV = path.join(__dirname, '../../calculos/output_validacao/comparacao-detalhada.csv');
    fs.writeFileSync(caminhoCSV, csvContent);
    
    console.log('✅ Comparação detalhada gerada com sucesso!');
    console.log(`📊 Total de medicamentos com problemas: ${medicamentosComProblemas.length}`);
    console.log(`📝 Arquivo JSON: ${caminhoComparacao}`);
    console.log(`📊 Arquivo CSV: ${caminhoCSV}`);
    
    // Exibe resumo por unidade
    console.log('\n📋 RESUMO POR UNIDADE:');
    console.log('=' .repeat(60));
    
    for (const [unidade, medicamentos] of agrupadoPorUnidade) {
      const acertoMedio = medicamentos.reduce((acc, m) => acc + m.acerto_geral, 0) / medicamentos.length;
      console.log(`🏥 ${unidade}: ${medicamentos.length} medicamentos com problemas (acerto médio: ${acertoMedio.toFixed(2)}%)`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao gerar comparação detalhada:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  gerarComparacaoDetalhada()
    .then(() => {
      console.log('\n✅ Comparação detalhada executada com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Erro na comparação detalhada:', error);
      process.exit(1);
    });
}

export { gerarComparacaoDetalhada };
