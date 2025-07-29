# Script de Cálculo de Medianas

Este script calcula as medianas dos valores de `qtd_saidas` para diferentes períodos de semanas, funcionando com qualquer ano.

## Funcionalidades

O script calcula as seguintes medianas baseadas nos valores de `qtd_saidas`:

- **Md04**: Média das semanas 1-4
- **Md08**: Média das semanas 1-8  
- **Md16**: Média das semanas 1-16
- **Md52**: Média das semanas 1-52
- **MdAno**: Igual a Md52 (média anual)
- **MdTt**: Igual a Md52 (média total)

## Como Usar

### 1. Executar o script principal

```bash
cd extraction
node calcular_medianas.js
```

O script irá:
- Ler o arquivo `data/modelo/modelo.json`
- Processar todos os dados
- Calcular as medianas para cada medicamento
- Salvar o resultado em `data/modelo/modelo_processado.json`
- Exibir estatísticas do processamento

### 2. Executar o teste

```bash
cd extraction
node teste_anos.js
```

Este teste demonstra o funcionamento com dados de diferentes anos (2024 e 2025).

## Formato dos Dados

O script espera que os índices das semanas sigam o formato: `YYYY_NN` onde:
- `YYYY` = ano (4 dígitos)
- `NN` = número da semana (2 dígitos)

Exemplos válidos:
- `2024_01` (semana 1 de 2024)
- `2025_15` (semana 15 de 2025)
- `2023_52` (semana 52 de 2023)

## Funções Disponíveis

### `obterAno(indice)`
Extrai o ano do índice da semana.
```javascript
obterAno("2024_01") // retorna 2024
obterAno("2025_15") // retorna 2025
```

### `obterNumeroSemana(indice)`
Extrai o número da semana do índice.
```javascript
obterNumeroSemana("2024_01") // retorna 1
obterNumeroSemana("2025_15") // retorna 15
```

### `validarIndiceSemana(indice)`
Valida se o formato do índice está correto.
```javascript
validarIndiceSemana("2024_01") // retorna true
validarIndiceSemana("2024_1")  // retorna false (formato inválido)
```

### `calcularMedia(numeros)`
Calcula a média de um array de números.
```javascript
calcularMedia([100, 150, 200]) // retorna 150
```

### `calcularMedianasMedicamento(medicamento, semanas)`
Calcula todas as medianas para um medicamento específico.

### `processarModelo(modelo)`
Processa todo o modelo de dados e retorna o resultado processado com estatísticas.

## Estrutura de Saída

O script gera um arquivo JSON com a mesma estrutura do arquivo de entrada, mas com as medianas calculadas para cada medicamento:

```json
{
  "cidade": {
    "tipo_estoque": [
      {
        "semanas": [
          {
            "indice": "2025_01",
            "qtd_saidas": 1000,
            "medicamentos": [
              {
                "nome": "Medicamento",
                "medianas": [
                  {"Md04": 1000},
                  {"Md08": 1000},
                  {"Md012": 1000},
                  {"Md016": 1000},
                  {"Md026": 1000},
                  {"Md52": 1000},
                  {"MdAno": 1000},
                  {"MdTt": 1000}
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## Compatibilidade

O script é compatível com:
- ✅ Qualquer ano (2020, 2021, 2022, 2023, 2024, 2025, etc.)
- ✅ Múltiplas cidades
- ✅ Múltiplos tipos de estoque
- ✅ Diferentes quantidades de semanas
- ✅ Diferentes quantidades de medicamentos

## Tratamento de Erros

O script inclui validação para:
- Formato correto dos índices das semanas
- Dados ausentes ou inválidos
- Ordenação automática das semanas por número
- Logs informativos sobre o processamento

## Exemplo de Saída

```
Processando modelo...
Modelo processado com sucesso! Arquivo salvo em: extraction/data/modelo/modelo_processado.json

Estatísticas do processamento:
- Cidades processadas: 2
- Tipos de estoque: 6
- Total de estoques: 6
- Total de semanas: 18
- Medicamentos por semana: 3
- Anos encontrados: 2025
``` 