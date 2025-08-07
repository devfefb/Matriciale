# Sistema de Cálculo do MÉTODO - Matriciale

Este sistema implementa a lógica completa para calcular o campo **MÉTODO** baseado no **TP_Metodo** e outras informações disponíveis, seguindo as regras específicas da metodologia Matriciale. O sistema utiliza exclusivamente o `inventoryData.json` como fonte de dados e gera os cálculos que preenchem o `modelo_caf.json`.

## 📁 Arquivos do Sistema

### 1. `calcular_metodo.js`
**Script principal** que calcula o MÉTODO baseado em dados do `inventoryData.json`.
- Lê arquivo `data/output/inventoryData.json`
- Processa todos os itens do inventário
- Calcula contagens, medianas, máximo e TP_Metodo
- Calcula o MÉTODO final
- Gera histórico de semanas baseado nas movimentações
- Atualiza o arquivo `data/modelo/modelo_caf.json`

### 2. `calcular_contagem.js`
**Script especializado** para cálculo de contagens de semanas com movimentação.
- Calcula contagens para diferentes períodos (4, 8, 12, 16, 26, 52 semanas, ano e total)
- Atualiza o campo `contagens` no `modelo_caf.json`
- Utiliza dados do `inventoryData.json`

### 3. `calcular_maximo.js`
**Script especializado** para cálculo do valor máximo do histórico.
- Calcula o valor máximo encontrado no histórico de semanas
- Atualiza o campo `maximo` no `modelo_caf.json`
- Utiliza dados do `inventoryData.json`

### 4. `calcular_medianas.js`
**Script especializado** para cálculo de medianas.
- Calcula todas as medianas (Md04, Md08, Md12, Md16, Md26, Md52, MdAno, MdTt)
- Atualiza o campo `medianas` no `modelo_caf.json`
- Utiliza dados do `inventoryData.json`

### 5. `calcular_TP_metodo.js`
**Script especializado** para classificação do TP_Metodo.
- Classifica itens em ENTRANTES, INATIVOS, INTERMITENTES, RECENTES ou ORDINÁRIOS
- Atualiza o campo `TP_metodo` no `modelo_caf.json`
- Utiliza dados do `inventoryData.json`

### 6. `README_CALCULAR_METODO.md`
**Documentação completa** do script principal.
- Explica todas as funções
- Detalha a lógica de cada TP_Metodo
- Fornece exemplos de uso e estrutura de dados

## 🎯 Lógica do Cálculo do MÉTODO

### **ENTRANTES**
```
MÉTODO = Quantitativo da única ocorrência (entrada ou saída)
```
- Aplica-se quando o item teve apenas uma ocorrência no histórico
- Pega o valor da única movimentação registrada

### **INATIVOS**
```
MÉTODO = 0
```
- Aplica-se quando o item não teve ocorrências nas últimas 16 semanas
- Retorna sempre zero

### **INTERMITENTES**
```
MÉTODO = Máximo (se < 1, então = 1)
```
- Aplica-se quando o item tem menos de 50% de ocorrências nas últimas 52 semanas
- Usa o valor máximo do histórico
- Arredonda para 1 se o resultado for menor que 1

### **ORDINÁRIOS** ou **RECENTES**
```
MÉTODO = Maior valor entre as 8 medianas (Md04 até MdTt)
```
- **Md04**: Mediana das últimas 4 semanas
- **Md08**: Mediana das últimas 8 semanas
- **Md12**: Mediana das últimas 12 semanas
- **Md16**: Mediana das últimas 16 semanas
- **Md26**: Mediana das últimas 26 semanas
- **Md52**: Mediana das últimas 52 semanas
- **MdAno**: Mediana das semanas do ano mais recente
- **MdTt**: Mediana do total do histórico

## 🚀 Como Usar

### Executar scripts individuais

```bash
cd extraction

# Script principal (calcula tudo)
node calcular_metodo.js

# Scripts especializados
node calcular_contagem.js
node calcular_maximo.js
node calcular_medianas.js
node calcular_TP_metodo.js
```

### Ordem recomendada de execução

1. **`calcular_metodo.js`** - Script principal que calcula tudo
2. **`calcular_contagem.js`** - Para atualizar apenas contagens
3. **`calcular_maximo.js`** - Para atualizar apenas máximos
4. **`calcular_medianas.js`** - Para atualizar apenas medianas
5. **`calcular_TP_metodo.js`** - Para atualizar apenas TP_metodo

