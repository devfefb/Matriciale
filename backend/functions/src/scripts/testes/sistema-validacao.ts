import * as fs from 'fs';
import * as path from 'path';
import { validarCalculosGeneralizado, criarConfiguracaoAutomatica, ConfiguracaoValidacao } from './validar-calculos-generalized';

/**
 * Sistema de Validação Consolidado
 * Orquestra validações automáticas com comparação de gabaritos
 */

interface ResultadoComparacao {
  arquivo_teste: string;
  gabarito_usado: string;
  compatibilidade: number; // 0-100%
  diferencas_encontradas: {
    campo: string;
    valor_teste: any;
    valor_gabarito: any;
    tipo_diferenca: 'valor' | 'tipo' | 'estrutura';
  }[];
  aprovado: boolean;
  observacoes: string[];
}

interface RelatorioValidacao {
  data_execucao: string;
  municipio: string;
  tipo_teste: 'semanal' | 'onboarding' | 'manual';
  arquivo_origem: string;
  configuracao_usada: ConfiguracaoValidacao;
  resultado_validacao: any;
  comparacao_gabarito: ResultadoComparacao;
  status_final: 'aprovado' | 'reprovado' | 'aprovado_com_ressalvas';
  proximos_passos: string[];
}

interface OpcoesValidacao {
  tolerancia_erro: number; // Percentual de erro aceitável (padrão: 5%)
  campos_criticos: string[]; // Campos que devem ter 100% de acerto
  salvar_detalhes: boolean;
  notificar_resultado: boolean;
  diretorio_backup: string;
}

class SistemaValidacao {
  private configuracao: OpcoesValidacao;
  private gabaritos: Map<string, any> = new Map();
  
  constructor(opcoes: Partial<OpcoesValidacao> = {}) {
    this.configuracao = {
      tolerancia_erro: 5,
      campos_criticos: ['metodo', 'metEst', 'reposicao', 'tp_metodo'],
      salvar_detalhes: true,
      notificar_resultado: true,
      diretorio_backup: path.resolve('test-output', 'backup'),
      ...opcoes
    };
    
    this.carregarGabaritos();
  }

  /**
   * Carrega todos os gabaritos disponíveis
   */
  private carregarGabaritos(): void {
    const diretorioGabaritos = path.resolve('test-gabaritos');
    
    if (!fs.existsSync(diretorioGabaritos)) {
      console.warn(`⚠️ Diretório de gabaritos não encontrado: ${diretorioGabaritos}`);
      return;
    }

    try {
      const arquivos = fs.readdirSync(diretorioGabaritos);
      
      for (const arquivo of arquivos) {
        if (arquivo.endsWith('.json')) {
          const caminhoCompleto = path.join(diretorioGabaritos, arquivo);
          const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
          const dados = JSON.parse(conteudo);
          
          const nomeGabarito = arquivo.replace('.json', '');
          this.gabaritos.set(nomeGabarito, dados);
          
          console.log(`📋 Gabarito carregado: ${nomeGabarito}`);
        }
      }
      
      console.log(`✅ ${this.gabaritos.size} gabaritos carregados`);
      
    } catch (error) {
      console.error('❌ Erro ao carregar gabaritos:', error);
    }
  }

  /**
   * Identifica qual gabarito usar para um determinado teste
   */
  private identificarGabarito(configuracao: ConfiguracaoValidacao): string | null {
    // Lógica para identificar gabarito apropriado
    // Por enquanto, usar o gabarito padrão
    
    if (this.gabaritos.has('gabarito-campos-calculados')) {
      return 'gabarito-campos-calculados';
    }
    
    // Tentar encontrar gabarito específico do município
    const gabaritoMunicipio = `gabarito-${configuracao.municipio}`;
    if (this.gabaritos.has(gabaritoMunicipio)) {
      return gabaritoMunicipio;
    }
    
    // Usar primeiro gabarito disponível
    const primeiroGabarito = Array.from(this.gabaritos.keys())[0];
    if (primeiroGabarito) {
      console.warn(`⚠️ Usando gabarito genérico: ${primeiroGabarito}`);
      return primeiroGabarito;
    }
    
    return null;
  }

