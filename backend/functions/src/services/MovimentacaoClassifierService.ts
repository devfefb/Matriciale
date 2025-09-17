/**
 * Serviço para classificação de movimentações conforme regras de negócio definidas em instructions.md
 * 
 * ESTRUTURA DE CLASSIFICAÇÃO:
 * - TP: Primeiro nível (A/E/S)
 * - TIPO: Segundo nível detalhado (AA/EA/ED/EP/ET/EU/EX/SA/SD/ST/SU/SV/SX)
 * 
 * REGRAS CRÍTICAS:
 * - SA (DISPENSAÇÃO): Regra residual após outras classificações de saída
 * - SU (SAÍDA PARA UNIDADES): Fundamental para cálculo de movimentação semanal
 */

export interface MovimentacaoClassificada {
  data_movimentacao: string;
  historico: string;
  documento: string | null;
  requisicao: string;
  entradas: number | null;
  saidas: number;
  estoque: number;
  observacao: string;
  
  // Campos de classificação adicionados
  tp: 'A' | 'E' | 'S';
  tipo_mov: 'AA' | 'EA' | 'ED' | 'EP' | 'ET' | 'EU' | 'EX' | 'SA' | 'SD' | 'ST' | 'SU' | 'SV' | 'SX';
  qtdmov: number; // Normalização: entradas (+) / saídas (-)
}

export interface UnidadeIdentificada {
  nome: string;
  tipo: 'CAF' | 'FARMACIA' | 'UBS' | 'PRONTO_ATENDIMENTO' | 'CONSULTORIO' | 'OUTROS';
  esCAF: boolean;
}

export class MovimentacaoClassifierService {
  
  // Listas de referência para classificação (configuráveis)
  private readonly FORNECEDORES_CONHECIDOS = [
    'FARMACIA POPULAR',
    'DISTRIBUIDORA',
    'LABORATORIO',
    'ROCHE',
    'NOVARTIS',
    'BAYER',
    'ABBOTT',
    'GENZYME'
  ];

  private readonly UNIDADES_MUNICIPIO = [
    'CAF',
    'FARMACIA CENTRAL',
    'FARMACIA DISTRITO',
    'ESF3',
    'OLAVO',
    'UBS',
    'PSF'
  ];

  private readonly UBS_KEYWORDS = [
    'UBS',
    'UNIDADE BASICA',
    'PSF',
    'ESTRATEGIA',
    'SAUDE DA FAMILIA'
  ];

  private readonly PRONTO_ATENDIMENTO_KEYWORDS = [
    'PRONTO ATENDIMENTO',
    'EMERGENCIA',
    'URGENCIA',
    'HOSPITAL'
  ];

  /**
   * Identifica o tipo da unidade baseado no nome
   */
  identificarUnidade(nomeUnidade: string): UnidadeIdentificada {
    const nome = nomeUnidade.toUpperCase().trim();
    
    if (nome === 'CAF' || nome.includes('CENTRAL DE ABASTECIMENTO')) {
      return {
        nome: nomeUnidade,
        tipo: 'CAF',
        esCAF: true
      };
    }

    if (nome.includes('FARMACIA')) {
      return {
        nome: nomeUnidade,
        tipo: 'FARMACIA',
        esCAF: false
      };
    }

    // Verifica UBS
    if (this.UBS_KEYWORDS.some(keyword => nome.includes(keyword))) {
      return {
        nome: nomeUnidade,
        tipo: 'UBS',
        esCAF: false
      };
    }

    // Verifica Pronto Atendimento
    if (this.PRONTO_ATENDIMENTO_KEYWORDS.some(keyword => nome.includes(keyword))) {
      return {
        nome: nomeUnidade,
        tipo: 'PRONTO_ATENDIMENTO',
        esCAF: false
      };
    }

    // Verifica se é consultório/ESF
    if (nome.includes('ESF') || nome.includes('OLAVO') || nome.includes('CONSULTORIO')) {
      return {
        nome: nomeUnidade,
        tipo: 'CONSULTORIO',
        esCAF: false
      };
    }

    return {
      nome: nomeUnidade,
      tipo: 'OUTROS',
      esCAF: false
    };
  }

