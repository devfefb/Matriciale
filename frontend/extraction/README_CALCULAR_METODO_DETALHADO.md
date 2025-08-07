# Documentação Detalhada - calcular_metodo.js

## 📋 Visão Geral

O script `calcular_metodo.js` é o **script principal** do sistema Matriciale que calcula o campo **MÉTODO** baseado no **TP_Metodo** e outras informações disponíveis. Este script consolida todas as funcionalidades dos outros scripts especializados em um único arquivo.

## 🎯 Objetivo

Calcular o valor do **MÉTODO** para cada item do inventário seguindo a lógica específica da metodologia Matriciale, utilizando exclusivamente o `inventoryData.json` como fonte de dados.

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

**Lógica**:
```javascript
const contarUltimas = (n) => {
    const ultimasNSemanas = historicoSemanas.slice(-n);
    return ultimasNSemanas.filter(s => s.value > 0).length;
};
```

**Períodos calculados**:
- `Cont04`: Últimas 4 semanas
- `Cont08`: Últimas 8 semanas
- `Cont12`: Últimas 12 semanas
- `Cont16`: Últimas 16 semanas
- `Cont26`: Últimas 26 semanas
- `Cont52`: Últimas 52 semanas
- `ContAno`: Semanas do ano mais recente
- `ContTt`: Total do histórico

### 2. `calcularMediana(numeros)`

**Propósito**: Calcula a mediana de um array de números.

**Parâmetros**:
- `numeros`: Array de números

**Retorna**: Valor da mediana (number)

**Lógica**:
1. Filtra números válidos
2. Ordena o array
3. Calcula a mediana (média dos dois valores centrais se par, valor central se ímpar)

### 3. `calcularMedianasParaHistorico(historicoSemanas)`

**Propósito**: Calcula todas as medianas baseadas no histórico de semanas.

**Parâmetros**:
- `historicoSemanas`: Array de objetos com `{week: string, value: number}`

**Retorna**: Objeto com todas as medianas calculadas

**Medianas calculadas**:
- `Md04`: Mediana das últimas 4 semanas
- `Md08`: Mediana das últimas 8 semanas
- `Md12`: Mediana das últimas 12 semanas
- `Md16`: Mediana das últimas 16 semanas
- `Md26`: Mediana das últimas 26 semanas
- `Md52`: Mediana das últimas 52 semanas
- `MdAno`: Mediana das semanas do ano mais recente
- `MdTt`: Mediana do total do histórico

### 4. `calcularMaximo(historicoSemanas)`

**Propósito**: Calcula o valor máximo do histórico de semanas.

**Parâmetros**:
- `historicoSemanas`: Array de objetos com `{week: string, value: number}`

**Retorna**: Valor máximo encontrado (number)

**Lógica**:
1. Extrai todos os valores
2. Filtra números válidos
3. Retorna o valor máximo

### 5. `calcularTPMetodo(dadosCalculados)`

**Propósito**: Classifica o item em uma das categorias de TP_Metodo.

**Parâmetros**:
- `dadosCalculados`: Objeto com `{contagens, semanas, totalSemanasHistorico}`

**Retorna**: String com a classificação

**Regras de classificação**:

#### ENTRANTES
```javascript
if (contagens.ContTt === 1) {
    const ultimaSemanaHistorico = semanas[semanas.length - 1];
    if (ultimaSemanaHistorico && ultimaSemanaHistorico.value > 0) {
        return "ENTRANTES";
    }
}
```

#### INTERMITENTES
```javascript
const periodo = Math.min(totalSemanasHistorico, 52);
if (periodo > 0 && (contagens.Cont52 / periodo) < 0.5) {
    return "INTERMITENTES";
}
```

#### INATIVOS
```javascript
if (contagens.Cont16 === 0) {
    return "INATIVOS";
}
```

#### RECENTES
```javascript
if (contagens.Cont04 > 0 && (contagens.Cont04 / 4) >= 0.5 && contagens.ContTt === contagens.Cont04) {
    return "RECENTES";
}
// ... outras condições similares
```

#### ORDINÁRIOS
```javascript
return "ORDINÁRIOS"; // Padrão
```

### 6. `calcularMetodo(dadosMedicamento)`

**Propósito**: Calcula o valor do MÉTODO baseado no TP_Metodo.

**Parâmetros**:
- `dadosMedicamento`: Objeto com `{TP_Metodo, medianas, maximo, historicoSemanas}`

**Retorna**: Valor do MÉTODO calculado (number)

