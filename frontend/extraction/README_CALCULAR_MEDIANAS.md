# Documentação Detalhada - calcular_medianas.js

## 📋 Visão Geral

O script `calcular_medianas.js` é um **script especializado** do sistema Matriciale que calcula as **medianas** para diferentes períodos do histórico de semanas de cada item. Este script foca especificamente no cálculo de medianas e atualiza apenas o campo `medianas` no `modelo_caf.json`.

## 🎯 Objetivo

Calcular e atualizar todas as medianas (Md04, Md08, Md12, Md16, Md26, Md52, MdAno, MdTt) para cada item do inventário, utilizando exclusivamente o `inventoryData.json` como fonte de dados.

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

### 1. `calcularMediana(numeros)`

**Propósito**: Calcula a mediana de um array de números.

**Parâmetros**:
- `numeros`: Array de números

**Retorna**: Valor da mediana (number)

**Lógica Detalhada**:

```javascript
function calcularMediana(numeros) {
    if (!Array.isArray(numeros) || numeros.length === 0) {
        return 0;
    }
    const numerosValidos = numeros.filter(n => typeof n === 'number' && !isNaN(n) && n !== '');
    if (numerosValidos.length === 0) {
        return 0;
    }
    const sorted = [...numerosValidos].sort((a, b) => a - b);
    const middleIndex = Math.floor(sorted.length / 2);
    if (sorted.length % 2 !== 0) {
        return sorted[middleIndex];
    }
    return (sorted[middleIndex - 1] + sorted[middleIndex]) / 2;
}
```

**Processo**:
1. **Validação**: Verifica se é um array válido e não vazio
2. **Filtragem**: Remove valores inválidos (NaN, undefined, null, string vazio)
3. **Ordenação**: Ordena os números em ordem crescente
4. **Cálculo**: 
   - Se ímpar: retorna o valor central
   - Se par: retorna a média dos dois valores centrais

**Exemplos**:
```javascript
// Array ímpar: [1, 3, 5, 7, 9]
// Mediana: 5 (valor central)

// Array par: [1, 3, 5, 7, 9, 11]
// Mediana: (5 + 7) / 2 = 6 (média dos dois centrais)
```

### 2. `calcularMedianasParaHistorico(historicoSemanas)`

**Propósito**: Calcula todas as medianas baseadas no histórico de semanas.

**Parâmetros**:
- `historicoSemanas`: Array de objetos com `{week: string, value: number}`

**Retorna**: Objeto com todas as medianas calculadas

**Lógica Detalhada**:

#### Extração de Valores
```javascript
const historicoValores = historicoSemanas.map(s => s.value);
```

#### Cálculo de Md52 (Últimas 52 semanas)
```javascript
const md52 = calcularMediana(historicoValores.slice(-52));
```

#### Cálculo de MdAno (Semanas do ano mais recente)
```javascript
let mdAno = 0;
if (historicoSemanas.length > 0) {
    const anoMaisRecente = historicoSemanas[historicoSemanas.length - 1].week.substring(0, 4);
    const valoresDoAno = historicoSemanas
        .filter(s => s.week.startsWith(anoMaisRecente))
        .map(s => s.value);
    mdAno = calcularMediana(valoresDoAno);
}
```

#### Cálculo das Outras Medianas
```javascript
const md04 = calcularMediana(historicoValores.slice(-4));   // Últimas 4 semanas
const md08 = calcularMediana(historicoValores.slice(-8));   // Últimas 8 semanas
const md12 = calcularMediana(historicoValores.slice(-12));  // Últimas 12 semanas
const md16 = calcularMediana(historicoValores.slice(-16));  // Últimas 16 semanas
const md26 = calcularMediana(historicoValores.slice(-26));  // Últimas 26 semanas
const mdTotal = calcularMediana(historicoValores);          // Total do histórico
```

#### Retorno com Arredondamento
```javascript
return {
    "Md04": Math.round(md04),
    "Md08": Math.round(md08),
    "Md12": Math.round(md12),
    "Md16": Math.round(md16),
    "Md26": Math.round(md26),
    "Md52": Math.round(md52),
    "MdAno": Math.round(mdAno),
    "MdTt": Math.round(mdTotal)
};
```

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

### 4. `atualizarModeloCafComMedianas(inventoryData, modeloCaf)`

**Propósito**: Atualiza o modelo CAF com as medianas calculadas.

**Parâmetros**:
- `inventoryData`: Dados do inventoryData.json
- `modeloCaf`: Modelo CAF existente

**Retorna**: Modelo CAF atualizado com medianas

**Processo Detalhado**:

