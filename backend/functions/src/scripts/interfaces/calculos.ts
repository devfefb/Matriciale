// Interfaces para cálculo de estoque
export interface ItemMovimentacao {
  cod_sistemico_item: string;
  descricao_item: string;
  qtd_periodo_final: number;
  [key: string]: any;
}

export interface DadosUnidade {
  periodo_inicio: string;
  periodo_fim: string;
  itens: ItemMovimentacao[];
}

export interface EstoqueCalculado {
  descricao_item: string;
  [campoEstoque: string]: string | number; // Permite 'estoque_NOME': numero
}

// export Interface para o gabarito
export interface GabaritoItem {
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

export interface GabaritoEstrutura {
  unidade: {
    [key: string]: GabaritoItem[];
  };
}

export interface ResultadoValidacao {
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
  acerto: number; // percentual de acerto (0-100)
}

// Novas export interfaces para análise detalhada
export interface EstatisticasCampo {
  campo: string;
  total_verificacoes: number;
  acertos: number;
  erros: number;
  taxa_acerto: number;
  erros_detalhados: {
    medicamento: string;
    unidade: string;
    valor_calculado: any;
    valor_gabarito: any;
    diferenca?: number;
    percentual_erro?: number;
  }[];
  valores_mais_frequentes: {
    valor: any;
    quantidade: number;
    percentual: number;
  }[];
}

export interface AnalisePadroes {
  campos_mais_problematicos: EstatisticasCampo[];
  unidades_mais_problematicas: {
    unidade: string;
    total_medicamentos: number;
    acerto_medio: number;
    campos_com_erro: string[];
  }[];
  medicamentos_mais_problematicos: {
    medicamento: string;
    unidade: string;
    acerto: number;
    campos_incorretos: string[];
  }[];
  distribuicao_erros: {
    faixa_acerto: string;
    quantidade: number;
    percentual: number;
  }[];
}