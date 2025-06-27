# Sistema de Análise de Reposição de Estoque Farmacêutico

## Objetivo Principal
Desenvolver um script Node.js (`node script.js`) que processa arquivos operacionais de estoque farmacêutico, aplica a metodologia de previsão de demanda da Well e gera relatórios de reposição para farmácias e Central de Abastecimento Farmacêutico (CAF).

## Arquitetura do Sistema

### Estrutura de Diretórios
```
src/
├── data/
│   ├── input/  # Arquivos de entrada (XLSX do balancete + PDF das movimentacoes)
│   └── output/         # Relatórios gerados
├── script.js           # Script principal
├── utils/
|    └── scripts_auxiliares [...]
└── package.json
```

### Execução
- **Comando**: `node script.js` ou simplesmente `npm run extract`
- **Processamento**: Batch de todos os arquivos em `data/input`
- **Independente**: Não utiliza drag & drop, processamento autônomo

## Especificação de Dados de Entrada

### 1. Arquivo Balancete (XLSX)
**Colunas obrigatórias:**
- `cod_sistemico_item`: String (11 caracteres: 9 números + 2 pontos)
- `descricao_item`: String (nome/descrição do item)
- `qtd_entradas_periodo`: Number (entradas no período)
- `qtd_saidas_periodo`: Number (saídas no período)
- `qtd_periodo_final`: Number (estoque atual)

**Ignorar:** `coluna_branco`

### 2. Relatório de Movimentação (PDF → JSON)
**Estrutura esperada:**
```json
{
  "Pagina": [{
    "Produto": {
      "CodigoProduto": "string",
      "Nome": "string",
      "Unidade": "string"
    },
    "Movimentacao": [{
      "Data": "DD/MM/AAAA",
      "Histórico": "string",
      "Documento": "string",
      "Requisição": "string",
      "Movimento": {
        "Entrada": "number|null",
        "Saída": "number|null"
      },
      "Estoque": "number",
      "Observação": "string"
    }]
  }]
}
```

## Processamento e Enriquecimento de Dados

### Campos Derivados Obrigatórios

#### Identificação e Classificação
- **`ID Unidade`**: Número sequencial único por farmácia/CAF
- **`Unidade`**: Nome extraído do histórico ou mapeamento
- **`Código do Item`**: Normalizado do `Produto.CodigoProduto`
- **`Nome do Item`**: Normalizado do `Produto.Nome`

#### Classificação Hierárquica (ordem de prioridade)
1. **"1 REMUME"**: Medicamentos básicos municipais
2. **"2 ASSISTENCIAL"**: Medicamentos para grupos específicos
3. **"3 PROCESSO JUDICIAL"**: Medicamentos por mandado judicial
4. **"4 FARMACOLÓGICO"**: Injetáveis de uso interno
5. **"5 MATERIAL"**: Material hospitalar (luvas, agulhas, etc.)
6. **"6 FRALDAS e/ou LEITES"**: Itens assistenciais controlados
7. **"Não Classificado"**: Demais itens

#### Temporal
- **`Data da Movimentação`**: Formato AAAA-MM-DD
- **`Semana`**: Formato "AAAA_SS AAAA" (ex: "2025_24 2025")

#### Tipificação de Movimentação

**`TP` (Tipo Geral):**
- "A": Saldo Anterior (histórico contém "SALDO ANTERIOR")
- "E": Entradas (`Movimento.Entrada` != null e != 0)
- "S": Saídas (`Movimento.Saída` != 0 e não é "A" ou "E")

**`TIPO` (Subtipo Específico):**

*Saldo Anterior:*
- "AA": Saldo Anterior

*Entradas (E):*
- "EA": Fornecedores (documento NF ou lista de fornecedores)
- "ED": Doações (histórico contém "DOAÇÃO")
- "EP": Empréstimos municipais (histórico: "TRANSFERENCIA ENTRE MUNICIPIOS", "PREFEITURA MUNICIPAL DE [NOME]")
- "ET": Transferências CAF↔Farmácias (histórico: "FARMACIA [NOME]")
- "EU": Transferências para unidades (histórico: "UBS", "PRONTO ATENDIMENTO")
- "EX": Ajustes de estoque (histórico: "ACERTO DE ESTOQUE", "QUEBRA")

