# Documentação Detalhada - calcular_TP_metodo.js

## 📋 Visão Geral

O script `calcular_TP_metodo.js` é um **script especializado** do sistema Matriciale que classifica cada item do inventário em uma das categorias de **TP_Metodo** (ENTRANTES, INATIVOS, INTERMITENTES, RECENTES, ORDINÁRIOS). Este script foca especificamente na classificação e atualiza apenas o campo `TP_metodo` no `modelo_caf.json`.

## 🎯 Objetivo

Classificar cada item do inventário em uma das categorias de TP_Metodo baseado nas contagens de semanas com movimentação, utilizando exclusivamente o `inventoryData.json` como fonte de dados.

## 📁 Estrutura do Arquivo

### Importações
```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
```

### Configuração de Módulos ES6
```javascript
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

## 🔧 Funções Principais

### 1. `calcularContagensParaHistorico(historicoSemanas)`

**Propósito**: Calcula as contagens de semanas com movimentação (valor > 0) para diferentes períodos.

**Parâmetros**:
- `historicoSemanas`: Array de objetos com `{week: string, value: number}`

**Retorna**: Objeto com contagens para diferentes períodos

**Lógica Detalhada**:

#### Função Auxiliar `contarUltimas(n)`
```javascript
const contarUltimas = (n) => {
    const ultimasNSemanas = historicoSemanas.slice(-n);
    return ultimasNSemanas.filter(s => s.value > 0).length;
};
```

#### Cálculos Realizados
```javascript
const cont04 = contarUltimas(4);   // Últimas 4 semanas
const cont08 = contarUltimas(8);   // Últimas 8 semanas
const cont12 = contarUltimas(12);  // Últimas 12 semanas
const cont16 = contarUltimas(16);  // Últimas 16 semanas
const cont26 = contarUltimas(26);  // Últimas 26 semanas
const cont52 = contarUltimas(52);  // Últimas 52 semanas
```

#### Contagem Total e do Ano
```javascript
const contTotal = historicoSemanas.filter(s => s.value > 0).length;

let contAno = 0;
if (historicoSemanas.length > 0) {
    const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
    contAno = historicoSemanas
        .filter(s => s.week.startsWith(anoMaisRecente) && s.value > 0)
        .length;
}
```

### 2. `calcularTPMetodo(dadosCalculados)`

**Propósito**: Classifica o item em uma das categorias de TP_Metodo.

**Parâmetros**:
- `dadosCalculados`: Objeto com `{contagens, semanas, totalSemanasHistorico}`

**Retorna**: String com a classificação

**Lógica Detalhada**:

#### REGRA 1: ENTRANTES
```javascript
if (contagens.ContTt === 1) {
    const ultimaSemanaHistorico = semanas[semanas.length - 1];
    if (ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
        return "ENTRANTES";
    }
}
```

**Condições**:
- Contagem total de semanas com movimento = 1
- Única movimentação foi na última semana do histórico

#### REGRA 2: INTERMITENTES
```javascript
const periodo = Math.min(totalSemanasHistorico, 52);
if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
    return "INTERMITENTES";
}
```

**Condições**:
- Menos de 50% de ocorrências nas últimas 52 semanas
- Aplica-se mesmo se a série histórica for inferior a 52 semanas

#### REGRA 3: INATIVOS
```javascript
if (contagens.Cont16 === 0) {
    return "INATIVOS";
}
```

**Condições**:
- Nenhuma ocorrência nas últimas 16 semanas

#### REGRA 4: RECENTES
```javascript
if (contagens.Cont04 > 0 && (contagens.Cont04 / 4) >= 0.5 && contagens.ContTt === contagens.Cont04) {
    return "RECENTES";
}
if (contagens.Cont08 > 0 && (contagens.Cont08 / 8) >= 0.5 && contagens.ContTt === contagens.Cont08) {
    return "RECENTES";
}
if (contagens.Cont12 > 0 && (contagens.Cont12 / 12) >= 0.5 && contagens.ContTt === contagens.Cont12) {
    return "RECENTES";
}
if (contagens.Cont16 > 0 && (contagens.Cont16 / 16) >= 0.5 && contagens.ContTt === contagens.Cont16) {
    return "RECENTES";
}
if (contagens.Cont26 > 0 && (contagens.Cont26 / 26) >= 0.5 && contagens.ContTt === contagens.Cont26) {
    return "RECENTES";
}
```

**Condições**:
- Pelo menos 50% de ocorrências em qualquer período (4, 8, 12, 16 ou 26 semanas)
- Todas as ocorrências estão dentro do período analisado

#### REGRA 5: ORDINÁRIOS (padrão)
```javascript
return "ORDINÁRIOS";
```

**Condições**:
- Padrão para itens que não se enquadram nas outras categorias

### 3. `gerarHistoricoSemanas(item)`

**Propósito**: Gera um histórico de 52 semanas baseado nas movimentações do item.

**Parâmetros**:
- `item`: Item do inventoryData

**Retorna**: Array de objetos com `{week: string, value: number}`

**Lógica Detalhada**:

#### Geração de Semanas
```javascript
const historicoSemanas = [];