  /**
   * Compara resultado da validação com gabarito
   */
  private compararComGabarito(
    resultadoValidacao: any, 
    nomeGabarito: string,
    configuracao: ConfiguracaoValidacao
  ): ResultadoComparacao {
    
    const gabarito = this.gabaritos.get(nomeGabarito);
    if (!gabarito) {
      throw new Error(`Gabarito não encontrado: ${nomeGabarito}`);
    }

    const diferencas: ResultadoComparacao['diferencas_encontradas'] = [];
    let totalComparacoes = 0;
    let compatibilidadeTotal = 0;

    // Comparar estatísticas principais
    if (resultadoValidacao.estatisticas && gabarito.estatisticas_esperadas) {
      const estatisticasComparar = ['taxa_acerto_geral', 'acerto_medio'];
      
      for (const campo of estatisticasComparar) {
        totalComparacoes++;
        const valorTeste = resultadoValidacao.estatisticas[campo];
        const valorGabarito = gabarito.estatisticas_esperadas[campo];
        
        if (valorTeste !== undefined && valorGabarito !== undefined) {
          const diferenca = Math.abs(valorTeste - valorGabarito);
          const percentualDiferenca = (diferenca / valorGabarito) * 100;
          
          if (percentualDiferenca <= this.configuracao.tolerancia_erro) {
            compatibilidadeTotal++;
          } else {
            diferencas.push({
              campo,
              valor_teste: valorTeste,
              valor_gabarito: valorGabarito,
              tipo_diferenca: 'valor'
            });
          }
        }
      }
    }

    // Comparar campos críticos
    if (resultadoValidacao.resultados_detalhados) {
      for (const resultado of resultadoValidacao.resultados_detalhados.slice(0, 10)) { // Amostra
        for (const campoCritico of this.configuracao.campos_criticos) {
          const valorCampo = resultado.campos_corretos?.includes(campoCritico);
          if (!valorCampo) {
            diferencas.push({
              campo: `${resultado.medicamento}.${campoCritico}`,
              valor_teste: 'erro',
              valor_gabarito: 'esperado_correto',
              tipo_diferenca: 'valor'
            });
          }
        }
      }
    }

    const compatibilidade = totalComparacoes > 0 ? (compatibilidadeTotal / totalComparacoes) * 100 : 0;
    const aprovado = compatibilidade >= (100 - this.configuracao.tolerancia_erro) && 
                     diferencas.filter(d => this.configuracao.campos_criticos.some(c => d.campo.includes(c))).length === 0;

    const observacoes: string[] = [];
    if (!aprovado) {
      observacoes.push(`Compatibilidade abaixo do esperado: ${compatibilidade.toFixed(1)}%`);
      
      const errosCriticos = diferencas.filter(d => 
        this.configuracao.campos_criticos.some(c => d.campo.includes(c))
      );
      
      if (errosCriticos.length > 0) {
        observacoes.push(`${errosCriticos.length} erros em campos críticos detectados`);
      }
    }

    return {
      arquivo_teste: 'resultado_validacao.json',
      gabarito_usado: nomeGabarito,
      compatibilidade,
      diferencas_encontradas: diferencas,
      aprovado,
      observacoes
    };
  }

  /**
   * Gera relatório consolidado da validação
   */
  private gerarRelatorio(
    configuracao: ConfiguracaoValidacao,
    resultadoValidacao: any,
    comparacao: ResultadoComparacao,
    arquivoOrigem: string
  ): RelatorioValidacao {
    
    let statusFinal: RelatorioValidacao['status_final'] = 'reprovado';
    const proximosPassos: string[] = [];

    if (comparacao.aprovado) {
      if (comparacao.compatibilidade >= 95) {
        statusFinal = 'aprovado';
        proximosPassos.push('✅ Validação passou em todos os critérios');
        proximosPassos.push('🚀 Sistema está pronto para uso em produção');
      } else {
        statusFinal = 'aprovado_com_ressalvas';
        proximosPassos.push('⚠️ Validação aprovada com algumas divergências menores');
        proximosPassos.push('🔍 Revisar campos com baixa compatibilidade');
        proximosPassos.push('📋 Considerar atualização do gabarito se necessário');
      }
    } else {
      proximosPassos.push('❌ Validação não passou nos critérios mínimos');
      proximosPassos.push('🔧 Verificar configuração de unidades e multiplicadores');
      proximosPassos.push('📊 Analisar campos críticos com erro');
      proximosPassos.push('🔄 Executar nova validação após correções');
    }

    // Detectar tipo de teste
    let tipoTeste: RelatorioValidacao['tipo_teste'] = 'manual';
    if (arquivoOrigem.includes('upload-semanal')) {
      tipoTeste = 'semanal';
    } else if (arquivoOrigem.includes('onboarding')) {
      tipoTeste = 'onboarding';
    }

    return {
      data_execucao: new Date().toISOString(),
      municipio: configuracao.municipio,
      tipo_teste: tipoTeste,
      arquivo_origem: arquivoOrigem,
      configuracao_usada: configuracao,
      resultado_validacao: resultadoValidacao,
      comparacao_gabarito: comparacao,
      status_final: statusFinal,
      proximos_passos: proximosPassos
    };
  }

