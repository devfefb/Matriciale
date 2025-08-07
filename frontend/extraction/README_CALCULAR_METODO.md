# Script de Cálculo do MÉTODO - Matriciale

Este script calcula o campo **MÉTODO** baseado no **TP_Metodo** e outras informações disponíveis, seguindo a lógica específica para cada tipo de classificação. O script utiliza exclusivamente o `inventoryData.json` como fonte de dados e gera os cálculos que preenchem o `modelo_caf.json`.

## Funcionalidades

O script implementa a seguinte lógica para calcular o MÉTODO:

### 1. **ENTRANTES**
- **MÉTODO** = Quantitativo da única ocorrência (entrada ou saída)
- Aplica-se quando o item teve apenas uma ocorrência no histórico

### 2. **INATIVOS**
- **MÉTODO** = 0
- Aplica-se quando o item não teve ocorrências nas últimas 16 semanas

### 3. **INTERMITENTES**
- **MÉTODO** = Valor do campo "Máximo"
- Se o resultado for menor que 1, então arredonda para 1
- Aplica-se quando o item tem menos de 50% de ocorrências nas últimas 52 semanas

### 4. **ORDINÁRIOS** ou **RECENTES**
- **MÉTODO** = Maior quantidade entre as 8 medianas calculadas:
  - Md04 (últimas 4 semanas)
  - Md08 (últimas 8 semanas)
  - Md12 (últimas 12 semanas)
  - Md16 (últimas 16 semanas)
  - Md26 (últimas 26 semanas)
  - Md52 (últimas 52 semanas)
  - MdAno (semanas do ano mais recente)
  - MdTt (total do histórico)

## Como Usar

### Executar o script

```bash
cd extraction
node calcular_metodo.js
```

O script irá:
- Ler o arquivo `data/output/inventoryData.json`
- Processar todos os itens do inventário
- Calcular contagens, medianas, máximo e TP_Metodo
- Calcular o MÉTODO baseado na lógica específica
- Gerar histórico de semanas baseado nas movimentações
- Atualizar o arquivo `data/modelo/modelo_caf.json`
- Exibir estatísticas do processamento

## Estrutura dos Dados de Entrada

O script lê o arquivo `inventoryData.json` que contém:

```json
{
  "periodo_inicio": "25/05/2025",
  "periodo_fim": "31/05/2025",
  "itens": [
    {
      "cod_sistemico_item": "325.023.001",
      "descricao_item": "AAS - ÁCIDO ACETIL SALICILICO 100MG",
      "qtd_periodo_inicial": 12290,
      "qtd_entradas_periodo": 0,
      "qtd_saidas_periodo": 520,
      "qtd_periodo_final": 11770,
      "movimentacoes": [...]
    }
  ]
}
```

## Estrutura dos Dados de Saída

O script gera o arquivo `modelo_caf.json` com a estrutura:

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
                ...
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Funções Disponíveis

### `gerarHistoricoSemanas(item)`
Gera um histórico de 52 semanas baseado nas movimentações do item do período atual.

### `calcularContagensParaHistorico(historicoSemanas)`
Calcula as contagens de semanas com movimentação para diferentes períodos.

### `calcularMedianasParaHistorico(historicoSemanas)`
Calcula todas as medianas (Md04 até MdTt) baseadas no histórico de semanas.

### `calcularMaximo(historicoSemanas)`
Calcula o valor máximo encontrado no histórico de semanas.

### `calcularTPMetodo(dadosCalculados)`
Classifica o item em uma das categorias: ENTRANTES, INATIVOS, INTERMITENTES, RECENTES ou ORDINÁRIOS.

### `calcularMetodo(dadosMedicamento)`
Calcula o valor do MÉTODO baseado no TP_Metodo e outras informações.

### `gerarModeloCaf(inventoryData)`
Gera o modelo CAF completo com todos os cálculos baseados no inventoryData.

## Exemplo de Saída

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

## Lógica de Classificação TP_Metodo

### 1. ENTRANTES
- Contagem total de semanas com movimento = 1
- Única movimentação foi na última semana do histórico

### 2. INTERMITENTES
- Menos de 50% de ocorrências nas últimas 52 semanas
- Aplica-se mesmo se a série histórica for inferior a 52 semanas

### 3. INATIVOS
- Nenhuma ocorrência nas últimas 16 semanas

### 4. RECENTES
- Pelo menos 50% de ocorrências em qualquer período (4, 8, 12, 16 ou 26 semanas)
- Todas as ocorrências estão dentro do período analisado

### 5. ORDINÁRIOS
- Padrão para itens que não se enquadram nas outras categorias

## Cálculos Realizados

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

## Compatibilidade

O script é compatível com:
- ✅ Dados do `inventoryData.json`
- ✅ Qualquer quantidade de itens
- ✅ Diferentes tipos de movimentação
- ✅ Valores numéricos e não numéricos
- ✅ Geração automática do `modelo_caf.json`

## Tratamento de Erros

O script inclui validação para:
- Arquivo `inventoryData.json` não encontrado
- Dados ausentes ou inválidos
- Valores não numéricos
- TP_Metodo desconhecido
- Logs informativos sobre o processamento

## Dependências

- `fs` - Manipulação de arquivos
- `path` - Manipulação de caminhos
- `url` e `dirname` - Configuração de módulos ES6

## Fluxo de Processamento

1. **Leitura**: Lê `inventoryData.json`
2. **Geração de Histórico**: Cria histórico de 52 semanas para cada item
3. **Cálculos**: Executa contagens, medianas, máximo e TP_Metodo
4. **Método**: Calcula o valor do MÉTODO baseado na classificação
5. **Reposição**: Calcula necessidade de reposição
6. **Saída**: Atualiza `modelo_caf.json` com todos os resultados

---

**Desenvolvido para o sistema Matriciale - Gestão de Estoque Farmacêutico** 