**Lógica por TP_Metodo**:

#### ENTRANTES
```javascript
case "ENTRANTES":
    const ocorrenciasComValor = historicoSemanas.filter(s => s.value > 0);
    if (ocorrenciasComValor.length === 1) {
        return ocorrenciasComValor[0].value;
    }
    return 0;
```

#### INATIVOS
```javascript
case "INATIVOS":
    return 0;
```

#### INTERMITENTES
```javascript
case "INTERMITENTES":
    const metodoIntermitentes = maximo;
    return metodoIntermitentes < 1 ? 1 : metodoIntermitentes;
```

#### ORDINÁRIOS/RECENTES
```javascript
case "ORDINÁRIOS":
case "RECENTES":
    const medianasArray = [
        medianas.Md04, medianas.Md08, medianas.Md12, medianas.Md16,
        medianas.Md26, medianas.Md52, medianas.MdAno, medianas.MdTt
    ];
    return Math.max(...medianasArray);
```

### 7. `gerarHistoricoSemanas(item)`

**Propósito**: Gera um histórico de 52 semanas baseado nas movimentações do item.

**Parâmetros**:
- `item`: Item do inventoryData

**Retorna**: Array de objetos com `{week: string, value: number}`

**Lógica**:
1. Gera 52 semanas (2025_01 a 2025_52)
2. Distribui movimentações do período atual nas últimas 7 semanas
3. Simula movimentação histórica baseada no padrão atual

### 8. `gerarModeloCaf(inventoryData)`

**Propósito**: Gera o modelo CAF completo com todos os cálculos.

**Parâmetros**:
- `inventoryData`: Dados do inventoryData.json

**Retorna**: Objeto modelo CAF completo

**Processo**:
1. Cria estrutura base do modelo CAF
2. Para cada item:
   - Gera histórico de semanas
   - Calcula contagens, medianas, máximo
   - Calcula TP_Metodo e MÉTODO
   - Calcula estoque atual, total geral, reposição
   - Adiciona ao modelo

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

5. **Geração do Modelo CAF**
   ```javascript
   const modeloCaf = gerarModeloCaf(inventoryData);
   ```

6. **Salvamento do Arquivo**
   ```javascript
   fs.writeFileSync(modeloCafPath, JSON.stringify(modeloCaf, null, 4), 'utf8');
   ```

7. **Exibição de Resultados**
   ```javascript
   console.log(`✅ Modelo CAF atualizado com sucesso!`);
   console.log(`📁 Arquivo salvo em: ${modeloCafPath}`);
   console.log(`📊 Total de medicamentos processados: ${modeloCaf.cidades[0].estoques[0].medicamentos.length}`);
   ```

## 📊 Estrutura de Saída

O script gera um arquivo `modelo_caf.json` com a seguinte estrutura:

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
                            "classificacao": "10.REMUME",
                            "TP_metodo": "ORDINÁRIOS",
                            "estoque_atual": 11770,
                            "total_geral": 12290,
                            "maximo": 126,
                            "metodo": 93,
                            "metest": 186,
                            "reposicao": 0,
                            "semanas": [
                                {"2025_01": 74},
                                {"2025_02": 74},
                                // ... 52 semanas
                            ]
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
node calcular_metodo.js
```

## 📈 Exemplo de Saída

```
Lendo o arquivo 'inventoryData.json'...

--- INICIANDO CÁLCULO DO MÉTODO PARA 194 ITENS ---

Processando 194 itens...

✅ Modelo CAF atualizado com sucesso!
📁 Arquivo salvo em: data/modelo/modelo_caf.json
📊 Total de medicamentos processados: 194

--- EXEMPLOS DE RESULTADOS ---

-----------------------------------------------------------------
>> AAS - ÁCIDO ACETIL SALICILICO 100MG
-----------------------------------------------------------------
TP_Metodo: ORDINÁRIOS
Método: 93
Máximo: 126
Estoque Atual: 11770
Reposição: 0
```

## ⚠️ Tratamento de Erros

O script inclui validação para:
- Arquivo `inventoryData.json` não encontrado
- Dados ausentes ou inválidos
- Valores não numéricos
- TP_Metodo desconhecido

## 🔗 Dependências

- `fs`: Manipulação de arquivos
- `path`: Manipulação de caminhos
- `url` e `dirname`: Configuração de módulos ES6

---

**Desenvolvido para o sistema Matriciale - Gestão de Estoque Farmacêutico** 