  /**
   * Executa validação completa de um arquivo
   */
  public async executarValidacao(
    arquivoOrigem: string,
    configuracao?: ConfiguracaoValidacao
  ): Promise<RelatorioValidacao> {
    
    console.log(`🔍 Iniciando validação de: ${path.basename(arquivoOrigem)}`);
    
    try {
      // Se não foi fornecida configuração, tentar detectar automaticamente
      if (!configuracao) {
        console.log('🔄 Detectando configuração automaticamente...');
        
        // Tentar extrair informações do arquivo
        const conteudo = fs.readFileSync(arquivoOrigem, 'utf8');
        const dados = JSON.parse(conteudo);
        
        let municipio = 'municipio_teste';
        let diretorioDados = path.dirname(arquivoOrigem);
        
        // Tentar extrair município dos dados
        if (dados.municipio) {
          municipio = dados.municipio;
        } else if (dados.cidades && dados.cidades[0]?.nome) {
          municipio = dados.cidades[0].nome;
        }
        
        // Tentar encontrar diretório com dados das unidades
        const possiveisDiretoriosDados = [
          path.join(__dirname, '../dados/2025_22'),
          path.join(process.cwd(), 'backend', 'functions', 'src', 'scripts', 'dados', '2025_22'),
          diretorioDados
        ];
        
        for (const dir of possiveisDiretoriosDados) {
          if (fs.existsSync(dir)) {
            diretorioDados = dir;
            break;
          }
        }
        
        configuracao = criarConfiguracaoAutomatica(municipio, diretorioDados, {
          debug: true,
          salvarResultados: this.configuracao.salvar_detalhes
        });
        
        console.log(`✅ Configuração detectada: ${municipio}, ${configuracao.unidades.length} unidades`);
      }

      // Executar validação
      console.log('⚙️ Executando validação de cálculos...');
      await validarCalculosGeneralizado(configuracao);
      
      // Carregar resultado da validação
      const padraoArquivoResultado = path.join(
        configuracao.opcoes.diretorioOutput, 
        `relatorio-validacao-${configuracao.municipio}-*.json`
      );
      
      // Encontrar arquivo de resultado mais recente
      const arquivosResultado = fs.readdirSync(configuracao.opcoes.diretorioOutput)
        .filter(f => f.startsWith(`relatorio-validacao-${configuracao.municipio}-`))
        .sort()
        .reverse();
      
      if (arquivosResultado.length === 0) {
        throw new Error('Arquivo de resultado da validação não encontrado');
      }
      
      const caminhoResultado = path.join(configuracao.opcoes.diretorioOutput, arquivosResultado[0]);
      const resultadoValidacao = JSON.parse(fs.readFileSync(caminhoResultado, 'utf8'));
      
      // Identificar gabarito apropriado
      const nomeGabarito = this.identificarGabarito(configuracao);
      if (!nomeGabarito) {
        throw new Error('Nenhum gabarito disponível para comparação');
      }
      
      console.log(`📋 Usando gabarito: ${nomeGabarito}`);
      
      // Comparar com gabarito
      console.log('🔍 Comparando resultado com gabarito...');
      const comparacao = this.compararComGabarito(resultadoValidacao, nomeGabarito, configuracao);
      
      // Gerar relatório consolidado
      const relatorio = this.gerarRelatorio(configuracao, resultadoValidacao, comparacao, arquivoOrigem);
      
      // Salvar relatório se solicitado
      if (this.configuracao.salvar_detalhes) {
        const nomeRelatorio = `relatorio-consolidado-${configuracao.municipio}-${Date.now()}.json`;
        const caminhoRelatorio = path.join(configuracao.opcoes.diretorioOutput, nomeRelatorio);
        
        fs.writeFileSync(caminhoRelatorio, JSON.stringify(relatorio, null, 2));
        console.log(`📄 Relatório consolidado salvo: ${caminhoRelatorio}`);
      }
      
      // Fazer backup do arquivo original
      if (this.configuracao.diretorio_backup) {
        if (!fs.existsSync(this.configuracao.diretorio_backup)) {
          fs.mkdirSync(this.configuracao.diretorio_backup, { recursive: true });
        }
        
        const nomeBackup = `${Date.now()}_${path.basename(arquivoOrigem)}`;
        const caminhoBackup = path.join(this.configuracao.diretorio_backup, nomeBackup);
        
        fs.copyFileSync(arquivoOrigem, caminhoBackup);
        console.log(`💾 Backup criado: ${caminhoBackup}`);
      }
      
      // Exibir resultado final
      this.exibirResultadoFinal(relatorio);
      
      return relatorio;
      
    } catch (error) {
      console.error(`❌ Erro durante validação de ${path.basename(arquivoOrigem)}:`, error);
      throw error;
    }
  }