  /**
   * Classifica uma única movimentação aplicando todas as regras de negócio
   */
  classificarMovimentacao(movimentacao: any): MovimentacaoClassificada {
    const historico = (movimentacao.historico || '').toUpperCase().trim();
    const entradas = parseFloat(movimentacao.entradas) || 0;
    const saidas = parseFloat(movimentacao.saidas) || 0;
    const documento = movimentacao.documento;
    
    // 1. PRIMEIRO NÍVEL (TP)
    let tp: 'A' | 'E' | 'S';
    
    if (historico.includes('SALDO ANTERIOR')) {
      tp = 'A';
    } else if (entradas > 0) {
      tp = 'E';
    } else if (saidas > 0) {
      tp = 'S';
    } else {
      // Fallback para casos edge
      tp = 'A';
    }

    // 2. SEGUNDO NÍVEL (TIPO)
    let tipo_mov: MovimentacaoClassificada['tipo_mov'];
    
    switch (tp) {
      case 'A':
        tipo_mov = 'AA'; // SALDO ANTERIOR
        break;
        
      case 'E':
        tipo_mov = this.classificarEntrada(historico, documento);
        break;
        
      case 'S':
        tipo_mov = this.classificarSaida(historico);
        break;
        
      default:
        tipo_mov = 'AA';
    }

    // 3. NORMALIZAÇÃO QTDMOV
    let qtdmov: number;
    if (tp === 'E') {
      qtdmov = entradas; // Positivo para entradas
    } else if (tp === 'S') {
      qtdmov = -saidas; // Negativo para saídas
    } else {
      qtdmov = 0; // Saldo anterior é neutro
    }

    return {
      data_movimentacao: movimentacao.data_movimentacao || '',
      historico: movimentacao.historico || '',
      documento: movimentacao.documento || null,
      requisicao: movimentacao.requisicao || '',
      entradas: entradas || null,
      saidas: saidas || 0,
      estoque: parseFloat(movimentacao.estoque) || 0,
      observacao: movimentacao.observacao || '',
      tp,
      tipo_mov,
      qtdmov
    };
  }

  /**
   * Classifica entradas conforme regras específicas
   */
  private classificarEntrada(historico: string, documento: any): MovimentacaoClassificada['tipo_mov'] {
    // ED: Doação
    if (historico.includes('DOAÇÃO') || historico.includes('DOACAO')) {
      return 'ED';
    }

    // EP: Empréstimo/Transferência entre municípios
    if (historico.includes('TRANSFERENCIA ENTRE MUNICIPIOS') || 
        historico.includes('EMPRESTIMO') || 
        historico.includes('PREFEITURA')) {
      return 'EP';
    }

    // ET: Transferência de outras farmácias do município
    if (this.UNIDADES_MUNICIPIO.some(unidade => historico.includes(unidade))) {
      return 'ET';
    }

    // EU: Entrada para Unidades (UBS, Pronto Atendimento, etc.)
    if (this.UBS_KEYWORDS.some(keyword => historico.includes(keyword)) ||
        this.PRONTO_ATENDIMENTO_KEYWORDS.some(keyword => historico.includes(keyword))) {
      return 'EU';
    }

    // EX: Ajuste de estoque
    if (historico.includes('ACERTO DE ESTOQUE') || 
        historico.includes('QUEBRA') || 
        historico.includes('AJUSTE') ||
        historico.includes('CORREÇÃO') ||
        historico.includes('CORRECAO')) {
      return 'EX';
    }

    // EA: Compra (validado por fornecedor conhecido ou documento)
    if (this.FORNECEDORES_CONHECIDOS.some(fornecedor => historico.includes(fornecedor)) ||
        (documento && documento.toString().trim() !== '')) {
      return 'EA';
    }

    // Fallback: se não identificou especificamente, assume compra
    return 'EA';
  }

