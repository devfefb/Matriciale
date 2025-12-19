# Teste de Formatos de Arquivo

## Formatos Suportados

### Formatos Novos (Adicionados)
1. `Balancete CAF 20251123`
2. `Movimentação CAF 20251123`
3. `Balancete Olavo 20251123`

### Formatos Existentes (Mantidos)
1. `movimentacao CAF`
2. `balancete CAF`
3. `CAF 01-06`
4. `CAF_01-06`
5. `CAF 01/06`

## Testes de Extração de Unidade

```javascript
// Teste 1: Novo formato com data YYYYMMDD
extrairNomeUnidade("Balancete CAF 20251123")
// Esperado: "CAF"

// Teste 2: Novo formato com Movimentação
extrairNomeUnidade("Movimentação CAF 20251123")
// Esperado: "CAF"

// Teste 3: Novo formato com Olavo
extrairNomeUnidade("Balancete Olavo 20251123")
// Esperado: "OLAVO"

// Teste 4: Formato existente
extrairNomeUnidade("movimentacao CAF")
// Esperado: "CAF"

// Teste 5: Formato existente com data
extrairNomeUnidade("CAF 01-06")
// Esperado: "CAF"
```

## Testes de Extração de Data

```javascript
// Teste 1: Formato YYYYMMDD
extrairDataDoNomeArquivo("Balancete CAF 20251123.xlsx")
// Esperado: { dataFormatada: "23/11/2025", dataOriginal: "20251123", dataObjeto: Date }

// Teste 2: Formato DD/MM/YYYY
extrairDataDoNomeArquivo("CAF 23/11/2025.xlsx")
// Esperado: { dataFormatada: "23/11/2025", dataOriginal: "23112025", dataObjeto: Date }

// Teste 3: Sem data
extrairDataDoNomeArquivo("movimentacao CAF.xlsx")
// Esperado: null
```

## Ordem de Prioridade dos Padrões

Os padrões são testados na seguinte ordem (mais específicos primeiro):

1. `(?:balancete|movimenta[cç][aã]o|moviment)\s+([A-Za-z0-9]+)\s+\d{8}` - Novo formato com data YYYYMMDD
2. `movimentac[aã]o\s+([A-Za-z0-9]+)` - Movimentação + unidade
3. `balancete\s+([A-Za-z0-9]+)` - Balancete + unidade
4. `moviment\s+([A-Za-z0-9]+)` - Moviment + unidade
5. `([A-Za-z0-9]+)\s+\d{2}-\d{2}` - Unidade + data DD-MM
6. `([A-Za-z0-9]+)[-_]\d{2}-\d{2}` - Unidade + data DD-MM (com separador)
7. `([A-Za-z0-9]+)\s*\d{2}\/\d{2}` - Unidade + data DD/MM
8. `([A-Za-z0-9]+)\s+\d{8}` - Unidade + data YYYYMMDD
9. `([A-Za-z0-9]+)$` - Último recurso: qualquer sequência alfanumérica

## Compatibilidade

✅ Todos os formatos existentes continuam funcionando
✅ Novos formatos são suportados
✅ Fallback mantido para casos não cobertos