*Saídas (S):*
- "SV": Vencimento (histórico: "VENCIDO", "PERDA POR VALIDADE")
- "SD": Doações (histórico: "DOAÇÃO")
- "ST": Transferências CAF↔Farmácias (histórico: "FARMACIA [NOME]")
- "SU": Transferências para unidades (histórico: "UBS", "PRONTO ATENDIMENTO")
- "SX": Ajustes de estoque (histórico: "ACERTO DE ESTOQUE", "QUEBRA")
- "SA": Dispensação pacientes (demais saídas não classificadas - **verificação final**)

#### Quantificação
- **`QTDMOV`**: 
  - Entrada: valor positivo
  - Saída: valor negativo
  - Saldo Anterior: 0
- **`ESTAJU`**: Estoque calculado (anterior + QTDMOV atual)

## Geração de Dados Sintéticos para Testes

### Propósito
Criar 52 semanas de histórico artificial anterior aos dados reais para validar algoritmos de mediana.

### Regras de Geração (para simular dados que não temos)
- **Base temporal**: 52 semanas antes da data mais antiga dos dados reais
- **Frequência**: 70% de chance de movimentação por item/semana
- **Volumes**: Inteiros aleatórios 1-200
- **Sazonalidade simulada**:
  - 20% das semanas: volumes 2-3x maiores
  - 10% das semanas: volumes muito baixos (1-5)
- **Tipos gerados**: Apenas "SA" e "SU"
- **Históricos sintéticos**:
  - SA: "DISPENSACAO TESTE PACIENTE [NUM_ALEATORIO]"
  - SU: "TRANSFERENCIA TESTE UNIDADE [NUM_ALEATORIO]"

## Metodologia de Análise - Well

### Base de Análise por Unidade
**Filtros:** Movimentações tipo "SA" e "SU" (reais + sintéticas)

### Métricas Calculadas

#### Colunas Temporais Dinâmicas
- Uma coluna por semana histórica (`AAAA_SS AAAA`)
- Valores: quantidade movimentada ou NULL

#### Agregações
- **`Total Geral`**: Soma absoluta de todas as movimentações SA/SU

#### Medianas Estratificadas
- **`Md04`**: Mediana últimas 4 semanas
- **`Md08`**: Mediana últimas 8 semanas  
- **`Md12`**: Mediana últimas 12 semanas
- **`Md16`**: Mediana últimas 16 semanas
- **`Md26`**: Mediana últimas 26 semanas
- **`Md52`**: Mediana últimas 52 semanas
- **`MdAno`**: Mediana do ano atual
- **`MdTt`**: Mediana de toda série histórica

#### Contadores de Ocorrência
- **`Cont04`** a **`ContTt`**: Número de semanas com movimentação != NULL nos respectivos períodos
- **`Máxima`**: Maior quantidade semanal da série

### Classificação de Padrão de Movimento

**`TP_Movimento`** (ordem de verificação):
1. **"ENTRANTES"**: Última semana != NULL e ContTt = 1
2. **"INATIVOS"**: Cont16 = 0 (sem movimento 16 semanas)
3. **"RECENTES"**: (Cont26 / semanas_disponíveis_26) ≥ 0.50
4. **"ORDINÁRIOS"**: (Cont52 / semanas_disponíveis_52) ≥ 0.50
5. **"INTERMITENTES"**: (Cont52 / semanas_disponíveis_52) < 0.50

### Algoritmo de Previsão

**`MÉTODO`** (previsão semanal):
- **ENTRANTES**: Valor da única ocorrência
- **INATIVOS**: 0
- **INTERMITENTES**: max(1, Máxima ÷ 4)
- **ORDINÁRIOS/RECENTES**: max(Md04, Md08, Md12, Md16, Md26, Md52, MdAno, MdTt)

### Cálculo de Reposição

#### Para Farmácias
- **`MetEst`**: MÉTODO × 3 semanas
- **`Estoque sistêmico`**: qtd_periodo_final do Balancete
- **`Reposição`**: max(0, MetEst - Estoque sistêmico)

#### Para CAF
- **`MetEst`**: MÉTODO × 12 semanas
- **`Estoque sistêmico`**: Soma de qtd_periodo_final de todas as unidades
- **`Reposição`**: max(0, MetEst - Estoque sistêmico)

## Especificação de Outputs e Relatórios