  /**
   * Classifica saídas conforme regras específicas
   * IMPORTANTE: SA deve ser regra residual!
   */
  private classificarSaida(historico: string): MovimentacaoClassificada['tipo_mov'] {
    // SD: Doação
    if (historico.includes('DOAÇÃO') || historico.includes('DOACAO')) {
      return 'SD';
    }

    // ST: Transferência entre farmácias
    if (this.UNIDADES_MUNICIPIO.some(unidade => historico.includes(unidade))) {
      return 'ST';
    }

    // SU: Saída para Unidades (UBS, Pronto Atendimento, etc.) - CRÍTICO PARA CÁLCULOS!
    if (this.UBS_KEYWORDS.some(keyword => historico.includes(keyword)) ||
        this.PRONTO_ATENDIMENTO_KEYWORDS.some(keyword => historico.includes(keyword))) {
      return 'SU';
    }

    // SV: Vencimento
    if (historico.includes('VENCIDO') || 
        historico.includes('PERDA POR VALIDADE') ||
        historico.includes('VALIDADE') ||
        historico.includes('VENCIMENTO')) {
      return 'SV';
    }

    // SX: Ajuste de estoque
    if (historico.includes('ACERTO DE ESTOQUE') || 
        historico.includes('QUEBRA') || 
        historico.includes('AJUSTE') ||
        historico.includes('CORREÇÃO') ||
        historico.includes('CORRECAO')) {
      return 'SX';
    }

    // SA: Dispensação para pacientes (REGRA RESIDUAL - MAIS IMPORTANTE!)
    // Se chegou até aqui e não foi classificado como nenhum dos acima,
    // assume que é dispensação para paciente
    return 'SA';
  }

  /**
   * Processa um array completo de movimentações aplicando classificação
   */
  processarMovimentacoes(movimentacoes: any[]): MovimentacaoClassificada[] {
    return movimentacoes.map(mov => this.classificarMovimentacao(mov));
  }

  /**
   * Calcula movimentação semanal conforme regras específicas CAF vs Farmácias
   * ESTA É A LÓGICA CENTRAL DO SISTEMA!
   */
  calcularMovimentacaoSemanal(
    movimentacoes: MovimentacaoClassificada[], 
    unidade: UnidadeIdentificada
  ): number {
    console.log(`🧮 [CLASSIFIER] Calculando movimentação semanal para ${unidade.nome} (${unidade.tipo})`);
    
    if (unidade.esCAF) {
      return this.calcularMovimentacaoCAF(movimentacoes);
    } else {
      return this.calcularMovimentacaoFarmacia(movimentacoes);
    }
  }

  /**
   * Lógica específica para CAF conforme instructions.md
   */
  private calcularMovimentacaoCAF(movimentacoes: MovimentacaoClassificada[]): number {
    console.log(`🏭 [CLASSIFIER] Aplicando lógica específica da CAF`);
    
    let totalMovimentacao = 0;
    let movimentacoesConsideradas = 0;
    
    for (const mov of movimentacoes) {
      // 1. Verificar se saida tem valor
      if (!mov.saidas || mov.saidas === 0) {
        console.log(`⏭️ [CAF] Ignorando movimentação sem saída: ${mov.historico}`);
        continue;
      }
      
      // 2. Verificar se observacao não está vazia
      if (!mov.observacao || mov.observacao.trim() === '') {
        console.log(`⏭️ [CAF] Ignorando movimentação sem observação: ${mov.historico}`);
        continue;
      }
      
      // 3. Verificar se historico NÃO contém "farmacia"
      if (mov.historico.toLowerCase().includes('farmacia')) {
        console.log(`⏭️ [CAF] Ignorando movimentação para farmácia: ${mov.historico}`);
        continue;
      }
      
      // Se passou por todos os filtros, considerar o valor
      totalMovimentacao += mov.saidas;
      movimentacoesConsideradas++;
      
      console.log(`✅ [CAF] Movimentação considerada: ${mov.saidas} - ${mov.historico}`);
    }
    
    console.log(`🏭 [CAF] Total: ${totalMovimentacao} (${movimentacoesConsideradas} movimentações consideradas)`);
    return totalMovimentacao;
  }

