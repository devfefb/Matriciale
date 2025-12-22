# Fluxo de Cálculos em 2 Etapas

## 📋 Visão Geral

O sistema agora executa os cálculos em **2 etapas sequenciais**, garantindo que todos os dados estejam corretamente inseridos no Firestore antes de realizar os cálculos.

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO COMPLETO (2 ETAPAS)                    │
└─────────────────────────────────────────────────────────────────┘

  ETAPA 1: PREPARAÇÃO DOS DADOS
  ┌───────────────────────────────────────────────────────────────┐
  │ 1. Buscar JSONs do Cloud Storage                              │
  │    → uploads/{municipio}/{unidade}/inventoryData/             │
  │                                                                │
  │ 2. Extrair para cada medicamento:                             │
  │    • qtd_periodo_final        → estoque                       │
  │    • qtd_saidas_periodo       → movimentação da semana        │
  │                                                                │
  │ 3. Inserir no Firestore                                       │
  │    → medicamentos_unidade/[medicamento]                       │
  │    → Atualizar campos: estoque, movimentacoes_semanais        │
  └───────────────────────────────────────────────────────────────┘
                              ↓
  ETAPA 2: CÁLCULO DOS CAMPOS RESTANTES
  ┌───────────────────────────────────────────────────────────────┐
  │ 1. Buscar dados do Firestore (já com estoque + movimentação) │
  │                                                                │
  │ 2. Calcular campos:                                           │
  │    • Medianas (Md04, Md08, Md12, Md16, Md26, Md52, MdTt)    │
  │    • Contagens (Cont04, Cont08, Cont12, etc.)                │
  │    • tp_metodo (classificação do medicamento)                 │
  │    • metodo (método de cálculo)                               │
  │    • met_est (método de estoque)                              │
  │    • reposicao (quantidade de reposição)                      │
  │    • analise_reposicao (análise da reposição)                │
  │                                                                │
  │ 3. Salvar campos calculados no Firestore                     │
  └───────────────────────────────────────────────────────────────┘
```

---

## 🔧 Arquivos Principais

### 1. `preparar-dados-calculos.ts`
**Responsabilidade**: ETAPA 1 - Preparação dos dados

Funções principais:
- `prepararDadosParaCalculos(municipio, unidades)`: Orquestra a busca e inserção
- `buscarInventoryDataDoBucket(municipio, unidade)`: Busca JSON mais recente
- `listarUnidadesDisponiveis(municipio)`: Detecta unidades automaticamente

**Input**:
- Município (ex: 'Palmares')
- Array de unidades (ex: ['CAF', 'Olavo', 'ESF3'])

**Output**:
```typescript
{
  sucesso: boolean,
  unidades_processadas: number,
  total_medicamentos_atualizados: number,
  total_medicamentos_zerados: number,
  resultados_por_unidade: Array<{
    unidade: string,
    sucesso: boolean,
    medicamentos_atualizados: number,
    medicamentos_zerados: number,
    semana_calculada: string,
    erro?: string
  }>
}
```

---

### 2. `calculosService.ts`
**Responsabilidade**: ETAPA 2 - Cálculos dos campos

Modificações principais:
- ❌ **Removido**: Leitura de arquivos locais hardcoded
- ✅ **Adicionado**: Busca dinâmica do Cloud Storage
- ✅ **Adicionado**: `buscarInventoryDataDoBucket()` para obter dados remotos

Funções principais:
- `calcularCamposParaMedicamento()`: Calcula todos os campos para um medicamento
- `calcularEstoquesUnidades()`: Consolida estoques de todas as unidades
- `buscarInventoryDataDoBucket()`: Busca JSON do bucket (nova!)

---

### 3. `[MAIN] executar-calculos.ts`
**Responsabilidade**: Orquestração do fluxo completo

Função principal:
- `atualizarCamposCalculadosNoFirestore(municipioId, unidades?)`

**Comportamento**:
1. Se `unidades` não for fornecido, busca automaticamente do Cloud Storage
2. Executa ETAPA 1: Preparação
3. Executa ETAPA 2: Cálculos
4. Retorna resultado consolidado

**Output**:
```typescript
{
  // Etapa 1
  preparacao: {
    unidades_processadas: number,
    medicamentos_atualizados: number,
    medicamentos_zerados: number,
    resultados_por_unidade: Array<...>
  },
  // Etapa 2
  calculos: {
    totalProcessados: number,
    totalSucessos: number,
    totalErros: number
  },
  // Compatibilidade com versão anterior
  totalProcessados: number,
  totalSucessos: number,
  totalErros: number
}
```

---

## 🚀 Como Usar

### Via API (Recomendado)

**Endpoint**: `POST /api/uploads/executar-calculos`

**Body**:
```json
{
  "municipio": "Palmares"
}
```

**Resposta**:
```json
{
  "status": "success",
  "message": "Cálculos executados com sucesso (2 etapas: preparação + cálculos)",
  "data": {
    "municipio": "Palmares",
    "total_processados": 150,
    "total_sucessos": 148,
    "total_erros": 2,
    "taxa_sucesso": "98.67%",
    "etapa_1_preparacao": {
      "unidades_processadas": 3,
      "medicamentos_atualizados": 120,
      "medicamentos_zerados": 30
    },
    "etapa_2_calculos": {
      "medicamentos_processados": 150,
      "calculos_bem_sucedidos": 148,
      "erros": 2
    }
  },
  "timestamp": "2025-12-19T21:30:00.000Z"
}
```

---

### Via Script (Para testes)

**Script 1**: Execução com unidades especificadas
```bash
npx ts-node "src/scripts/core/[MAIN] executar-calculos.ts"
```

**Script 2**: Teste completo (2 cenários)
```bash
npx ts-node "src/scripts/testes/testar-fluxo-completo-2etapas.ts"
```

---

## 📊 Estrutura de Dados no Cloud Storage

### Caminho dos Arquivos
```
uploads/
  └── {municipio}/           (ex: Palmares)
      ├── CAF/
      │   └── inventoryData/
      │       └── 2025-12-19T21-09-03-159Z_uuid_inventoryDataCAF.json
      ├── Olavo/
      │   └── inventoryData/
      │       └── 2025-12-19T21-10-15-234Z_uuid_inventoryDataOlavo.json
      └── ESF3/
          └── inventoryData/
              └── 2025-12-19T21-11-30-567Z_uuid_inventoryDataESF3.json