## 📊 Exemplo de Saída

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
Máximo: 129
Estoque Atual: 11770
Reposição: 0
```

## 🔧 Funções Principais

### Scripts Especializados

#### `calcular_contagem.js`
- `gerarHistoricoSemanas(item)` - Gera histórico de 52 semanas
- `calcularContagensParaHistorico(historicoSemanas)` - Calcula contagens
- `atualizarModeloCafComContagens(inventoryData, modeloCaf)` - Atualiza modelo

#### `calcular_maximo.js`
- `calcularMaximaMedicamento(historicoSemanas)` - Calcula valor máximo
- `atualizarModeloCafComMaximos(inventoryData, modeloCaf)` - Atualiza modelo

#### `calcular_medianas.js`
- `calcularMediana(numeros)` - Calcula mediana de array
- `calcularMedianasParaHistorico(historicoSemanas)` - Calcula todas as medianas
- `atualizarModeloCafComMedianas(inventoryData, modeloCaf)` - Atualiza modelo

#### `calcular_TP_metodo.js`
- `calcularTPMetodo(dadosCalculados)` - Classifica TP_metodo
- `atualizarModeloCafComTPMetodo(inventoryData, modeloCaf)` - Atualiza modelo

### Script Principal

#### `calcular_metodo.js`
- `gerarHistoricoSemanas(item)` - Gera histórico de 52 semanas
- `calcularContagensParaHistorico(historicoSemanas)` - Calcula contagens
- `calcularMedianasParaHistorico(historicoSemanas)` - Calcula medianas
- `calcularMaximo(historicoSemanas)` - Calcula máximo
- `calcularTPMetodo(dadosCalculados)` - Classifica TP_metodo
- `calcularMetodo(dadosMedicamento)` - Calcula método final
- `gerarModeloCaf(inventoryData)` - Gera modelo completo

## 📋 Classificação TP_Metodo

### 1. **ENTRANTES**
- Contagem total de semanas com movimento = 1
- Única movimentação foi na última semana do histórico

### 2. **INTERMITENTES**
- Menos de 50% de ocorrências nas últimas 52 semanas
- Aplica-se mesmo se a série histórica for inferior a 52 semanas

### 3. **INATIVOS**
- Nenhuma ocorrência nas últimas 16 semanas

### 4. **RECENTES**
- Pelo menos 50% de ocorrências em qualquer período (4, 8, 12, 16 ou 26 semanas)
- Todas as ocorrências estão dentro do período analisado

### 5. **ORDINÁRIOS**
- Padrão para itens que não se enquadram nas outras categorias

## 📈 Cálculos Realizados

### Histórico de Semanas
- Gera 52 semanas de histórico (2025_01 a 2025_52)
- Distribui movimentações do período atual nas últimas 7 semanas
- Simula movimentação histórica baseada no padrão atual

### Campos Calculados
- **TP_metodo**: Classificação do tipo de método
- **metodo**: Valor calculado baseado na lógica específica
- **maximo**: Valor máximo do histórico de semanas
- **estoque_atual**: Quantidade final do período
- **total_geral**: Quantidade inicial + entradas
- **reposicao**: Máximo(0, método - estoque_atual)
- **metest**: Método * 2 (valor estatístico)
- **semanas**: Array com valores semanais
- **contagens**: Contagens de semanas com movimentação
- **medianas**: Todas as medianas calculadas

## ✅ Compatibilidade

O sistema é compatível com:
- ✅ Dados do `inventoryData.json`
- ✅ Qualquer quantidade de itens
- ✅ Diferentes tipos de movimentação
- ✅ Valores numéricos e não numéricos
- ✅ Geração automática do `modelo_caf.json`
- ✅ Execução individual ou em conjunto dos scripts

## 🛡️ Tratamento de Erros

O sistema inclui validação para:
- Arquivo `inventoryData.json` não encontrado
- Dados ausentes ou inválidos
- Valores não numéricos
- TP_Metodo desconhecido
- Logs informativos sobre o processamento

## 📦 Dependências

- `fs` - Manipulação de arquivos
- `path` - Manipulação de caminhos
- `url` e `dirname` - Configuração de módulos ES6

## 🎯 Resultados Esperados

O sistema calcula corretamente o MÉTODO para cada tipo de item:

- **ENTRANTES**: Valor da única ocorrência
- **INATIVOS**: Sempre 0
- **INTERMITENTES**: Valor máximo (mínimo 1)
- **ORDINÁRIOS/RECENTES**: Maior mediana entre as 8 calculadas

## 🔄 Fluxo de Processamento

### Script Principal
1. **Leitura**: Lê `inventoryData.json`
2. **Geração de Histórico**: Cria histórico de 52 semanas para cada item
3. **Cálculos**: Executa contagens, medianas, máximo e TP_Metodo
4. **Método**: Calcula o valor do MÉTODO baseado na classificação
5. **Reposição**: Calcula necessidade de reposição
6. **Saída**: Atualiza `modelo_caf.json` com todos os resultados

### Scripts Especializados
1. **Leitura**: Lê `inventoryData.json` e `modelo_caf.json` existente
2. **Processamento**: Executa apenas o cálculo específico
3. **Atualização**: Atualiza apenas o campo correspondente no `modelo_caf.json`
4. **Saída**: Salva o arquivo atualizado

## 📁 Estrutura de Arquivos

```
extraction/
├── calcular_metodo.js              # Script principal
├── calcular_contagem.js            # Script de contagens
├── calcular_maximo.js              # Script de máximos
├── calcular_medianas.js            # Script de medianas
├── calcular_TP_metodo.js           # Script de TP_metodo
├── README_CALCULAR_METODO.md       # Documentação detalhada
├── README_METODO_FINAL.md          # Este arquivo
├── data/
│   ├── output/
│   │   └── inventoryData.json      # Fonte de dados
│   └── modelo/
│       └── modelo_caf.json         # Arquivo de saída
```

## 🚀 Integração

O sistema pode ser facilmente integrado com:
- Dados existentes do `inventoryData.json`
- Sistemas de gestão de estoque
- Relatórios de movimentação
- Outros módulos do sistema Matriciale

## 🔧 Vantagens da Arquitetura Modular

1. **Flexibilidade**: Cada script pode ser executado independentemente
2. **Manutenibilidade**: Fácil atualização de cálculos específicos
3. **Eficiência**: Processamento otimizado para cada tipo de cálculo
4. **Escalabilidade**: Fácil adição de novos tipos de cálculo
5. **Debugging**: Isolamento de problemas por funcionalidade

---

**Desenvolvido para o sistema Matriciale - Gestão de Estoque Farmacêutico** 