### Estrutura de Saída
```
data/output/
├── [TIMESTAMP]_processamento/
│   ├── intermediarios/
│   │   ├── balancete_processado.json
│   │   ├── movimentacao_processada.json
│   │   ├── dados_sinteticos.json
│   │   ├── base_consolidada.json
│   │   └── metricas_calculadas.json
│   ├── logs/
│   │   ├── processamento.log
│   │   ├── validacoes.log
│   │   └── erros.log
│   ├── relatorios_finais/
│   │   ├── reposicao_farmacia_[TIMESTAMP].xlsx
│   │   ├── reposicao_caf_[TIMESTAMP].xlsx
│   │   ├── dashboard_executivo.xlsx
│   │   └── auditoria_calculos.xlsx
│   └── estatisticas/
│       ├── resumo_processamento.json
│       ├── metricas_qualidade.json
│       └── indicadores_negocio.json
```

### Arquivos Intermediários Obrigatórios

#### 1. **balancete_processado.json**
```json
{
  "timestamp": "2025-06-11T10:30:00Z",
  "total_registros": 1500,
  "itens": [{
    "cod_sistemico_item": "12345.67.89",
    "descricao_item": "PARACETAMOL 500MG",
    "qtd_entradas_periodo": 100,
    "qtd_saidas_periodo": 80,
    "qtd_periodo_final": 250,
    "classificacao": "1 REMUME",
    "processado_em": "2025-06-11T10:30:15Z"
  }]
}
```

#### 2. **movimentacao_processada.json**
```json
{
  "timestamp": "2025-06-11T10:30:00Z",
  "total_movimentacoes": 5000,
  "periodo_inicio": "2024-01-01",
  "periodo_fim": "2025-06-11",
  "movimentacoes": [{
    "id_unidade": 1,
    "unidade": "Farmácia Central",
    "codigo_item": "12345.67.89",
    "nome_item": "PARACETAMOL 500MG",
    "classificacao": "1 REMUME",
    "data_movimentacao": "2025-06-10",
    "semana": "2025_24 2025",
    "tp": "S",
    "tipo": "SA",
    "qtdmov": -50,
    "estaju": 200,
    "historico": "DISPENSACAO PACIENTE JOÃO SILVA"
  }]
}
```

#### 3. **dados_sinteticos.json**
```json
{
  "timestamp": "2025-06-11T10:30:00Z",
  "periodo_sintetico": "52 semanas anteriores",
  "data_inicio_sintetico": "2024-01-01",
  "total_movimentacoes_sinteticas": 15000,
  "parametros_geracao": {
    "frequencia_ocorrencia": 0.70,
    "volume_min": 1,
    "volume_max": 200,
    "picos_sazonais": 0.20,
    "vales_sazonais": 0.10
  },
  "movimentacoes_sinteticas": [
    "// Mesma estrutura que movimentacao_processada.json"
  ]
}
```

#### 4. **base_consolidada.json**
Dados reais + sintéticos unificados, ordenados cronologicamente

#### 5. **metricas_calculadas.json**
```json
{
  "timestamp": "2025-06-11T10:30:00Z",
  "itens": [{
    "codigo_item": "12345.67.89",
    "unidade": "Farmácia Central",
    "colunas_semanais": {
      "2024_01 2024": 45,
      "2024_02 2024": null,
      "2024_03 2024": 38
    },
    "total_geral": 1200,
    "medianas": {
      "md04": 12.5,
      "md08": 15.0,
      "md12": 18.2,
      "md16": 16.8,
      "md26": 20.1,
      "md52": 19.5,
      "mdano": 21.0,
      "mdtt": 18.9
    },
    "maxima": 85,
    "contadores": {
      "cont04": 3,
      "cont08": 6,
      "cont12": 9,
      "cont16": 12,
      "cont26": 18,
      "cont52": 32,
      "contano": 15,
      "conttt": 47
    },
    "tp_movimento": "ORDINÁRIOS",
    "metodo": 21.0,
    "metest": 63.0,
    "estoque_sistemico": 250,
    "reposicao": 0
  }]
}
```

### Relatórios Finais Excel

#### 1. **reposicao_farmacia_[TIMESTAMP].xlsx**
- **Aba por farmácia** (ex: "Farmácia Central", "Farmácia Norte")
- Todas as colunas especificadas na metodologia
- Filtros automáticos habilitados
- Formatação condicional para reposições > 0

#### 2. **reposicao_caf_[TIMESTAMP].xlsx**
- **Aba única** "Reposição CAF"
- Consolidação de todas as unidades
- Cálculos específicos para 12 semanas
- Destaque para itens críticos (reposição alta)