```javascript
function atualizarModeloCafComMedianas(inventoryData, modeloCaf) {
    console.log(`Processando medianas para ${inventoryData.itens.length} itens...`);

    for (let i = 0; i < inventoryData.itens.length; i++) {
        const item = inventoryData.itens[i];
        const medicamento = modeloCaf.cidades[0].estoques[0].medicamentos[i];

        if (!medicamento) continue;

        // Gera histórico de semanas baseado nas movimentações
        const historicoSemanas = gerarHistoricoSemanas(item);

        // Calcula medianas
        const medianas = calcularMedianasParaHistorico(historicoSemanas);

        // Atualiza o medicamento com as medianas
        medicamento.medianas = medianas;
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

6. **Atualização com Medianas**
   ```javascript
   modeloCaf = atualizarModeloCafComMedianas(inventoryData, modeloCaf);
   ```

7. **Salvamento do Arquivo**
   ```javascript
   fs.writeFileSync(modeloCafPath, JSON.stringify(modeloCaf, null, 4), 'utf8');
   ```

8. **Exibição de Resultados**
   ```javascript
   console.log(`✅ Modelo CAF atualizado com medianas!`);
   console.log(`📁 Arquivo salvo em: ${modeloCafPath}`);
   console.log(`📊 Total de itens processados: ${inventoryData.itens.length}`);
   ```

## 📊 Estrutura de Saída

O script atualiza o campo `medianas` no `modelo_caf.json`:

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
                            "medianas": {
                                "Md04": 109,
                                "Md08": 107,
                                "Md12": 89,
                                "Md16": 89,
                                "Md26": 91,
                                "Md52": 86,
                                "MdAno": 86,
                                "MdTt": 86
                            }
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
node calcular_medianas.js
```

## 📈 Exemplo de Saída

```
Lendo o arquivo 'inventoryData.json'...

--- INICIANDO CÁLCULO DAS MEDIANAS PARA 194 ITENS ---

Processando medianas para 194 itens...

✅ Modelo CAF atualizado com medianas!
📁 Arquivo salvo em: data/modelo/modelo_caf.json
📊 Total de itens processados: 194

--- EXEMPLOS DE MEDIANAS ---

-----------------------------------------------------------------
>> AAS - ÁCIDO ACETIL SALICILICO 100MG
-----------------------------------------------------------------
Medianas Calculadas:
{
  "Md04": 109,
  "Md08": 107,
  "Md12": 89,
  "Md16": 89,
  "Md26": 91,
  "Md52": 86,
  "MdAno": 86,
  "MdTt": 86
}
```

## 📋 Significado das Medianas

### Md04 (Últimas 4 semanas)
- Mediana das últimas 4 semanas
- Indica tendência muito recente
- Usado para análise de curto prazo

### Md08 (Últimas 8 semanas)
- Mediana das últimas 8 semanas
- Período intermediário para análise
- Equivale a 2 meses de dados

### Md12 (Últimas 12 semanas)
- Mediana das últimas 12 semanas
- Período de 3 meses para análise
- Usado para análise de tendências

### Md16 (Últimas 16 semanas)
- Mediana das últimas 16 semanas
- Período de 4 meses para análise
- Usado para análise de sazonalidade

### Md26 (Últimas 26 semanas)
- Mediana das últimas 26 semanas
- Período de 6 meses para análise
- Usado para análise semestral

### Md52 (Últimas 52 semanas)
- Mediana das últimas 52 semanas
- Período de 1 ano para análise
- Usado para análise anual

### MdAno (Semanas do ano atual)
- Mediana das semanas do ano mais recente
- Análise específica do ano corrente
- Pode variar dependendo do período atual

### MdTt (Total do histórico)
- Mediana de todo o histórico disponível
- Representa a tendência geral
- Usado para análise de longo prazo

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
1. **Atualização de Medianas**: Quando apenas as medianas precisam ser recalculadas
2. **Análise de Tendências**: Para entender padrões de movimentação
3. **Debugging**: Para verificar especificamente as medianas
4. **Otimização**: Quando outros campos já estão corretos e apenas medianas precisam ser atualizadas

### Vantagens:
- **Eficiência**: Processa apenas cálculos de medianas
- **Velocidade**: Mais rápido que o script principal
- **Especialização**: Foco específico em medianas
- **Flexibilidade**: Pode ser executado independentemente

## 🔍 Exemplos de Cálculo

### Exemplo 1: Mediana de Array Ímpar
```javascript
// Valores: [100, 150, 200, 250, 300]
// Mediana: 200 (valor central)
```

### Exemplo 2: Mediana de Array Par
```javascript
// Valores: [100, 150, 200, 250]
// Mediana: (150 + 200) / 2 = 175
```

### Exemplo 3: Mediana com Valores Inválidos
```javascript
// Valores: [100, NaN, 150, undefined, 200, null]
// Mediana: (100 + 150 + 200) / 3 = 150 (apenas valores válidos)
```

## 📊 Relação com Outros Campos

### Cálculo do MÉTODO
- Para itens ORDINÁRIOS e RECENTES, o MÉTODO = maior mediana entre as 8 calculadas
- As medianas são fundamentais para o cálculo final do método

### Análise de Padrões
- Comparação entre diferentes períodos
- Identificação de sazonalidade
- Análise de tendências de movimentação

---

**Desenvolvido para o sistema Matriciale - Gestão de Estoque Farmacêutico** 