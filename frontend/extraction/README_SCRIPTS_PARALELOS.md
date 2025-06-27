# Scripts Paralelos de Processamento - Sistema Matriciale

## Visão Geral

Este documento descreve os scripts paralelos independentes criados para facilitar o debug e isolamento de processamento de diferentes tipos de arquivos no Sistema Matriciale.

## Scripts Disponíveis

### 1. Script Principal (`script.cjs`)
- **Funcionalidade**: Processamento completo do sistema
- **Arquivos**: Processa balancetes e movimentações
- **Limitações**: Nenhuma (processamento completo)
- **Comando**: `npm run extract`

### 2. Script de Movimentação (`scriptMovimentacao.cjs`)
- **Funcionalidade**: Processamento isolado de arquivos de movimentação
- **Arquivos**: Apenas PDFs de movimentação
- **Limitação**: Máximo 10 páginas por PDF
- **Comando**: `npm run extract:movimentacao`

### 3. Script de Balancete (`scriptBalancete.cjs`)
- **Funcionalidade**: Processamento isolado de arquivos de balancete
- **Arquivos**: Apenas planilhas XLSX de balancete
- **Limitação**: Máximo 50 linhas por planilha
- **Comando**: `npm run extract:balancete`

## Comandos NPM Disponíveis

```bash
# Scripts de produção
npm run extract                    # Script principal completo
npm run extract:movimentacao      # Apenas movimentação (limitado)
npm run extract:balancete         # Apenas balancete (limitado)

# Scripts de debug
npm run debug                      # Debug do script principal
npm run debug:movimentacao        # Debug da movimentação (limitado)
npm run debug:balancete           # Debug do balancete (limitado)
```

## Limitações Implementadas

### Script de Movimentação
- **Limitação**: 10 páginas por PDF
- **Implementação**: Controle durante o parsing do PDF
- **Log específico**: Prefixo `[MOVIMENTACAO]`
- **Saída**: Diretório `{timestamp}_movimentacao/`

### Script de Balancete
- **Limitação**: 50 linhas por planilha
- **Implementação**: Controle durante a leitura das linhas de dados
- **Log específico**: Prefixo `[BALANCETE]`
- **Saída**: Diretório `{timestamp}_balancete/`

## Estrutura de Arquivos

### Scripts Principais
```
extraction/
├── script.cjs                          # Script principal (completo)
├── scriptMovimentacao.cjs              # Script isolado de movimentação
├── scriptBalancete.cjs                 # Script isolado de balancete
└── utils/
    ├── movimentacaoProcessor.cjs       # Processador original
    ├── balanceteProcessor.cjs          # Processador original
    ├── movimentacaoProcessorLimited.cjs # Processador limitado (10 páginas)
    └── balanceteProcessorLimited.cjs   # Processador limitado (50 linhas)
```

### Saídas Geradas

#### Script Principal
```
{timestamp}_processamento/
├── intermediarios/
├── logs/
├── relatorios_finais/
└── estatisticas/
```

#### Script de Movimentação
```
{timestamp}_movimentacao/
├── intermediarios/
│   └── movimentacao_processada.json
├── logs/
│   ├── movimentacao_processamento.log
│   ├── movimentacao_validacoes.log
│   └── movimentacao_erros.log
└── relatorios_movimentacao/
    └── estatisticas_movimentacao.json
```

#### Script de Balancete
```
{timestamp}_balancete/
├── intermediarios/
│   └── balancete_processado.json
├── logs/
│   ├── balancete_processamento.log
│   ├── balancete_validacoes.log
│   └── balancete_erros.log
└── relatorios_balancete/
    └── estatisticas_balancete.json
```

## Logs Específicos

### Formato dos Logs
- **Movimentação**: `[MOVIMENTACAO][LEVEL] mensagem`
- **Balancete**: `[BALANCETE][LEVEL] mensagem`

### Informações de Limitação
- Os logs incluem informações sobre as limitações aplicadas
- Indicadores de progresso específicos para cada tipo de processamento
- Estatísticas detalhadas sobre o processamento limitado

## Compatibilidade

### Estrutura de Dados
- Os scripts mantêm compatibilidade com a estrutura de dados original
- Campos adicionais indicam quando a limitação foi aplicada:
  - `limitado: true`
  - `paginas_processadas: 10` (movimentação)
  - `linhas_processadas: 50` (balancete)

### Processamento Principal
- O script principal (`script.cjs`) **não foi alterado**
- Mantém o processamento completo sem limitações
- Funcionalidade original preservada integralmente

## Casos de Uso

### Debug de Movimentação
```bash
npm run debug:movimentacao
```
- Útil para testar extração de PDFs
- Limita o processamento para acelerar o debug
- Logs específicos facilitam identificação de problemas

### Debug de Balancete
```bash
npm run debug:balancete
```
- Útil para testar processamento de planilhas
- Processa apenas as primeiras linhas relevantes
- Ideal para validação de mapeamento de colunas

### Desenvolvimento e Testes
- Scripts isolados permitem testes independentes
- Facilita identificação de problemas específicos
- Acelera o ciclo de desenvolvimento

## Observações Técnicas

### Implementação das Limitações
- **PDFs**: Limitação aplicada no nível do `pdf-parse` com parâmetro `max`
- **Planilhas**: Limitação aplicada durante o loop de processamento de linhas
- **Logs**: Sistema de logging independente para cada script

### Performance
- Scripts limitados executam mais rapidamente
- Redução significativa no uso de memória
- Ideal para desenvolvimento e testes

### Manutenção
- Cada script é independente e pode ser mantido separadamente
- Alterações nos processadores limitados não afetam o principal
- Facilita atualizações e correções pontuais

## Exemplo de Uso

```bash
# Processar apenas movimentação para debug
npm run extract:movimentacao

# Verificar logs específicos
cat data/output/{timestamp}_movimentacao/logs/movimentacao_processamento.log

# Processar apenas balancete para validação
npm run extract:balancete

# Comparar resultados limitados vs completos
npm run extract:balancete
npm run extract
```

## Suporte

Para dúvidas ou problemas relacionados aos scripts paralelos:
1. Verificar os logs específicos de cada script
2. Comparar comportamento com o script principal
3. Validar a estrutura dos arquivos de entrada 