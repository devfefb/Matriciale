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

// Interfaces para cálculos
export interface SemanaHistorico {
  week: string;
  value: number;
}

export interface Contagens {
  Cont04: number;
  Cont08: number;
  Cont12: number;
  Cont16: number;
  Cont26: number;
  Cont52: number; // Para ESF3, este campo representa Cont49 (49 semanas)
  ContAno: number;
  ContTt: number;
}

export interface Medianas {
  Md04: number;
  Md08: number;
  Md12: number;
  Md16: number;
  Md26: number;
  Md52: number; // Para ESF3, este campo representa Md49 (49 semanas)
  MdAno: number;
  MdTt: number;
}

export interface AnaliseReposicao {
  metEst: number;
  estoque_atual: number;
  reposicao_calculada: number;
  status: 'NECESSITA_REPOSICAO' | 'ESTOQUE_SUFICIENTE';
  percentual_cobertura: string;
}

export interface MedicamentoCalculado extends MedicamentoFirebase {
  estoque?: number;
  contagens?: Contagens;
  maximo?: number;
  medianas?: Medianas;
  tp_metodo?: string;
  metodo?: string;
  metEst?: number;
  reposicao?: number;
  analise_reposicao?: AnaliseReposicao;
}

export interface DadosCalculados {
  contagens: Contagens;
  semanas: SemanaHistorico[];
  totalSemanasHistorico: number;
}