#### 3. **dashboard_executivo.xlsx**
```
Abas:
├── "Resumo Geral" - KPIs principais
├── "Top Reposições" - Itens com maior necessidade
├── "Análise por Classificação" - Breakdown por tipo
├── "Farmácias Críticas" - Unidades com mais reposições
└── "Tendências" - Análise temporal
```

#### 4. **auditoria_calculos.xlsx**
```
Abas:
├── "Validação Medianas" - Verificação dos cálculos
├── "Dados Sintéticos" - Amostra dos dados gerados
├── "Classificações" - Auditoria de TP_Movimento
└── "Erros e Alertas" - Problemas encontrados
```

### Logs Detalhados

#### **processamento.log**
```
2025-06-11 10:30:00 [INFO] Iniciando processamento
2025-06-11 10:30:05 [INFO] Balancete carregado: 1500 registros
2025-06-11 10:30:12 [INFO] Movimentação processada: 5000 registros
2025-06-11 10:30:45 [INFO] Dados sintéticos gerados: 15000 registros
2025-06-11 10:31:20 [INFO] Métricas calculadas para 1200 itens
2025-06-11 10:31:35 [INFO] Relatórios Excel gerados
2025-06-11 10:31:40 [INFO] Processamento concluído
```

#### **validacoes.log**
```
2025-06-11 10:30:05 [WARN] Item 98765.43.21 sem classificação definida
2025-06-11 10:30:08 [WARN] Movimentação sem histórico: linha 245
2025-06-11 10:30:12 [INFO] Validação de códigos: 99.8% válidos
```

### Arquivos de Estatísticas

#### **resumo_processamento.json**
```json
{
  "timestamp": "2025-06-11T10:31:40Z",
  "duracao_processamento": "00:01:40",
  "estatisticas": {
    "total_itens_processados": 1200,
    "total_movimentacoes": 20000,
    "total_farmácias": 5,
    "periodo_analise": "52 semanas",
    "dados_sinteticos_gerados": 15000,
    "itens_com_reposicao": 340,
    "valor_reposicao_total": 125000
  }
}
```

#### **indicadores_negocio.json**
```json
{
  "kpis": {
    "taxa_giro_medio": 2.3,
    "itens_inativos_pct": 15.2,
    "cobertura_estoque_dias": 21,
    "farmacia_maior_reposicao": "Farmácia Sul",
    "classificacao_maior_demanda": "1 REMUME"
  }
}
```

### Estrutura do Relatório

#### Colunas de Identificação
- `ID Unidade` (apenas farmácias)
- `Unidade` (apenas farmácias)  
- `Classificação`
- `Código do Item`
- `Nome do Item`

#### Colunas Temporais
- Colunas dinâmicas por semana histórica
- `Total Geral`

#### Métricas Estatísticas
- Todas as medianas (Md04 → MdTt)
- `Máxima`
- Todos os contadores (Cont04 → ContTt)

#### Resultados Finais
- `TP_Movimento`
- `MÉTODO`
- `MetEst`
- `Estoque sistêmico`
- `Reposição`

### Ordenação
- **Farmácias**: Unidade → Classificação → Nome do Item
- **CAF**: Classificação → Nome do Item

## Implementação Técnica

### Dependências Sugeridas
```json
{
  "xlsx": "^0.18.5",
  "pdf-parse": "^1.1.1", 
  "moment": "^2.29.4",
  "lodash": "^4.17.21"
}
```

### Validações Obrigatórias
1. **Arquivos**: Verificar existência dos arquivos de entrada
2. **Estrutura**: Validar colunas obrigatórias
3. **Dados**: Verificar integridade de códigos e quantidades
4. **Consistência**: Cross-validation entre Balancete e Movimentação

### Tratamento de Erros
- Log detalhado de processamento
- Relatório de itens não processados
- Backup de dados intermediários

### Performance
- Processamento em lotes para grandes volumes
- Índices em memória para joins eficientes
- Progress indicators para operações longas

## Validação Final

O sistema deve produzir relatórios que permitam:
1. **Validação de mediana**: Verificar se as 52 semanas sintéticas produzem medianas coerentes
2. **Auditoria de classificação**: Rastrear decisões de TP_Movimento
3. **Verificação de reposição**: Confirmar cálculos matemáticos

Todos os valores intermediários devem ser auditáveis e os algoritmos determinísticos para facilitar debugging e validação.