  /**
   * Exibe resultado final da validação
   */
  private exibirResultadoFinal(relatorio: RelatorioValidacao): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADO FINAL DA VALIDAÇÃO');
    console.log('='.repeat(80));
    
    console.log(`🏢 Município: ${relatorio.municipio}`);
    console.log(`📄 Arquivo: ${relatorio.arquivo_origem}`);
    console.log(`🔧 Tipo: ${relatorio.tipo_teste}`);
    console.log(`📅 Executado em: ${new Date(relatorio.data_execucao).toLocaleString('pt-BR')}`);
    
    console.log(`\n📋 Compatibilidade: ${relatorio.comparacao_gabarito.compatibilidade.toFixed(1)}%`);
    console.log(`🎯 Gabarito usado: ${relatorio.comparacao_gabarito.gabarito_usado}`);
    
    // Status com emoji
    let statusEmoji = '';
    let statusCor = '';
    
    switch (relatorio.status_final) {
      case 'aprovado':
        statusEmoji = '✅';
        statusCor = '\x1b[32m'; // Verde
        break;
      case 'aprovado_com_ressalvas':
        statusEmoji = '⚠️';
        statusCor = '\x1b[33m'; // Amarelo
        break;
      case 'reprovado':
        statusEmoji = '❌';
        statusCor = '\x1b[31m'; // Vermelho
        break;
    }
    
    console.log(`\n${statusEmoji} ${statusCor}STATUS: ${relatorio.status_final.toUpperCase()}\x1b[0m`);
    
    if (relatorio.comparacao_gabarito.observacoes.length > 0) {
      console.log(`\n📝 Observações:`);
      relatorio.comparacao_gabarito.observacoes.forEach(obs => {
        console.log(`   • ${obs}`);
      });
    }
    
    if (relatorio.comparacao_gabarito.diferencas_encontradas.length > 0) {
      console.log(`\n🔍 Principais diferenças encontradas:`);
      relatorio.comparacao_gabarito.diferencas_encontradas.slice(0, 5).forEach(diff => {
        console.log(`   • ${diff.campo}: teste=${diff.valor_teste}, gabarito=${diff.valor_gabarito}`);
      });
      
      if (relatorio.comparacao_gabarito.diferencas_encontradas.length > 5) {
        console.log(`   ... e mais ${relatorio.comparacao_gabarito.diferencas_encontradas.length - 5} diferenças`);
      }
    }
    
    console.log(`\n🚀 Próximos passos:`);
    relatorio.proximos_passos.forEach(passo => {
      console.log(`   ${passo}`);
    });
    