```

### Formato do JSON (inventoryData)
```json
{
  "periodo_inicio": "26/05/2025",
  "periodo_fim": "01/06/2025",
  "unidade": "CAF",
  "itens": [
    {
      "cod_sistemico_item": "325.023.001",
      "descricao_item": "AAS - ÁCIDO ACETIL SALICILICO 100MG",
      "qtd_periodo_final": 11770,          // ← ESTOQUE
      "qtd_saidas_periodo": 520,           // ← MOVIMENTAÇÃO
      "movimentacao_semanal_calculada": 20,
      // ... outros campos ...
    }
  ]
}
```

---

## 🔍 Detalhes Importantes

### ETAPA 1: Preparação

#### O que acontece:
1. Para cada unidade especificada (ou detectada automaticamente):
   - Busca o JSON mais recente em `uploads/{municipio}/{unidade}/inventoryData/`
   - Ordena por data de atualização (mais recente primeiro)

2. Para cada medicamento no JSON:
   - Busca o medicamento no Firestore pelo `cod_sistemico_item`
   - Atualiza campos:
     - `estoque` ← `qtd_periodo_final`
     - `movimentacoes_semanais[nova_semana]` ← `qtd_saidas_periodo`

3. Para medicamentos **não encontrados** no JSON:
   - Mantém o estoque anterior
   - Adiciona movimentação = 0 para a semana

#### Resultado:
✅ Todos os medicamentos têm `estoque` e `movimentacoes_semanais` atualizados

---

### ETAPA 2: Cálculos

#### O que acontece:
1. Busca todos os medicamentos do Firestore (já com estoque + movimentação)

2. Para cada medicamento:
   - Converte `movimentacoes_semanais` em histórico
   - Calcula medianas (Md04, Md08, Md12, Md16, Md26, Md52, MdTt)
   - Calcula contagens (Cont04, Cont08, Cont12, Cont16, Cont26, Cont52, ContTt, ContAno)
   - Calcula `tp_metodo` (classificação: ENTRANTES, RECENTES, INATIVOS, etc.)
   - Calcula `metodo` (média baseada no tp_metodo)
   - Calcula `met_est` (método de estoque)
   - Calcula `reposicao` (quantidade de reposição)
   - Gera `analise_reposicao` (análise da reposição)

3. Salva todos os campos calculados no Firestore

#### Resultado:
✅ Todos os medicamentos têm campos calculados atualizados

---

## 🎯 Vantagens do Novo Fluxo

### ✅ Antes (Problemas)
- ❌ Caminhos hardcoded para arquivos locais
- ❌ Não funcionava em produção (Cloud Storage)
- ❌ Dependia de downloads manuais
- ❌ Difícil manutenção

### ✅ Depois (Solução)
- ✅ Busca dinâmica do Cloud Storage
- ✅ Funciona em produção
- ✅ Automático (sem downloads)
- ✅ Fácil manutenção
- ✅ 2 etapas separadas (preparação + cálculos)
- ✅ Detecção automática de unidades
- ✅ Relatórios detalhados por etapa

---

## 🧪 Testes

### Cenário 1: Unidades Especificadas
```typescript
const resultado = await atualizarCamposCalculadosNoFirestore('Palmares', ['CAF', 'Olavo', 'ESF3']);
```

### Cenário 2: Busca Automática
```typescript
const resultado = await atualizarCamposCalculadosNoFirestore('Palmares');
// Busca automaticamente as unidades disponíveis no Cloud Storage
```

---

## 📝 Logs de Exemplo

```
╔════════════════════════════════════════════════════════════════════╗
║         INÍCIO DO PROCESSO DE ATUALIZAÇÃO DE CAMPOS              ║
╚════════════════════════════════════════════════════════════════════╝
📍 Município: Palmares

