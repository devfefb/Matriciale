# Sistema de Extração de Dados - Matriciale

Este sistema extrai informações das planilhas "balancete" e "movimentacao" para gerar um objeto `inventoryData` estruturado.

## Estrutura do Projeto

```
extraction/
├── script.cjs              # Script principal
├── utils/                  # Utilitários modulares
│   ├── balanceteUtils.js   # Processamento do balancete
│   ├── movimentacaoUtils.js # Processamento da movimentação
│   ├── dateUtils.js        # Manipulação de datas
│   └── fileUtils.js        # Manipulação de arquivos
├── data/
│   ├── input/              # Arquivos de entrada (.xlsx)
│   └── output/             # Arquivos de saída (.json)
└── README.md               # Esta documentação
```

## Pré-requisitos

- Node.js >= 14.0.0
- Dependências instaladas: `exceljs`, `moment`

## Instalação

```bash
cd frontend
npm install
```

## Uso

### Execução Básica

```bash
npm run extract
```

### Execução com Debug

```bash
npm run debug
```

### Execução em Modo Teste

```bash
npm run test
```

## Arquivos de Entrada

O sistema espera encontrar os seguintes arquivos na pasta `data/input/`:

1. **balancete.xlsx** - Planilha com dados do balancete
2. **movimentacao.xlsx** - Planilha com dados de movimentação

### Formato do Balancete

O arquivo deve conter as seguintes colunas (1ª à 13ª):

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| 1 | cod_sistemico_item | Código sistêmico do item |
| 2 | descricao_item | Descrição do item |
| 3 | (ignorada) | Coluna em branco |
| 4 | tipo_unid_item | Tipo de unidade |
| 5 | qtd_periodo_inicial | Quantidade inicial |
| 6 | valor_item_periodo_inicial | Valor inicial |
| 7 | qtd_entradas_periodo | Quantidade de entradas |
| 8 | valor_entradas_periodo | Valor das entradas |
| 9 | qtd_saidas_periodo | Quantidade de saídas |
| 10 | valor_saidas_periodo | Valor das saídas |
| 11 | qtd_periodo_final | Quantidade final |
| 12 | valor_unitario_periodo_final | Valor unitário final |
| 13 | valor_item_periodo_final | Valor final do item |

### Formato da Movimentação

O arquivo deve conter as seguintes colunas:

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| 1 | data_movimentacao | Data da movimentação |
| 2 | historico | Histórico da movimentação |
| 3 | documento | Documento |
| 4 | requisicao | Requisição |
| 5 | entradas | Quantidade de entradas |
| 6 | saidas | Quantidade de saídas |
| 7 | estoque | Estoque atual |
| 8 | observacao | Observações |

## Arquivo de Saída

O sistema gera um arquivo `inventoryData.json` na pasta `data/output/` com a seguinte estrutura:

```json
{
  "periodo_inicio": "25/05/2025",
  "periodo_fim": "01/06/2025",
  "itens": [
    {
      "cod_sistemico_item": "325.023.001",
      "descricao_item": "AAS - ÁCIDO ACETIL SALICILICO 100MG",
      "tipo_unid_item": "CP",
      "qtd_periodo_inicial": 12290,
      "valor_item_periodo_inicial": 1229.00,
      "qtd_entradas_periodo": 0,
      "valor_entradas_periodo": 0.00,
      "qtd_saidas_periodo": 520,
      "valor_saidas_periodo": 52.00,
      "qtd_periodo_final": 11770,
      "valor_unitario_periodo_final": 0.10,
      "valor_item_periodo_final": 1177.00,
      "movimentacoes": [
        {
          "data_movimentacao": "25/05/2025",
          "historico": "SALDO ANTERIOR",
          "documento": null,
          "requisicao": "",
          "entradas": null,
          "saidas": 0,
          "estoque": 12.290,
          "observacao": ""
        }
      ]
    }
  ]
}
```

## Lógica de Processamento

### 1. Processamento do Balancete

- Lê a planilha linha por linha
- Filtra itens onde `qtd_entradas_periodo` OU `qtd_saidas_periodo` > 0
- Extrai todos os campos conforme mapeamento
- Ignora a 3ª coluna (em branco)

### 2. Processamento da Movimentação

- Localiza a primeira ocorrência de "SALDO ANTERIOR"
- Calcula período: início = data_saldo_anterior + 1 dia, fim = início + 6 dias
- Agrupa movimentações por item usando a lógica do "SALDO ANTERIOR"
- Cada "SALDO ANTERIOR" indica início de um novo item

### 3. Cálculo do Período

- **periodo_inicio**: Um dia após a data do "SALDO ANTERIOR"
- **periodo_fim**: Seis dias após o periodo_inicio

## Tratamento de Erros

O sistema inclui validações para:

- Existência dos arquivos de entrada
- Formato correto das planilhas
- Dados obrigatórios
- Integridade dos dados

## Logs e Debug

O sistema fornece logs detalhados durante a execução:

- 🚀 Início do processo
- 📁 Busca por arquivos
- ✅ Validações
- 📋 Processamento do balancete
- 📊 Processamento da movimentação
- 📅 Cálculo do período
- 📦 Contagem de itens
- 🎉 Conclusão

## Modo Debug

Use `--debug` para obter informações adicionais:

```bash
npm run debug
```

## Modo Teste

Use `--test` para execução em modo teste:

```bash
npm run test
```

## Contribuição

Para modificar o sistema:

1. Edite os arquivos em `utils/` para alterar a lógica específica
2. Modifique `script.cjs` para alterar o fluxo principal
3. Atualize esta documentação conforme necessário

## Suporte

Em caso de problemas:

1. Verifique se os arquivos de entrada estão no formato correto
2. Execute em modo debug para mais detalhes
3. Verifique os logs de erro no console 