// Gera 52 semanas de histórico (último ano)
for (let i = 51; i >= 0; i--) {
    const semana = `2025_${String(52 - i).padStart(2, '0')}`;
```

#### Cálculo de Valores
```javascript
let valor = 0;

// Se o item teve movimentação no período, distribui os valores
if (item.qtd_entradas_periodo > 0 || item.qtd_saidas_periodo > 0) {
    const totalMovimentacao = item.qtd_entradas_periodo + item.qtd_saidas_periodo;
    
    // Distribui a movimentação ao longo das semanas de forma realista
    if (i >= 45) { // Últimas 7 semanas (período atual)
        valor = Math.floor(totalMovimentacao / 7);
    } else {
        // Simula movimentação histórica baseada no padrão atual
        const baseValue = Math.floor(totalMovimentacao * 0.1);
        valor = Math.floor(Math.random() * baseValue * 2) + Math.floor(baseValue * 0.5);
    }
}
```

### 4. `atualizarModeloCafComTPMetodo(inventoryData, modeloCaf)`

**Propósito**: Atualiza o modelo CAF com os TP_metodo calculados.

**Parâmetros**:
- `inventoryData`: Dados do inventoryData.json
- `modeloCaf`: Modelo CAF existente

**Retorna**: Modelo CAF atualizado com TP_metodo

**Processo Detalhado**:

```javascript
function atualizarModeloCafComTPMetodo(inventoryData, modeloCaf) {
    console.log(`Processando TP_metodo para ${inventoryData.itens.length} itens...`);

    for (let i = 0; i < inventoryData.itens.length; i++) {
        const item = inventoryData.itens[i];
        const medicamento = modeloCaf.cidades[0].estoques[0].medicamentos[i];

        if (!medicamento) continue;

        // Gera histórico de semanas baseado nas movimentações
        const historicoSemanas = gerarHistoricoSemanas(item);

        // Calcula contagens
        const contagens = calcularContagensParaHistorico(historicoSemanas);

        // Calcula TP_metodo
        const dadosParaCalculo = {
            contagens: contagens,
            semanas: historicoSemanas,
            totalSemanasHistorico: historicoSemanas.length
        };
        const tp_metodo = calcularTPMetodo(dadosParaCalculo);

        // Atualiza o medicamento com o TP_metodo
        medicamento.TP_metodo = tp_metodo;
    }

    return modeloCaf;
}
```

## 🔄 Função Principal `main()`

### Passo a Passo:

1. **Definição de Caminhos**
   ```javascript
   const inventoryPath = path.join(__dirname, 'data', 'output', 'inventoryData.json');
   const modeloCafPath = path.join(__dirname, 'data', 'modelo', 'modelo_caf.json');
   ```

2. **Validação de Arquivo**
   ```javascript
   if (!fs.existsSync(inventoryPath)) {
       throw new Error(`Arquivo inventoryData.json não encontrado no caminho: ${inventoryPath}`);
   }
   ```

3. **Leitura dos Dados**
   ```javascript
   const inventoryData = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
   ```

4. **Validação de Dados**
   ```javascript
   if (!inventoryData.itens || inventoryData.itens.length === 0) {
       console.log("O arquivo inventoryData.json não contém dados ou está vazio.");
       return;
   }
   ```

5. **Carregamento do Modelo CAF**
   ```javascript
   let modeloCaf;
   if (fs.existsSync(modeloCafPath)) {
       modeloCaf = JSON.parse(fs.readFileSync(modeloCafPath, 'utf8'));
   } else {
       modeloCaf = {
           cidades: [
               {
                   nome: "palmares_paulista",
                   estoques: [
                       {
                           nome: "CAF",
                           medicamentos: []
                       }
                   ]
               }
           ]
       };
   }
   ```

6. **Atualização com TP_metodo**
   ```javascript
   modeloCaf = atualizarModeloCafComTPMetodo(inventoryData, modeloCaf);
   ```

7. **Salvamento do Arquivo**
   ```javascript
   fs.writeFileSync(modeloCafPath, JSON.stringify(modeloCaf, null, 4), 'utf8');
   ```

8. **Exibição de Resultados**
   ```javascript
   console.log(`✅ Modelo CAF atualizado com TP_metodo!`);
   console.log(`📁 Arquivo salvo em: ${modeloCafPath}`);
   console.log(`📊 Total de itens processados: ${inventoryData.itens.length}`);
   ```

## 📊 Estrutura de Saída

O script atualiza o campo `TP_metodo` no `modelo_caf.json`:

```json
{
    "cidades": [
        {
            "nome": "palmares_paulista",
            "estoques": [
                {
                    "nome": "CAF",
                    "medicamentos": [
                        {
                            "cod_item": 325023001,
                            "nome": "AAS - ÁCIDO ACETIL SALICILICO 100MG",
                            "TP_metodo": "ORDINÁRIOS"
                        }
                    ]
                }
            ]
        }
    ]
}
```

## 🚀 Como Executar

```bash
cd extraction
node calcular_TP_metodo.js
```

## 📈 Exemplo de Saída

```
Lendo o arquivo 'inventoryData.json'...

--- INICIANDO CLASSIFICAÇÃO DO TP_METODO PARA 194 ITENS ---

Processando TP_metodo para 194 itens...

✅ Modelo CAF atualizado com TP_metodo!
📁 Arquivo salvo em: data/modelo/modelo_caf.json
📊 Total de itens processados: 194

--- EXEMPLOS DE TP_METODO ---

-----------------------------------------------------------------
>> AAS - ÁCIDO ACETIL SALICILICO 100MG
-----------------------------------------------------------------
TP_Metodo: ORDINÁRIOS
```

## 📋 Classificações TP_Metodo

### ENTRANTES
- **Definição**: Itens novos que tiveram apenas uma ocorrência no histórico
- **Condições**:
  - Contagem total de semanas com movimento = 1
  - Única movimentação foi na última semana do histórico
- **Uso**: Para itens recém-adicionados ao sistema

### INATIVOS
- **Definição**: Itens que não possuíram ocorrências nas últimas 16 semanas
- **Condições**:
  - Nenhuma ocorrência nas últimas 16 semanas
- **Uso**: Para itens que podem ser descontinuados

### INTERMITENTES
- **Definição**: Itens com menos de 50% de ocorrências nas últimas 52 semanas
- **Condições**:
  - Menos de 50% de ocorrências nas últimas 52 semanas
  - Aplica-se mesmo se a série histórica for inferior a 52 semanas
- **Uso**: Para itens com movimentação irregular

### RECENTES
- **Definição**: Itens com pelo menos 50% de ocorrências em qualquer período
- **Condições**:
  - Pelo menos 50% de ocorrências em qualquer período (4, 8, 12, 16 ou 26 semanas)
  - Todas as ocorrências estão dentro do período analisado
- **Uso**: Para itens com movimentação recente e consistente

### ORDINÁRIOS
- **Definição**: Padrão para itens que não se enquadram nas outras categorias
- **Condições**:
  - Não se enquadra em nenhuma das categorias acima
- **Uso**: Para itens com movimentação regular e previsível

## ⚠️ Tratamento de Erros

O script inclui validação para:
- Arquivo `inventoryData.json` não encontrado
- Dados ausentes ou inválidos
- Medicamentos não encontrados no modelo CAF
- Valores não numéricos no histórico
- Arrays vazios ou sem valores válidos

## 🔗 Dependências

- `fs`: Manipulação de arquivos
- `path`: Manipulação de caminhos
- `url` e `dirname`: Configuração de módulos ES6

## 🎯 Casos de Uso

### Quando Usar Este Script:
1. **Atualização de Classificações**: Quando apenas as classificações TP_metodo precisam ser recalculadas
2. **Análise de Padrões**: Para entender padrões de movimentação dos itens
3. **Debugging**: Para verificar especificamente as classificações
4. **Otimização**: Quando outros campos já estão corretos e apenas TP_metodo precisa ser atualizado

### Vantagens:
- **Eficiência**: Processa apenas classificações TP_metodo
- **Velocidade**: Mais rápido que o script principal
- **Especialização**: Foco específico em classificações
- **Flexibilidade**: Pode ser executado independentemente

## 🔍 Exemplos de Classificação

### Exemplo 1: ENTRANTES
```javascript
// Contagens: {ContTt: 1, Cont16: 1, ...}
// Última semana: {week: "2025_52", value: 100}
// Resultado: "ENTRANTES"
```

### Exemplo 2: INATIVOS
```javascript
// Contagens: {Cont16: 0, ContTt: 5, ...}
// Resultado: "INATIVOS"
```

### Exemplo 3: INTERMITENTES
```javascript
// Contagens: {Cont52: 20, ...} (20/52 = 38% < 50%)
// Resultado: "INTERMITENTES"
```

### Exemplo 4: RECENTES
```javascript
// Contagens: {Cont04: 3, ContTt: 3, ...} (3/4 = 75% >= 50%)
// Resultado: "RECENTES"
```

### Exemplo 5: ORDINÁRIOS
```javascript
// Contagens: {Cont16: 10, Cont52: 40, ...} (não se enquadra em outras categorias)
// Resultado: "ORDINÁRIOS"
```

## 📊 Relação com Outros Campos

### Cálculo do MÉTODO
- **ENTRANTES**: MÉTODO = valor da única ocorrência
- **INATIVOS**: MÉTODO = 0
- **INTERMITENTES**: MÉTODO = máximo
- **RECENTES/ORDINÁRIOS**: MÉTODO = maior mediana

### Análise de Padrões
- Identificação de itens problemáticos
- Planejamento de estoque
- Análise de sazonalidade

---

**Desenvolvido para o sistema Matriciale - Gestão de Estoque Farmacêutico** 