  /**
   * Lógica para Farmácias: soma apenas SA + SU
   */
  private calcularMovimentacaoFarmacia(movimentacoes: MovimentacaoClassificada[]): number {
    console.log(`🏥 [CLASSIFIER] Aplicando lógica para Farmácia (SA + SU apenas)`);
    
    let totalMovimentacao = 0;
    let movimentacoesConsideradas = 0;
    
    for (const mov of movimentacoes) {
      // Apenas considera SA (dispensação) e SU (saída para unidades)
      if (mov.tipo_mov === 'SA' || mov.tipo_mov === 'SU') {
        totalMovimentacao += Math.abs(mov.qtdmov); // Usar valor absoluto
        movimentacoesConsideradas++;
        
        console.log(`✅ [FARMACIA] ${mov.tipo_mov}: ${Math.abs(mov.qtdmov)} - ${mov.historico}`);
      } else {
        console.log(`⏭️ [FARMACIA] Ignorando ${mov.tipo_mov}: ${mov.historico}`);
      }
    }
    
    console.log(`🏥 [FARMACIA] Total: ${totalMovimentacao} (${movimentacoesConsideradas} movimentações consideradas)`);
    return totalMovimentacao;
  }

  /**
   * Processa um item completo do inventário aplicando classificação e cálculo
   */
  processarItemInventario(
    item: any, 
    unidade: UnidadeIdentificada
  ): {
    item_processado: any;
    movimentacao_semanal_calculada: number;
    movimentacoes_classificadas: MovimentacaoClassificada[];
  } {
    console.log(`📦 [CLASSIFIER] Processando item: ${item.descricao_item} (${unidade.nome})`);
    
    // 1. Classificar todas as movimentações
    const movimentacoesClassificadas = this.processarMovimentacoes(item.movimentacoes || []);
    
    // 2. Calcular movimentação semanal baseada na unidade
    const movimentacaoSemanal = this.calcularMovimentacaoSemanal(movimentacoesClassificadas, unidade);
    
    // 3. Retornar item enriquecido
    const itemProcessado = {
      ...item,
      movimentacoes: movimentacoesClassificadas,
      movimentacao_semanal_calculada: movimentacaoSemanal,
      unidade_info: unidade
    };
    
    console.log(`✅ [CLASSIFIER] Item processado: ${item.descricao_item} → Movimentação semanal: ${movimentacaoSemanal}`);
    
    return {
      item_processado: itemProcessado,
      movimentacao_semanal_calculada: movimentacaoSemanal,
      movimentacoes_classificadas: movimentacoesClassificadas
    };
  }

  /**
   * Processa um inventário completo (todos os itens de uma unidade)
   */
  processarInventarioCompleto(
    inventoryData: any, 
    nomeUnidade: string
  ): {
    inventory_processado: any;
    estatisticas: {
      total_itens: number;
      total_movimentacoes: number;
      tipos_movimentacao: { [tipo: string]: number };
      movimentacao_total_semanal: number;
    };
  } {
    console.log(`📋 [CLASSIFIER] Processando inventário completo da unidade: ${nomeUnidade}`);
    
    const unidade = this.identificarUnidade(nomeUnidade);
    const itensProcessados = [];
    let totalMovimentacoes = 0;
    let movimentacaoTotalSemanal = 0;
    const tiposMovimentacao: { [tipo: string]: number } = {};
    
    for (const item of inventoryData.itens || []) {
      const resultado = this.processarItemInventario(item, unidade);
      
      itensProcessados.push(resultado.item_processado);
      movimentacaoTotalSemanal += resultado.movimentacao_semanal_calculada;
      totalMovimentacoes += resultado.movimentacoes_classificadas.length;
      
      // Contabilizar tipos de movimentação
      for (const mov of resultado.movimentacoes_classificadas) {
        tiposMovimentacao[mov.tipo_mov] = (tiposMovimentacao[mov.tipo_mov] || 0) + 1;
      }
    }
    
    const inventoryProcessado = {
      ...inventoryData,
      unidade: nomeUnidade,
      unidade_info: unidade,
      itens: itensProcessados,
      data_processamento: new Date().toISOString(),
      versao_classifier: '1.0.0'
    };
    
    const estatisticas = {
      total_itens: itensProcessados.length,
      total_movimentacoes: totalMovimentacoes,
      tipos_movimentacao: tiposMovimentacao,
      movimentacao_total_semanal: movimentacaoTotalSemanal
    };
    
    console.log(`✅ [CLASSIFIER] Inventário processado: ${nomeUnidade}`);
    console.log(`📊 [CLASSIFIER] Estatísticas:`, estatisticas);
    
    return {
      inventory_processado: inventoryProcessado,
      estatisticas
    };
  }
}