    console.log('\n' + '='.repeat(80));
  }

  /**
   * Processa múltiplos arquivos de uma vez
   */
  public async processarLote(arquivos: string[]): Promise<RelatorioValidacao[]> {
    const resultados: RelatorioValidacao[] = [];
    
    console.log(`📦 Processando lote de ${arquivos.length} arquivos...`);
    
    for (let i = 0; i < arquivos.length; i++) {
      const arquivo = arquivos[i];
      console.log(`\n[${i + 1}/${arquivos.length}] Processando: ${path.basename(arquivo)}`);
      
      try {
        const resultado = await this.executarValidacao(arquivo);
        resultados.push(resultado);
        
        // Pequena pausa entre processamentos
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erro ao processar ${path.basename(arquivo)}:`, error);
        // Continuar com próximo arquivo
      }
    }
    
    // Gerar resumo do lote
    this.gerarResumoLote(resultados);
    
    return resultados;
  }

  /**
   * Gera resumo de processamento em lote
   */
  private gerarResumoLote(resultados: RelatorioValidacao[]): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMO DO PROCESSAMENTO EM LOTE');
    console.log('='.repeat(80));
    
    const total = resultados.length;
    const aprovados = resultados.filter(r => r.status_final === 'aprovado').length;
    const aprovadosRessalvas = resultados.filter(r => r.status_final === 'aprovado_com_ressalvas').length;
    const reprovados = resultados.filter(r => r.status_final === 'reprovado').length;
    
    console.log(`📦 Total processados: ${total}`);
    console.log(`✅ Aprovados: ${aprovados} (${((aprovados / total) * 100).toFixed(1)}%)`);
    console.log(`⚠️ Aprovados com ressalvas: ${aprovadosRessalvas} (${((aprovadosRessalvas / total) * 100).toFixed(1)}%)`);
    console.log(`❌ Reprovados: ${reprovados} (${((reprovados / total) * 100).toFixed(1)}%)`);
    
    const compatibilidadeMedia = resultados.reduce((acc, r) => acc + r.comparacao_gabarito.compatibilidade, 0) / total;
    console.log(`📊 Compatibilidade média: ${compatibilidadeMedia.toFixed(1)}%`);
    
    console.log('\n' + '='.repeat(80));
  }
}

/**
 * Função para executar validação de arquivo único
 */
async function validarArquivoUnico(
  caminhoArquivo: string, 
  opcoes: Partial<OpcoesValidacao> = {}
): Promise<RelatorioValidacao> {
  const sistema = new SistemaValidacao(opcoes);
  return await sistema.executarValidacao(caminhoArquivo);
}

/**
 * Função para executar validação em lote
 */
async function validarLoteArquivos(
  arquivos: string[], 
  opcoes: Partial<OpcoesValidacao> = {}
): Promise<RelatorioValidacao[]> {
  const sistema = new SistemaValidacao(opcoes);
  return await sistema.processarLote(arquivos);
}

// Função principal para execução como script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Sistema de Validação Consolidado

Uso: node sistema-validacao.js <arquivo|pasta> [opções]

Argumentos:
  <arquivo>                 Arquivo JSON para validar
  <pasta>                   Pasta com múltiplos arquivos para validar

Opções:
  --tolerancia <n>          Percentual de erro aceitável (padrão: 5%)
  --criticos <campos>       Campos críticos separados por vírgula
  --output <pasta>          Diretório de saída (padrão: test-output)
  --backup <pasta>          Diretório de backup (padrão: test-output/backup)
  --debug                   Ativa logs detalhados
  --help                    Mostra esta ajuda

Exemplos:
  node sistema-validacao.js arquivo.json
  node sistema-validacao.js ./test-input --tolerancia 3
  node sistema-validacao.js dados.json --criticos "metodo,metEst,reposicao"
    `);
    process.exit(0);
  }
  
  const caminhoEntrada = args[0];
  const opcoes: Partial<OpcoesValidacao> = {};
  
  // Parse argumentos
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--tolerancia':
        opcoes.tolerancia_erro = parseFloat(args[i + 1]);
        i++;
        break;
      case '--criticos':
        opcoes.campos_criticos = args[i + 1].split(',');
        i++;
        break;
      case '--output':
        // Note: diretorio_output será definido pela configuração automática
        i++;
        break;
      case '--backup':
        opcoes.diretorio_backup = path.resolve(args[i + 1]);
        i++;
        break;
      case '--debug':
        // Debug será ativado na configuração
        break;
    }
  }
  
  try {
    const stats = fs.statSync(caminhoEntrada);
    
    if (stats.isFile()) {
      // Validar arquivo único
      console.log(`📄 Validando arquivo: ${path.basename(caminhoEntrada)}`);
      await validarArquivoUnico(caminhoEntrada, opcoes);
      
    } else if (stats.isDirectory()) {
      // Validar múltiplos arquivos
      const arquivos = fs.readdirSync(caminhoEntrada)
        .filter(f => f.endsWith('.json'))
        .map(f => path.join(caminhoEntrada, f));
      
      if (arquivos.length === 0) {
        console.warn('⚠️ Nenhum arquivo JSON encontrado na pasta');
        process.exit(1);
      }
      
      console.log(`📦 Validando ${arquivos.length} arquivos da pasta`);
      await validarLoteArquivos(arquivos, opcoes);
    }
    
    console.log('\n✅ Validação concluída com sucesso!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

export { SistemaValidacao, validarArquivoUnico as validarArquivo, validarLoteArquivos as validarLote, RelatorioValidacao, OpcoesValidacao };
