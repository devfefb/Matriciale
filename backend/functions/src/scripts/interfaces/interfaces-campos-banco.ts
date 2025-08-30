export interface MovimentacaoSemanal {
  [key: string]: number;
}

export interface Medicamento {
  nome: string;
  cod_item: string;
  classificacao: string;
  movimentacoes_semanais: MovimentacaoSemanal[];
}

export interface Unidade {
  nome: string;
  medicamentos: Medicamento[];
}

export interface Cidade {
  nome: string;
  unidades: Unidade[];
}

export interface DadosCompletos {
  cidades: Cidade[];
}

export interface MedicamentoFirebase {
  nome: string;
  cod_item: string;
  classificacao: string;
  movimentacoes_semanais: { [key: string]: number };
  data_criacao: Date;
  data_atualizacao: Date;
}

export interface EstatisticasUnidade {
  nome: string;
  totalMedicamentos: number;
  totalMovimentacoes: number;
}

export interface EstatisticasMunicipio {
  nome: string;
  totalUnidades: number;
  totalMedicamentos: number;
  unidades: EstatisticasUnidade[];
}

export interface EstatisticasGerais {
  totalMunicipios: number;
  totalUnidades: number;
  totalMedicamentos: number;
  totalMovimentacoes: number;
  municipios: EstatisticasMunicipio[];
}

// Interfaces para inserção de movimentações semanais
export interface MovimentacaoSemana {
  nome_medicamento: string;
  quantidade: number;
}

export interface DadosUnidade {
  nome_unidade: string;
  movimentacoes: MovimentacaoSemana[];
}

export interface DadosPlanilha {
  unidades: DadosUnidade[];
}