╔════════════════════════════════════════════════════════════════════╗
║  ETAPA 1: PREPARAÇÃO DOS DADOS (Estoque + Movimentação)          ║
╚════════════════════════════════════════════════════════════════════╝

🚀 [PREPARAR DADOS] Iniciando preparação de dados para cálculos...
📍 Município: Palmares
🏥 Unidades: CAF, Olavo, ESF3

======================================================================
🏥 Processando unidade: CAF
======================================================================
🔍 Buscando arquivos em: uploads/Palmares/CAF/inventoryData/
📄 Arquivo mais recente: uploads/Palmares/CAF/inventoryData/2025-12-19T...json
📥 Arquivo encontrado para CAF
📅 Período: 26/05/2025 a 01/06/2025
📦 Total de itens: 150

🔄 Iniciando atualização de estoque e movimentação semanal...
  ✅ AAS 100MG (325.023.001): Estoque=11770, Mov=520
  ✅ ACICLOVIR 200MG (325.025.001): Estoque=0, Mov=500
  ...

✅ Atualização concluída com sucesso!
📊 Estatísticas:
   - Medicamentos atualizados: 120
   - Medicamentos zerados (não movimentados): 30
   - Semana calculada: 2025W22

✅ Etapa 1 concluída com sucesso!
📊 Unidades processadas: 3
📊 Medicamentos atualizados: 360
📊 Medicamentos zerados: 90

╔════════════════════════════════════════════════════════════════════╗
║  ETAPA 2: CÁLCULO DOS CAMPOS RESTANTES                            ║
╚════════════════════════════════════════════════════════════════════╝

Processando Município: Palmares
  Processando Unidade: CAF (150 medicamentos)
    ✅ Sucesso: AAS 100MG
    ✅ Sucesso: ACICLOVIR 200MG
    ...

╔════════════════════════════════════════════════════════════════════╗
║  PROCESSO CONCLUÍDO COM SUCESSO!                                  ║
╚════════════════════════════════════════════════════════════════════╝

📊 RESUMO GERAL:
──────────────────────────────────────────────────────────────────────
ETAPA 1 - Preparação de Dados:
  ✅ Unidades processadas: 3
  ✅ Medicamentos atualizados: 360
  ⚠️  Medicamentos zerados: 90

ETAPA 2 - Cálculos:
  ✅ Medicamentos processados: 450
  ✅ Cálculos bem-sucedidos: 448
  ❌ Erros: 2
──────────────────────────────────────────────────────────────────────
```

---

## 🔧 Manutenção

### Adicionar Nova Unidade
1. Fazer upload do JSON no formato correto para:
   ```
   uploads/{municipio}/{nova_unidade}/inventoryData/
   ```
2. O sistema detecta automaticamente se usar busca automática
3. Ou especificar manualmente no array de unidades

### Adicionar Novo Município
1. Fazer upload dos JSONs:
   ```
   uploads/{novo_municipio}/{unidade}/inventoryData/
   ```
2. Chamar a API com `municipio: "NovoMunicipio"`

---

## 📚 Referências

- `preparar-dados-calculos.ts`: ETAPA 1
- `calculosService.ts`: ETAPA 2
- `[MAIN] executar-calculos.ts`: Orquestração
- `atualizar-estoque-movimentacao.ts`: Inserção no Firestore
- `UploadController.ts`: API endpoint

---

**Data de criação**: 19/12/2025  
**Versão**: 2.0.0  
**Status**: ✅ Implementado e testado

